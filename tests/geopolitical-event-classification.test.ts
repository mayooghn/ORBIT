import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyGeopoliticalEvent, GeopoliticalEventClassifier } from '../src/geopoliticalEvents/classification';
import { GeopoliticalEventValidationError } from '../src/geopoliticalEvents/model';
import { GeopoliticalEventIngestionStore } from '../src/geopoliticalEvents/ingestion';

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

const ingest = (overrides: Record<string, unknown> = {}) => new GeopoliticalEventIngestionStore().ingest(validEvent(overrides));

test('classifies conflict events', () => {
  const result = classifyGeopoliticalEvent(ingest({ category: 'conflict', title: 'Armed conflict near oil infrastructure' }));
  assert.equal(result.eventId, 'event-1');
  assert.equal(result.category, 'conflict');
});

test('classifies sanctions events', () => {
  const result = classifyGeopoliticalEvent(ingest({ category: 'sanctions', title: 'Sanctions restrict crude exports' }));
  assert.equal(result.category, 'sanctions');
  assert.equal(result.energyRelevant, true);
});

test('classifies maritime disruption events as energy relevant', () => {
  const result = classifyGeopoliticalEvent(ingest({ category: 'maritime_disruption', title: 'Shipping lane disruption' }));
  assert.equal(result.category, 'maritime_disruption');
  assert.equal(result.energyRelevant, true);
});

test('classifies infrastructure disruption events', () => {
  const result = classifyGeopoliticalEvent(ingest({ category: 'infrastructure_disruption', title: 'Crude pipeline damaged' }));
  assert.equal(result.category, 'infrastructure_disruption');
  assert.equal(result.energyRelevant, true);
});

test('preserves structured severity classification', () => {
  for (const severity of ['low', 'medium', 'high', 'critical'] as const) {
    assert.equal(classifyGeopoliticalEvent(ingest({ severity })).severity, severity);
  }
});

test('returns geographic relevance from location and countries', () => {
  const result = classifyGeopoliticalEvent(ingest({ location: 'Strait of Hormuz', countriesInvolved: ['India', 'Iran', 'Oman'] }));
  assert.deepEqual(result.countriesInvolved, ['India', 'Iran', 'Oman']);
  assert.equal(result.location, 'Strait of Hormuz');
  assert.equal(result.region, 'Middle East');
});

test('identifies a non-energy event', () => {
  const result = classifyGeopoliticalEvent(ingest({
    title: 'Diplomatic summit concludes',
    description: 'European officials concluded a cultural cooperation agreement.',
    location: 'Europe',
    countriesInvolved: ['France', 'Germany'],
    category: 'diplomatic_escalation',
  }));
  assert.equal(result.energyRelevant, false);
  assert.equal(result.region, 'Europe');
});

test('classification reasons explain category, severity, geography, and energy rules', () => {
  const result = classifyGeopoliticalEvent(ingest({ category: 'trade_restriction', severity: 'critical', title: 'Oil export restriction' }));
  assert.equal(result.classificationReasons.length, 4);
  assert.ok(result.classificationReasons.some((reason) => reason.includes('category rule')));
  assert.ok(result.classificationReasons.some((reason) => reason.includes('severity rule')));
  assert.ok(result.classificationReasons.some((reason) => reason.includes('geographic rule')));
  assert.ok(result.classificationReasons.some((reason) => reason.includes('energy rule')));
});

test('classification is deterministic across repeated calls', () => {
  const event = ingest({ id: 'deterministic-event', category: 'sanctions' });
  const classifier = new GeopoliticalEventClassifier();
  assert.deepEqual(classifier.classify(event), classifier.classify(event));
});

test('invalid events are rejected by the classifier', () => {
  assert.throws(() => classifyGeopoliticalEvent(validEvent({ category: 'invalid' })), GeopoliticalEventValidationError);
  assert.throws(() => classifyGeopoliticalEvent({}), GeopoliticalEventValidationError);
});

test('classification does not mutate the input event', () => {
  const event = ingest({ id: 'immutable-event', countriesInvolved: ['India', 'Saudi Arabia'] });
  const before = JSON.stringify(event);
  const result = classifyGeopoliticalEvent(event);
  result.countriesInvolved.push('Iraq');
  assert.equal(JSON.stringify(event), before);
});
