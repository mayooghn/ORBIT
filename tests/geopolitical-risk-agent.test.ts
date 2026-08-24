import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test, { after, before } from 'node:test';
import { createApp } from '../server';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { classifyGeopoliticalEvent } from '../src/geopoliticalEvents/classification';
import { integrateGeopoliticalRiskWithDigitalTwin } from '../src/geopoliticalEvents/digitalTwinIntegration';
import { GeopoliticalEventIngestionStore } from '../src/geopoliticalEvents/ingestion';
import { analyzeGeopoliticalSupplyChainRelevance } from '../src/geopoliticalEvents/relevance';
import { GeopoliticalRiskIntelligenceAgent, type GeopoliticalRiskAgent, type GeopoliticalRiskAgentResponse } from '../src/geopoliticalEvents/agent';
import { assessGeopoliticalRisk } from '../src/geopoliticalEvents/risk';
import { createGroqAgentProvider, createGroqNewsProvider, getExtractionMaxCompletionTokens, GroqConfigurationError, GroqRateLimitError, GroqService, GroqServiceError, type GroqExplanationInput, type GroqModelClient, type GroqServiceContract } from '../src/geopoliticalEvents/groq';
import { createDigitalTwinRuntime, type DigitalTwinRuntime } from '../src/digitalTwin/runtime';

const processedDir = path.join(process.cwd(), 'data', 'processed');
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-geopolitical-agent-'));
const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
let database = openPhase2Database({ dbPath: databasePath });
let runtime: DigitalTwinRuntime;
let server: Server;
let baseUrl = '';

const validExtractedEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'agent-event-1',
  title: 'Strait of Hormuz disruption',
  description: 'A disruption was reported at the Strait of Hormuz affecting crude maritime transit.',
  timestamp: '2026-08-21T12:00:00.000Z',
  source: 'User request',
  sourceUrl: 'https://example.gov/events/1',
  location: 'Strait of Hormuz',
  countriesInvolved: ['Iran', 'Oman'],
  category: 'maritime_disruption',
  severity: 'critical',
  ...overrides,
});

class MockGroqService implements GroqServiceContract {
  readonly extractionRequests: string[] = [];
  readonly explanationInputs: GroqExplanationInput[] = [];

  constructor(private readonly extractedEvent: unknown, private readonly explanation = 'The deterministic result identifies the matched energy network and its affected assets.') {}

  async extractEvent(request: string): Promise<unknown> {
    this.extractionRequests.push(request);
    return structuredClone(this.extractedEvent);
  }

  async explain(input: GroqExplanationInput): Promise<string> {
    this.explanationInputs.push(structuredClone(input));
    return this.explanation;
  }
}

const runAgent = (extractedEvent: unknown, llm?: GroqServiceContract) => {
  const service = llm || new MockGroqService(extractedEvent);
  const agent = new GeopoliticalRiskIntelligenceAgent(runtime, service);
  return { service, analyze: (request: string) => agent.analyze(request) };
};

const withEnvironment = async (
  values: Record<string, string | undefined>,
  callback: () => Promise<void>,
): Promise<void> => {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    await callback();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
};

const providerInternals = (provider: GroqService): { apiKey?: string; model: string } => provider as unknown as { apiKey?: string; model: string };

