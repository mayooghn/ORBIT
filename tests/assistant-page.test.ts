import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { AssistantPage, EXAMPLE_PROMPTS, EXTERNAL_MONITORING_FRESHNESS_MS, formatExternalMonitoringEventTime, getExternalMonitoringStatus, getPageNumbers, INITIAL_ASSISTANT_REQUEST, NodeIdList, renderSafeAssessmentMarkdown } from '../src/pages/AssistantPage';
import type { MonitoredEventRecord } from '../src/services/api';

const assistantSource = readFileSync(path.join(process.cwd(), 'src/pages/AssistantPage.tsx'), 'utf8');

test('fresh Assistant page starts empty without an automatic executive assessment', () => {
  const markup = renderToStaticMarkup(React.createElement(AssistantPage));
  const textareaStart = markup.indexOf('<textarea');
  const textareaEnd = markup.indexOf('</textarea>', textareaStart);
  const textareaMarkup = markup.slice(textareaStart, textareaEnd + '</textarea>'.length);

  assert.equal(INITIAL_ASSISTANT_REQUEST, '');
  assert.ok(textareaStart >= 0);
  assert.doesNotMatch(textareaMarkup, /Strait of Hormuz/);
  assert.doesNotMatch(markup, /Executive Assessment/);
});

test('example prompts remain explicit input actions and analysis remains submit-driven', () => {
  assert.ok(EXAMPLE_PROMPTS.includes('What happens if the Strait of Hormuz is disrupted?'));
  assert.match(assistantSource, /onClick=\{\(\) => setRequest\(prompt\)\}/);
  assert.match(assistantSource, /onSubmit=\{handleAnalyze\}/);
  assert.match(assistantSource, /setResult\(await analyzeGeopoliticalRisk\(normalizedRequest\)\)/);
  assert.doesNotMatch(assistantSource, /useEffect\([\s\S]*analyzeGeopoliticalRisk\(request/);
});

test('analysis result renders before automatic monitoring in the page layout', () => {
  const resultMarkers = [
    'Deterministic risk assessment',
    'Executive Assessment',
    '<ResultSection title="Event"',
    '<ResultSection title="Classification"',
    'Supply-chain Relevance',
    'Supply Chain Impact',
    'Risk Factors and Reasoning',
  ];
  const resultPositions = resultMarkers.map((marker) => assistantSource.indexOf(marker));
  const monitoringRenderPosition = assistantSource.indexOf('<MonitoringSection');
  const assessmentContainerPosition = assistantSource.indexOf('aria-labelledby="geopolitical-assessment-title"');
  const monitoringDividerPosition = assistantSource.indexOf('pt-10 sm:pt-14 border-t border-[#252525]');

  assert.ok(resultPositions.every((position) => position >= 0));
  assert.ok(resultPositions.every((position, index) => index === 0 || position > resultPositions[index - 1]));
  assert.ok(assessmentContainerPosition >= 0);
  assert.ok(assessmentContainerPosition < resultPositions[0]);
  assert.ok(monitoringDividerPosition > resultPositions[resultPositions.length - 1]);
  assert.ok(monitoringRenderPosition > resultPositions[resultPositions.length - 1]);
  assert.match(assistantSource, /Live external intelligence/);
  assert.doesNotMatch(assistantSource, /Affected nodes/);
  assert.doesNotMatch(assistantSource, /Affected edges/);
});

test('Executive Assessment renders safe bold markdown without exposing raw syntax', () => {
  const markup = renderToStaticMarkup(React.createElement('p', null, renderSafeAssessmentMarkdown('**critical** event with a **score of 87** and `chokepoint-strait-of-hormuz`.')));

  assert.match(markup, /<strong[^>]*>critical<\/strong>/);
  assert.match(markup, /<strong[^>]*>score of 87<\/strong>/);
  assert.doesNotMatch(markup, /\*\*/);
  assert.doesNotMatch(markup, /`/);
  assert.doesNotMatch(markup, /chokepoint-strait-of-hormuz/);
  assert.match(markup, /Chokepoint: Strait of Hormuz/);
});

test('raw Digital Twin identifiers are hidden behind technical details', () => {
  const rawNodeId = 'shipping-route-hormuz-india';
  const markup = renderToStaticMarkup(React.createElement(NodeIdList, {
    label: 'Affected assets',
    nodeIds: [rawNodeId],
    nodeTypes: ['shipping_route'],
  }));
  const defaultView = markup.slice(0, markup.indexOf('<details'));

  assert.doesNotMatch(defaultView, new RegExp(rawNodeId));
  assert.match(defaultView, /Shipping route: Hormuz India/);
  assert.match(markup, /View technical asset details/);
  assert.match(markup, new RegExp(rawNodeId));
});

test('analysis presentation uses concise summaries and expandable reasoning', () => {
  assert.match(assistantSource, /Why this matters/);
  assert.match(assistantSource, /Impact summary/);
  assert.match(assistantSource, /How the score was calculated/);
  assert.match(assistantSource, /View classification reasoning/);
  assert.match(assistantSource, /View detailed impact reasoning/);
  assert.doesNotMatch(assistantSource, /Assessment reasoning/);
});

const externalEvent = (detectedAt: string): MonitoredEventRecord => ({
  article: { sourceType: 'external_webhook' },
  detectedAt,
});

test('automatic monitoring reports ACTIVE for a recent external webhook event', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');
  const status = getExternalMonitoringStatus([externalEvent('2026-08-23T11:45:00.000Z')], now);

  assert.equal(status.state, 'ACTIVE');
  assert.equal(status.message, 'External ingestion pipeline is receiving events.');
  assert.equal(status.latestEventAt, undefined);
  assert.doesNotMatch(status.message, /ORBIT_MONITORING_ENABLED|RSS polling/);
});

test('automatic monitoring reports STANDBY with the latest event time when external events are stale', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');
  const detectedAt = new Date(now - EXTERNAL_MONITORING_FRESHNESS_MS - 1).toISOString();
  const status = getExternalMonitoringStatus([
    externalEvent(detectedAt),
  ], now);

  assert.equal(status.state, 'STANDBY');
  assert.equal(status.message, 'No new external events recently.');
  assert.equal(status.latestEventAt, detectedAt);
  assert.equal(formatExternalMonitoringEventTime(status.latestEventAt).length > 0, true);
});

test('automatic monitoring reports WAITING before the first external webhook event', () => {
  const status = getExternalMonitoringStatus([]);

  assert.equal(status.state, 'WAITING');
  assert.equal(status.message, 'Waiting for the first event from the external ingestion pipeline.');
  assert.equal(status.latestEventAt, undefined);
  assert.doesNotMatch(assistantSource, /Automatic monitoring is disabled|ORBIT_MONITORING_ENABLED/);
});

test('getPageNumbers generates compact Google-style pagination page numbers', () => {
  assert.deepEqual(getPageNumbers(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(getPageNumbers(1, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(getPageNumbers(1, 10), [1, 2, 3, 4, 5, '...', 10]);
  assert.deepEqual(getPageNumbers(6, 12), [1, '...', 5, 6, 7, '...', 12]);
  assert.deepEqual(getPageNumbers(11, 12), [1, '...', 8, 9, 10, 11, 12]);
});

test('Recent Monitored Events includes Google-style pagination components and range counters', () => {
  assert.match(assistantSource, /Showing \{startIndex \+ 1\}–\{endIndex\} of \{totalEvents\} monitored events/);
  assert.match(assistantSource, /nav aria-label="Monitored events pagination"/);
  assert.match(assistantSource, /Previous/);
  assert.match(assistantSource, /Next/);
  assert.match(assistantSource, /fetchMonitoredEvents\(200\)/);
});
