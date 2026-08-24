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
  'supplyGap',
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

  const candidate = value as Partial<StrategicReserveOptimizationInput>;
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

  // 1. Gross Supply Gap
  const grossSupplyGap = normalized.supplyGap;

  // 2. Procurement Coverage (volume covered by procurement alternatives)
  const procurementCoverage = Math.min(
    grossSupplyGap,
    Math.max(0, normalized.alternativeProcurement),
  );

  // 3. Residual Supply Gap (Gross supply gap minus alternative procurement)
  const residualSupplyGap = Math.max(
    0,
    grossSupplyGap - normalized.alternativeProcurement,
  );
  const effectiveGap = residualSupplyGap; // legacy alias

  // 4. Required Reserve Drawdown (Residual gap across disruption duration)
  const requiredReserveDrawdown = residualSupplyGap * normalized.disruptionDuration;
  const totalNeed = requiredReserveDrawdown; // legacy alias

  // 5. Maximum Safe Reserve Drawdown
  // Safety constraint: Current reserve minus minimum reserve threshold (capped at 0)
  const maximumSafeReserveDrawdown = Math.max(
    0,
    normalized.currentReserve - normalized.minimumReserveThreshold,
  );
  const safeAvailableReserve = maximumSafeReserveDrawdown; // legacy alias

  // 6. Recommended Reserve Drawdown
  // MUST NEVER exceed safe available reserve, ensuring remainingReserve >= minimumReserveThreshold
  const recommendedReserveDrawdown = Math.min(
    requiredReserveDrawdown,
    maximumSafeReserveDrawdown,
  );
  const drawdownAmount = recommendedReserveDrawdown; // legacy alias

  // 7. Remaining Reserve after Drawdown
  const remainingReserve = normalized.currentReserve - recommendedReserveDrawdown;

  // 8. Reserve Drawdown Rate (per day)
  const reserveDrawdownRate = normalized.disruptionDuration === 0
    ? 0
    : recommendedReserveDrawdown / normalized.disruptionDuration;
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
  } else if (normalized.currentReserve < normalized.minimumReserveThreshold) {
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
    duration: normalized.disruptionDuration,
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