before(async () => {
  importPhase2Data({ dbPath: databasePath, processedDir });
  database.close();
  database = openPhase2Database({ dbPath: databasePath });
  runtime = createDigitalTwinRuntime(new Phase2Repository(database));

  const apiAgent: GeopoliticalRiskAgent = {
    async analyze(request: string): Promise<GeopoliticalRiskAgentResponse> {
      return {
        request,
        event: validExtractedEvent(),
        classification: { eventId: 'agent-event-1', category: 'maritime_disruption', severity: 'critical', energyRelevant: true, countriesInvolved: ['Iran', 'Oman'], location: 'Strait of Hormuz', region: 'Middle East', classificationReasons: [] },
        relevance: { eventId: 'agent-event-1', relevant: true, matchedNodeIds: ['chokepoint-strait-of-hormuz'], matchedNodeTypes: ['chokepoint'], matchedLocations: ['Strait of Hormuz'], matchedCountries: ['Iran', 'Oman'], relevanceReasons: [] },
        risk: { eventId: 'agent-event-1', riskLevel: 'critical', riskScore: 80, factors: [], reasoning: [], matchedNodeIds: ['chokepoint-strait-of-hormuz'], energyRelevant: true },
        digitalTwinImpact: { eventId: 'agent-event-1', relevant: true, riskLevel: 'critical', riskScore: 80, matchedNodeIds: ['chokepoint-strait-of-hormuz'], affectedNodeIds: [], affectedEdgeIds: [], affectedNodeTypes: [], affectedCapacity: { nodeTotals: [], edgeTotals: [] }, affectedFlow: { nodeTotals: [], edgeTotals: [] }, impactReasons: [] },
        explanation: 'The mocked agent explanation preserves the deterministic values.',
      } as GeopoliticalRiskAgentResponse;
    },
  };
  const app = createApp(new Phase2Repository(database), runtime, apiAgent);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('structured request handling runs the Groq-to-ORBIT pipeline', async () => {
  const { service, analyze } = runAgent(validExtractedEvent());
  const result = await analyze('What happens if the Strait of Hormuz is disrupted?');
  assert.equal(result.request, 'What happens if the Strait of Hormuz is disrupted?');
  assert.equal(result.event.id, 'agent-event-1');
  assert.equal(result.classification.eventId, result.event.id);
  assert.equal(result.relevance.eventId, result.event.id);
  assert.equal(result.risk.eventId, result.event.id);
  assert.equal(result.digitalTwinImpact.eventId, result.event.id);
  assert.equal((service as MockGroqService).extractionRequests.length, 1);
  assert.equal((service as MockGroqService).explanationInputs.length, 1);
});

test('Groq service abstraction parses structured extraction and explanation with default 1500 token budget', async () => {
  const calls: Array<{ model: string; messages: Array<{ role: 'system' | 'user'; content: string }>; max_completion_tokens?: number; response_format?: unknown }> = [];
  const client: GroqModelClient = {
    chat: {
      completions: {
        async create(options) {
          calls.push(options);
          return { choices: [{ message: { content: calls.length === 1 ? JSON.stringify(validExtractedEvent()) : 'Deterministic explanation.' } }] };
        },
      },
    },
  };
  const service = new GroqService({ apiKey: 'test-key', client });
  assert.deepEqual(await service.extractEvent('Hormuz disruption'), validExtractedEvent());
  assert.equal(await service.explain({} as GroqExplanationInput), 'Deterministic explanation.');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].model, 'openai/gpt-oss-20b');
  assert.equal(calls[0].max_completion_tokens, 1500);
  assert.equal(calls[1].max_completion_tokens, 140);
  assert.ok(calls[1].messages[1].content.length < 1_000);
  assert.equal((calls[0].response_format as { type: string }).type, 'json_schema');
});

test('EXTRACTION_MAX_COMPLETION_TOKENS environment variable configures completion budget and defaults safely', async () => {
  await withEnvironment({ EXTRACTION_MAX_COMPLETION_TOKENS: '2000' }, async () => {
    assert.equal(getExtractionMaxCompletionTokens(), 2000);
  });

  await withEnvironment({ EXTRACTION_MAX_COMPLETION_TOKENS: undefined }, async () => {
    assert.equal(getExtractionMaxCompletionTokens(), 1500);
  });

  await withEnvironment({ EXTRACTION_MAX_COMPLETION_TOKENS: 'invalid' }, async () => {
    assert.equal(getExtractionMaxCompletionTokens(), 1500);
  });

  await withEnvironment({ EXTRACTION_MAX_COMPLETION_TOKENS: '-50' }, async () => {
    assert.equal(getExtractionMaxCompletionTokens(), 1500);
  });

  await withEnvironment({ EXTRACTION_MAX_COMPLETION_TOKENS: '0' }, async () => {
    assert.equal(getExtractionMaxCompletionTokens(), 1500);
  });
});

test('the user-facing agent provider uses AGENT credentials and model explicitly', async () => {
  await withEnvironment({
    GROQ_AGENT_API_KEY: 'agent-secret',
    GROQ_AGENT_MODEL: 'agent-model',
    GROQ_NEWS_API_KEY: 'news-secret',
    GROQ_NEWS_MODEL: 'news-model',
    GROQ_API_KEY: 'legacy-secret',
    GROQ_MODEL: 'legacy-model',
  }, async () => {
    const provider = createGroqAgentProvider({ client: {} as GroqModelClient });
    const internals = providerInternals(provider);
    assert.equal(internals.apiKey, 'agent-secret');
    assert.equal(internals.model, 'agent-model');
    assert.equal(JSON.stringify(provider).includes('agent-secret'), false);
  });
});

