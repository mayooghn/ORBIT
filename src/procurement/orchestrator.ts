import { buildProcurementOptimizationModel } from './optimization-model';
import {
  validateProcurementAllocations,
  PROCUREMENT_VALIDATION_TOLERANCE,
} from './feasibility-validator';
import { validateProcurementRequest } from './input-validator';
import type {
  NormalizedProcurementRequest,
  ProcurementAllocation,
  ProcurementConstraintValidation,
  ProcurementRequest,
  ProcurementResult,
  ProcurementRouteAllocation,
  ProcurementSolverStatus,
  ProcurementSupplierAllocation,
} from './model';
import { GlpkSolverAdapter } from './glpk-solver-adapter';
import type { SolverAdapter } from './solver-adapter';

const emptyValidation = (): ProcurementConstraintValidation => ({
  valid: false,
  tolerance: PROCUREMENT_VALIDATION_TOLERANCE,
  checks: [],
});

const zeroAllocations = (request: NormalizedProcurementRequest): ProcurementAllocation[] =>
  request.lanes.map((lane) => ({
    laneId: lane.laneId,
    supplierId: lane.supplierId,
    routeId: lane.routeId,
    quantity: 0,
    quantityUnit: request.supplyGap.unit,
    procurementCost: 0,
    procurementCostUnit: lane.procurementCostUnit,
    transitTimeDays: lane.transitTimeDays,
    riskScore: lane.riskScore,
    reliabilityScore: lane.reliabilityScore,
    objectiveContribution: 0,
  }));

const buildSupplierAllocations = (
  request: NormalizedProcurementRequest,
  allocations: ProcurementAllocation[],
): ProcurementSupplierAllocation[] => request.suppliers.map((supplier) => {
  const supplierAllocations = allocations.filter(
    (allocation) => allocation.supplierId === supplier.supplierId,
  );
  const quantity = supplierAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0,
  );
  const totalCost = supplierAllocations.reduce(
    (sum, allocation) => sum + allocation.procurementCost,
    0,
  );

  return {
    supplierId: supplier.supplierId,
    supplierName: supplier.name,
    quantity,
    capacity: supplier.capacity,
    unit: request.supplyGap.unit,
    totalCost,
    totalCostUnit: supplierAllocations[0]?.procurementCostUnit ?? 'unavailable',
    riskScore: quantity > 0
      ? supplierAllocations.reduce(
        (sum, allocation) => sum + allocation.quantity * (allocation.riskScore ?? 0),
        0,
      ) / quantity
      : null,
    reliabilityScore: quantity > 0
      ? supplierAllocations.reduce(
        (sum, allocation) => sum + allocation.quantity * (allocation.reliabilityScore ?? 0),
        0,
      ) / quantity
      : null,
  };
});

const buildRouteAllocations = (
  request: NormalizedProcurementRequest,
  allocations: ProcurementAllocation[],
): ProcurementRouteAllocation[] => request.routes.map((route) => {
  const routeAllocations = allocations.filter(
    (allocation) => allocation.routeId === route.routeId,
  );
  const quantity = routeAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0,
  );

  return {
    routeId: route.routeId,
    routeName: route.name,
    quantity,
    capacity: route.capacity,
    unit: request.supplyGap.unit,
    transitTimeDays: quantity > 0
      ? routeAllocations.reduce(
        (sum, allocation) => sum + allocation.quantity * (allocation.transitTimeDays ?? 0),
        0,
      ) / quantity
      : null,
  };
});

const buildResult = (
  request: NormalizedProcurementRequest,
  status: ProcurementResult['status'],
  solverStatus: ProcurementSolverStatus,
  allocations: ProcurementAllocation[],
  solveTimeMs: number,
  objectiveValue: number,
  constraintValidation: ProcurementConstraintValidation,
  error?: string,
): ProcurementResult => {
  const totalProcured = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const totalCost = allocations.reduce((sum, allocation) => sum + allocation.procurementCost, 0);
  const costUnit = request.lanes.find((lane) => lane.procurementCostUnit.trim())?.procurementCostUnit ?? 'unavailable';

  return {
    status,
    solverStatus,
    allocations,
    supplierAllocations: buildSupplierAllocations(request, allocations),
    routeAllocations: buildRouteAllocations(request, allocations),
    totalProcured,
    totalProcuredUnit: request.supplyGap.unit,
    totalCost,
    totalCostUnit: costUnit,
    objectiveValue,
    unmetSupply: Math.max(0, request.supplyGap.quantity - totalProcured),
    unmetSupplyUnit: request.supplyGap.unit,
    constraintValidation,
    solveTimeMs,
    ...(error ? { error } : {}),
  };
};

