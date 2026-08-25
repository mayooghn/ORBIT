import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import {
  RealScenarioProcurementDataProvider,
  DemoScenarioProcurementDataProvider,
  buildProcurementRequestFromScenario,
  optimizeProcurement,
  EiaPriceService,
} from '../src/procurement';
import { createApp } from '../server';
import { ScenarioEngine } from '../src/scenarios/scenario-engine';
import { SqliteScenarioBaselineProvider } from '../src/scenarios/sqlite-baseline-provider';
import type { ScenarioInput } from '../src/scenarios/model';

const dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);
const scenarioEngine = new ScenarioEngine(
  new SqliteScenarioBaselineProvider(repository),
);

test('EiaPriceService returns structured benchmark economics', () => {
  const eiaService = new EiaPriceService();
  const saudiEconomics = eiaService.getSupplierEconomics('Saudi Arabia');

  assert.equal(saudiEconomics.countryName, 'Saudi Arabia');
  assert.match(saudiEconomics.benchmarkName, /Arab Light/i);
  assert.ok(saudiEconomics.basePriceUsdPerTonne > 0);
  assert.ok(saudiEconomics.freightCostUsdPerTonne > 0);
  assert.equal(
    saudiEconomics.totalCostUsdPerTonne,
    Math.round((saudiEconomics.basePriceUsdPerTonne + saudiEconomics.freightCostUsdPerTonne) * 100) / 100,
  );
  assert.ok(saudiEconomics.transitDistanceNm > 0);
  assert.ok(saudiEconomics.standardTransitDays >= 3);
  assert.ok(saudiEconomics.riskScore >= 0 && saudiEconomics.riskScore <= 100);
  assert.ok(saudiEconomics.reliabilityScore > 0 && saudiEconomics.reliabilityScore <= 1.0);

  const transitDays = eiaService.calculateTransitDays(1450, 13.0);
  assert.ok(transitDays >= 4 && transitDays <= 7);
});

test('RealScenarioProcurementDataProvider resolves real Phase 2 suppliers and routes', () => {
  const provider = new RealScenarioProcurementDataProvider(repository);
  const saudiNode = runtime.stateEngine
    .getCurrentTwin()
    .nodes
    .find((n) => n.nodeType === 'supplier' && n.name.toLowerCase().includes('saudi'));

  assert.ok(saudiNode, 'Saudi supplier node exists');

  const scenario = scenarioEngine.run(runtime.stateEngine, {
    eventId: 'saudi-disruption-test',
    durationDays: 14,
    severity: 'HIGH',
    affectedNodeId: saudiNode.nodeId,
    capacityReductionPercent: 50,
  });

  const resolution = provider.resolve({
    scenario,
    graph: runtime.stateEngine.getCurrentTwin(),
  });

  assert.equal(resolution.status, 'AVAILABLE');
  if (resolution.status === 'AVAILABLE') {
    assert.match(resolution.data.source, /Real Procurement Data Layer/i);
    assert.ok(resolution.data.suppliers.length > 0, 'Suppliers list is populated');
    assert.ok(resolution.data.routes.length > 0, 'Routes list is populated');
    assert.ok(resolution.data.lanes.length > 0, 'Lanes list is populated');

    // Excluded supplier check: Saudi Arabia must not be in alternative suppliers
    const hasExcludedSupplier = resolution.data.suppliers.some((s) =>
      s.name.toLowerCase().includes('saudi'),
    );
    assert.equal(hasExcludedSupplier, false, 'Affected supplier is excluded from alternatives');

    // Every supplier carries explicit physical unit
    for (const s of resolution.data.suppliers) {
      assert.equal(s.capacityUnit, scenario.shortageUnit);
      assert.ok(s.capacity > 0);
    }

    // Every route carries explicit physical unit
    for (const r of resolution.data.routes) {
      assert.equal(r.capacityUnit, scenario.shortageUnit);
      assert.ok(r.capacity > 0);
    }

    // Every lane carries verified cost and transit time
    for (const lane of resolution.data.lanes) {
      assert.equal(lane.compatible, true);
      assert.ok(lane.procurementCostPerUnit > 0);
      assert.equal(lane.procurementCostUnit, 'USD_per_tonne');
      assert.ok(lane.transitTimeDays >= 1);
      assert.ok(lane.riskScore >= 1 && lane.riskScore <= 100);
      assert.ok(lane.reliabilityScore > 0 && lane.reliabilityScore <= 1);
    }
  }
});