test('the NEWS provider uses NEWS credentials and model explicitly', async () => {
  await withEnvironment({
    GROQ_AGENT_API_KEY: 'agent-secret',
    GROQ_AGENT_MODEL: 'agent-model',
    GROQ_NEWS_API_KEY: 'news-secret',
    GROQ_NEWS_MODEL: 'news-model',
    GROQ_API_KEY: 'legacy-secret',
    GROQ_MODEL: 'legacy-model',
  }, async () => {
    const provider = createGroqNewsProvider({ client: {} as GroqModelClient });
    const internals = providerInternals(provider);
    assert.equal(internals.apiKey, 'news-secret');
    assert.equal(internals.model, 'news-model');
    assert.equal(JSON.stringify(provider).includes('news-secret'), false);
  });
});

test('the agent provider requires GROQ_AGENT_API_KEY and never falls back to legacy GROQ_API_KEY', async () => {
  await withEnvironment({
    GROQ_AGENT_API_KEY: undefined,
    GROQ_AGENT_MODEL: undefined,
    GROQ_NEWS_API_KEY: 'news-only-secret',
    GROQ_NEWS_MODEL: 'news-only-model',
    GROQ_API_KEY: 'legacy-secret',
    GROQ_MODEL: 'legacy-model',
  }, async () => {
    await assert.rejects(
      () => createGroqAgentProvider().extractEvent('Hormuz disruption'),
      (error: unknown) => error instanceof GroqConfigurationError && error.message.includes('GROQ_AGENT_API_KEY'),
    );
  });
});

test('the NEWS provider never falls back to AGENT or legacy credentials', async () => {
  await withEnvironment({
    GROQ_AGENT_API_KEY: 'agent-only-secret',
    GROQ_AGENT_MODEL: 'agent-only-model',
    GROQ_NEWS_API_KEY: undefined,
    GROQ_NEWS_MODEL: undefined,
    GROQ_API_KEY: 'legacy-secret',
    GROQ_MODEL: 'legacy-model',
  }, async () => {
    await assert.rejects(
      () => createGroqNewsProvider().extractEvent('Hormuz disruption'),
      (error: unknown) => error instanceof GroqConfigurationError && error.message.includes('GROQ_NEWS_API_KEY'),
    );
  });
});

test('deterministic tools are invoked and supplied to Groq explanation', async () => {
  const service = new MockGroqService(validExtractedEvent());
  const result = await new GeopoliticalRiskIntelligenceAgent(runtime, service).analyze('Analyze Hormuz.');
  assert.equal(service.extractionRequests.length, 1);
  assert.equal(service.explanationInputs.length, 1);
  const explanationInput = service.explanationInputs[0];
  assert.ok(explanationInput);
  assert.equal(explanationInput.event.id, result.event.id);
  assert.equal(explanationInput.classification.eventId, result.event.id);
  assert.equal(explanationInput.relevance.eventId, result.event.id);
  assert.equal(explanationInput.risk.eventId, result.event.id);
  assert.equal(explanationInput.digitalTwinImpact.eventId, result.event.id);
  assert.ok(result.relevance.matchedNodeIds.includes('chokepoint-strait-of-hormuz'));
  const event = new GeopoliticalEventIngestionStore().ingest(validExtractedEvent());
  const classification = classifyGeopoliticalEvent(event);
  const relevance = analyzeGeopoliticalSupplyChainRelevance(event, runtime.stateEngine.getCurrentTwin(), classification);
  const risk = assessGeopoliticalRisk(event, classification, relevance);
  const digitalTwinImpact = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, runtime);
  assert.deepEqual(result.event, event);
  assert.deepEqual(result.classification, classification);
  assert.deepEqual(result.relevance, relevance);
  assert.deepEqual(result.risk, risk);
  assert.deepEqual(result.digitalTwinImpact, digitalTwinImpact);
});

test('unmatched events produce deterministic risk score 0 and no Digital Twin impact', async () => {
  const unrelatedEvent = validExtractedEvent({
    id: 'agent-event-unrelated',
    title: 'Local election update',
    description: 'A municipal election occurred with no supply chain relevance.',
    location: 'Small Town',
    countriesInvolved: ['Small Nation'],
    category: 'political_instability',
    severity: 'low',
  });
  const { analyze } = runAgent(unrelatedEvent);
  const result = await analyze('Analyze local election.');
  assert.equal(result.classification.energyRelevant, false);
  assert.equal(result.relevance.relevant, false);
  assert.equal(result.risk.energyRelevant, false);
  assert.equal(result.risk.riskScore, 0);
  assert.equal(result.risk.riskLevel, 'low');
  assert.equal(result.digitalTwinImpact.relevant, false);
  assert.equal(result.digitalTwinImpact.affectedNodeIds.length, 0);
  assert.equal(result.digitalTwinImpact.affectedEdgeIds.length, 0);
  assert.match(result.explanation, /classification marked the event as not energy relevant/);
});

