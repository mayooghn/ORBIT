import type {
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
  StrategicReserveValidationResult,
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
  const effectiveGap = Math.max(
    0,
    normalized.supplyGap - normalized.alternativeProcurement,
  );
  const totalNeed = effectiveGap * normalized.disruptionDuration;
  const safeAvailableReserve = Math.max(
    0,
    normalized.currentReserve - normalized.minimumReserveThreshold,
  );
  const drawdownAmount = Math.min(totalNeed, safeAvailableReserve);
  const remainingReserve = normalized.currentReserve - drawdownAmount;
  const shortfall = Math.max(0, totalNeed - drawdownAmount);
  const fullyCovered = shortfall === 0;

  return {
    effectiveGap,
    totalNeed,
    safeAvailableReserve,
    drawdownAmount,
    drawdownRate: normalized.disruptionDuration === 0
      ? 0
      : drawdownAmount / normalized.disruptionDuration,
    duration: normalized.disruptionDuration,
    durationUnit: 'days',
    remainingReserve,
    replenishmentRequirement: Math.max(0, drawdownAmount),
    shortfall,
    fullyCovered,
    coverageStatus: effectiveGap === 0
      ? 'NO_EFFECTIVE_GAP'
      : fullyCovered
        ? 'FULLY_COVERED'
        : safeAvailableReserve === 0 &&
            normalized.currentReserve < normalized.minimumReserveThreshold
          ? 'RESERVE_BELOW_THRESHOLD'
          : 'PARTIALLY_COVERED',
  };
};
