import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import {
  buildProcurementRequestFromScenario,
  SqliteScenarioProcurementDataProvider,
  type ScenarioProcurementDataProvider,
} from '../src/procurement';
import { createApp } from '../server';
import { ScenarioEngine } from '../src/scenarios/scenario-engine';
import { SqliteScenarioBaselineProvider } from '../src/scenarios/sqlite-baseline-provider';
import type { ScenarioInput, ScenarioResult } from '../src/scenarios/model';

const dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);
const scenarioEngine = new ScenarioEngine(
  new SqliteScenarioBaselineProvider(repository),
);
const sourceNode = runtime.stateEngine
  .getCurrentTwin()
  .nodes
  .find(
    (node) =>
      node.nodeType === 'supplier' &&
      (node.currentFlow?.value || 0) > 0,
  );

assert.ok(sourceNode);

const scenarioInput: ScenarioInput = {
  eventId: 'scenario-procurement-integration',
  durationDays: 7,
  severity: 'HIGH',
  affectedNodeId: sourceNode.nodeId,
  capacityReductionPercent: 50,
};

let capacityMultiplier = 1;

const fixtureProvider: ScenarioProcurementDataProvider = {
  resolve: ({ scenario }) => {
    const capacity = scenario.shortage * capacityMultiplier;

    return {
      status: 'AVAILABLE',
      data: {
        source: 'test fixture: explicit scenario procurement lanes',
        suppliers: [
          {
            supplierId: 'fixture-supplier',
            name: 'Fixture Supplier',
            capacity,
            capacityUnit: scenario.shortageUnit,
          },
        ],
        routes: [
          {
            routeId: 'fixture-route',
            name: 'Fixture Route',
            capacity,
            capacityUnit: scenario.shortageUnit,
          },
        ],
        lanes: [
          {
            laneId: 'fixture-lane',
            supplierId: 'fixture-supplier',
            routeId: 'fixture-route',
            compatible: true,
            procurementCostPerUnit: 1,
            procurementCostUnit: 'test_cost_per_unit',
            transitTimeDays: 2,
            riskScore: 10,
            reliabilityScore: 0.95,
          },
        ],
      },
    };
  },
};

let server: Server;
let baseUrl = '';

before(async () => {
  const app = createApp(
    repository,
    runtime,
    undefined,
    undefined,
    fixtureProvider,
  );
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not bind to a TCP port.');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
  database.close();
});

const postScenarioProcurement = async (
  body: unknown,
): Promise<Response> =>
  fetch(`${baseUrl}/api/scenarios/procurement`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('existing scenario supply gap is converted into a ProcurementRequest', () => {
  const scenario = scenarioEngine.run(
    runtime.stateEngine,
    scenarioInput,
  );
  const resolution = buildProcurementRequestFromScenario(
    scenario,
    runtime.stateEngine.getCurrentTwin(),
    fixtureProvider,
  );

  assert.ok(scenario.shortage > 0);
  assert.equal(resolution.status, 'AVAILABLE');
  assert.ok(resolution.request);
  assert.equal(resolution.request.supplyGap.quantity, scenario.shortage);
  assert.equal(resolution.request.supplyGap.unit, scenario.shortageUnit);
  assert.equal(resolution.request.suppliers.length, 1);
  assert.equal(resolution.request.routes.length, 1);
  assert.equal(resolution.request.lanes.length, 1);
});

test('existing scenario simulation remains unchanged', async () => {
  const response = await fetch(`${baseUrl}/api/scenarios/simulate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(scenarioInput),
  });
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    scenario: ScenarioResult;
  };
  assert.equal(body.status, 'AVAILABLE');
  assert.ok(body.scenario.supplyLoss > 0);
  assert.equal(body.scenario.input.affectedNodeId, scenarioInput.affectedNodeId);
});

test('scenario procurement returns an optimal replacement plan', async () => {
  capacityMultiplier = 1;
  const response = await postScenarioProcurement(scenarioInput);
  assert.notEqual(response.status, 404);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    scenario: ScenarioResult;
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
  assert.equal(body.procurement.totalProcured, body.scenario.shortage);
  assert.equal(body.procurement.unmetSupply, 0);
  assert.equal(body.procurement.constraintValidation.valid, true);
});

test('demo scenario procurement uses the real optimizer with explicitly labeled fixture data', async () => {
  const response = await fetch(`${baseUrl}/api/scenarios/procurement?dataSource=demo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(scenarioInput),
  });
  assert.notEqual(response.status, 404);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    source: string;
    procurement: { status: string; solverStatus: string; allocations: Array<{ quantity: number }> };
  };
  assert.equal(body.status, 'OPTIMAL');
  assert.equal(body.procurement.status, 'OPTIMAL');
  assert.equal(body.procurement.solverStatus, 'OPTIMAL');
  assert.match(body.source, /Demo procurement data/);
  assert.ok(body.procurement.allocations.some((allocation) => allocation.quantity > 0));
});

test('scenario procurement returns INFEASIBLE when verified lane capacity is insufficient', async () => {
  capacityMultiplier = 0.5;
  const response = await postScenarioProcurement(scenarioInput);
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    procurement: {
      status: string;
      solverStatus: string;
      unmetSupply: number;
    };
  };
  assert.equal(body.status, 'INFEASIBLE');
  assert.equal(body.procurement.status, 'INFEASIBLE');
  assert.equal(body.procurement.solverStatus, 'INFEASIBLE');
  assert.ok(body.procurement.unmetSupply > 0);
});

test('SQLite provider does not fabricate a scenario procurement network', () => {
  const scenario = scenarioEngine.run(
    runtime.stateEngine,
    scenarioInput,
  );
  const resolution = buildProcurementRequestFromScenario(
    scenario,
    runtime.stateEngine.getCurrentTwin(),
    new SqliteScenarioProcurementDataProvider(repository),
  );

  assert.equal(resolution.status, 'UNAVAILABLE');
  assert.equal(resolution.request, undefined);
  assert.match(resolution.reason || '', /route capacity/i);
});

test('scenario procurement rejects invalid scenario input with a structured error', async () => {
  const response = await postScenarioProcurement({
    ...scenarioInput,
    durationDays: 0,
  });
  assert.equal(response.status, 400);
  const body = await response.json() as { status: string; error: string };
  assert.equal(body.status, 'ERROR');
  assert.match(body.error, /durationDays/);
});
