import type {
  NormalizedProcurementRequest,
  ProcurementAllocation,
  ProcurementConstraintCheck,
  ProcurementConstraintValidation,
} from './model';

export const PROCUREMENT_VALIDATION_TOLERANCE = 1e-7;

const check = (
  constraint: string,
  passed: boolean,
  actual: number | null,
  limit: number | null,
  message: string,
): ProcurementConstraintCheck => ({
  constraint,
  passed,
  actual,
  limit,
  message,
});

const withinTolerance = (left: number, right: number): boolean =>
  Math.abs(left - right) <= PROCUREMENT_VALIDATION_TOLERANCE * Math.max(1, Math.abs(right));

export const validateProcurementAllocations = (
  request: NormalizedProcurementRequest,
  allocations: ProcurementAllocation[],
): ProcurementConstraintValidation => {
  const checks: ProcurementConstraintCheck[] = [];
  const suppliers = new Map(request.suppliers.map((supplier) => [supplier.supplierId, supplier]));
  const routes = new Map(request.routes.map((route) => [route.routeId, route]));
  const lanes = new Map(request.lanes.map((lane) => [lane.laneId, lane]));
  const supplierTotals = new Map<string, number>();
  const routeTotals = new Map<string, number>();
  let total = 0;

  for (const allocation of allocations) {
    const lane = lanes.get(allocation.laneId);
    const validQuantity = Number.isFinite(allocation.quantity) && allocation.quantity >= -PROCUREMENT_VALIDATION_TOLERANCE;
    checks.push(check(
      `allocation_non_negative_${allocation.laneId}`,
      validQuantity,
      allocation.quantity,
      0,
      validQuantity ? 'Allocation quantity is non-negative.' : 'Allocation quantity is negative or non-finite.',
    ));

    const knownLane = lane !== undefined && lane.supplierId === allocation.supplierId && lane.routeId === allocation.routeId;
    checks.push(check(
      `allocation_lane_${allocation.laneId}`,
      knownLane,
      null,
      null,
      knownLane ? 'Allocation references a known lane.' : 'Allocation references an unknown or mismatched lane.',
    ));

    const compatible = lane?.compatible === true;
    checks.push(check(
      `allocation_compatibility_${allocation.laneId}`,
      !lane || compatible || Math.abs(allocation.quantity) <= PROCUREMENT_VALIDATION_TOLERANCE,
      allocation.quantity,
      0,
      !lane || compatible || Math.abs(allocation.quantity) <= PROCUREMENT_VALIDATION_TOLERANCE
        ? 'Incompatible lanes have zero allocation.'
        : 'An incompatible lane received procurement quantity.',
    ));

    if (validQuantity && knownLane && lane) {
      const quantity = Math.max(0, allocation.quantity);
      total += quantity;
      supplierTotals.set(allocation.supplierId, (supplierTotals.get(allocation.supplierId) ?? 0) + quantity);
      routeTotals.set(allocation.routeId, (routeTotals.get(allocation.routeId) ?? 0) + quantity);
    }
  }

  checks.push(check(
    'supply_gap',
    withinTolerance(total, request.supplyGap.quantity),
    total,
    request.supplyGap.quantity,
    withinTolerance(total, request.supplyGap.quantity)
      ? 'Total procurement exactly satisfies the supply gap.'
      : 'Total procurement does not satisfy the supply gap.',
  ));

  for (const supplier of request.suppliers) {
    const quantity = supplierTotals.get(supplier.supplierId) ?? 0;
    checks.push(check(
      `supplier_capacity_${supplier.supplierId}`,
      quantity <= supplier.capacity + PROCUREMENT_VALIDATION_TOLERANCE,
      quantity,
      supplier.capacity,
      quantity <= supplier.capacity + PROCUREMENT_VALIDATION_TOLERANCE
        ? 'Supplier capacity is respected.'
        : 'Supplier capacity is exceeded.',
    ));
  }

  for (const route of request.routes) {
    const quantity = routeTotals.get(route.routeId) ?? 0;
    checks.push(check(
      `route_capacity_${route.routeId}`,
      quantity <= route.capacity + PROCUREMENT_VALIDATION_TOLERANCE,
      quantity,
      route.capacity,
      quantity <= route.capacity + PROCUREMENT_VALIDATION_TOLERANCE
        ? 'Route capacity is respected.'
        : 'Route capacity is exceeded.',
    ));
  }

  return {
    valid: checks.every((constraint) => constraint.passed),
    tolerance: PROCUREMENT_VALIDATION_TOLERANCE,
    checks,
  };
};
