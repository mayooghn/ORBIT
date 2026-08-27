import type {
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
  StrategicReserveValidationResult,
  StrategicReserveFeasibility,
  StrategicReserveConstraintStatus,
  StrategicReserveCoverageStatus,
} from './model';

const INPUT_FIELDS: Array<keyof StrategicReserveOptimizationInput> = [
  'currentReserve',
  'demand',
  'availableSupply',
  'disruptionDuration',
  'alternativeProcurement',
  'replenishmentRate',
  'minimumReserveThreshold',
];

export const validateStrategicReserveInput = (
  value: unknown,
): StrategicReserveValidationResult => {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ path: 'request', message: 'A strategic reserve request is required.' }],
    };
  }

  const candidate = { ...(value as Record<string, unknown>) } as Partial<StrategicReserveOptimizationInput>;

  // Backwards compatibility: if availableSupply is missing but supplyGap is provided, derive availableSupply
  if (typeof candidate.availableSupply !== 'number' && typeof candidate.supplyGap === 'number') {
    candidate.availableSupply = Math.max(0, (candidate.demand ?? 0) - candidate.supplyGap);
  }

  const issues = INPUT_FIELDS.flatMap((field) => {
    const fieldValue = candidate[field];
    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
      return [{ path: field, message: 'Value must be a finite number.' }];
    }
    if (fieldValue < 0) {
      return [{ path: field, message: 'Value must be non-negative.' }];
    }
    return [];
  });

  if (issues.length > 0) return { valid: false, issues };

  // Guarantee calculated supply gap is stored
  candidate.supplyGap = Math.max(0, (candidate.demand ?? 0) - (candidate.availableSupply ?? 0));

  return {
    valid: true,
    issues: [],
    input: candidate as StrategicReserveOptimizationInput,
  };
};

/**
 * Deterministically optimizes strategic reserve drawdown without an LLM.
 *
 * CRITICAL SAFETY CONSTRAINT:
 * The optimizer MUST NEVER recommend a drawdown that causes:
 * remainingReserve < minimumReserveThreshold.
 *
 * If requested response exceeds safe available reserve, it caps drawdown at
 * maximumSafeReserveDrawdown and sets constraint status accordingly.
 */
