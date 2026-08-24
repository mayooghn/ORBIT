export interface ProcurementSupplyGap {
  quantity: number;
  unit: string;
}

export interface ProcurementSupplier {
  supplierId: string;
  name: string;
  capacity: number;
  capacityUnit: string;
}

export interface ProcurementRoute {
  routeId: string;
  name: string;
  capacity: number;
  capacityUnit: string;
}

export interface ProcurementLane {
  laneId: string;
  supplierId: string;
  routeId: string;
  compatible: boolean;
  procurementCostPerUnit: number;
  procurementCostUnit: string;
  transitTimeDays: number;
  riskScore: number;
  reliabilityScore: number;
}

export interface ProcurementObjectiveWeights {
  cost: number;
  risk: number;
  transitTime: number;
  reliabilityPenalty: number;
}

export interface ProcurementRequest {
  supplyGap: ProcurementSupplyGap;
  suppliers: ProcurementSupplier[];
  routes: ProcurementRoute[];
  lanes: ProcurementLane[];
  objectiveWeights?: Partial<ProcurementObjectiveWeights>;
}

export interface NormalizedProcurementRequest extends ProcurementRequest {
  objectiveWeights: ProcurementObjectiveWeights;
}

export interface ProcurementValidationIssue {
  path: string;
  message: string;
}

export interface ProcurementInputValidationResult {
  valid: boolean;
  issues: ProcurementValidationIssue[];
  request?: NormalizedProcurementRequest;
}

export interface ProcurementAllocation {
  laneId: string;
  supplierId: string;
  routeId: string;
  quantity: number;
  quantityUnit: string;
  procurementCost: number;
  procurementCostUnit: string;
  transitTimeDays?: number;
  riskScore?: number;
  reliabilityScore?: number;
  objectiveContribution: number;
}

export interface ProcurementSupplierAllocation {
  supplierId: string;
  supplierName: string;
  quantity: number;
  capacity: number;
  unit: string;
  totalCost: number;
  totalCostUnit: string;
  riskScore: number | null;
  reliabilityScore: number | null;
}

export interface ProcurementRouteAllocation {
  routeId: string;
  routeName: string;
  quantity: number;
  capacity: number;
  unit: string;
  transitTimeDays: number | null;
}

export interface ProcurementConstraintCheck {
  constraint: string;
  passed: boolean;
  actual: number | null;
  limit: number | null;
  message: string;
}

export interface ProcurementConstraintValidation {
  valid: boolean;
  tolerance: number;
  checks: ProcurementConstraintCheck[];
}

export type ProcurementOptimizationStatus =
  | 'OPTIMAL'
  | 'INFEASIBLE'
  | 'ERROR';

export type ProcurementSolverStatus =
  | 'OPTIMAL'
  | 'FEASIBLE'
  | 'INFEASIBLE'
  | 'UNBOUNDED'
  | 'ERROR'
  | 'NOT_RUN';

export interface ProcurementResult {
  status: ProcurementOptimizationStatus;
  solverStatus: ProcurementSolverStatus;
  allocations: ProcurementAllocation[];
  supplierAllocations: ProcurementSupplierAllocation[];
  routeAllocations: ProcurementRouteAllocation[];
  totalProcured: number;
  totalProcuredUnit: string;
  totalCost: number;
  totalCostUnit: string;
  objectiveValue: number;
  unmetSupply: number;
  unmetSupplyUnit: string;
  constraintValidation: ProcurementConstraintValidation;
  solveTimeMs: number;
  error?: string;
}
