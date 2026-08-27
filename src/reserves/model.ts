export interface StrategicReserveOptimizationInput {
  currentReserve: number;
  demand: number;
  availableSupply?: number;
  supplyGap?: number;
  disruptionDuration: number;
  alternativeProcurement: number;
  replenishmentRate: number;
  minimumReserveThreshold: number;
  notes?: string;
}

export type StrategicReserveCoverageStatus =
  | 'FULLY_COVERED'
  | 'PARTIALLY_COVERED'
  | 'NO_EFFECTIVE_GAP'
  | 'RESERVE_BELOW_THRESHOLD'
  | 'INFEASIBLE';

export type StrategicReserveFeasibility =
  | 'FEASIBLE'
  | 'PARTIALLY_FEASIBLE'
  | 'INFEASIBLE';

export type StrategicReserveConstraintStatus =
  | 'SATISFIED'
  | 'BINDING'
  | 'LIMIT_ENFORCED'
  | 'BELOW_THRESHOLD';

export interface StrategicReserveOptimizationResult {
  // Phase 8 Core Calculations
  grossSupplyGap: number;
  calculatedSupplyGap: number;
  availableSupply: number;
  procurementCoverage: number;
  residualSupplyGap: number;
  requiredReserveDrawdown: number;
  maximumSafeReserveDrawdown: number;
  recommendedReserveDrawdown: number;
  remainingReserve: number;
  reserveDrawdownRate: number;
  replenishmentRequirement: number;
  replenishmentDays: number;
  minimumReserveConstraint: number;
  isFeasible: boolean;
  feasibility: StrategicReserveFeasibility;
  constraintStatus: StrategicReserveConstraintStatus;
  coverageStatus: StrategicReserveCoverageStatus;
  safetyConstraintGuaranteed: boolean;
  calculatedAt: string;

  // Backward compatibility aliases
  effectiveGap: number;
  totalNeed: number;
  safeAvailableReserve: number;
  drawdownAmount: number;
  drawdownRate: number;
  duration: number;
  durationUnit: 'days';
  shortfall: number;
  fullyCovered: boolean;
  minimumReserveThreshold?: number;
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

export interface StrategicReserveFacility {
  strategicReserveId: string;
  facilityName: string;
  capacity: number;
  capacityUnit: string;
  latitude: number | null;
  longitude: number | null;
  mappingStatus: string;
  notes: string | null;
}

export interface RealAlternativeSupplier {
  countryId: string;
  sourceCountryName: string;
  canonicalName: string;
  financialYear: string;
  annualQuantityTonnes: number;
  dailyCapacityTonnes: number;
  shareOfTotalImportsPercent: number;
  productName: string;
}

export interface RealAlternativeProcurementState {
  availableAlternativeDailyTonnes: number;
  totalAnnualImportTonnes: number;
  financialYear: string;
  supplierCount: number;
  suppliers: RealAlternativeSupplier[];
  commercialCostStatus: 'Commercial lane-cost data unavailable';
  isCommercialCostAvailable: false;
  dataSource: string;
  provenance: string;
}

export interface ProcurementProvenance {
  source: string;
  commercialCostStatus: 'Commercial lane-cost data unavailable';
  isCommercialCostAvailable: false;
  usedAlternativeProcurement: number;
  financialYear?: string;
  activeSuppliersCount?: number;
  disruptedSupplierExcluded?: string | null;
  notes?: string;
}

export interface StrategicReserveState {
  facilityName: string;
  country: string;
  totalCapacity: number;
  capacityUnit: string;
  capacitySource: string;
  isCapacityFromDatabase: boolean;
  currentReserve: number;
  currentReserveStatus: 'AVAILABLE' | 'POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY' | 'REPORTED';
  currentReserveSource: string;
  minimumReserveThreshold: number;
  minimumReservePolicyBasis: string;
  currentDemand: number;
  demandBasis: string;
  demandFinancialYear: string | null;
  isDemandFromDatabase: boolean;
  defaultReplenishmentRate: number;
  replenishmentPolicyBasis: string;
  unit: string;
  facilities: StrategicReserveFacility[];
  alternativeProcurement?: RealAlternativeProcurementState;
  lastUpdated: string;
}

