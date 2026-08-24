import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { tmpdir } from 'node:os';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { buildDigitalTwinFromPhase2 } from '../src/digitalTwin/fromPhase2';
import { classifyGeopoliticalEvent } from '../src/geopoliticalEvents/classification';
import { GeopoliticalEventIngestionStore } from '../src/geopoliticalEvents/ingestion';
import { analyzeGeopoliticalSupplyChainRelevance, GeopoliticalSupplyChainRelevanceAnalyzer } from '../src/geopoliticalEvents/relevance';

const processedDir = path.join(process.cwd(), 'data', 'processed');
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-geopolitical-relevance-'));
const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
let graph: ReturnType<typeof buildDigitalTwinFromPhase2>['snapshot'] extends () => infer Snapshot ? Snapshot : never;

before(() => {
  let database = openPhase2Database({ dbPath: databasePath });
  importPhase2Data({ dbPath: databasePath, processedDir });
  database.close();
  database = openPhase2Database({ dbPath: databasePath });
  graph = buildDigitalTwinFromPhase2(new Phase2Repository(database)).snapshot();
  database.close();
});

after(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

const validEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  title: 'Maritime security incident',
  description: 'A documented maritime security incident affected commercial transit.',
  timestamp: '2026-08-21T12:00:00.000Z',
  source: 'Government bulletin',
  sourceUrl: 'https://example.gov/events/1',
  location: 'Arabian Sea',
  countriesInvolved: ['India', 'Oman'],
  category: 'maritime_disruption',
  severity: 'high',
  ...overrides,
});

const ingestAndClassify = (overrides: Record<string, unknown> = {}) => {
  const event = new GeopoliticalEventIngestionStore().ingest(validEvent(overrides));
  return { event, classification: classifyGeopoliticalEvent(event) };
};

test('Hormuz event matches the existing chokepoint', () => {
  const { event, classification } = ingestAndClassify({ id: 'hormuz-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.equal(result.relevant, true);
  assert.ok(result.matchedNodeIds.includes('chokepoint-strait-of-hormuz'));
  assert.ok(result.matchedLocations.includes('Strait of Hormuz'));
});

test('maritime disruption matches existing Hormuz routes and chokepoint', () => {
  const { event, classification } = ingestAndClassify({ id: 'route-event', title: 'Hormuz maritime disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.includes('shipping-route-persian-gulf-hormuz-arabian-sea'));
  assert.ok(result.matchedNodeIds.includes('shipping-route-hormuz-india'));
  assert.ok(result.matchedNodeIds.includes('chokepoint-strait-of-hormuz'));
});

test('port event matches Vadinar Terminal', () => {
  const { event, classification } = ingestAndClassify({ id: 'port-event', title: 'Disruption at Vadinar Terminal', location: 'Vadinar Terminal', countriesInvolved: ['India'] });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.includes('port-port-42e3af128436239dad1c'));
  assert.ok(result.matchedNodeTypes.includes('port'));
});

test('refinery event matches MRPL Mangalore', () => {
  const { event, classification } = ingestAndClassify({ id: 'refinery-event', title: 'MRPL Mangalore refinery disruption', location: 'Mangalore', countriesInvolved: ['India'], category: 'infrastructure_disruption' });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.includes('refinery-refinery-2e0d4ad0d99de43e1e73'));
  assert.ok(result.matchedNodeTypes.includes('refinery'));
});

test('strategic reserve event matches ISPRL Mangalore', () => {
  const { event, classification } = ingestAndClassify({ id: 'reserve-event', title: 'ISPRL Mangalore Strategic Reserve disruption', location: 'Mangalore', countriesInvolved: ['India'], category: 'infrastructure_disruption' });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.includes('strategic-reserve-isprl-mangalore'));
  assert.ok(result.matchedNodeTypes.includes('strategic_reserve'));
});

test('country matching finds the existing Saudi Arabia supplier', () => {
  const { event, classification } = ingestAndClassify({ id: 'country-event', title: 'Saudi Arabia export restriction', description: 'A documented crude export restriction was announced.', location: undefined, countriesInvolved: ['Saudi Arabia'], category: 'trade_restriction' });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.some((nodeId) => graph.nodes.find((node) => node.nodeId === nodeId)?.name === 'Saudi Arabia'));
  assert.ok(result.matchedCountries.includes('Saudi Arabia'));
});

test('unrelated event returns irrelevant', () => {
  const { event, classification } = ingestAndClassify({ id: 'unrelated-event', title: 'Cultural cooperation agreement', description: 'Officials signed a cultural cooperation agreement.', location: 'Liechtenstein', countriesInvolved: ['Liechtenstein', 'Andorra'], category: 'diplomatic_escalation' });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.equal(result.relevant, false);
  assert.deepEqual(result.matchedNodeIds, []);
});

test('one event can match multiple existing entities', () => {
  const { event, classification } = ingestAndClassify({ id: 'multi-event', title: 'Mangalore energy disruption', description: 'A disruption affected Mangalore energy infrastructure.', location: 'Mangalore', countriesInvolved: ['India'], category: 'infrastructure_disruption' });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.includes('strategic-reserve-isprl-mangalore'));
  assert.ok(result.matchedNodeIds.includes('refinery-refinery-2e0d4ad0d99de43e1e73'));
  assert.ok(result.matchedNodeIds.length > 1);
});

test('matching is case-insensitive and punctuation-normalized', () => {
  const { event, classification } = ingestAndClassify({ id: 'normalized-event', title: 'STRAIT-OF-HORMUZ disruption', location: 'strait-of-hormuz', countriesInvolved: ['Iran', 'Oman'] });
  const result = analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.ok(result.matchedNodeIds.includes('chokepoint-strait-of-hormuz'));
});

test('relevance reasons explain matching and existing relationships', () => {
  const { event, classification } = ingestAndClassify({ id: 'reason-event', title: 'Disruption at Vadinar Terminal', location: 'Vadinar Terminal', countriesInvolved: ['India'] });
  const result = new GeopoliticalSupplyChainRelevanceAnalyzer(graph).analyze(event, classification);
  assert.ok(result.relevanceReasons.some((reason) => reason.includes('location')));
  assert.ok(result.relevanceReasons.some((reason) => reason.includes('entity name')));
  assert.ok(result.relevanceReasons.some((reason) => reason.includes('existing graph relationships')));
});

test('Digital Twin and event inputs remain unchanged', () => {
  const { event, classification } = ingestAndClassify({ id: 'immutable-event', title: 'Strait of Hormuz disruption', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'] });
  const graphBefore = JSON.stringify(graph);
  const eventBefore = JSON.stringify(event);
  analyzeGeopoliticalSupplyChainRelevance(event, graph, classification);
  assert.equal(JSON.stringify(graph), graphBefore);
  assert.equal(JSON.stringify(event), eventBefore);
});
