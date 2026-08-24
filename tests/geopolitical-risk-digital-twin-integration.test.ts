import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test, { after, before } from 'node:test';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { DigitalTwinGraphModel } from '../src/digitalTwin/model';
import { DigitalTwinImpactAnalyzer } from '../src/digitalTwin/impact';
import { createDigitalTwinRuntime, type DigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { DigitalTwinStateEngine } from '../src/digitalTwin/state';
import { classifyGeopoliticalEvent } from '../src/geopoliticalEvents/classification';
import { GeopoliticalEventIngestionStore } from '../src/geopoliticalEvents/ingestion';
import { analyzeGeopoliticalSupplyChainRelevance } from '../src/geopoliticalEvents/relevance';
import { integrateGeopoliticalRiskWithDigitalTwin } from '../src/geopoliticalEvents/digitalTwinIntegration';
import { assessGeopoliticalRisk } from '../src/geopoliticalEvents/risk';

const processedDir = path.join(process.cwd(), 'data', 'processed');
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-geopolitical-integration-'));
const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
let runtime: DigitalTwinRuntime;

before(() => {
  let database = openPhase2Database({ dbPath: databasePath });
  importPhase2Data({ dbPath: databasePath, processedDir });
  database.close();
  database = openPhase2Database({ dbPath: databasePath });
  runtime = createDigitalTwinRuntime(new Phase2Repository(database));
  database.close();
});

after(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

const validEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  title: 'Maritime security incident',
  description: 'A documented maritime security incident affected commercial crude transit.',
  timestamp: '2026-08-21T12:00:00.000Z',
  source: 'Government bulletin',
  sourceUrl: 'https://example.gov/events/1',
  location: 'Arabian Sea',
  countriesInvolved: ['India', 'Oman'],
  category: 'maritime_disruption',
  severity: 'high',
  ...overrides,
});

const prepare = (overrides: Record<string, unknown> = {}) => {
  const event = new GeopoliticalEventIngestionStore().ingest(validEvent(overrides));
  const classification = classifyGeopoliticalEvent(event);
  const relevance = analyzeGeopoliticalSupplyChainRelevance(event, runtime.stateEngine.getCurrentTwin(), classification);
  const risk = assessGeopoliticalRisk(event, classification, relevance);
  const result = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, runtime);
  return { event, classification, relevance, risk, result };
};

