import assert from 'node:assert/strict';
import test from 'node:test';
import type { DigitalTwinGraph } from '../src/digitalTwin/model';
import { validateGeopoliticalEvent } from '../src/geopoliticalEvents/model';
import { extractDeterministicGeopoliticalEvent, HIGH_CONFIDENCE_THRESHOLD } from '../src/geopoliticalEvents/deterministicExtractor';

const graph: DigitalTwinGraph = {
  modelVersion: 1,
  nodes: [
    {
      nodeId: 'supplier-iran',
      nodeType: 'supplier',
      name: 'Iran',
      connectedNodeIds: [],
      operationalState: 'operational',
      stateSource: 'BASELINE',
      sourceReferences: [{ table: 'supplier_imports', id: 'iran' }],
      metadata: { sourceCountryName: 'Iran', countryId: 'country-iran' },
    },
    {
      nodeId: 'supplier-saudi',
      nodeType: 'supplier',
      name: 'Saudi Arabia',
      connectedNodeIds: [],
      operationalState: 'operational',
      stateSource: 'BASELINE',
      sourceReferences: [{ table: 'supplier_imports', id: 'saudi' }],
      metadata: { sourceCountryName: 'Saudi Arab', countryId: 'country-saudi' },
    },
    {
      nodeId: 'supplier-united-states',
      nodeType: 'supplier',
      name: 'United States',
      connectedNodeIds: [],
      operationalState: 'operational',
      stateSource: 'BASELINE',
      sourceReferences: [{ table: 'supplier_imports', id: 'united-states' }],
      metadata: { sourceCountryName: 'United States', countryId: 'country-us' },
    },
    {
      nodeId: 'refinery-mangalore',
      nodeType: 'refinery',
      name: 'MRPL, Mangalore',
      connectedNodeIds: [],
      operationalState: 'operational',
      stateSource: 'BASELINE',
      sourceReferences: [{ table: 'refineries', id: 'mangalore' }],
      metadata: { company: 'Mangalore Refinery and Petrochemicals Limited', state: 'Karnataka' },
    },
    {
      nodeId: 'chokepoint-strait-of-hormuz',
      nodeType: 'chokepoint',
      name: 'Strait of Hormuz',
      connectedNodeIds: ['shipping-route-hormuz-india'],
      operationalState: 'operational',
      stateSource: 'BASELINE',
      sourceReferences: [{ table: 'external_source', id: 'hormuz' }],
      metadata: { documentedRole: 'major oil chokepoint' },
    },
    {
      nodeId: 'shipping-route-hormuz-india',
      nodeType: 'shipping_route',
      name: 'Strait of Hormuz-India Crude Flow',
      connectedNodeIds: ['chokepoint-strait-of-hormuz'],
      operationalState: 'operational',
      stateSource: 'BASELINE',
      sourceReferences: [{ table: 'external_source', id: 'hormuz-route' }],
      metadata: { documentedDestination: 'India among major Asian destinations' },
    },
  ],
  edges: [],
};

const article = (overrides: Record<string, unknown> = {}) => ({
  id: 'article-1',
  title: 'Iran blocks oil shipments through the Strait of Hormuz after a tanker attack.',
  description: 'Tanker traffic was disrupted after the attack.',
  source: 'Example Energy Wire',
  url: 'https://example.test/article-1',
  publishedAt: '2026-08-24T08:00:00.000Z',
  ...overrides,
});

test('extracts a high-confidence Hormuz maritime disruption', () => {
  const result = extractDeterministicGeopoliticalEvent(article(), graph);

  assert.equal(result.confidenceLevel, 'HIGH');
  assert.equal(result.route, 'DETERMINISTIC');
  assert.equal(result.event?.category, 'maritime_disruption');
  assert.ok(result.event?.countriesInvolved.includes('Iran'));
  assert.ok(result.matchedEntities.some((entity) => entity.entityId === 'chokepoint-strait-of-hormuz'));
  assert.ok((result.event?.severity === 'high') || (result.event?.severity === 'critical'));
  assert.ok(result.confidence >= HIGH_CONFIDENCE_THRESHOLD);
});

test('extracts tanker attacks only when the article provides sufficient country/entity evidence', () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: 'Tanker attack disrupts crude shipping near Iran',
    description: 'The incident affected tanker movements.',
  }), graph);

  assert.equal(result.confidenceLevel, 'HIGH');
  assert.equal(result.event?.category, 'maritime_disruption');
  assert.ok(result.event?.countriesInvolved.includes('Iran'));
});

