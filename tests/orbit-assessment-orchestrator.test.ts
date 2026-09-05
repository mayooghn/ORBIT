/**
 * Phase 3 orchestrator contract tests: the reusable runOrbitAssessment service
 * behind /api/pipeline/run — per-stage ledger, partial failure, SKIPPED stages,
 * legacy payload compatibility, and assessment persistence/query endpoints.
 * Uses stub agents so the suite is deterministic (no Groq, no network).
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
import type { GeopoliticalRiskAgent, GeopoliticalRiskAgentResponse } from '../src/geopoliticalEvents/agent';
import { createApp } from '../server';

const dir = mkdtempSync(join(tmpdir(), 'orbit-assessment-tests-'));
const dbPath = join(dir, 'check.db');
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);

const stubAnalysis: GeopoliticalRiskAgentResponse = {
  request: 'stub',
  event: {
    id: 'evt-stub-hormuz',
    title: 'Strait of Hormuz blockade halts crude tanker traffic',
    description: 'Stub event for orchestrator contract tests.',
    timestamp: '2026-01-01T00:00:00.000Z',
    source: 'orbit-test',
    location: 'Strait of Hormuz',
    countriesInvolved: ['Iran', 'Oman'],
    category: 'maritime_disruption',
    severity: 'critical',
  },
  classification: {
    eventId: 'evt-stub-hormuz',
    category: 'maritime_disruption',
    severity: 'critical',
    energyRelevant: true,
    countriesInvolved: ['Iran', 'Oman'],
    location: 'Strait of Hormuz',
    classificationReasons: ['stub'],
  },
  relevance: {
    eventId: 'evt-stub-hormuz',
    relevant: true,
    matchedNodeIds: ['chokepoint-strait-of-hormuz'],
    matchedNodeTypes: ['chokepoint'],
    matchedLocations: ['Strait of Hormuz'],
    matchedCountries: [],
    relevanceReasons: ['stub'],
  },
  risk: {
    eventId: 'evt-stub-hormuz',
    riskLevel: 'high',
    riskScore: 60,
    factors: [],
    reasoning: ['stub'],
    matchedNodeIds: ['chokepoint-strait-of-hormuz'],
    energyRelevant: true,
  },
  digitalTwinImpact: {
    eventId: 'evt-stub-hormuz',
    relevant: true,
    riskLevel: 'high',
    riskScore: 60,
    matchedNodeIds: ['chokepoint-strait-of-hormuz'],
    affectedNodeIds: ['chokepoint-strait-of-hormuz'],
    affectedNodeNames: ['Strait of Hormuz'],
    affectedEdgeIds: [],
    affectedNodeTypes: ['chokepoint'],
    affectedCapacity: { nodeTotals: [], edgeTotals: [] },
    affectedFlow: { nodeTotals: [], edgeTotals: [] },
    impactReasons: ['stub'],
  },
  explanation: 'stub explanation',
};

const stubAgent: GeopoliticalRiskAgent = { analyze: async () => stubAnalysis };
const failingAgent: GeopoliticalRiskAgent = {
  analyze: async () => {
    throw new Error('stub geopolitical failure');
  },
};

let failingServer: Server;
let failingBaseUrl = '';
let stubServer: Server;
let stubBaseUrl = '';

before(async () => {
  const failingApp = createApp(repository, runtime, failingAgent);
  failingServer = createServer(failingApp);
  await new Promise<void>((resolve) => failingServer.listen(0, '127.0.0.1', resolve));
  const failingAddress = failingServer.address();
  if (!failingAddress || typeof failingAddress === 'string') throw new Error('Failing test server did not bind.');
  failingBaseUrl = `http://127.0.0.1:${failingAddress.port}`;

  const stubApp = createApp(repository, runtime, stubAgent);
  stubServer = createServer(stubApp);
  await new Promise<void>((resolve) => stubServer.listen(0, '127.0.0.1', resolve));
  const stubAddress = stubServer.address();
  if (!stubAddress || typeof stubAddress === 'string') throw new Error('Stub test server did not bind.');
  stubBaseUrl = `http://127.0.0.1:${stubAddress.port}`;
});

after(() => {
  failingServer.closeAllConnections();
  failingServer.close();
  stubServer.closeAllConnections();
  stubServer.close();
  database.close();
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

test('orchestrator: start failure -> 500 with FAILED assessment and downstream SKIPPED stages', async () => {
  const response = await fetch(`${failingBaseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Strait of Hormuz disruption' }),
  });

  assert.equal(response.status, 500);
  const body = await response.json() as any;
  assert.equal(body.status, 'ERROR');
  assert.match(body.error, /stub geopolitical failure/);
  assert.ok(body.assessment, 'failed assessment must be attached');
  assert.equal(body.assessment.status, 'FAILED');
  assert.equal(body.assessment.stages[0].stage, 'geopoliticalAnalysis');
  assert.equal(body.assessment.stages[0].status, 'FAILED');
  assert.ok(body.assessment.stages.slice(1).every((stage: any) => stage.status === 'SKIPPED'));
  assert.ok(body.assessment.errors.length > 0);
  assert.equal(body.pipeline, undefined);

  // Failed assessments are still persisted (honest history, no fake success).
  assert.ok(repository.getOrbitAssessment(body.assessment.assessmentId));
});

test('orchestrator: partial failure when duration is missing -> 200 PARTIAL, FAILED stage, no legacy pipeline', async () => {
  const response = await fetch(`${stubBaseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: 'Strait of Hormuz disruption',
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal(body.status, 'AVAILABLE');
  assert.equal(body.assessment.status, 'PARTIAL');
  const stageStatus = Object.fromEntries(
    body.assessment.stages.map((stage: any) => [stage.stage, stage.status]),
  );
  assert.equal(stageStatus.geopoliticalAnalysis, 'COMPLETED');
  assert.equal(stageStatus.networkImpactResolution, 'COMPLETED');
  assert.equal(stageStatus.reserveOptimization, 'FAILED');
  assert.match(
    body.assessment.stages.find((stage: any) => stage.stage === 'reserveOptimization').error,
    /duration/i,
  );
  assert.ok(body.assessment.errors.length > 0);
  assert.ok(body.assessment.summary.length > 0);
  assert.equal(body.pipeline, undefined);
});

test('orchestrator: happy path -> COMPLETED assessment, legacy payload, persistence, query endpoints', async () => {
  const response = await fetch(`${stubBaseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Strait of Hormuz disruption', durationDays: 10 }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal(body.status, 'AVAILABLE');
  const assessment = body.assessment;
  assert.match(assessment.assessmentId, /^assessment-[0-9a-f-]{36}$/);
  assert.equal(assessment.status, 'COMPLETED');
  assert.equal(assessment.trigger, 'manual_request');
  assert.equal(assessment.stages.length, 3);
  assert.ok(assessment.stages.every((stage: any) => stage.status === 'COMPLETED'));
  assert.deepEqual(assessment.errors, []);
  assert.equal(assessment.overallRisk, 'high');
  assert.ok(assessment.reserve.optimizationId.startsWith('reserve-optimization-'));
  assert.ok(assessment.summary.length > 0);
  assert.ok(assessment.recommendation && assessment.recommendation.length > 0);

  // legacy payload preserved and consistent with the assessment
  assert.ok(body.pipeline?.stages, 'legacy pipeline payload preserved');
  assert.equal(body.pipeline.stages.reserveOptimization.optimizationId, assessment.reserve.optimizationId);
  assert.equal(body.pipeline.stages.geopoliticalAnalysis.event.id, assessment.geopolitical.event.id);

  // persistence + query endpoints
  const latestResponse = await fetch(`${stubBaseUrl}/api/assessments/latest`);
  const latestBody = await latestResponse.json() as any;
  assert.equal(latestBody.assessment.assessmentId, assessment.assessmentId);

  const byIdResponse = await fetch(`${stubBaseUrl}/api/assessments/${assessment.assessmentId}`);
  assert.equal(byIdResponse.status, 200);
  const byIdBody = await byIdResponse.json() as any;
  assert.equal(byIdBody.assessment.status, 'COMPLETED');

  const missingResponse = await fetch(`${stubBaseUrl}/api/assessments/assessment-does-not-exist`);
  assert.equal(missingResponse.status, 404);

  const listResponse = await fetch(`${stubBaseUrl}/api/assessments?limit=10`);
  const listBody = await listResponse.json() as any;
  assert.equal(listBody.status, 'AVAILABLE');
  assert.ok(listBody.count >= 1);
});

test('orchestrator: input validation -> 400 when neither text nor event is provided', async () => {
  const response = await fetch(`${stubBaseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  const body = await response.json() as any;
  assert.equal(body.status, 'ERROR');
  assert.match(body.error, /Either "text" or "event" is required/);
});