export const optimizeStrategicReserve = (
  input: StrategicReserveOptimizationInput,
): StrategicReserveOptimizationResult => {
  const validation = validateStrategicReserveInput(input);
  if (!validation.valid || !validation.input) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '),
    );
  }

  const normalized = validation.input;

  // 1. Fundamental relationship: Supply Gap = max(0, Daily Demand - Available Supply)
  const demand = Math.max(0, normalized.demand);
  const availableSupply = Math.max(0, normalized.availableSupply);
  const calculatedSupplyGap = Math.max(0, demand - availableSupply);
  const grossSupplyGap = calculatedSupplyGap;

  // 2. Backup Supply (alternativeProcurement) & Procurement Coverage
  const backupSupply = Math.max(0, normalized.alternativeProcurement);
  const procurementCoverage = Math.min(
    grossSupplyGap,
    backupSupply,
  );

  // 3. Effective Supply Gap = max(0, Supply Gap - Backup Supply)
  const residualSupplyGap = Math.max(
    0,
    grossSupplyGap - backupSupply,
  );
  const effectiveGap = residualSupplyGap; // legacy alias

  // 4. Total Crisis Requirement = Effective Supply Gap * Crisis Duration
  const disruptionDuration = Math.max(0, normalized.disruptionDuration);
  const requiredReserveDrawdown = residualSupplyGap * disruptionDuration;
  const totalNeed = requiredReserveDrawdown; // legacy alias

  // 5. Maximum Safe Reserve Drawdown = max(0, Current Reserve - Safety Reserve)
  // Below-safety-threshold case: If Current Reserve < Safety Reserve, max safe drawdown = 0, recommended = 0
  const isBelowSafety = normalized.currentReserve < normalized.minimumReserveThreshold;
  const maximumSafeReserveDrawdown = isBelowSafety
    ? 0
    : Math.max(
        0,
        normalized.currentReserve - normalized.minimumReserveThreshold,
      );
  const safeAvailableReserve = maximumSafeReserveDrawdown; // legacy alias

  // 6. Recommended Reserve Drawdown = min(Total Crisis Requirement, Maximum Safe Drawdown)
  // MUST NEVER exceed safe available reserve, ensuring remainingReserve >= minimumReserveThreshold
  const recommendedReserveDrawdown = isBelowSafety
    ? 0
    : Math.min(
        requiredReserveDrawdown,
        maximumSafeReserveDrawdown,
      );
  const drawdownAmount = recommendedReserveDrawdown; // legacy alias

  // 7. Remaining Reserve after Drawdown
  const remainingReserve = normalized.currentReserve - recommendedReserveDrawdown;

  // 8. Reserve Drawdown Rate (per day)
  const reserveDrawdownRate = disruptionDuration === 0
    ? 0
    : recommendedReserveDrawdown / disruptionDuration;
  const drawdownRate = reserveDrawdownRate; // legacy alias

  // 9. Replenishment Requirement & Duration
  const replenishmentRequirement = recommendedReserveDrawdown;
  const replenishmentDays = normalized.replenishmentRate > 0 && replenishmentRequirement > 0
    ? Math.ceil(replenishmentRequirement / normalized.replenishmentRate)
    : 0;

  // 10. Shortfall & Full Coverage
  const shortfall = Math.max(0, requiredReserveDrawdown - recommendedReserveDrawdown);
  const fullyCovered = shortfall === 0;

  // 11. Constraint Status & Feasibility
  let constraintStatus: StrategicReserveConstraintStatus;
  let feasibility: StrategicReserveFeasibility;
  let coverageStatus: StrategicReserveCoverageStatus;

  if (grossSupplyGap === 0 || residualSupplyGap === 0) {
    constraintStatus = 'SATISFIED';
    feasibility = 'FEASIBLE';
    coverageStatus = 'NO_EFFECTIVE_GAP';
  } else if (isBelowSafety) {
    constraintStatus = 'BELOW_THRESHOLD';
    feasibility = 'INFEASIBLE';
    coverageStatus = 'RESERVE_BELOW_THRESHOLD';
  } else if (requiredReserveDrawdown <= maximumSafeReserveDrawdown) {
    constraintStatus = maximumSafeReserveDrawdown === 0 ? 'BINDING' : 'SATISFIED';
    feasibility = 'FEASIBLE';
    coverageStatus = 'FULLY_COVERED';
  } else if (maximumSafeReserveDrawdown > 0) {
    constraintStatus = 'LIMIT_ENFORCED';
    feasibility = 'PARTIALLY_FEASIBLE';
    coverageStatus = 'PARTIALLY_COVERED';
  } else {
    constraintStatus = 'BINDING';
    feasibility = 'INFEASIBLE';
    coverageStatus = 'PARTIALLY_COVERED';
  }

  // Double-check mathematical safety constraint
  const safetyConstraintGuaranteed =
    remainingReserve >= Math.min(normalized.currentReserve, normalized.minimumReserveThreshold);

  const isFeasible = feasibility === 'FEASIBLE';

  return {
    // Phase 8 Core Calculations
    grossSupplyGap,
    calculatedSupplyGap,
    availableSupply,
    procurementCoverage,
    residualSupplyGap,
    requiredReserveDrawdown,
    maximumSafeReserveDrawdown,
    recommendedReserveDrawdown,
    remainingReserve,
    reserveDrawdownRate,
    replenishmentRequirement,
    replenishmentDays,
    minimumReserveConstraint: normalized.minimumReserveThreshold,
    isFeasible,
    feasibility,
    constraintStatus,
    coverageStatus,
    safetyConstraintGuaranteed,
    calculatedAt: new Date().toISOString(),

    // Backward compatibility aliases
    effectiveGap,
    totalNeed,
    safeAvailableReserve,
    drawdownAmount,
    drawdownRate,
    duration: disruptionDuration,
    durationUnit: 'days',
    shortfall,
    fullyCovered,
    minimumReserveThreshold: normalized.minimumReserveThreshold,
  };
};

/**
 * Helper to integrate with Procurement Alternatives from the existing procurement engine.
 */
export const optimizeStrategicReserveWithProcurement = (
  input: Omit<StrategicReserveOptimizationInput, 'alternativeProcurement'> & {
    alternativeProcurement?: number;
    procurementResult?: { totalProcured?: number };
  },
): StrategicReserveOptimizationResult => {
  const alternativeProcurement =
    typeof input.alternativeProcurement === 'number'
      ? input.alternativeProcurement
      : input.procurementResult?.totalProcured ?? 0;

  return optimizeStrategicReserve({
    currentReserve: input.currentReserve,
    demand: input.demand,
    supplyGap: input.supplyGap,
    disruptionDuration: input.disruptionDuration,
    alternativeProcurement,
    replenishmentRate: input.replenishmentRate,
    minimumReserveThreshold: input.minimumReserveThreshold,
    notes: input.notes,
  });
};

