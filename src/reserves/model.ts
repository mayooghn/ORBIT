export interface StrategicReserveOptimizationInput {
  currentReserve: number;
  demand: number;
  supplyGap: number;
  disruptionDuration: number;
  alternativeProcurement: number;
  replenishmentRate: number;
  minimumReserveThreshold: number;
}

export type StrategicReserveCoverageStatus =
  | 'FULLY_COVERED'
  | 'PARTIALLY_COVERED'
  | 'NO_EFFECTIVE_GAP'
  | 'RESERVE_BELOW_THRESHOLD';

export interface StrategicReserveOptimizationResult {
  effectiveGap: number;
  totalNeed: number;
  safeAvailableReserve: number;
  drawdownAmount: number;
  drawdownRate: number;
  duration: number;
  durationUnit: 'days';
  remainingReserve: number;
  replenishmentRequirement: number;
  shortfall: number;
  fullyCovered: boolean;
  coverageStatus: StrategicReserveCoverageStatus;
}

export interface StrategicReserveValidationIssue {
  path: string;
  message: string;
}

export interface StrategicReserveValidationResult {
  valid: boolean;
  issues: StrategicReserveValidationIssue[];
  input?: StrategicReserveOptimizationInput;
}
