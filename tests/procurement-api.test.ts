import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { createApp } from '../server';
import { openPhase2Database } from '../src/dataLayer/database';
import { Phase2Repository } from '../src/dataLayer/repository';

const database = openPhase2Database({ dbPath: ':memory:' });
let server: Server;
let baseUrl = '';

const requestBody = () => ({
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

before(async () => {
  const app = createApp(new Phase2Repository(database));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
  database.close();
});

const postOptimization = async (body: unknown): Promise<Response> =>
  fetch(`${baseUrl}/api/procurement/optimize`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

test('valid procurement request returns an optimal result', async () => {
  const response = await postOptimization(requestBody());
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    procurement: {
      status: string;
      solverStatus: string;
      totalProcured: number;
      unmetSupply: number;
      constraintValidation: { valid: boolean };
    };
  };
  assert.equal(body.status, 'OPTIMAL');
  assert.equal(body.procurement.status, 'OPTIMAL');
  assert.equal(body.procurement.solverStatus, 'OPTIMAL');
  assert.equal(body.procurement.totalProcured, 100);
  assert.equal(body.procurement.unmetSupply, 0);
  assert.equal(body.procurement.constraintValidation.valid, true);
});

test('multiple suppliers and routes return allocations', async () => {
  const body = await (await postOptimization(requestBody())).json() as {
    procurement: {
      allocations: Array<{ supplierId: string; routeId: string; quantity: number }>;
      supplierAllocations: Array<{ supplierId: string; quantity: number }>;
      routeAllocations: Array<{ routeId: string; quantity: number }>;
    };
  };

  assert.ok(body.procurement.allocations.length === 4);
  assert.equal(body.procurement.supplierAllocations.length, 2);
  assert.equal(body.procurement.routeAllocations.length, 2);
  assert.ok(body.procurement.allocations.some((allocation) => allocation.quantity > 0));
});

test('infeasible request returns HTTP 200 with INFEASIBLE status', async () => {
  const body = requestBody();
  body.suppliers.forEach((supplier) => { supplier.capacity = 20; });

  const response = await postOptimization(body);
  assert.equal(response.status, 200);
  const result = await response.json() as {
    status: string;
    procurement: { status: string; solverStatus: string; unmetSupply: number };
  };
  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.procurement.status, 'INFEASIBLE');
  assert.equal(result.procurement.solverStatus, 'INFEASIBLE');
  assert.ok(result.procurement.unmetSupply > 0);
});

test('invalid request returns HTTP 400 with structured issues', async () => {
  const response = await postOptimization({
    ...requestBody(),
    supplyGap: { quantity: -1, unit: 'tonnes' },
  });

  assert.equal(response.status, 400);
  const body = await response.json() as {
    status: string;
    error: string;
    issues: Array<{ path: string; message: string }>;
  };
  assert.equal(body.status, 'ERROR');
  assert.equal(body.error, 'Invalid procurement request.');
  assert.ok(body.issues.some((issue) => issue.path === 'supplyGap.quantity'));
});

test('solver result is returned without exposing GLPK internals', async () => {
  const response = await postOptimization(requestBody());
  const body = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.ok(body.procurement);
  assert.equal('rawStatus' in body, false);
  assert.equal('rawStatus' in (body.procurement as Record<string, unknown>), false);
});
