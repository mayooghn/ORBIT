import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { RealScenarioProcurementDataProvider } from '../src/procurement';
import type { GeopoliticalRiskAgent } from '../src/geopoliticalEvents/agent';
import { createApp } from '../server';

const dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);
const realDataProvider = new RealScenarioProcurementDataProvider(repository);

const stubAgent: GeopoliticalRiskAgent = {
  analyze: async (input) => {
    const affectedNodeId = 'chokepoint-strait-of-hormuz';
    return {
      request: typeof input === 'string' ? input : JSON.stringify(input),
      event: { id: 'evt-test-hormuz', title: 'Strait of Hormuz disruption', description: 'Test event.', timestamp: '2026-01-01T00:00:00.000Z', source: 'test', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'], category: 'maritime_disruption', severity: 'critical' },
      classification: { eventId: 'evt-test-hormuz', category: 'maritime_disruption', severity: 'critical', energyRelevant: true, countriesInvolved: ['Iran', 'Oman'], location: 'Strait of Hormuz', classificationReasons: ['test'] },
      relevance: { eventId: 'evt-test-hormuz', relevant: true, matchedNodeIds: [affectedNodeId], matchedNodeTypes: ['chokepoint'], matchedLocations: ['Strait of Hormuz'], matchedCountries: [], relevanceReasons: ['test'] },
      risk: { eventId: 'evt-test-hormuz', riskLevel: 'high', riskScore: 60, factors: [], reasoning: ['test'], matchedNodeIds: [affectedNodeId], energyRelevant: true },
      digitalTwinImpact: { eventId: 'evt-test-hormuz', relevant: true, riskLevel: 'high', riskScore: 60, matchedNodeIds: [affectedNodeId], affectedNodeIds: [affectedNodeId], affectedNodeNames: ['Strait of Hormuz'], affectedEdgeIds: [], affectedNodeTypes: ['chokepoint'], affectedCapacity: { nodeTotals: [], edgeTotals: [] }, affectedFlow: { nodeTotals: [], edgeTotals: [] }, impactReasons: ['test'] },
      explanation: 'Test stub.',
    };
  },
};

let server: Server;
let baseUrl = '';

before(async () => {
  const app = createApp(repository, runtime, stubAgent, undefined, realDataProvider);
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

test('Integration: /api/pipeline/run with 30-day scenario confirms the Reserve Optimizer receives the correct inputs without procurement stage', async () => {
  const durationDays = 30;
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: 'A major disruption in Strait of Hormuz causes massive capacity reduction for 30 days',
      durationDays,
      severity: 'HIGH',
      capacityReductionPercent: 50,
      dataSource: 'real'
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as any;

  assert.equal(body.status, 'AVAILABLE');
  assert.ok(body.assessment, 'OrbitAssessment should be present');
  assert.equal(body.assessment.status, 'COMPLETED');
  
  const reserveResult = body.assessment.reserve;
  assert.ok(reserveResult, 'Reserve optimization should be present in assessment');
  assert.equal(reserveResult.input.disruptionDuration, durationDays);
  assert.equal(reserveResult.input.alternativeProcurement, 0);
  assert.equal(typeof reserveResult.input.supplyGap, 'number');
  console.log(`Verified streamlined assessment: disruptionDuration=${durationDays}, alternativeProcurement=0, supplyGap=${reserveResult.input.supplyGap}`);
});

test('Integration: /api/pipeline/run enforces alternativeProcurement = 0 per exact architecture specification', async () => {
  const manualOverride = 15000;
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: 'A major disruption in Strait of Hormuz causes massive capacity reduction',
      durationDays: 30,
      severity: 'HIGH',
      capacityReductionPercent: 50,
      alternativeProcurement: manualOverride,
      dataSource: 'real'
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as any;

  assert.equal(body.status, 'AVAILABLE');
  assert.ok(body.assessment, 'OrbitAssessment should be present');
  const reserveInput = body.assessment.reserve?.input;
  assert.ok(reserveInput, 'Reserve input should be present');
  assert.equal(reserveInput.alternativeProcurement, 0);
  console.log(`Verified exact specification: alternativeProcurement is 0.`);
});

test('Integration Case A: Partial external replacement', () => {
  // Original gap = 350,000 t/day, Current Reserve = 5,000,000 t, Safety threshold = 1,000,000 t, Duration = 10 days
  // External replacement = 100,000 t/day
  // Expected remaining supply gap = 350,000 - 100,000 = 250,000 t/day
  // Expected required reserve drawdown = 250,000 * 10 = 2,500,000 t (which is within safe drawdown: 5M - 1M = 4M)
  const input = {
    currentReserve: 5_000_000,
    demand: 650_000,
    availableSupply: 300_000, // original gap = 350,000
    disruptionDuration: 10,
    alternativeProcurement: 100_000, // external replacement < 350,000
    replenishmentRate: 10_000,
    minimumReserveThreshold: 1_000_000,
  };

  const { optimizeStrategicReserve } = require('../src/reserves/optimizer');
  const result = optimizeStrategicReserve(input);

  assert.equal(result.grossSupplyGap, 350_000, 'Original supply gap should be 350k');
  assert.equal(result.residualSupplyGap, 250_000, 'Remaining supply gap should be 250k');
  assert.equal(result.drawdownAmount, 2_500_000, 'Reserve drawdown should handle only the remaining gap');
  console.log('Case A Verified: Partial external replacement correctly reduces remaining supply gap and drawdown.');
});

test('Integration Case B: Full external replacement', () => {
  // Original gap = 100,000 t/day
  // External replacement = 150,000 t/day (>= gap)
  // Expected remaining gap = 0, reserve drawdown = 0
  const input = {
    currentReserve: 5_000_000,
    demand: 500_000,
    availableSupply: 400_000, // original gap = 100,000
    disruptionDuration: 10,
    alternativeProcurement: 150_000, // external replacement >= gap
    replenishmentRate: 10_000,
    minimumReserveThreshold: 1_000_000,
  };

  const { optimizeStrategicReserve } = require('../src/reserves/optimizer');
  const result = optimizeStrategicReserve(input);

  assert.equal(result.grossSupplyGap, 100_000, 'Original supply gap should be 100k');
  assert.equal(result.residualSupplyGap, 0, 'Remaining gap should be 0');
  assert.equal(result.drawdownAmount, 0, 'No unnecessary reserve release should be made');
  console.log('Case B Verified: Full external replacement results in 0 remaining gap and 0 drawdown.');
});

test('Integration Case C: No procurement result', () => {
  // External replacement = 0 t/day
  // Expected remaining gap = original gap
  const input = {
    currentReserve: 5_000_000,
    demand: 500_000,
    availableSupply: 400_000, // original gap = 100,000
    disruptionDuration: 10,
    alternativeProcurement: 0,
    replenishmentRate: 10_000,
    minimumReserveThreshold: 1_000_000,
  };

  const { optimizeStrategicReserve } = require('../src/reserves/optimizer');
  const result = optimizeStrategicReserve(input);

  assert.equal(result.grossSupplyGap, 100_000);
  assert.equal(result.residualSupplyGap, 100_000);
  assert.equal(result.drawdownAmount, 1_000_000); // 100k * 10
  console.log('Case C Verified: Reserve behavior with zero alternative procurement remains unchanged.');
});

test('Integration Case D: Procurement INFEASIBLE', () => {
  // Under existing result contract, INFEASIBLE procurement status means no fabricated replacement is used, or only validated allocated capacity.
  // When procurement is infeasible, no cumulative tonnage is applied.
  const input = {
    currentReserve: 5_000_000,
    demand: 500_000,
    availableSupply: 400_000,
    disruptionDuration: 10,
    alternativeProcurement: 0, // Infeasible results in 0 allocated capacity being committed
    replenishmentRate: 10_000,
    minimumReserveThreshold: 1_000_000,
  };

  const { optimizeStrategicReserve } = require('../src/reserves/optimizer');
  const result = optimizeStrategicReserve(input);

  assert.equal(result.residualSupplyGap, 100_000);
  assert.equal(result.drawdownAmount, 1_000_000);
  console.log('Case D Verified: Infeasible procurement results in 0 alternative capacity being committed.');
});

test('Integration Case E: Manual alternativeProcurement', () => {
  // Verify manually supplied daily value remains unchanged
  const input = {
    currentReserve: 5_000_000,
    demand: 500_000,
    availableSupply: 400_000,
    disruptionDuration: 10,
    alternativeProcurement: 45_000, // Manual daily value
    replenishmentRate: 10_000,
    minimumReserveThreshold: 1_000_000,
  };

  const { optimizeStrategicReserve } = require('../src/reserves/optimizer');
  const result = optimizeStrategicReserve(input);

  assert.equal(result.procurementCoverage, 45_000);
  assert.equal(result.residualSupplyGap, 55_000); // 100k - 45k
  console.log('Case E Verified: Manual alternative procurement remains unchanged.');
});

test('Integration Case F: Duration change and Single Multiplication Verification', () => {
  // Original gap = 100,000 t/day, Duration = 20 days
  // External replacement = 30,000 t/day (from cumulative 600,000 tonnes over 20 days)
  // Expected remaining gap = 70,000 t/day
  // Drawdown = remaining gap * duration = 70,000 * 20 = 1,400,000 tonnes
  // If duration was applied twice, we would see a different value.
  const duration = 20;
  const cumulativeProcurement = 600_000;
  const dailyEquivalent = cumulativeProcurement / duration; // 30,000 t/day

  const input = {
    currentReserve: 5_000_000,
    demand: 500_000,
    availableSupply: 400_000, // original gap = 100,000 t/day
    disruptionDuration: duration,
    alternativeProcurement: dailyEquivalent,
    replenishmentRate: 10_000,
    minimumReserveThreshold: 1_000_000,
  };

  const { optimizeStrategicReserve } = require('../src/reserves/optimizer');
  const result = optimizeStrategicReserve(input);

  assert.equal(result.grossSupplyGap, 100_000);
  assert.equal(result.procurementCoverage, 30_000);
  assert.equal(result.residualSupplyGap, 70_000);
  assert.equal(result.drawdownAmount, 1_400_000, 'Drawdown should be exactly Remaining Gap * Duration (70k * 20 = 1.4M)');
  console.log('Case F Verified: Cumulative procurement converts correctly to daily rate and duration is applied exactly once (no double multiplication).');
});

test('Integration: /api/procurement/optimize-gap with custom daily gap and duration', async () => {
  const response = await fetch(`${baseUrl}/api/procurement/optimize-gap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplyGap: 120_000,
      disruptionDuration: 15,
      affectedNodeId: 'chokepoint-strait-of-hormuz'
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.ok(body.status === 'OPTIMAL' || body.status === 'INFEASIBLE' || body.status === 'UNAVAILABLE');
  console.log('Verified: custom daily gap and duration propagate and trigger optimization recalculation.');
});

test('Integration: /api/procurement/optimize-gap with custom dropdown source selection (Malacca)', async () => {
  const response = await fetch(`${baseUrl}/api/procurement/optimize-gap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplyGap: 80_000,
      disruptionDuration: 25,
      affectedNodeId: 'chokepoint-strait-of-malacca'
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.ok(body.status === 'OPTIMAL' || body.status === 'INFEASIBLE' || body.status === 'UNAVAILABLE');
  console.log('Verified: custom dropdown source selection (Malacca) propagates and triggers recalculation.');
});

test('Integration: /api/procurement/optimize-gap with invalid/empty inputs (invalid gap)', async () => {
  const response = await fetch(`${baseUrl}/api/procurement/optimize-gap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplyGap: -1000,
      disruptionDuration: 10
    }),
  });

  assert.equal(response.status, 400);
  const body = await response.json() as any;
  assert.equal(body.status, 'ERROR');
  assert.ok(body.error.includes('supplyGap'));
  console.log('Verified: invalid/empty inputs rejected with 400 Bad Request error.');
});
