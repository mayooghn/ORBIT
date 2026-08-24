import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEOPOLITICAL_EVENT_CATEGORIES,
  GEOPOLITICAL_EVENT_SEVERITIES,
  GeopoliticalEventValidationError,
  validateGeopoliticalEvent,
} from '../src/geopoliticalEvents/model';
import { DuplicateGeopoliticalEventError, GeopoliticalEventIngestionStore } from '../src/geopoliticalEvents/ingestion';

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

test('valid event ingestion preserves attribution, location, and multiple countries', () => {
  const store = new GeopoliticalEventIngestionStore();
  const event = store.ingest(validEvent());

  assert.equal(event.id, 'event-1');
  assert.equal(event.source, 'Government bulletin');
  assert.equal(event.sourceUrl, 'https://example.gov/events/1');
  assert.equal(event.location, 'Arabian Sea');
  assert.deepEqual(event.countriesInvolved, ['India', 'Oman']);
  assert.equal(store.size, 1);
});

test('required fields are validated', () => {
  for (const field of ['id', 'title', 'description', 'timestamp', 'source', 'countriesInvolved']) {
    const event = validEvent({ [field]: field === 'countriesInvolved' ? [] : '' });
    assert.throws(() => validateGeopoliticalEvent(event), GeopoliticalEventValidationError);
  }
});

test('category values are constrained', () => {
  for (const category of GEOPOLITICAL_EVENT_CATEGORIES) {
    assert.equal(validateGeopoliticalEvent(validEvent({ category })).category, category);
  }
  assert.throws(() => validateGeopoliticalEvent(validEvent({ category: 'invalid' })), /category must be one of/);
});

test('severity values are constrained', () => {
  for (const severity of GEOPOLITICAL_EVENT_SEVERITIES) {
    assert.equal(validateGeopoliticalEvent(validEvent({ severity })).severity, severity);
  }
  assert.throws(() => validateGeopoliticalEvent(validEvent({ severity: 'urgent' })), /severity must be one of/);
});

test('timestamps must be valid date-time strings', () => {
  assert.equal(validateGeopoliticalEvent(validEvent()).timestamp, '2026-08-21T12:00:00.000Z');
  assert.throws(() => validateGeopoliticalEvent(validEvent({ timestamp: 'not-a-timestamp' })), /timestamp/);
  assert.throws(() => validateGeopoliticalEvent(validEvent({ timestamp: '2026-08-21' })), /timestamp/);
});

test('location is optional', () => {
  const event = validateGeopoliticalEvent(validEvent({ location: undefined }));
  assert.equal(event.location, undefined);
});

test('malformed events and source URLs are rejected', () => {
  assert.throws(() => validateGeopoliticalEvent(null), GeopoliticalEventValidationError);
  assert.throws(() => validateGeopoliticalEvent(validEvent({ sourceUrl: 'not-a-url' })), /sourceUrl/);
  assert.throws(() => validateGeopoliticalEvent(validEvent({ countriesInvolved: ['India', 'india'] })), /duplicate country/);
});

test('duplicate event IDs are rejected', () => {
  const store = new GeopoliticalEventIngestionStore();
  store.ingest(validEvent());
  assert.throws(() => store.ingest(validEvent()), DuplicateGeopoliticalEventError);
});

test('events can be retrieved deterministically', () => {
  const store = new GeopoliticalEventIngestionStore();
  store.ingest(validEvent());
  const retrieved = store.getEvent('event-1');
  assert.deepEqual(retrieved, validateGeopoliticalEvent(validEvent()));
  assert.equal(store.getEvent('missing-event'), undefined);
  assert.deepEqual(store.getEvents().map((event) => event.id), ['event-1']);
});

test('multiple events can be ingested as one validated batch', () => {
  const store = new GeopoliticalEventIngestionStore();
  const events = store.ingestMany([
    validEvent({ id: 'event-1', category: 'conflict', severity: 'critical' }),
    validEvent({ id: 'event-2', category: 'sanctions', severity: 'medium', countriesInvolved: ['India', 'Russia'] }),
  ]);

  assert.deepEqual(events.map((event) => event.id), ['event-1', 'event-2']);
  assert.deepEqual(store.getEvents().map((event) => event.id), ['event-1', 'event-2']);
});

test('batch ingestion is atomic when an event is invalid or duplicated', () => {
  const store = new GeopoliticalEventIngestionStore();
  assert.throws(() => store.ingestMany([validEvent({ id: 'event-1' }), validEvent({ id: 'event-1' })]), DuplicateGeopoliticalEventError);
  assert.equal(store.size, 0);
  assert.throws(() => store.ingestMany([validEvent({ id: 'event-1' }), validEvent({ id: 'event-2', severity: 'invalid' })]), GeopoliticalEventValidationError);
  assert.equal(store.size, 0);
});
