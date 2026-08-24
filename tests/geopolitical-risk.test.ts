import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyGeopoliticalEvent } from '../src/geopoliticalEvents/classification';
import { assessGeopoliticalRisk, GeopoliticalRiskAssessor } from '../src/geopoliticalEvents/risk';
import type { GeopoliticalSupplyChainRelevance } from '../src/geopoliticalEvents/relevance';

const validEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  title: 'Crude supply disruption',
  description: 'A documented crude oil disruption affected energy continuity.',
  timestamp: '2026-08-21T12:00:00.000Z',
  source: 'Government bulletin',
  sourceUrl: 'https://example.gov/events/1',
  location: 'Arabian Sea',
  countriesInvolved: ['India', 'Oman'],
  category: 'maritime_disruption',
  severity: 'medium',
  ...overrides,
});

const relevanceFor = (eventId: string, matchedNodeTypes: GeopoliticalSupplyChainRelevance['matchedNodeTypes'], matchedNodeIds = matchedNodeTypes.map((type, index) => `${type}-${index}`), relevant = true): GeopoliticalSupplyChainRelevance => ({
  eventId,
  relevant,
  matchedNodeIds,
  matchedNodeTypes,
  matchedLocations: [],
  matchedCountries: [],
  relevanceReasons: [],
});

const assess = (eventOverrides: Record<string, unknown> = {}, matchedTypes: GeopoliticalSupplyChainRelevance['matchedNodeTypes'] = ['port']) => {
  const event = validEvent(eventOverrides);
  const classification = classifyGeopoliticalEvent(event);
  const relevance = relevanceFor(event.id, matchedTypes);
  return { event, classification, relevance, result: assessGeopoliticalRisk(event, classification, relevance) };
};

test('low-risk event produces a low score', () => {
  const { result } = assess({ id: 'low-event', title: 'Routine energy notice', severity: 'low' }, ['port']);
  assert.equal(result.riskLevel, 'low');
  assert.ok(result.riskScore < 25);
});

test('medium-risk event produces a medium score', () => {
  const { result } = assess({ id: 'medium-event', severity: 'medium' }, ['port']);
  assert.equal(result.riskLevel, 'medium');
  assert.ok(result.riskScore >= 25 && result.riskScore < 50);
});

test('high-risk event produces a high score', () => {
  const { result } = assess({ id: 'high-event', severity: 'high' }, ['refinery']);
  assert.equal(result.riskLevel, 'high');
  assert.ok(result.riskScore >= 50 && result.riskScore < 80);
});

test('critical-risk event produces a critical score', () => {
  const { result } = assess({ id: 'critical-event', severity: 'critical', location: 'Strait of Hormuz' }, ['chokepoint']);
  assert.equal(result.riskLevel, 'critical');
  assert.ok(result.riskScore >= 80);
});

test('irrelevant non-energy events are gated to low risk', () => {
  const event = validEvent({ id: 'non-energy-event', title: 'Cultural exchange', description: 'A cultural exchange was announced.', location: 'Liechtenstein', countriesInvolved: ['Liechtenstein', 'Andorra'], category: 'diplomatic_escalation', severity: 'critical' });
  const classification = classifyGeopoliticalEvent(event);
  const relevance = relevanceFor(event.id, [], [], false);
  const result = assessGeopoliticalRisk(event, classification, relevance);
  assert.equal(result.energyRelevant, false);
  assert.equal(result.riskLevel, 'low');
  assert.equal(result.riskScore, 0);
});

test('chokepoint exposure contributes a distinct factor', () => {
  const { result } = assess({ id: 'chokepoint-event', location: 'Strait of Hormuz', severity: 'high' }, ['chokepoint']);
  assert.ok(result.factors.some((factor) => factor.name === 'chokepoint exposure'));
  assert.ok(result.riskScore >= 50);
});

test('port, refinery, and reserve exposure are scored by node type', () => {
  const { result } = assess({ id: 'asset-event', severity: 'high' }, ['port', 'refinery', 'strategic_reserve']);
  assert.ok(result.factors.some((factor) => factor.name === 'port exposure'));
  assert.ok(result.factors.some((factor) => factor.name === 'refinery exposure'));
  assert.ok(result.factors.some((factor) => factor.name === 'strategic reserve exposure'));
  assert.deepEqual(result.matchedNodeIds, ['port-0', 'refinery-1', 'strategic_reserve-2']);
});

test('risk assessment is deterministic', () => {
  const { event, classification, relevance } = assess({ id: 'deterministic-event', severity: 'high' }, ['supplier', 'port', 'refinery']);
  const assessor = new GeopoliticalRiskAssessor();
  assert.deepEqual(assessor.assess(event, classification, relevance), assessor.assess(event, classification, relevance));
});

test('factors and reasoning explain the score', () => {
  const { result } = assess({ id: 'reason-event', severity: 'critical', location: 'Strait of Hormuz' }, ['chokepoint', 'port']);
  assert.ok(result.factors.length >= 4);
  assert.ok(result.reasoning.some((reason) => reason.includes('Severity critical')));
  assert.ok(result.reasoning.some((reason) => reason.includes('raw score')));
  assert.ok(result.reasoning.some((reason) => reason.includes('thresholds')));
});

test('risk assessment does not mutate inputs', () => {
  const { event, classification, relevance } = assess({ id: 'immutable-event' }, ['port', 'refinery']);
  const eventBefore = JSON.stringify(event);
  const classificationBefore = JSON.stringify(classification);
  const relevanceBefore = JSON.stringify(relevance);
  const result = assessGeopoliticalRisk(event, classification, relevance);
  result.matchedNodeIds.push('new-node');
  result.factors.push({ name: 'test', points: 0, explanation: 'test' });
  assert.equal(JSON.stringify(event), eventBefore);
  assert.equal(JSON.stringify(classification), classificationBefore);
  assert.equal(JSON.stringify(relevance), relevanceBefore);
});

test('invalid event, classification, or relevance input is rejected', () => {
  const { event, classification, relevance } = assess({ id: 'invalid-input-event' });
  assert.throws(() => assessGeopoliticalRisk({}, classification, relevance), /Invalid geopolitical event/);
  assert.throws(() => assessGeopoliticalRisk(event, { ...classification, eventId: 'other-event' }, relevance), /classification does not match/);
  assert.throws(() => assessGeopoliticalRisk(event, classification, { ...relevance, eventId: 'other-event' }), /relevance result/);
});
