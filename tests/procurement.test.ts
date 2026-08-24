import assert from 'node:assert/strict';
import test from 'node:test';
import {
  optimizeProcurement,
  validateProcurementAllocations,
  type ProcurementRequest,
  type SolverAdapter,
  type LinearOptimizationModel,
  type SolverSolution,
} from '../src/procurement';

const baseRequest = (): ProcurementRequest => ({
  supplyGap: { quantity: 100, unit: 'tonnes' },
  suppliers: [
    { supplierId: 'supplier-a', name: 'Supplier A', capacity: 100, capacityUnit: 'tonnes' },
    { supplierId: 'supplier-b', name: 'Supplier B', capacity: 100, capacityUnit: 'tonnes' },
  ],
  routes: [
    { routeId: 'route-1', name: 'Route 1', capacity: 100, capacityUnit: 'tonnes' },
    { routeId: 'route-2', name: 'Route 2', capacity: 100, capacityUnit: 'tonnes' },
  ],
  lanes: [
    { laneId: 'lane-a-1', supplierId: 'supplier-a', routeId: 'route-1', compatible: true, procurementCostPerUnit: 10, procurementCostUnit: 'USD_per_tonne', transitTimeDays: 5, riskScore: 10, reliabilityScore: 0.9 },
    { laneId: 'lane-a-2', supplierId: 'supplier-a', routeId: 'route-2', compatible: true, procurementCostPerUnit: 12, procurementCostUnit: 'USD_per_tonne', transitTimeDays: 7, riskScore: 20, reliabilityScore: 0.8 },
    { laneId: 'lane-b-1', supplierId: 'supplier-b', routeId: 'route-1', compatible: true, procurementCostPerUnit: 8, procurementCostUnit: 'USD_per_tonne', transitTimeDays: 8, riskScore: 30, reliabilityScore: 0.7 },
    { laneId: 'lane-b-2', supplierId: 'supplier-b', routeId: 'route-2', compatible: true, procurementCostPerUnit: 9, procurementCostUnit: 'USD_per_tonne', transitTimeDays: 6, riskScore: 15, reliabilityScore: 0.85 },
  ],
});

test('single supplier and route optimization satisfies the gap', async () => {
  const request = baseRequest();
  request.suppliers = [request.suppliers[0]];
  request.routes = [request.routes[0]];
  request.lanes = [request.lanes[0]];
  request.supplyGap.quantity = 60;

  const result = await optimizeProcurement(request);

  assert.equal(result.status, 'OPTIMAL');
  assert.equal(result.solverStatus, 'OPTIMAL');
  assert.equal(result.supplierAllocations[0]?.quantity, 60);
  assert.equal(result.routeAllocations[0]?.quantity, 60);
  assert.equal(result.unmetSupply, 0);
  assert.equal(result.constraintValidation.valid, true);
});

test('multiple suppliers use the least weighted lane combination', async () => {
  const result = await optimizeProcurement({
    ...baseRequest(),
    objectiveWeights: {
      cost: 1,
      risk: 0,
      transitTime: 0,
      reliabilityPenalty: 0,
    },
  });

  assert.equal(result.status, 'OPTIMAL');
  assert.equal(result.totalProcured, 100);
  assert.equal(result.allocations.find((allocation) => allocation.laneId === 'lane-b-1')?.quantity, 100);
  assert.equal(result.allocations.find((allocation) => allocation.laneId === 'lane-a-1')?.quantity, 0);
  assert.equal(result.totalCost, 800);
});

test('supplier capacity constraint splits allocation', async () => {
  const request = baseRequest();
  request.suppliers[0].capacity = 60;
  request.suppliers[1].capacity = 40;
  request.routes[1].capacity = 100;

  const result = await optimizeProcurement(request);

  assert.equal(result.status, 'OPTIMAL');
  assert.equal(result.supplierAllocations.find((allocation) => allocation.supplierId === 'supplier-b')?.quantity, 40);
  assert.equal(result.supplierAllocations.find((allocation) => allocation.supplierId === 'supplier-a')?.quantity, 60);
  assert.equal(result.constraintValidation.valid, true);
});