test('extracts refinery outages and pipeline shutdowns as infrastructure disruption', () => {
  const refinery = extractDeterministicGeopoliticalEvent(article({
    title: 'Saudi refinery shuts down after a fire',
    description: 'Operations at the refinery were stopped.',
  }), graph);
  const pipeline = extractDeterministicGeopoliticalEvent(article({
    title: 'Iran pipeline shutdown interrupts crude operations',
    description: 'The pipeline was taken offline.',
  }), graph);

  assert.equal(refinery.confidenceLevel, 'HIGH');
  assert.equal(refinery.event?.category, 'infrastructure_disruption');
  assert.ok(refinery.event?.countriesInvolved.includes('Saudi Arabia'));
  assert.equal(pipeline.confidenceLevel, 'HIGH');
  assert.equal(pipeline.event?.category, 'infrastructure_disruption');
  assert.ok(pipeline.event?.countriesInvolved.includes('Iran'));
});

test('extracts sanctions and trade restrictions with country aliases', () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: 'US announces sanctions restricting Iranian oil exports',
    description: 'The measure restricts crude exports.',
  }), graph);

  assert.equal(result.confidenceLevel, 'HIGH');
  assert.ok(result.event?.category === 'sanctions' || result.event?.category === 'trade_restriction');
  assert.ok(result.event?.countriesInvolved.includes('Iran'));
  assert.ok(result.event?.countriesInvolved.includes('United States'));
});

test('classifies an explicit armed attack as conflict when maritime context does not take precedence', () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: 'Military strike damages a Saudi oil terminal',
    description: 'The attack damaged the energy facility.',
  }), graph);

  assert.equal(result.confidenceLevel, 'HIGH');
  assert.equal(result.event?.category, 'conflict');
  assert.ok(result.event?.countriesInvolved.includes('Saudi Arabia'));
});

test('routes vague tension and generic oil-price stories to uncertainty', () => {
  const tension = extractDeterministicGeopoliticalEvent(article({
    title: 'Strait of Hormuz tensions increase as markets worry about oil supplies',
    description: 'Analysts expressed concern about possible disruption.',
  }), graph);
  const prices = extractDeterministicGeopoliticalEvent(article({
    title: 'Oil prices rise as investors remain concerned about global supply',
    description: 'Markets reacted to broad supply concerns.',
  }), graph);
  const capacity = extractDeterministicGeopoliticalEvent(article({
    title: 'Refinery capacity remains under pressure',
    description: 'No outage or shutdown was reported.',
  }), graph);

  assert.equal(tension.confidenceLevel, 'UNCERTAIN');
  assert.equal(tension.route, 'GROQ_FALLBACK');
  assert.equal(prices.confidenceLevel, 'UNCERTAIN');
  assert.equal(prices.event, undefined);
  assert.equal(capacity.confidenceLevel, 'UNCERTAIN');
});

test('does not fabricate countries, entities, or timestamps', () => {
  const missingCountry = extractDeterministicGeopoliticalEvent(article({
    title: 'Strait of Hormuz closure disrupts oil shipping',
  }), graph);
  const missingTimestamp = extractDeterministicGeopoliticalEvent(article({ publishedAt: undefined }), graph);
  const unknownLocation = extractDeterministicGeopoliticalEvent(article({
    title: 'Refinery outage reported near an unknown basin',
    description: 'The refinery outage has not been linked to a known country.',
  }), graph);

  assert.equal(missingCountry.confidenceLevel, 'UNCERTAIN');
  assert.equal(missingCountry.event, undefined);
  assert.equal(missingTimestamp.confidenceLevel, 'UNCERTAIN');
  assert.equal(missingTimestamp.event, undefined);
  assert.equal(unknownLocation.confidenceLevel, 'UNCERTAIN');
  assert.equal(unknownLocation.event, undefined);
  assert.ok(missingTimestamp.extractionReasons.some((reason) => reason.includes('timestamp')));
});

test('uses descriptions, avoids false substring matches, and deduplicates entities', () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: 'Incident reported',
    description: 'IRAN  blocks   crude exports; the warbler report was unrelated.',
  }), graph);

  assert.equal(result.event?.category, 'trade_restriction');
  assert.equal(result.confidenceLevel, 'HIGH');
  assert.deepEqual(result.event?.countriesInvolved, ['Iran']);
  assert.equal(result.matchedEntities.filter((entity) => entity.entityType === 'country' && entity.name === 'Iran').length, 1);
  assert.equal(result.extractionReasons.some((reason) => reason.includes('warbler')), false);
});

test('returns stable output for repeated extraction and preserves event validation compatibility', () => {
  const first = extractDeterministicGeopoliticalEvent(article(), graph);
  const second = extractDeterministicGeopoliticalEvent(article(), graph);

  assert.deepEqual(second, first);
  assert.ok(first.event);
  assert.deepEqual(validateGeopoliticalEvent(first.event), first.event);
});
