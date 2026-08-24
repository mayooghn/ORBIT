import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { createApp } from '../server';
import { openPhase2Database } from '../src/dataLayer/database';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';

const database = openPhase2Database({ dbPath: './Data/orbit.db' });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);
const sourceNode = runtime.stateEngine
  .getCurrentTwin()
  .nodes
  .find((node) => node.nodeType === 'supplier' && (node.currentFlow?.value || 0) > 0);

assert.ok(sourceNode);

let server: Server;
let baseUrl = '';

before(async () => {
  server = createServer(createApp(repository, runtime));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
  database.close();
});

const postReserveOptimization = async (body: unknown): Promise<Response> =>
  fetch(`${baseUrl}/api/reserves/optimize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('reserve API returns a deterministic optimization result', async () => {
  const response = await postReserveOptimization({
    currentReserve: 1000,
    demand: 800,
    supplyGap: 100,
    disruptionDuration: 5,
    alternativeProcurement: 25,
    replenishmentRate: 20,
    minimumReserveThreshold: 100,
  });
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    reserve: {
      effectiveGap: number;
      totalNeed: number;
      drawdownAmount: number;
      drawdownRate: number;
      remainingReserve: number;
      fullyCovered: boolean;
    };
  };
  assert.equal(body.status, 'AVAILABLE');
  assert.equal(body.reserve.effectiveGap, 75);
  assert.equal(body.reserve.totalNeed, 375);
  assert.equal(body.reserve.drawdownAmount, 375);
  assert.equal(body.reserve.drawdownRate, 75);
  assert.equal(body.reserve.remainingReserve, 625);
  assert.equal(body.reserve.fullyCovered, true);

  const persisted = database.prepare(`
    SELECT request_json, result_json
    FROM strategic_reserve_optimization_runs
    ORDER BY requested_at DESC
    LIMIT 1
  `).get() as { request_json?: string; result_json?: string } | undefined;
  assert.ok(persisted?.request_json);
  assert.ok(persisted?.result_json);
  assert.equal(JSON.parse(persisted.request_json).supplyGap, 100);
  assert.equal(JSON.parse(persisted.result_json).drawdownAmount, 375);
});

test('reserve API rejects invalid inputs', async () => {
  const response = await postReserveOptimization({
    currentReserve: -1,
    demand: 800,
    supplyGap: 100,
    disruptionDuration: 5,
    alternativeProcurement: 0,
    replenishmentRate: 20,
    minimumReserveThreshold: 100,
  });
  assert.equal(response.status, 400);
  const body = await response.json() as { status: string; issues: Array<{ path: string }> };
  assert.equal(body.status, 'ERROR');
  assert.ok(body.issues.some((issue) => issue.path === 'currentReserve'));
});

test('scenario simulation automatically includes reserve analysis when requested', async () => {
  const response = await fetch(`${baseUrl}/api/scenarios/simulate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventId: 'reserve-workflow-test',
      durationDays: 7,
      severity: 'HIGH',
      affectedNodeId: sourceNode.nodeId,
      capacityReductionPercent: 50,
      reserveAnalysis: {
        currentReserve: 1_000_000_000,
        demand: 500_000_000,
        replenishmentRate: 0,
        minimumReserveThreshold: 0,
      },
    }),
  });
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    scenario: { shortage: number; input: { durationDays: number } };
    reserveOptimization: {
      status: string;
      reserve: {
        effectiveGap: number;
        totalNeed: number;
        duration: number;
      };
    };
  };
  assert.equal(body.status, 'AVAILABLE');
  assert.equal(body.reserveOptimization.status, 'AVAILABLE');
  assert.equal(body.reserveOptimization.reserve.effectiveGap, body.scenario.shortage);
  assert.equal(
    body.reserveOptimization.reserve.totalNeed,
    body.scenario.shortage * body.scenario.input.durationDays,
  );
  assert.equal(body.reserveOptimization.reserve.duration, body.scenario.input.durationDays);
});