test('RealScenarioProcurementDataProvider returns structured UNAVAILABLE for unverified unit', () => {
  const provider = new RealScenarioProcurementDataProvider(repository);
  const unverifiedScenario = {
    ...scenarioEngine.run(runtime.stateEngine, {
      eventId: 'test-event',
      durationDays: 7,
      severity: 'LOW',
      affectedNodeId: 'port-port-251a9f32cbcedd0b8e47',
      capacityReductionPercent: 10,
    }),
    shortageUnit: 'unavailable',
  };

  const resolution = provider.resolve({
    scenario: unverifiedScenario,
    graph: runtime.stateEngine.getCurrentTwin(),
  });

  assert.equal(resolution.status, 'UNAVAILABLE');
  if (resolution.status === 'UNAVAILABLE') {
    assert.match(resolution.reason, /unverified/i);
    assert.match(resolution.source, /Real Procurement Data Provider/i);
  }
});

test('buildProcurementRequestFromScenario constructs valid GLPK request from Real provider', async () => {
  const provider = new RealScenarioProcurementDataProvider(repository);
  const iraqNode = runtime.stateEngine
    .getCurrentTwin()
    .nodes
    .find((n) => n.nodeType === 'supplier' && n.name.toLowerCase().includes('iraq'));

  assert.ok(iraqNode);

  const scenario = scenarioEngine.run(runtime.stateEngine, {
    eventId: 'iraq-supply-disruption-test',
    durationDays: 14,
    severity: 'MEDIUM',
    affectedNodeId: iraqNode.nodeId,
    capacityReductionPercent: 30,
  });

  const resolution = buildProcurementRequestFromScenario(
    scenario,
    runtime.stateEngine.getCurrentTwin(),
    provider,
  );

  assert.equal(resolution.status, 'AVAILABLE');
  assert.ok(resolution.request);

  if (resolution.request) {
    const result = await optimizeProcurement(resolution.request);
    assert.ok(
      result.status === 'OPTIMAL' || result.status === 'INFEASIBLE',
      `Optimization returned ${result.status}`,
    );
    if (result.status === 'OPTIMAL') {
      assert.ok(result.totalProcured > 0);
      assert.ok(result.totalCost > 0);
      assert.ok(result.supplierAllocations.length > 0);
      assert.ok(result.routeAllocations.length > 0);
    }
  }
});

let server: Server;
let baseUrl = '';

before(async () => {
  const app = createApp(repository, runtime);
  server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('POST /api/scenarios/procurement uses Real provider by default', async () => {
  const sourceNode = runtime.stateEngine
    .getCurrentTwin()
    .nodes
    .find((n) => n.nodeType === 'supplier');

  assert.ok(sourceNode);

  const response = await fetch(`${baseUrl}/api/scenarios/procurement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: 'api-real-procurement-test',
      durationDays: 14,
      severity: 'HIGH',
      affectedNodeId: sourceNode.nodeId,
      capacityReductionPercent: 40,
    }),
  });

  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    status: string;
    source?: string;
    procurement?: { status: string; totalProcured: number };
  };

  assert.ok(data.status === 'OPTIMAL' || data.status === 'INFEASIBLE');
  assert.match(data.source || '', /Real Procurement Data/i);
});

test('POST /api/scenarios/procurement?dataSource=demo uses Demo provider', async () => {
  const sourceNode = runtime.stateEngine
    .getCurrentTwin()
    .nodes
    .find((n) => n.nodeType === 'supplier');

  assert.ok(sourceNode);

  const response = await fetch(`${baseUrl}/api/scenarios/procurement?dataSource=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: 'api-demo-procurement-test',
      durationDays: 7,
      severity: 'HIGH',
      affectedNodeId: sourceNode.nodeId,
      capacityReductionPercent: 50,
    }),
  });

  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    status: string;
    source?: string;
  };

  assert.equal(data.status, 'OPTIMAL');
  assert.match(data.source || '', /Demo procurement data/i);
});