test('invalid extracted events are rejected by validation', async () => {
  const invalidEvent = { ...validExtractedEvent(), severity: 'apocalyptic' };
  const { analyze } = runAgent(invalidEvent);
  await assert.rejects(() => analyze('Analyze invalid event.'), (error: unknown) => error instanceof Error && error.message.includes('severity'));
});

test('missing Groq API key produces a configuration error', async () => {
  const agentProvider = createGroqAgentProvider({ apiKey: '' });
  await assert.rejects(
    () => agentProvider.extractEvent('Hormuz disruption'),
    (error: unknown) => error instanceof GroqConfigurationError && error.message.includes('GROQ_AGENT_API_KEY'),
  );
});

test('invalid Groq structured output produces a clear service error', async () => {
  const client: GroqModelClient = {
    chat: {
      completions: {
        async create() {
          return { choices: [{ message: { content: 'not-json' } }] };
        },
      },
    },
  };
  const service = new GroqService({ apiKey: 'test-key', client });
  await assert.rejects(
    () => service.extractEvent('Hormuz disruption'),
    (error: unknown) => error instanceof GroqServiceError && error.message.includes('invalid structured event JSON'),
  );
});

test('Groq 429 is surfaced with retry timing and never retried by the service', async () => {
  const error = new Error('Rate limit reached');
  (error as { status?: number }).status = 429;
  (error as { headers?: Record<string, string> }).headers = { 'retry-after-ms': '12500' };

  const client: GroqModelClient = {
    chat: {
      completions: {
        async create() {
          throw error;
        },
      },
    },
  };
  const service = new GroqService({ apiKey: 'test-key', client });

  await assert.rejects(
    () => service.extractEvent('Hormuz disruption'),
    (rateLimitError: unknown) =>
      rateLimitError instanceof GroqRateLimitError &&
      rateLimitError.status === 429 &&
      rateLimitError.retryAfterMs === 12500 &&
      Number.isFinite(Date.parse(rateLimitError.retryAt)),
  );
});

test('agent protects deterministic inputs and results from Groq mutation', async () => {
  const mutatingClient: GroqServiceContract = {
    async extractEvent() {
      return validExtractedEvent();
    },
    async explain(input) {
      input.request = 'Mutated request';
      input.event.title = 'Mutated title';
      input.risk.riskScore = 999;
      return 'Explanation returned after internal mutation attempt.';
    },
  };
  const { analyze } = runAgent(validExtractedEvent(), mutatingClient);
  const result = await analyze('What happens if the Strait of Hormuz is disrupted?');

  assert.equal(result.request, 'What happens if the Strait of Hormuz is disrupted?');
  assert.equal(result.event.title, 'Strait of Hormuz disruption');
  assert.equal(result.risk.riskScore, 87);
});

test('POST /api/geopolitical-risk/agent follows the API convention', async () => {
  const response = await fetch(`${baseUrl}/api/geopolitical-risk/agent`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ request: 'What happens if the Strait of Hormuz is disrupted?' }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { status: string; event: { title: string } };
  assert.equal(body.status, 'AVAILABLE');
  assert.equal(body.event.title, 'Strait of Hormuz disruption');
});

test('the agent API returns a clean 429 state without retrying after Groq rate limiting', async () => {
  const rateLimitError = new Error('Rate limit reached');
  (rateLimitError as { status?: number }).status = 429;
  (rateLimitError as { headers?: Record<string, string> }).headers = { 'retry-after-ms': '5000' };

  const rateLimitedProvider: GroqServiceContract = {
    async extractEvent() {
      throw new GroqRateLimitError(5000);
    },
    async explain() {
      throw new Error('Explain should not be called when extraction is rate-limited.');
    },
  };
  const app = createApp(new Phase2Repository(database), runtime, new GeopoliticalRiskIntelligenceAgent(runtime, rateLimitedProvider));
  const rateLimitedServer = createServer(app);
  await new Promise<void>((resolve) => rateLimitedServer.listen(0, '127.0.0.1', resolve));
  const address = rateLimitedServer.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind.');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/geopolitical-risk/agent`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: 'Hormuz disruption' }),
    });
    assert.equal(response.status, 429);
    const body = (await response.json()) as { status: string; code: string; retryAfterMs: number };
    assert.equal(body.status, 'ERROR');
    assert.equal(body.code, 'GROQ_RATE_LIMITED');
    assert.equal(body.retryAfterMs, 5000);
  } finally {
    rateLimitedServer.close();
  }
});