const invalidRequestResult = (
  validationIssues: string[],
): ProcurementResult => ({
  status: 'ERROR',
  solverStatus: 'NOT_RUN',
  allocations: [],
  supplierAllocations: [],
  routeAllocations: [],
  totalProcured: 0,
  totalProcuredUnit: 'unavailable',
  totalCost: 0,
  totalCostUnit: 'unavailable',
  objectiveValue: 0,
  unmetSupply: 0,
  unmetSupplyUnit: 'unavailable',
  constraintValidation: emptyValidation(),
  solveTimeMs: 0,
  error: validationIssues.join(' '),
});

const buildAllocations = (
  request: NormalizedProcurementRequest,
  laneVariableNames: Record<string, string>,
  variables: Record<string, number>,
): ProcurementAllocation[] => request.lanes.map((lane) => {
  const quantity = Math.abs(variables[laneVariableNames[lane.laneId]] ?? 0) <= PROCUREMENT_VALIDATION_TOLERANCE
    ? 0
    : Math.max(0, variables[laneVariableNames[lane.laneId]] ?? 0);
  const objectiveContribution = quantity * (
    request.objectiveWeights.cost * lane.procurementCostPerUnit +
    request.objectiveWeights.risk * lane.riskScore +
    request.objectiveWeights.transitTime * lane.transitTimeDays +
    request.objectiveWeights.reliabilityPenalty * (1 - lane.reliabilityScore)
  );

  return {
    laneId: lane.laneId,
    supplierId: lane.supplierId,
    routeId: lane.routeId,
    quantity,
    quantityUnit: request.supplyGap.unit,
    procurementCost: quantity * lane.procurementCostPerUnit,
    procurementCostUnit: lane.procurementCostUnit,
    transitTimeDays: lane.transitTimeDays,
    riskScore: lane.riskScore,
    reliabilityScore: lane.reliabilityScore,
    objectiveContribution,
  };
});

export class ProcurementOrchestrator {
  constructor(private readonly solverAdapter: SolverAdapter = new GlpkSolverAdapter()) {}

  async optimize(input: ProcurementRequest): Promise<ProcurementResult> {
    const validation = validateProcurementRequest(input);
    if (!validation.valid || !validation.request) {
      return invalidRequestResult(validation.issues.map((issue) => `${issue.path}: ${issue.message}`));
    }

    const request = validation.request;
    const model = buildProcurementOptimizationModel(request);
    const solverResult = await this.solverAdapter.solve(model.linearModel);

    if (solverResult.status === 'INFEASIBLE') {
      const allocations = zeroAllocations(request);
      const constraintValidation = validateProcurementAllocations(request, allocations);
      return buildResult(
        request,
        'INFEASIBLE',
        'INFEASIBLE',
        allocations,
        solverResult.solveTimeMs,
        0,
        constraintValidation,
        'No feasible procurement allocation satisfies the supply-gap and capacity constraints.',
      );
    }

    if (solverResult.status !== 'OPTIMAL' && solverResult.status !== 'FEASIBLE') {
      return buildResult(
        request,
        'ERROR',
        solverResult.status,
        zeroAllocations(request),
        solverResult.solveTimeMs,
        0,
        emptyValidation(),
        solverResult.error ?? 'The procurement solver did not return a usable solution.',
      );
    }

    const allocations = buildAllocations(
      request,
      model.laneVariableNames,
      solverResult.variables,
    );
    const constraintValidation = validateProcurementAllocations(request, allocations);

    if (!constraintValidation.valid) {
      return buildResult(
        request,
        'ERROR',
        solverResult.status,
        allocations,
        solverResult.solveTimeMs,
        solverResult.objectiveValue,
        constraintValidation,
        'Independent feasibility validation rejected the solver output.',
      );
    }

    return buildResult(
      request,
      solverResult.status === 'OPTIMAL' ? 'OPTIMAL' : 'ERROR',
      solverResult.status,
      allocations,
      solverResult.solveTimeMs,
      solverResult.objectiveValue,
      constraintValidation,
      solverResult.status === 'FEASIBLE'
        ? 'The solver returned a feasible but non-optimal solution.'
        : undefined,
    );
  }
}

export const optimizeProcurement = async (
  request: ProcurementRequest,
  solverAdapter?: SolverAdapter,
): Promise<ProcurementResult> =>
  new ProcurementOrchestrator(solverAdapter).optimize(request);
