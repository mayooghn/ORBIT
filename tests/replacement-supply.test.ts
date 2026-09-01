import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createApp } from '../server';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { RealScenarioProcurementDataProvider } from '../src/procurement';

const dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);
const realDataProvider = new RealScenarioProcurementDataProvider(repository);

let server: Server;
let baseUrl = '';

const pageSource = readFileSync(
  path.join(process.cwd(), 'src/pages/ReservesPage.tsx'),
  'utf8',
);

before(async () => {
  const app = createApp(repository, runtime, undefined, undefined, realDataProvider);
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

test('Replacement Supply backend API /api/procurement/optimize-gap returns valid optimal results', async () => {
  const response = await fetch(`${baseUrl}/api/procurement/optimize-gap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplyGap: 10000,
      disruptionDuration: 30,
    }),
  });

  assert.equal(response.status, 200);
  const result = await response.json() as any;

  assert.equal(result.status, 'OPTIMAL');
  assert.ok(result.procurement);
  assert.equal(result.procurement.status, 'OPTIMAL');
  assert.ok(result.procurement.totalProcured > 0);
  assert.equal(result.procurement.unmetSupply, 0);

  // Allocations should match the real database-backed network lanes
  assert.ok(result.procurement.allocations.length > 0);
  for (const allocation of result.procurement.allocations) {
    assert.ok(allocation.quantity >= 0);
    assert.ok(allocation.laneId);
    assert.ok(allocation.supplierId);
    assert.ok(allocation.routeId);
    if (allocation.transitTimeDays !== undefined) {
      assert.ok(allocation.transitTimeDays >= 0);
    }
  }
});

test('Replacement Supply API with Hormuz disruption returns modified allocations due to chokepoint blockages', async () => {
  const response = await fetch(`${baseUrl}/api/procurement/optimize-gap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplyGap: 25000,
      disruptionDuration: 30,
      affectedNodeId: 'chokepoint-strait-of-hormuz',
    }),
  });

  assert.equal(response.status, 200);
  const result = await response.json() as any;

  // The optimization should be solved (either feasible or infeasible depending on remaining capacities, but valid run)
  assert.ok(['OPTIMAL', 'INFEASIBLE'].includes(result.status));
  assert.ok(result.procurement);
  
  // Verify chokepoint routes are filtered or penalty is reflected in objective/allocations
  const allocations = result.procurement.allocations || [];
  const hormuzAllocations = allocations.filter((a: any) => a.routeId.includes('hormuz') && a.quantity > 0);
  // Should have zero positive allocations through blocked corridors
  assert.equal(hormuzAllocations.length, 0);
});

test('Replacement Supply API handles massive infeasible gaps gracefully without crashing', async () => {
  const response = await fetch(`${baseUrl}/api/procurement/optimize-gap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplyGap: 999999999, // Unreachable gap
      disruptionDuration: 30,
    }),
  });

  assert.equal(response.status, 200);
  const result = await response.json() as any;

  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.procurement.status, 'INFEASIBLE');
  assert.ok(result.procurement.unmetSupply > 0);
});

test('ReservesPage UI implementation contains required Replacement Supply elements', () => {
  // Check that the tab buttons and main sections are correct
  assert.match(pageSource, /Replacement Supply/);
  assert.match(pageSource, /mainTab === 'replacement'/);
  assert.match(pageSource, /fetchOptimizedReplacementSupply/);
  assert.match(pageSource, /Active Crisis Supply Gap/);
  assert.match(pageSource, /OPTIMAL PLAN FOUND/);
  assert.match(pageSource, /INFEASIBLE - INSUFFICIENT CAPACITY/);
  assert.match(pageSource, /Recommended Sourcing Corridor Allocations/);
  assert.match(pageSource, /Bilateral Reliability/);
  assert.match(pageSource, /Geopolitical Risk/);
  assert.match(pageSource, /Solver Constraint & Feasibility Audit/);
  assert.match(pageSource, /Recommendations Disclaimer/);
  assert.match(pageSource, /No actual purchase transaction is executed/);
});