test('route capacity constraint splits allocation', async () => {
  const request = baseRequest();
  request.routes[0].capacity = 70;
  request.routes[1].capacity = 30;

  const result = await optimizeProcurement(request);

  assert.equal(result.status, 'OPTIMAL');
  assert.equal(result.routeAllocations.find((allocation) => allocation.routeId === 'route-2')?.quantity, 30);
  assert.equal(result.routeAllocations.find((allocation) => allocation.routeId === 'route-1')?.quantity, 70);
  assert.equal(result.constraintValidation.valid, true);
});

test('incompatible supplier-route pairs receive zero quantity', async () => {
  const request = baseRequest();
  request.lanes[3].compatible = false;
  request.lanes[0].procurementCostPerUnit = 20;

  const result = await optimizeProcurement(request);

  assert.equal(result.status, 'OPTIMAL');
  assert.equal(result.allocations.find((allocation) => allocation.laneId === 'lane-b-2')?.quantity, 0);
  assert.equal(result.unmetSupply, 0);
  assert.equal(result.constraintValidation.valid, true);
});

test('no compatible supplier-route lanes returns INFEASIBLE', async () => {
  const request = baseRequest();
  request.lanes = request.lanes.map((lane) => ({ ...lane, compatible: false }));

  const result = await optimizeProcurement(request);

  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.solverStatus, 'INFEASIBLE');
  assert.equal(result.unmetSupply, 100);
});

test('insufficient total capacity returns INFEASIBLE', async () => {
  const request = baseRequest();
  request.suppliers.forEach((supplier) => { supplier.capacity = 20; });

  const result = await optimizeProcurement(request);

  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.solverStatus, 'INFEASIBLE');
  assert.ok(result.error);
  assert.ok(result.unmetSupply > 0);
});

test('invalid input returns ERROR without invoking the solver', async () => {
  const result = await optimizeProcurement({
    ...baseRequest(),
    supplyGap: { quantity: -1, unit: 'tonnes' },
  });

  assert.equal(result.status, 'ERROR');
  assert.equal(result.solverStatus, 'NOT_RUN');
  assert.match(result.error ?? '', /supplyGap\.quantity/);
});

test('independent post-solve validation rejects an invalid solver output', async () => {
  const invalidAdapter: SolverAdapter = {
    async solve(model: LinearOptimizationModel): Promise<SolverSolution> {
      const firstVariable = model.variables[0]?.name ?? 'missing';
      return {
        status: 'OPTIMAL',
        objectiveValue: 0,
        variables: { [firstVariable]: 999 },
        solveTimeMs: 1,
        rawStatus: 5,
      };
    },
  };

  const result = await optimizeProcurement(baseRequest(), invalidAdapter);

  assert.equal(result.status, 'ERROR');
  assert.match(result.error ?? '', /Independent feasibility validation/);
  assert.equal(result.constraintValidation.valid, false);
  assert.ok(result.constraintValidation.checks.some((check) => !check.passed));
});

test('independent validator detects incompatible allocation directly', () => {
  const request = baseRequest();
  const invalidAllocations = [{
    laneId: 'lane-b-2',
    supplierId: 'supplier-b',
    routeId: 'route-2',
    quantity: 100,
    quantityUnit: 'tonnes',
    procurementCost: 900,
    procurementCostUnit: 'USD_per_tonne',
    objectiveContribution: 0,
  }];
  request.lanes[3].compatible = false;

  const validation = validateProcurementAllocations(
    {
      ...request,
      objectiveWeights: { cost: 1, risk: 1, transitTime: 1, reliabilityPenalty: 1 },
    },
    invalidAllocations,
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.checks.some((check) => check.constraint.includes('compatibility') && !check.passed));
});