test('relevant Hormuz event matches the Digital Twin and returns impact', () => {
  const { result } = prepare({ id: 'hormuz-integration-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  assert.equal(result.relevant, true);
  assert.ok(result.matchedNodeIds.includes('chokepoint-strait-of-hormuz'));
  assert.ok(result.impactReasons.some((reason) => reason.includes('chokepoint-strait-of-hormuz')));
});

test('relevant supplier event matches the existing supplier node', () => {
  const { result } = prepare({ id: 'supplier-integration-event', title: 'Saudi Arabia export restriction', description: 'A documented crude export restriction was announced.', location: undefined, countriesInvolved: ['Saudi Arabia'], category: 'trade_restriction' });
  assert.equal(result.relevant, true);
  assert.ok(result.matchedNodeIds.some((nodeId) => runtime.stateEngine.getCurrentTwin().nodes.find((node) => node.nodeId === nodeId)?.name === 'Saudi Arabia'));
});

test('port and refinery events match the correct existing entities', () => {
  const port = prepare({ id: 'port-integration-event', title: 'Disruption at Vadinar Terminal', location: 'Vadinar Terminal', countriesInvolved: ['India'] });
  const refinery = prepare({ id: 'refinery-integration-event', title: 'MRPL Mangalore refinery disruption', location: 'Mangalore', countriesInvolved: ['India'], category: 'infrastructure_disruption' });
  assert.ok(port.result.matchedNodeIds.includes('port-port-42e3af128436239dad1c'));
  assert.ok(refinery.result.matchedNodeIds.includes('refinery-refinery-2e0d4ad0d99de43e1e73'));
});

test('impact propagates through existing Digital Twin edges', () => {
  const { result } = prepare({ id: 'propagation-integration-event', title: 'Saudi Arabia export restriction', description: 'A documented crude export restriction was announced.', location: undefined, countriesInvolved: ['Saudi Arabia'], category: 'trade_restriction' });
  assert.ok(result.affectedEdgeIds.includes('relationship-supplier-saudi-arabia-hormuz-route'));
  assert.ok(result.affectedNodeIds.includes('chokepoint-strait-of-hormuz'));
  assert.ok(result.affectedNodeIds.includes('shipping-route-hormuz-india'));
  assert.ok(result.affectedFlow.nodeTotals.some((measurement) => measurement.value === 6880000 && measurement.unit === 'barrels_per_day'));
  assert.ok(result.impactReasons.some((reason) => reason.includes('relationship-supplier-saudi-arabia-hormuz-route')));
});

test('multiple matched nodes are combined with deduplicated impact', () => {
  const { result } = prepare({ id: 'multiple-integration-event', title: 'Mangalore energy disruption', description: 'A disruption affected Mangalore energy infrastructure.', location: 'Mangalore', countriesInvolved: ['India'], category: 'infrastructure_disruption' });
  assert.ok(result.matchedNodeIds.length > 1);
  assert.equal(new Set(result.affectedNodeIds).size, result.affectedNodeIds.length);
  assert.equal(new Set(result.affectedEdgeIds).size, result.affectedEdgeIds.length);
  assert.ok(result.impactReasons.some((reason) => reason.includes('deduplicated')));
});

test('irrelevant events produce no Digital Twin impact', () => {
  const { result } = prepare({ id: 'irrelevant-integration-event', title: 'Cultural cooperation agreement', description: 'Officials signed a cultural cooperation agreement.', location: 'Liechtenstein', countriesInvolved: ['Liechtenstein', 'Andorra'], category: 'diplomatic_escalation', severity: 'critical' });
  assert.equal(result.relevant, false);
  assert.deepEqual(result.affectedNodeIds, []);
  assert.deepEqual(result.affectedEdgeIds, []);
  assert.deepEqual(result.affectedCapacity, { nodeTotals: [], edgeTotals: [] });
  assert.deepEqual(result.affectedFlow, { nodeTotals: [], edgeTotals: [] });
});

test('integration leaves the baseline Digital Twin unchanged', () => {
  const before = JSON.stringify(runtime.stateEngine.getCurrentTwin());
  prepare({ id: 'immutable-integration-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  assert.equal(JSON.stringify(runtime.stateEngine.getCurrentTwin()), before);
});

test('risk level and score are preserved exactly', () => {
  const { risk, result } = prepare({ id: 'risk-preservation-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'], severity: 'critical' });
  assert.equal(result.riskLevel, risk.riskLevel);
  assert.equal(result.riskScore, risk.riskScore);
});

test('missing capacity and flow remain unavailable', () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: 'isolated-chokepoint', nodeType: 'chokepoint', name: 'Test Chokepoint', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  const stateEngine = new DigitalTwinStateEngine(model.snapshot());
  const miniRuntime: DigitalTwinRuntime = { stateEngine, impactAnalyzer: new DigitalTwinImpactAnalyzer(stateEngine) };
  const event = new GeopoliticalEventIngestionStore().ingest(validEvent({ id: 'missing-measurements-event', title: 'Test Chokepoint disruption', location: 'Test Chokepoint', countriesInvolved: ['India'], severity: 'high' }));
  const classification = classifyGeopoliticalEvent(event);
  const relevance = analyzeGeopoliticalSupplyChainRelevance(event, stateEngine.getCurrentTwin(), classification);
  const risk = assessGeopoliticalRisk(event, classification, relevance);
  const result = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, miniRuntime);
  assert.deepEqual(result.affectedCapacity, { nodeTotals: [], edgeTotals: [] });
  assert.deepEqual(result.affectedFlow, { nodeTotals: [], edgeTotals: [] });
});

test('repeated integration is deterministic', () => {
  const { classification, relevance, risk } = prepare({ id: 'deterministic-integration-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  const first = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, runtime);
  const second = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, runtime);
  assert.deepEqual(second, first);
});

test('integration rejects a matched node that is absent from the graph', () => {
  const { classification, relevance, risk } = prepare({ id: 'invalid-node-integration-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  assert.throws(() => integrateGeopoliticalRiskWithDigitalTwin(
    classification,
    { ...relevance, matchedNodeIds: ['missing-node'] },
    { ...risk, matchedNodeIds: ['missing-node'] },
    runtime,
  ), /Digital Twin node not found/);
});
