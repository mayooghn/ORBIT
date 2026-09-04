/**
 * Phase 6 — End-to-End Test + Hardening.
 * Tests the REAL integration path: manual event -> orchestrator ->
 * geopolitical (deterministic) -> Digital Twin -> scenario -> procurement ->
 * reserve -> OrbitAssessment -> persistence -> Command Overview.
 * Uses structured events (no Groq); all other engines run real logic.
 */
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { after, before } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { GeopoliticalMonitoringService } from '../src/geopoliticalEvents/monitoring';
import { createApp } from '../server';
import type { GeopoliticalRiskAgent } from '../src/geopoliticalEvents/agent';

const dir = mkdtempSync(join(tmpdir(), 'orbit-phase6-'));
const dbPath = join(dir, 'phase6.db');
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);

function makeStubAgent(overrides: { riskLevel?: 'low' | 'medium' | 'high' | 'critical'; affectedNodeId?: string } = {}): GeopoliticalRiskAgent {
  const riskLevel = overrides.riskLevel ?? 'high';
  const affectedNodeId = overrides.affectedNodeId ?? 'chokepoint-strait-of-hormuz';
  return {
    analyze: async (input) => ({
      request: typeof input === 'string' ? input : JSON.stringify(input),
      event: { id: 'evt-phase6-hormuz', title: 'Strait of Hormuz blockade', description: 'Phase 6 test.', timestamp: '2026-01-01T00:00:00.000Z', source: 'phase6-test', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'], category: 'maritime_disruption', severity: 'critical' },
      classification: { eventId: 'evt-phase6-hormuz', category: 'maritime_disruption', severity: 'critical', energyRelevant: true, countriesInvolved: ['Iran', 'Oman'], location: 'Strait of Hormuz', classificationReasons: ['phase6'] },
      relevance: { eventId: 'evt-phase6-hormuz', relevant: true, matchedNodeIds: [affectedNodeId], matchedNodeTypes: ['chokepoint'], matchedLocations: ['Strait of Hormuz'], matchedCountries: [], relevanceReasons: ['phase6'] },
      risk: { eventId: 'evt-phase6-hormuz', riskLevel, riskScore: riskLevel === 'critical' ? 90 : 60, factors: [], reasoning: ['phase6'], matchedNodeIds: [affectedNodeId], energyRelevant: true },
      digitalTwinImpact: { eventId: 'evt-phase6-hormuz', relevant: true, riskLevel, riskScore: riskLevel === 'critical' ? 90 : 60, matchedNodeIds: [affectedNodeId], affectedNodeIds: [affectedNodeId], affectedNodeNames: ['Strait of Hormuz'], affectedEdgeIds: [], affectedNodeTypes: ['chokepoint'], affectedCapacity: { nodeTotals: [], edgeTotals: [] }, affectedFlow: { nodeTotals: [], edgeTotals: [] }, impactReasons: ['phase6'] },
      explanation: 'Phase 6 stub.',
    }),
  };
}

const failingAgent: GeopoliticalRiskAgent = { analyze: async () => { throw new Error('stub geopolitical failure'); } };

let server: Server;
let baseUrl = '';
let monitoring: GeopoliticalMonitoringService;

before(async () => {
  process.env.ORBIT_MONITORING_INTERVAL_MS = '999999999';
  monitoring = new GeopoliticalMonitoringService(database, makeStubAgent(), { enabled: false });
  const app = createApp(repository, runtime, makeStubAgent(), monitoring);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (addr && typeof addr === 'object') baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  database.close();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// A. MANUAL EVENT -> ORCHESTRATOR
// ---------------------------------------------------------------------------
test('A1: manual structured event -> COMPLETED assessment with all 5 stages', async () => {
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: { id: 'evt-manual-1', title: 'Strait of Hormuz blockade', description: 'Manual event.', timestamp: '2026-01-01T00:00:00.000Z', source: 'phase6-test', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'], category: 'maritime_disruption', severity: 'critical' } }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.equal(body.status, 'AVAILABLE');
  const a = body.assessment;
  assert.match(a.assessmentId, /^assessment-[0-9a-f-]{36}$/);
  assert.equal(a.status, 'COMPLETED');
  assert.equal(a.trigger, 'manual_request');
  assert.equal(a.stages.length, 5);
  assert.ok(a.stages.every((s: any) => s.status === 'COMPLETED'));
  assert.deepEqual(a.errors, []);
  assert.equal(a.overallRisk, 'critical');
  assert.ok(a.summary.length > 0 && a.recommendation && a.recommendation.length > 0);
  assert.ok(a.geopolitical && a.geopolitical.event.id === 'evt-manual-1');
  assert.ok(a.disruption && a.disruption.affectedNodeId === 'chokepoint-strait-of-hormuz');
  assert.ok(a.scenario && a.reserve && a.reserve.optimizationId.startsWith('reserve-optimization-'));
  const latest = await fetch(`${baseUrl}/api/assessments/latest`);
  const latestBody = (await latest.json()) as any;
  assert.equal(latestBody.assessment.assessmentId, a.assessmentId);
});

test('A2: manual text event -> assessment created via deterministic extraction', async () => {
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Strait of Hormuz blockade halts crude tanker traffic' }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.match(body.assessment.assessmentId, /^assessment-/);
  assert.ok(['COMPLETED', 'PARTIAL'].includes(body.assessment.status));
});

// ---------------------------------------------------------------------------
// B. MONITORED EVENT -> n8n -> ORBIT (provenance path)
// ---------------------------------------------------------------------------
test('B1: monitoredEventId provenance -> trigger=monitored_event set on assessment', async () => {
  // The pipeline endpoint accepts monitoredEventId and sets trigger=monitored_event.
  // (The full n8n ingestion path is covered by tests/geopolitical-monitoring.test.ts.)
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ monitoredEventId: 'n8n-candidate-001', text: 'Hormuz tanker attack disrupts crude exports' }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.equal(body.assessment.trigger, 'monitored_event');
  assert.equal(body.assessment.monitoredEventId, 'n8n-candidate-001');
});

// ---------------------------------------------------------------------------
// C. HIGH-RISK EVENT
// ---------------------------------------------------------------------------
test('C1: critical event -> high overallRisk + affected assets + reserve produced', async () => {
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: { id: 'evt-critical-1', title: 'Critical Hormuz blockade', description: 'Full blockade.', timestamp: '2026-01-01T00:00:00.000Z', source: 'phase6-test', location: 'Strait of Hormuz', countriesInvolved: ['Iran', 'Oman'], category: 'maritime_disruption', severity: 'critical' } }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  const a = body.assessment;
  assert.ok(['high', 'critical'].includes(a.overallRisk));
  assert.ok(a.geopolitical.digitalTwinImpact.affectedNodeIds.length > 0);
  assert.ok(a.geopolitical.digitalTwinImpact.affectedNodeNames.includes('Strait of Hormuz'));
  assert.ok(a.disruption && a.disruption.affectedNodeId === 'chokepoint-strait-of-hormuz');
  assert.ok(a.reserve && a.reserve.result.coverageStatus);
  assert.equal(a.status, 'COMPLETED');
});


// ---------------------------------------------------------------------------
// D. FAILURE HANDLING
// ---------------------------------------------------------------------------
test('D1: geopolitical stage failure -> FAILED, downstream SKIPPED, persisted', async () => {
  const app = createApp(repository, runtime, failingAgent);
  const failServer = createServer(app);
  await new Promise<void>((resolve) => failServer.listen(0, resolve));
  const failBase = `http://127.0.0.1:${(failServer.address() as any).port}`;
  try {
    const response = await fetch(`${failBase}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'This will fail geopolitically' }),
    });
    assert.equal(response.status, 500);
    const body = (await response.json()) as any;
    assert.equal(body.status, 'ERROR');
    assert.ok(body.assessment, 'assessment attached even on failure');
    const a = body.assessment;
    assert.equal(a.status, 'FAILED');
    const stageMap = Object.fromEntries(a.stages.map((s: any) => [s.stage, s.status]));
    assert.equal(stageMap.geopoliticalAnalysis, 'FAILED');
    assert.equal(stageMap.networkImpactResolution, 'SKIPPED');
    assert.equal(stageMap.scenarioSimulation, 'SKIPPED');
    assert.equal(stageMap.procurementOptimization, 'SKIPPED');
    assert.equal(stageMap.reserveOptimization, 'SKIPPED');
    assert.ok(a.errors.length > 0);
    assert.match(a.errors[0], /stub geopolitical failure/);
    assert.equal(a.overallRisk, undefined);
  } finally {
    await new Promise<void>((resolve) => failServer.close(() => resolve()));
  }
});

test('D2: scenario stage failure (bad node) -> PARTIAL, downstream SKIPPED', async () => {
  const badNodeAgent: GeopoliticalRiskAgent = {
    analyze: async () => ({
      request: 'stub',
      event: { id: 'evt-bad-node', title: 'Bad node', description: 'phase6', timestamp: '2026-01-01T00:00:00.000Z', source: 'phase6-test', location: 'Nowhere', countriesInvolved: [], category: 'maritime_disruption', severity: 'critical' },
      classification: { eventId: 'evt-bad-node', category: 'maritime_disruption', severity: 'critical', energyRelevant: true, countriesInvolved: [], location: 'Nowhere', classificationReasons: ['stub'] },
      relevance: { eventId: 'evt-bad-node', relevant: true, matchedNodeIds: ['node-does-not-exist'], matchedNodeTypes: ['chokepoint'], matchedLocations: [], matchedCountries: [], relevanceReasons: ['stub'] },
      risk: { eventId: 'evt-bad-node', riskLevel: 'high', riskScore: 60, factors: [], reasoning: ['stub'], matchedNodeIds: ['node-does-not-exist'], energyRelevant: true },
      digitalTwinImpact: { eventId: 'evt-bad-node', relevant: true, riskLevel: 'high', riskScore: 60, matchedNodeIds: ['node-does-not-exist'], affectedNodeIds: ['node-does-not-exist'], affectedNodeNames: ['Nowhere'], affectedEdgeIds: [], affectedNodeTypes: ['chokepoint'], affectedCapacity: { nodeTotals: [], edgeTotals: [] }, affectedFlow: { nodeTotals: [], edgeTotals: [] }, impactReasons: ['stub'] },
      explanation: 'stub',
    }),
  };
  const app = createApp(repository, runtime, badNodeAgent);
  const failServer = createServer(app);
  await new Promise<void>((resolve) => failServer.listen(0, resolve));
  const failBase = `http://127.0.0.1:${(failServer.address() as any).port}`;
  try {
    const response = await fetch(`${failBase}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Bad node event' }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;
    assert.equal(body.assessment.status, 'PARTIAL');
    const stageMap = Object.fromEntries(body.assessment.stages.map((s: any) => [s.stage, s.status]));
    assert.equal(stageMap.geopoliticalAnalysis, 'COMPLETED');
    assert.equal(stageMap.networkImpactResolution, 'COMPLETED');
    assert.equal(stageMap.scenarioSimulation, 'FAILED');
    assert.match(body.assessment.stages.find((s: any) => s.stage === 'scenarioSimulation').error, /node-does-not-exist/);
    assert.equal(stageMap.procurementOptimization, 'SKIPPED');
    assert.equal(stageMap.reserveOptimization, 'SKIPPED');
    assert.ok(body.assessment.errors.length > 0);
    assert.equal(body.pipeline, undefined, 'no legacy payload on PARTIAL');
  } finally {
    await new Promise<void>((resolve) => failServer.close(() => resolve()));
  }
});

// ---------------------------------------------------------------------------
// E. n8n FAILURE ISOLATION
// ---------------------------------------------------------------------------
test('E1: pipeline handles bad monitoredEventId gracefully (no fake success)', async () => {
  // When a monitoredEventId doesn't resolve, the pipeline still runs (provenance lookup is best-effort).
  // This verifies the failure isolation: a missing monitored event doesn't break the pipeline.
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ monitoredEventId: 'nonexistent-event-id', text: 'Hormuz disruption test for failure isolation' }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.equal(body.assessment.monitoredEventId, 'nonexistent-event-id');
  assert.equal(body.assessment.trigger, 'monitored_event');
  assert.ok(body.assessment.stages.length > 0);
});


// ---------------------------------------------------------------------------
// F. DUPLICATION / IDEMPOTENCY
// ---------------------------------------------------------------------------
test('F1: same monitoredEventId twice -> two assessments (documented limitation)', async () => {
  const payload = { monitoredEventId: 'n8n-duplicate-test', text: 'Hormuz disruption duplicate test' };
  const r1 = await fetch(`${baseUrl}/api/pipeline/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const r2 = await fetch(`${baseUrl}/api/pipeline/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const b1 = (await r1.json()) as any;
  const b2 = (await r2.json()) as any;
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.notEqual(b1.assessment.assessmentId, b2.assessment.assessmentId);
  assert.equal(b1.assessment.monitoredEventId, 'n8n-duplicate-test');
  assert.equal(b2.assessment.monitoredEventId, 'n8n-duplicate-test');
  const listResponse = await fetch(`${baseUrl}/api/assessments?limit=50`);
  const listBody = (await listResponse.json()) as any;
  const matching = listBody.assessments.filter((a: any) => a.monitoredEventId === 'n8n-duplicate-test');
  assert.ok(matching.length >= 2, 'both assessments persisted (idempotency not enforced)');
});

// ---------------------------------------------------------------------------
// G. COMMAND OVERVIEW REGRESSION (via API endpoints)
// ---------------------------------------------------------------------------
test('G1: assessments list returns data for dashboard consumption', async () => {
  const response = await fetch(`${baseUrl}/api/assessments?limit=50`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.equal(body.status, 'AVAILABLE');
  assert.ok(Array.isArray(body.assessments));
  assert.ok(body.count >= 1);
  for (const a of body.assessments) {
    assert.ok(a.assessmentId);
    assert.ok(['COMPLETED', 'PARTIAL', 'FAILED'].includes(a.status));
    assert.ok(a.summary);
    assert.ok(Array.isArray(a.stages));
  }
});

test('G2: latest endpoint returns most recent assessment', async () => {
  const response = await fetch(`${baseUrl}/api/assessments/latest`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.ok(body.assessment && body.assessment.assessmentId);
});

test('G3: by-id returns 404 for unknown', async () => {
  const response = await fetch(`${baseUrl}/api/assessments/assessment-does-not-exist`);
  assert.equal(response.status, 404);
});

test('G4: filter by status works', async () => {
  const response = await fetch(`${baseUrl}/api/assessments?status=COMPLETED&limit=10`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.ok(body.assessments.every((a: any) => a.status === 'COMPLETED'));
});


// ---------------------------------------------------------------------------
// H. EXISTING MODULE REGRESSION
// ---------------------------------------------------------------------------
test('H1: /api/health still works', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.equal(body.status, 'AVAILABLE');
  assert.ok(body.capabilities);
});

test('H2: /api/reserves/state still works', async () => {
  const response = await fetch(`${baseUrl}/api/reserves/state`);
  assert.equal(response.status, 200);
});

test('H3: /api/geopolitical-risk/monitor/status still works', async () => {
  const response = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/status`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.ok(body.monitoring);
  assert.ok(body.monitoring.state);
});

test('H4: /api/digital-twin still works', async () => {
  const response = await fetch(`${baseUrl}/api/digital-twin`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as any;
  assert.ok(body.graph && body.graph.nodes && body.graph.edges);
});

// ---------------------------------------------------------------------------
// I. API / DATABASE CONSISTENCY
// ---------------------------------------------------------------------------
test('I1: persisted assessment matches orchestrator result (round-trip)', async () => {
  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: { id: 'evt-consistency-1', title: 'Consistency test', description: 'phase6', timestamp: '2026-01-01T00:00:00.000Z', source: 'phase6-test', location: 'Strait of Hormuz', countriesInvolved: ['Iran'], category: 'maritime_disruption', severity: 'critical' } }),
  });
  const body = (await response.json()) as any;
  const original = body.assessment;
  const byId = await fetch(`${baseUrl}/api/assessments/${original.assessmentId}`);
  const byIdBody = (await byId.json()) as any;
  const retrieved = byIdBody.assessment;
  assert.equal(retrieved.assessmentId, original.assessmentId);
  assert.equal(retrieved.monitoredEventId, original.monitoredEventId);
  assert.equal(retrieved.status, original.status);
  assert.equal(retrieved.overallRisk, original.overallRisk);
  assert.equal(retrieved.summary, original.summary);
  assert.equal(retrieved.reserve.optimizationId, original.reserve.optimizationId);
});

test('I2: assessment IDs are unique per run', async () => {
  const r1 = await fetch(`${baseUrl}/api/pipeline/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Unique id test 1' }) });
  const r2 = await fetch(`${baseUrl}/api/pipeline/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Unique id test 2' }) });
  const b1 = (await r1.json()) as any;
  const b2 = (await r2.json()) as any;
  assert.notEqual(b1.assessment.assessmentId, b2.assessment.assessmentId);
});


// ---------------------------------------------------------------------------
// J. n8n WORKFLOW VALIDATION
// ---------------------------------------------------------------------------
test('J1: n8n workflow JSON is valid and correctly structured', async () => {
  const fs = await import('node:fs');
  const workflowPath = join(process.cwd(), 'n8n', 'orbit-phase4-energy-monitoring.json');
  const raw = fs.readFileSync(workflowPath, 'utf8');
  const workflow = JSON.parse(raw);

  assert.ok(workflow.name);
  assert.ok(Array.isArray(workflow.nodes));
  assert.ok(workflow.connections);

  for (const node of workflow.nodes) {
    assert.ok(node.id, `node ${node.name} must have an id`);
    assert.ok(node.name && node.type);
  }

  const ifNode = workflow.nodes.find((n: any) => n.name === 'Candidate Is High or Critical Alert');
  assert.ok(ifNode, 'IF gate node must exist');
  assert.equal(ifNode.type, 'n8n-nodes-base.if');

  const ifConnections = workflow.connections['Candidate Is High or Critical Alert'];
  assert.ok(ifConnections);
  assert.ok(ifConnections.main[0].length > 0, 'IF true branch must connect to assessment trigger');
  assert.equal(ifConnections.main[0][0].node, 'Trigger ORBIT Assessment');
  assert.equal(ifConnections.main[1].length, 0, 'IF false branch empty (no-op)');

  const triggerNode = workflow.nodes.find((n: any) => n.name === 'Trigger ORBIT Assessment');
  assert.ok(triggerNode, 'assessment trigger node must exist');
  assert.equal(triggerNode.type, 'n8n-nodes-base.httpRequest');
  assert.equal(triggerNode.parameters.method, 'POST');
  assert.match(triggerNode.parameters.url, /\/api\/pipeline\/run$/);
  assert.equal(triggerNode.parameters.options.response.response.neverError, true);

  const scanSummaryNode = workflow.nodes.find((n: any) => n.name === 'Build External Scan Summary');
  assert.ok(scanSummaryNode, 'scan-summary branch must remain');
  const scanConnections = workflow.connections['Build External Scan Summary'];
  assert.equal(scanConnections.main[0][0].node, 'POST Scan Summary to ORBIT');

  const files = fs.readdirSync(join(process.cwd(), 'n8n'));
  const workflows = files.filter((f: string) => f.endsWith('.json'));
  assert.equal(workflows.length, 1, 'only one n8n workflow must exist');
});

// ---------------------------------------------------------------------------
// K. SECURITY / CONFIGURATION CHECK
// ---------------------------------------------------------------------------
test('K1: n8n workflow has no embedded secrets', async () => {
  const fs = await import('node:fs');
  const workflowPath = join(process.cwd(), 'n8n', 'orbit-phase4-energy-monitoring.json');
  const raw = fs.readFileSync(workflowPath, 'utf8');
  assert.doesNotMatch(raw, /sk-[a-zA-Z0-9]{20,}/, 'no API key pattern');
  assert.doesNotMatch(raw, /Bearer\s+[a-zA-Z0-9_-]{20,}/, 'no bearer token');
  assert.doesNotMatch(raw, /password['":\s]+['"][^'"]{3,}/i, 'no password field');
});

test('K2: assessment trigger uses monitoredEventId + text (safe interpolation)', async () => {
  const fs = await import('node:fs');
  const workflowPath = join(process.cwd(), 'n8n', 'orbit-phase4-energy-monitoring.json');
  const raw = fs.readFileSync(workflowPath, 'utf8');
  const workflow = JSON.parse(raw);
  const triggerNode = workflow.nodes.find((n: any) => n.name === 'Trigger ORBIT Assessment');
  const jsonBody = triggerNode.parameters.jsonBody;
  assert.match(jsonBody, /monitoredEventId/);
  assert.match(jsonBody, /text/);
  assert.doesNotMatch(jsonBody, /<\s*script/i, 'no script injection');
});
