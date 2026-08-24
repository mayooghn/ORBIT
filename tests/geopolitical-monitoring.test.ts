import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test, { after, before, beforeEach } from 'node:test';
import { createApp } from '../server';
import { openPhase2Database } from '../src/dataLayer/database';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime, type DigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { DigitalTwinGraphModel } from '../src/digitalTwin/model';
import { DigitalTwinImpactAnalyzer } from '../src/digitalTwin/impact';
import { DigitalTwinStateEngine } from '../src/digitalTwin/state';
import { analyzeGeopoliticalEventDeterministically, type GeopoliticalRiskAgent, type GeopoliticalRiskAgentAnalysisOptions, type GeopoliticalRiskAgentResponse } from '../src/geopoliticalEvents/agent';
import { areLikelySameEvent } from '../src/geopoliticalEvents/deduplication';
import { GroqRateLimitError, type GroqServiceContract } from '../src/geopoliticalEvents/groq';
import { extractDeterministicGeopoliticalEvent } from '../src/geopoliticalEvents/deterministicExtractor';
import { createN8nMonitoringRefreshTrigger, DuplicateMonitoredEventError, ExternalCandidateBudgetExceededError, GeopoliticalMonitoringService, IrrelevantMonitoringCandidateError, MonitoringRefreshTriggerError, getMonitoringConfig, isEnergyMonitoringCandidate, type MonitoringArticleSource, type MonitoringConfig } from '../src/geopoliticalEvents/monitoring';
import { ENERGY_MONITORING_QUERIES, fetchGoogleNews, parseGoogleNewsRss, parseRssFeed, type NewsApiResponse, type RawNewsArticle } from '../src/services/dataIngestion/googleNews';

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-geopolitical-monitoring-'));
const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
let database = openPhase2Database({ dbPath: databasePath });
let runtime: DigitalTwinRuntime;
let deterministicRuntime: DigitalTwinRuntime;

const rssXml = `<?xml version="1.0"?><rss><channel><item><title>Strait of Hormuz disruption - Test Wire</title><link>https://example.test/hormuz</link><pubDate>Fri, 21 Aug 2026 12:00:00 GMT</pubDate><description>Crude shipping disruption reported.</description><source>Test Wire</source></item><item><title>Malformed item</title><link>not-a-url</link></item></channel></rss>`;

const article = (overrides: Partial<RawNewsArticle> = {}): RawNewsArticle => ({
  id: 'news-hormuz',
  title: 'Strait of Hormuz disruption',
  url: 'https://example.test/hormuz',
  source: 'Test Wire',
  publishedAt: '2026-08-21T12:00:00.000Z',
  description: 'Crude shipping disruption reported.',
  retrievedAt: '2026-08-21T12:01:00.000Z',
  query: 'Strait of Hormuz',
  ...overrides,
});

const analysisFor = (request: string): GeopoliticalRiskAgentResponse => {
  const normalizedRequest = request.toLowerCase();
  const isHormuz = normalizedRequest.includes('hormuz');
  const isPiracy = normalizedRequest.includes('pirate') || normalizedRequest.includes('tanker') || normalizedRequest.includes('yemen');
  const relevant = isHormuz || isPiracy;
  const riskLevel = relevant ? 'critical' : 'low';
  const eventId = isHormuz ? 'monitor-hormuz' : isPiracy ? 'monitor-piracy-yemen' : 'monitor-unrelated';
  const eventTitle = isHormuz ? 'Strait of Hormuz disruption' : isPiracy ? 'Somali pirates hijack oil tanker off Yemen' : 'Unrelated event';
  const countriesInvolved = isHormuz ? ['Iran', 'Oman'] : isPiracy ? ['Somalia', 'Yemen'] : ['France'];
  const location = isHormuz ? 'Strait of Hormuz' : isPiracy ? 'Off the coast of Yemen' : undefined;
  const category = relevant ? 'maritime_disruption' : 'other';
  return {
    request,
    event: { id: eventId, title: eventTitle, description: request, timestamp: '2026-08-21T12:00:00.000Z', source: 'Test Wire', ...(location ? { location } : {}), countriesInvolved, category, severity: relevant ? 'critical' : 'low' },
    classification: { eventId, category, severity: relevant ? 'critical' : 'low', energyRelevant: relevant, countriesInvolved, region: relevant ? 'Middle East' : 'Europe', classificationReasons: [] },
    relevance: { eventId, relevant, matchedNodeIds: isHormuz ? ['chokepoint-strait-of-hormuz'] : [], matchedNodeTypes: isHormuz ? ['chokepoint'] : [], matchedLocations: location ? [location] : [], matchedCountries: relevant ? countriesInvolved : [], relevanceReasons: [] },
    risk: { eventId, riskLevel, riskScore: relevant ? 87 : 0, factors: [], reasoning: [], matchedNodeIds: isHormuz ? ['chokepoint-strait-of-hormuz'] : [], energyRelevant: relevant },
    digitalTwinImpact: { eventId, relevant, riskLevel, riskScore: relevant ? 87 : 0, matchedNodeIds: isHormuz ? ['chokepoint-strait-of-hormuz'] : [], affectedNodeIds: isHormuz ? ['shipping-route-hormuz-india'] : [], affectedEdgeIds: isHormuz ? ['relationship-hormuz-to-india-facing-route'] : [], affectedNodeTypes: isHormuz ? ['shipping_route'] : [], affectedCapacity: { nodeTotals: [], edgeTotals: [] }, affectedFlow: { nodeTotals: [], edgeTotals: [] }, impactReasons: [] },
    explanation: relevant ? 'The deterministic monitor identified a critical maritime energy risk.' : 'No energy supply-chain relevance was found.',
  };
};

class MockAgent implements GeopoliticalRiskAgent {
  calls: string[] = [];
  options: GeopoliticalRiskAgentAnalysisOptions[] = [];
  async analyze(request: string, options?: GeopoliticalRiskAgentAnalysisOptions): Promise<GeopoliticalRiskAgentResponse> {
    this.calls.push(request);
    if (options) this.options.push(options);
    return analysisFor(request);
  }
}

class RateLimitedAgent implements GeopoliticalRiskAgent {
  calls = 0;
  async analyze(): Promise<GeopoliticalRiskAgentResponse> {
    this.calls += 1;
    throw new GroqRateLimitError(60_000);
  }
}

class NewsProviderStub implements Pick<GroqServiceContract, 'extractEvent'> {
  calls: string[] = [];

  constructor(private readonly response: unknown | Error) {}

  async extractEvent(request: string): Promise<unknown> {
    this.calls.push(request);
    if (this.response instanceof Error) throw this.response;
    return structuredClone(this.response);
  }
}

const newsEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'news-fallback-event',
  title: 'Iran oil supply tension',
  description: 'Iran oil supply tension was reported by the source.',
  timestamp: '2026-08-21T12:00:00.000Z',
  source: 'Test Wire',
  sourceUrl: 'https://example.test/news-fallback',
  location: 'Persian Gulf',
  countriesInvolved: ['Iran'],
  category: 'political_instability',
  severity: 'medium',
  ...overrides,
});

const productionMonitoring = (
  agent: GeopoliticalRiskAgent,
  provider: Pick<GroqServiceContract, 'extractEvent'> | undefined,
  source: MonitoringArticleSource,
  config: MonitoringConfig = {},
): GeopoliticalMonitoringService => new GeopoliticalMonitoringService(
  database,
  agent,
  { enabled: true, ...config },
  source,
  undefined,
  { runtime: deterministicRuntime, ...(provider ? { newsProvider: provider } : {}) },
);

const createDeterministicMonitoringRuntime = (): DigitalTwinRuntime => {
  const graph = new DigitalTwinGraphModel();
  graph.addNode({ nodeId: 'supplier-iran', nodeType: 'supplier', name: 'Iran', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [], metadata: { sourceCountryName: 'Iran' } });
  graph.addNode({ nodeId: 'shipping-route-hormuz', nodeType: 'shipping_route', name: 'Strait of Hormuz-India Crude Flow', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  graph.addNode({ nodeId: 'chokepoint-strait-of-hormuz', nodeType: 'chokepoint', name: 'Strait of Hormuz', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  graph.addEdge({ edgeId: 'supplier-to-route', edgeType: 'supplier_to_shipping_route', fromNodeId: 'supplier-iran', toNodeId: 'shipping-route-hormuz', sourceReferences: [], evidence: 'test source', notes: 'test relationship', confidence: 1 });
  graph.addEdge({ edgeId: 'route-to-hormuz', edgeType: 'shipping_route_to_chokepoint', fromNodeId: 'shipping-route-hormuz', toNodeId: 'chokepoint-strait-of-hormuz', sourceReferences: [], evidence: 'test source', notes: 'test relationship', confidence: 1 });
  const stateEngine = new DigitalTwinStateEngine(graph.snapshot());
  return { stateEngine, impactAnalyzer: new DigitalTwinImpactAnalyzer(stateEngine) };
};

const sourceFor = (articles: RawNewsArticle[]): MonitoringArticleSource => ({
  async fetch(): Promise<NewsApiResponse> {
    return { status: 'AVAILABLE', source: 'Google News RSS', retrievedAt: new Date().toISOString(), count: articles.length, articles };
  },
});

before(() => {
  runtime = createDigitalTwinRuntime(new Phase2Repository(database));
  deterministicRuntime = createDeterministicMonitoringRuntime();
});

beforeEach(() => {
  new GeopoliticalMonitoringService(database, new MockAgent(), { enabled: false });
  database.exec('DELETE FROM geopolitical_monitor_processed; DELETE FROM geopolitical_monitor_results;');
});

after(() => {
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('RSS parser extracts valid articles and ignores malformed items', () => {
  const articles = parseGoogleNewsRss(rssXml, 'Hormuz', '2026-08-21T12:01:00.000Z');
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, 'Strait of Hormuz disruption');
  assert.equal(articles[0].source, 'Test Wire');
  assert.equal(articles[0].publishedAt, '2026-08-21T12:00:00.000Z');
});

test('energy monitoring query configuration covers the target oil threat domains', () => {
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('crude oil')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('Strait of Hormuz')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('Persian Gulf')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('Red Sea')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('OPEC')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('Saudi Arabia')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('oil pipeline')));
  assert.ok(ENERGY_MONITORING_QUERIES.some((query) => query.includes('oil refinery')));
});

test('n8n is the default scheduler and ORBIT polling remains opt-in fallback', () => {
  const original = process.env.ORBIT_MONITORING_ENABLED;
  delete process.env.ORBIT_MONITORING_ENABLED;
  try {
    assert.equal(getMonitoringConfig().enabled, false);
    assert.match(readFileSync(path.join(process.cwd(), '.env.example'), 'utf8'), /ORBIT_MONITORING_ENABLED=\"false\"/);
  } finally {
    if (original === undefined) delete process.env.ORBIT_MONITORING_ENABLED;
    else process.env.ORBIT_MONITORING_ENABLED = original;
  }
});

test('the n8n workflow export keeps fetching/filtering outside ORBIT and posts to the existing webhook', () => {
  const workflow = JSON.parse(readFileSync(path.join(process.cwd(), 'n8n', 'orbit-phase4-energy-monitoring.json'), 'utf8')) as {
    active: boolean;
    nodes: Array<{ name: string; type: string; onError?: string; continueOnFail?: boolean; parameters?: { url?: string; jsonBody?: string; jsCode?: string } }>;
    connections: Record<string, unknown>;
  };
  assert.equal(workflow.active, false);
  assert.deepEqual(workflow.nodes.map((node) => node.name), [
    'Schedule - Every 15 Minutes',
    'Manual Refresh - ORBIT',
    'Build Google News RSS Queries',
    'Fetch Google News RSS',
    'Build External Scan Summary',
    'POST Scan Summary to ORBIT',
    'Normalize and Filter Energy Candidates',
    'POST Candidate to ORBIT',
  ]);
  const queryNode = workflow.nodes.find((node) => node.name === 'Build Google News RSS Queries');
  const fetchNode = workflow.nodes.find((node) => node.name === 'Fetch Google News RSS');
  const normalizeNode = workflow.nodes.find((node) => node.name === 'Normalize and Filter Energy Candidates');
  const webhookNode = workflow.nodes.find((node) => node.name === 'POST Candidate to ORBIT');
  const buildQueries = new Function(queryNode?.parameters?.jsCode || '') as () => Array<{ json: { query: string; feedUrl: string } }>;
  const queries = buildQueries();
  assert.equal(queries.length, 17);
  assert.match(queries[0].json.feedUrl, /^https:\/\/news\.google\.com\/rss\/search\?/);
  assert.ok(queries.some((item) => item.json.query.includes('Strait of Hormuz')));
  assert.equal(fetchNode?.onError, 'continueRegularOutput');
  assert.equal(fetchNode?.continueOnFail, true);
  assert.equal(webhookNode?.onError, 'continueRegularOutput');
  assert.equal(webhookNode?.continueOnFail, true);
  assert.match(webhookNode?.parameters?.url || '', /api\/geopolitical-risk\/monitor\/events/);
  assert.match(webhookNode?.parameters?.jsonBody || '', /sourceUrl/);
  assert.match(webhookNode?.parameters?.jsonBody || '', /publishedAt/);
  assert.ok(workflow.connections['Normalize and Filter Energy Candidates']);

  const normalize = new Function('$input', normalizeNode?.parameters?.jsCode || '') as (input: { all: () => Array<{ json: Record<string, unknown> }> }) => Array<{ json: Record<string, unknown> }>;
  const normalized = normalize({ all: () => [
    { json: { data: rssXml, query: 'Strait of Hormuz oil' } },
    { json: { data: rssXml, query: 'oil tanker attack' } },
  ] });
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].json.title, 'Strait of Hormuz disruption - Test Wire');
  assert.equal(normalized[0].json.source, 'Test Wire');
  assert.equal(normalized[0].json.sourceUrl, 'https://example.test/hormuz');
  assert.equal(normalized[0].json.publishedAt, '2026-08-21T12:00:00.000Z');
  assert.match(String(normalized[0].json.id), /^n8n-/);
});

test('monitoring candidate filtering rejects general political news without an energy supply threat', () => {
  assert.equal(isEnergyMonitoringCandidate({ title: 'Election coalition talks continue', description: 'Party leaders met to discuss a new cabinet.' }), false);
  assert.equal(isEnergyMonitoringCandidate({ title: 'Oil pipeline disrupted after regional attack', description: 'Exports were halted while repairs begin.' }), true);
  assert.equal(isEnergyMonitoringCandidate({ title: 'Strait of Hormuz shipping disruption', description: 'Tanker traffic was temporarily halted.' }), true);
});

test('direct RSS and Atom normalization preserves feed origin, publisher, URL, and timestamp', () => {
  const atomXml = `<?xml version="1.0"?><feed><entry><title>Pipeline disruption</title><link href="https://direct.example/pipeline"/><updated>2026-08-21T13:00:00Z</updated><summary>Pipeline operations were disrupted.</summary><source>Direct Energy Wire</source></entry></feed>`;
  const articles = parseRssFeed(atomXml, 'direct-feed', '2026-08-21T13:01:00.000Z', 'direct_rss', 'https://direct.example/rss');
  assert.equal(articles.length, 1);
  assert.equal(articles[0].sourceType, 'direct_rss');
  assert.equal(articles[0].feedUrl, 'https://direct.example/rss');
  assert.equal(articles[0].source, 'Direct Energy Wire');
  assert.equal(articles[0].url, 'https://direct.example/pipeline');
  assert.equal(articles[0].publishedAt, '2026-08-21T13:00:00.000Z');
  assert.equal(articles[0].description, 'Pipeline operations were disrupted.');
});

test('Google News and configured direct RSS feeds normalize into one response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const direct = url.includes('direct.example');
    const xml = direct
      ? `<?xml version="1.0"?><rss><channel><item><title>Direct refinery disruption - Direct Wire</title><link>https://direct.example/refinery</link><pubDate>Fri, 21 Aug 2026 13:00:00 GMT</pubDate><description>Direct feed report.</description></item></channel></rss>`
      : `<?xml version="1.0"?><rss><channel><item><title>Google tanker disruption - Google Wire</title><link>https://google.example/tanker</link><pubDate>Fri, 21 Aug 2026 12:00:00 GMT</pubDate><description>Google News report.</description></item></channel></rss>`;
    return new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
  };
  try {
    const response = await fetchGoogleNews({ queries: ['tanker'], feedUrls: ['https://direct.example/rss'] });
    assert.equal(response.source, 'Google News + Direct RSS');
    assert.deepEqual(response.sources?.sort(), ['direct_rss', 'google_news']);
    assert.deepEqual(response.articles.map((item) => item.sourceType).sort(), ['direct_rss', 'google_news']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Google News and RSS deduplicate the same story across tracking URLs and sources', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const direct = url.includes('direct.example');
    const link = direct ? 'https://direct.example/oil-export?utm_source=feed' : 'https://direct.example/oil-export?oc=5';
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Oil export disruption - Energy Wire</title><link>${link}</link><pubDate>Fri, 21 Aug 2026 13:00:00 GMT</pubDate><description>Crude oil exports were disrupted by a tanker incident.</description><source>Energy Wire</source></item></channel></rss>`;
    return new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
  };
  try {
    const response = await fetchGoogleNews({ queries: ['oil export disruption'], feedUrls: ['https://direct.example/rss'] });
    assert.equal(response.count, 1);
    assert.equal(response.articles[0].source, 'Energy Wire');
    assert.equal(response.articles[0].url, 'https://direct.example/oil-export?oc=5');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('one failed RSS feed does not prevent another feed from returning real articles', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('failed.test')) throw new Error('feed unavailable');
    return new Response(rssXml, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
  };
  try {
    const response = await fetchGoogleNews({ feedUrls: ['https://failed.test/rss', 'https://working.test/rss'] });
    assert.equal(response.status, 'AVAILABLE');
    assert.equal(response.count, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('monitoring deduplicates the same canonical article URL across feed runs', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([
    article({ id: 'same-url-first', url: 'https://example.test/same-story?utm_source=google' }),
    article({ id: 'same-url-second', url: 'https://EXAMPLE.TEST/same-story?utm_medium=rss', title: 'Strait of Hormuz disruption - Reuters', source: 'Reuters' }),
  ]));
  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(result.eventsSkipped, 1);
  assert.equal(agent.calls.length, 1);
  assert.equal(service.getEvents().length, 1);
});

test('monitoring merges identical headlines from different publishers and aggregates source traceability', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([
    article({ id: 'publisher-ap', source: 'AP News', url: 'https://apnews.com/article/hormuz-disruption' }),
    article({ id: 'publisher-reuters', source: 'Reuters', url: 'https://reuters.com/world/hormuz-disruption' }),
  ]));
  const result = await service.scan();
  const [event] = service.getEvents();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(agent.calls.length, 1);
  assert.equal(service.getEvents().length, 1);
  assert.equal(event.analysis.risk.riskScore, 87);
  assert.equal(service.getAlerts().length, 1);
  assert.deepEqual(event.article.sources, ['AP News', 'Reuters']);
  assert.deepEqual(event.article.sourceReferences?.map((reference) => reference.url), [
    'https://apnews.com/article/hormuz-disruption',
    'https://reuters.com/world/hormuz-disruption',
  ]);
  assert.equal(event.article.source, 'AP News');
  assert.equal(event.article.url, 'https://apnews.com/article/hormuz-disruption');
});

test('monitoring conservatively merges a minor headline variation for the same underlying event', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([
    article({ id: 'variation-first', title: 'Somali pirates hijack oil tanker off Yemen', source: 'AP News', url: 'https://apnews.com/article/yemen-tanker' }),
    article({ id: 'variation-second', title: 'Somali pirate hijack oil tanker near Yemen', source: 'Reuters', url: 'https://reuters.com/world/yemen-tanker' }),
  ]));
  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(agent.calls.length, 1);
  assert.equal(service.getEvents().length, 1);
  assert.deepEqual(service.getEvents()[0].article.sources, ['AP News', 'Reuters']);
});

test('monitoring keeps distinct lookalike events separate when their locations differ', () => {
  assert.equal(areLikelySameEvent(
    { title: 'Somali pirates hijack oil tanker off Yemen', location: 'Off the coast of Yemen', countriesInvolved: ['Somalia', 'Yemen'], category: 'maritime_disruption', publishedAt: '2026-08-21T12:00:00.000Z' },
    { title: 'Somali pirates hijack oil tanker off Oman', location: 'Off the coast of Oman', countriesInvolved: ['Somalia', 'Oman'], category: 'maritime_disruption', publishedAt: '2026-08-21T12:00:00.000Z' },
  ), false);
});

test('monitoring tolerates classifier category drift when the event anchors are identical', () => {
  assert.equal(areLikelySameEvent(
    { title: 'U.S., Iran trade warnings as new sanctions loom and Hormuz oil flows stall', location: 'Strait of Hormuz', countriesInvolved: ['United States', 'Iran'], category: 'diplomatic_escalation', timestamp: '2026-08-22T01:25:35.000Z' },
    { title: 'U.S., Iran trade warnings as new sanctions loom and Hormuz oil flows stall', location: 'Strait of Hormuz', countriesInvolved: ['United States', 'Iran'], category: 'maritime_disruption', timestamp: '2026-08-22T01:27:33.000Z' },
  ), true);
});

test('monitoring merges the same event across a service restart and separate n8n webhook runs', async () => {
  const firstAgent = new MockAgent();
  const firstService = new GeopoliticalMonitoringService(database, firstAgent, { enabled: false });
  await firstService.ingestExternal({ id: 'n8n-run-one', title: 'Somali pirates hijack oil tanker off Yemen', description: 'Oil tanker seized near Yemen.', source: 'AP News', sourceUrl: 'https://apnews.com/article/yemen-tanker', publishedAt: '2026-08-21T12:00:00.000Z' });

  const secondAgent = new MockAgent();
  const restartedService = new GeopoliticalMonitoringService(database, secondAgent, { enabled: false });
  const merged = await restartedService.ingestExternal({ id: 'n8n-run-two', title: 'Somali pirate hijack oil tanker near Yemen', description: 'Oil tanker seized near Yemen.', source: 'Reuters', sourceUrl: 'https://reuters.com/world/yemen-tanker', publishedAt: '2026-08-21T12:05:00.000Z' });

  assert.equal(firstAgent.calls.length, 1);
  assert.equal(secondAgent.calls.length, 0);
  assert.equal(restartedService.getEvents().length, 1);
  assert.equal(merged.analysis.risk.riskScore, 87);
  assert.deepEqual(merged.article.sources, ['AP News', 'Reuters']);
  assert.equal(restartedService.getAlerts().length, 1);
});

test('monitoring deduplicates already processed articles and reuses the existing agent pipeline', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([article(), article()]));
  const first = await service.scan();
  const second = await service.scan();
  assert.equal(first.eventsProcessed, 1);
  assert.equal(first.eventsSkipped, 1);
  assert.equal(second.eventsProcessed, 0);
  assert.equal(second.eventsSkipped, 2);
  assert.equal(agent.calls.length, 1);
  assert.equal(service.getEvents().length, 1);
});

test('monitoring filters explicit external-feed articles before LLM extraction when they lack an energy supply threat', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([
    article({ id: 'news-filter-energy', url: 'https://example.test/filter-energy', sourceType: 'google_news' }),
    article({ id: 'news-filter-politics', url: 'https://example.test/filter-politics', title: 'Election coalition talks continue', description: 'Party leaders met to discuss a new cabinet.', sourceType: 'google_news' }),
  ]));
  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(result.eventsSkipped, 1);
  assert.equal(agent.calls.length, 1);
});

test('external webhook rejects an irrelevant candidate before LLM processing', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: false });
  await assert.rejects(
    () => service.ingestExternal({ id: 'webhook-politics', title: 'Election coalition talks continue', description: 'Party leaders met to discuss a new cabinet.', source: 'n8n' }),
    (error: unknown) => error instanceof IrrelevantMonitoringCandidateError,
  );
  assert.equal(agent.calls.length, 0);
  assert.equal(service.getEvents().length, 0);
});

test('monitoring passes deterministic explanation mode and uses one LLM analysis per candidate', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([article({ id: 'single-llm-call', sourceType: 'google_news' })]));
  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.deepEqual(agent.options, [{ explanation: 'deterministic' }]);
  assert.equal(agent.calls.length, 1);
});

test('production monitoring routes a high-confidence article deterministically without calling either Groq path', async () => {
  const agent = new MockAgent();
  const provider = new NewsProviderStub(newsEvent());
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'deterministic-hormuz', sourceType: 'google_news', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(agent.calls.length, 0);
  assert.equal(provider.calls.length, 0);
  assert.equal(service.getEvents()[0].analysis.event.location, 'Strait of Hormuz');
});

test('production monitoring routes an uncertain article to NEWS Groq and then the deterministic ORBIT pipeline', async () => {
  const agent = new MockAgent();
  const provider = new NewsProviderStub(newsEvent());
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'uncertain-news', title: 'Iran oil price tension', description: 'Oil markets face tension in the Persian Gulf.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(agent.calls.length, 0);
  assert.equal(provider.calls.length, 1);
  assert.equal(service.getEvents()[0].analysis.event.id, 'news-fallback-event');
  assert.equal(service.getEvents()[0].analysis.risk.energyRelevant, true);
});

test('scan summary accounts exactly for deterministic, NEWS fallback, duplicate, and persisted outcomes', async () => {
  const deterministicArticles = Array.from({ length: 7 }, (_, index) => article({
    id: `summary-deterministic-${index + 1}`,
    url: `https://example.test/summary-deterministic-${index + 1}`,
    title: `Iran crude shipping disruption near Strait of Hormuz report ${index + 1}`,
    description: `Iran reports crude shipping disruption near the Strait of Hormuz in report ${index + 1}.`,
    publishedAt: `2026-08-${String(index * 4 + 1).padStart(2, '0')}T12:00:00.000Z`,
    sourceType: 'google_news',
  }));
  const duplicate = article({
    id: 'summary-duplicate',
    url: deterministicArticles[0].url,
    title: deterministicArticles[0].title,
    description: deterministicArticles[0].description,
    publishedAt: deterministicArticles[0].publishedAt,
    sourceType: 'google_news',
  });
  const fallbackArticles = [
    article({ id: 'summary-fallback-a', url: 'https://example.test/summary-fallback-a', title: 'Iran oil market tension fallback A', description: 'Oil markets face tension in the Persian Gulf sector A.', publishedAt: '2026-09-01T12:00:00.000Z', sourceType: 'google_news' }),
    article({ id: 'summary-fallback-b', url: 'https://example.test/summary-fallback-b', title: 'Iran oil market tension fallback B', description: 'Oil markets face tension in the Persian Gulf sector B.', publishedAt: '2026-09-05T12:00:00.000Z', sourceType: 'google_news' }),
  ];
  const provider: Pick<GroqServiceContract, 'extractEvent'> = {
    async extractEvent(request: string): Promise<unknown> {
      const suffix = request.includes('fallback B') ? 'b' : 'a';
      return newsEvent({
        id: `summary-fallback-event-${suffix}`,
        title: `Iran oil market tension fallback ${suffix.toUpperCase()}`,
        sourceUrl: `https://example.test/summary-fallback-event-${suffix}`,
        timestamp: suffix === 'a' ? '2026-09-01T12:00:00.000Z' : '2026-09-05T12:00:00.000Z',
      });
    },
  };
  const service = productionMonitoring(new MockAgent(), provider, sourceFor([...deterministicArticles, duplicate, ...fallbackArticles]), { maxArticlesPerScan: 100 });

  const result = await service.scan();
  assert.deepEqual({
    status: result.status,
    articlesFetched: result.articlesFetched,
    candidatesAfterFiltering: result.candidatesAfterFiltering,
    deterministicHighConfidence: result.deterministicHighConfidence,
    deterministicRejected: result.deterministicRejected,
    groqFallbackCandidates: result.groqFallbackCandidates,
    groqFallbackSuccessful: result.groqFallbackSuccessful,
    groqRateLimited: result.groqRateLimited,
    groqDeferred: result.groqDeferred,
    groqFailed: result.groqFailed,
    duplicates: result.duplicates,
    invalidEvents: result.invalidEvents,
    newEventsPersisted: result.newEventsPersisted,
  }, {
    status: 'SUCCESS',
    articlesFetched: 10,
    candidatesAfterFiltering: 10,
    deterministicHighConfidence: 7,
    deterministicRejected: 2,
    groqFallbackCandidates: 2,
    groqFallbackSuccessful: 2,
    groqRateLimited: 0,
    groqDeferred: 0,
    groqFailed: 0,
    duplicates: 1,
    invalidEvents: 0,
    newEventsPersisted: 9,
  });
  assert.equal(service.getStatus().lastScanStatus, 'SUCCESS');
  assert.equal(service.getEvents().length, 9);
});

test('NEWS 429 produces PARTIAL accounting while deterministic events still persist', async () => {
  const service = productionMonitoring(new MockAgent(), new NewsProviderStub(new GroqRateLimitError(60_000)), sourceFor([
    article({ id: 'summary-rate-deterministic', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
    article({ id: 'summary-rate-fallback', url: 'https://example.test/summary-rate-fallback', title: 'Iran oil market tension', description: 'Oil markets face tension in the Persian Gulf.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.deterministicHighConfidence, 1);
  assert.equal(result.groqFallbackCandidates, 1);
  assert.equal(result.groqRateLimited, 1);
  assert.equal(result.newEventsPersisted, 1);
  assert.equal(service.getEvents().length, 1);
  assert.equal(service.getStatus().lastScanSummary?.groqRateLimited, 1);
});

test('all candidates being duplicates produces NO_NEW_EVENTS', async () => {
  const firstService = productionMonitoring(new MockAgent(), new NewsProviderStub(newsEvent()), sourceFor([
    article({ id: 'summary-duplicate-seed' }),
  ]));
  await firstService.scan();

  const secondService = productionMonitoring(new MockAgent(), new NewsProviderStub(newsEvent()), sourceFor([
    article({ id: 'summary-duplicate-run-one' }),
    article({ id: 'summary-duplicate-run-two' }),
  ]));
  const result = await secondService.scan();
  assert.equal(result.status, 'NO_NEW_EVENTS');
  assert.equal(result.candidatesAfterFiltering, 2);
  assert.equal(result.duplicates, 2);
  assert.equal(result.newEventsPersisted, 0);
  assert.equal(secondService.getStatus().lastScanStatus, 'NO_NEW_EVENTS');
});

test('no relevant candidates completes without fabricated events', async () => {
  const service = productionMonitoring(new MockAgent(), new NewsProviderStub(newsEvent()), sourceFor([
    article({ id: 'summary-irrelevant-one', title: 'Election coalition talks continue', description: 'Party leaders met to discuss a new cabinet.', sourceType: 'google_news' }),
    article({ id: 'summary-irrelevant-two', title: 'Cultural exchange announced', description: 'A cultural exchange was announced.', sourceType: 'google_news' }),
  ]));

  const result = await service.scan();
  assert.equal(result.status, 'NO_NEW_EVENTS');
  assert.equal(result.articlesFetched, 2);
  assert.equal(result.candidatesAfterFiltering, 0);
  assert.equal(result.newEventsPersisted, 0);
  assert.equal(service.getEvents().length, 0);
});

test('NEWS unavailable produces PARTIAL accounting while deterministic events continue', async () => {
  const service = productionMonitoring(new MockAgent(), undefined, sourceFor([
    article({ id: 'summary-unavailable-deterministic', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
    article({ id: 'summary-unavailable-fallback', url: 'https://example.test/summary-unavailable-fallback', title: 'Iran oil market tension', description: 'Oil markets face tension in the Persian Gulf.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.deterministicHighConfidence, 1);
  assert.equal(result.groqFallbackCandidates, 1);
  assert.equal(result.groqDeferred, 1);
  assert.equal(result.newEventsPersisted, 1);
  assert.equal(service.getEvents().length, 1);
});

test('NEWS Groq rate limits defer only uncertain articles while deterministic articles continue', async () => {
  const agent = new MockAgent();
  const provider = new NewsProviderStub(new GroqRateLimitError(60_000));
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'rate-limited-news', title: 'Iran oil price tension', description: 'Oil markets face tension in the Persian Gulf.' }),
    article({ id: 'deterministic-after-rate-limit', url: 'https://example.test/hormuz-after-rate-limit', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.failedEvents, 1);
  assert.equal(result.eventsProcessed, 1);
  assert.equal(provider.calls.length, 1);
  assert.equal(service.getEvents().length, 1);
  assert.equal(service.getEvents()[0].article.id, 'deterministic-after-rate-limit');
  assert.match(service.getStatus().lastError || '', /rate limit|retry/i);
});

test('NEWS Groq permanent failure does not fabricate an event or prevent deterministic persistence', async () => {
  const agent = new MockAgent();
  const provider = new NewsProviderStub(new Error('NEWS provider unavailable'));
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'failed-news', title: 'Iran oil price tension', description: 'Oil markets face tension in the Persian Gulf.' }),
    article({ id: 'deterministic-after-failure', url: 'https://example.test/hormuz-after-failure', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.failedEvents, 1);
  assert.equal(result.eventsProcessed, 1);
  assert.equal(service.getEvents().length, 1);
  assert.equal(service.getEvents()[0].article.id, 'deterministic-after-failure');
});

test('an invalid NEWS structured event is rejected without creating an incomplete monitoring result', async () => {
  const agent = new MockAgent();
  const provider = new NewsProviderStub({ title: 'Missing required event fields' });
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'invalid-news', title: 'Iran oil price tension', description: 'Oil markets face tension in the Persian Gulf.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.failedEvents, 1);
  assert.equal(service.getEvents().length, 0);
  assert.equal(service.getStatus().lastError && /invalid geopolitical event/i.test(service.getStatus().lastError), true);
});

test('duplicate deterministic articles are deduplicated before any NEWS Groq call', async () => {
  const agent = new MockAgent();
  const provider = new NewsProviderStub(newsEvent());
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'deterministic-duplicate-one', url: 'https://example.test/duplicate-deterministic', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
    article({ id: 'deterministic-duplicate-two', url: 'https://example.test/duplicate-deterministic?utm_source=repeat', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' }),
  ]));

  const result = await service.scan();
  assert.equal(result.eventsProcessed, 1);
  assert.equal(result.eventsSkipped, 1);
  assert.equal(provider.calls.length, 0);
  assert.equal(service.getEvents().length, 1);
});

test('deterministic and NEWS-extracted versions converge on the same downstream ORBIT analysis', async () => {
  const deterministicArticle = article({ id: 'equivalent-deterministic', url: 'https://example.test/equivalent-deterministic', description: 'Iran reports a crude shipping disruption near the Strait of Hormuz.' });
  const extracted = extractDeterministicGeopoliticalEvent(deterministicArticle, deterministicRuntime.stateEngine.getCurrentTwin());
  assert.equal(extracted.route, 'DETERMINISTIC');
  assert.ok(extracted.event);

  const direct = analyzeGeopoliticalEventDeterministically(JSON.stringify(deterministicArticle), extracted.event, deterministicRuntime);
  const agent = new MockAgent();
  const provider = new NewsProviderStub(extracted.event);
  const service = productionMonitoring(agent, provider, sourceFor([
    article({ id: 'equivalent-news', title: 'Iran oil price tension', description: 'Oil markets face tension in the Persian Gulf.', url: 'https://example.test/equivalent-news' }),
  ]));
  await service.scan();
  const fallback = service.getEvents()[0].analysis;

  assert.deepEqual(fallback.classification, direct.classification);
  assert.deepEqual(fallback.relevance, direct.relevance);
  assert.deepEqual(fallback.risk, direct.risk);
  assert.deepEqual(fallback.digitalTwinImpact, direct.digitalTwinImpact);
});

test('monitoring pauses after a Groq 429 without retrying or creating an event', async () => {
  let sourceCalls = 0;
  const rateLimitedAgent = new RateLimitedAgent();
  const service = new GeopoliticalMonitoringService(database, rateLimitedAgent, { enabled: true }, {
    async fetch(): Promise<NewsApiResponse> {
      sourceCalls += 1;
      return sourceFor([article({ id: 'rate-limited-article', sourceType: 'google_news' })]).fetch();
    },
  });

  const first = await service.scan();
  const second = await service.scan();
  assert.equal(first.failedEvents, 1);
  assert.equal(second.failedEvents, 0);
  assert.equal(rateLimitedAgent.calls, 1);
  assert.equal(sourceCalls, 1);
  assert.equal(service.getEvents().length, 0);
  assert.equal(service.getStatus().state, 'ERROR');
  assert.match(service.getStatus().lastError || '', /paused|rate limit/i);
});

test('relevant high and critical results create alerts while irrelevant events remain informational', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([
    article({ id: 'news-alert', title: 'Strait of Hormuz disruption', url: 'https://example.test/alert' }),
    article({ id: 'news-unrelated', title: 'Cultural exchange', url: 'https://example.test/unrelated', description: 'A cultural exchange was announced.' }),
  ]));
  const result = await service.scan();
  assert.equal(result.alertsCreated, 1);
  assert.ok(service.getAlerts().length >= 1);
  assert.equal(service.getAlerts()[0].alertLevel, 'critical');
  assert.ok(service.getStatus().relevantEvents >= 1);
  assert.equal(service.getEvents().some((event) => event.alertLevel === 'informational'), true);
});

test('monitoring results survive service recreation in the existing SQLite data layer', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([article({ id: 'news-persisted', url: 'https://example.test/persisted' })]));
  await service.scan();
  const recreated = new GeopoliticalMonitoringService(database, new MockAgent(), { enabled: false });
  assert.ok(recreated.getEvents().some((event) => event.article.id === 'news-persisted'));
});

test('external webhook events use the same Phase 4 agent and reject duplicates', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: false });
  const record = await service.ingestExternal({ id: 'webhook-hormuz', title: 'Strait of Hormuz disruption', description: 'Crude maritime disruption.', source: 'n8n', sourceUrl: 'https://example.test/webhook', publishedAt: '2026-08-21T12:00:00.000Z' });
  assert.equal(record.alertLevel, 'critical');
  assert.equal(record.article.sourceType, 'external_webhook');
  assert.equal(record.article.source, 'n8n');
  assert.equal(record.article.url, 'https://example.test/webhook');
  assert.equal(record.article.publishedAt, '2026-08-21T12:00:00.000Z');
  assert.equal(record.article.description, 'Crude maritime disruption.');
  assert.equal(agent.calls.length, 1);
  await assert.rejects(() => service.ingestExternal({ id: 'webhook-hormuz', title: 'Strait of Hormuz disruption', description: 'Crude maritime disruption.', source: 'n8n' }), DuplicateMonitoredEventError);
});

test('external URL identity wins over changing n8n IDs and prevents a second LLM call', async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: false });
  await service.ingestExternal({ id: 'n8n-run-one', title: 'Strait of Hormuz disruption', description: 'Crude maritime disruption.', source: 'n8n', sourceUrl: 'https://example.test/hormuz?utm_source=run-one' });
  await assert.rejects(
    () => service.ingestExternal({ id: 'n8n-run-two', title: 'Hormuz shipping disruption reported', description: 'Crude maritime disruption.', source: 'n8n', sourceUrl: 'https://EXAMPLE.TEST/hormuz?utm_medium=run-two' }),
    DuplicateMonitoredEventError,
  );
  assert.equal(agent.calls.length, 1);
  assert.equal(service.getEvents().length, 1);
});

test('monitoring APIs expose status, recent events, alerts, and webhook ingestion', async () => {
  const apiDatabasePath = path.join(temporaryDirectory, 'api.sqlite');
  const apiDatabase = openPhase2Database({ dbPath: apiDatabasePath });
  const repository = new Phase2Repository(apiDatabase);
  const apiRuntime = createDigitalTwinRuntime(repository);
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(apiDatabase, agent, { enabled: false });
  const app = createApp(repository, apiRuntime, agent, service);
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const status = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/status`);
    assert.equal(status.status, 200);
    assert.equal((await status.json() as { monitoring: { enabled: boolean } }).monitoring.enabled, false);

    const webhook = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'api-hormuz', title: 'Strait of Hormuz disruption', description: 'Crude maritime disruption.', source: 'n8n' }) });
    assert.equal(webhook.status, 201);
    assert.equal((await webhook.json() as { alert: boolean }).alert, true);

    const events = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`);
    assert.equal((await events.json() as { count: number }).count, 1);
    const alerts = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/alerts`);
    assert.equal((await alerts.json() as { count: number }).count, 1);
    const relevant = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/relevant-events`);
    assert.equal((await relevant.json() as { count: number }).count, 1);
    const high = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/alerts/high`);
    assert.equal((await high.json() as { count: number }).count, 0);
    const critical = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/alerts/critical`);
    assert.equal((await critical.json() as { count: number }).count, 1);
    const duplicateEvent = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'api-hormuz-second-article', title: 'Strait of Hormuz disruption', source: 'n8n' }) });
    assert.equal(duplicateEvent.status, 201);
    assert.equal((await (await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`)).json() as { count: number }).count, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    apiDatabase.close();
    rmSync(apiDatabasePath, { force: true });
  }
});

test('external scan completion updates Last external scan without changing internal scan semantics', () => {
  const service = new GeopoliticalMonitoringService(database, new MockAgent(), { enabled: false });
  const scan = service.recordExternalScan({
    scanId: 'n8n-scan-success',
    status: 'SUCCESS',
    scannedAt: '2026-08-24T12:00:00.000Z',
    source: 'n8n_google_news',
    articlesSeen: 17,
  });

  assert.deepEqual(scan, { scanId: 'n8n-scan-success', scannedAt: '2026-08-24T12:00:00.000Z', articlesSeen: 17 });
  assert.equal(service.getStatus().lastSuccessfulExternalScan, '2026-08-24T12:00:00.000Z');
  assert.equal(service.getStatus().lastExternalScanArticlesSeen, 17);
});

test('external scan summaries preserve observability counts and normalize legacy ERROR to FAILED', () => {
  const service = new GeopoliticalMonitoringService(database, new MockAgent(), { enabled: false });
  const scan = service.recordExternalScan({
    scanId: 'n8n-scan-partial',
    status: 'PARTIAL',
    scannedAt: '2026-08-24T12:04:00.000Z',
    source: 'n8n_google_news',
    articlesSeen: 10,
    articlesFetched: 10,
    candidatesAfterFiltering: 9,
    deterministicHighConfidence: 7,
    deterministicRejected: 2,
    groqFallbackCandidates: 2,
    groqFallbackSuccessful: 1,
    groqRateLimited: 1,
    groqDeferred: 0,
    groqFailed: 0,
    duplicates: 1,
    invalidEvents: 0,
    newEventsPersisted: 8,
  });

  assert.deepEqual(scan.summary, {
    status: 'PARTIAL',
    articlesFetched: 10,
    candidatesAfterFiltering: 9,
    deterministicHighConfidence: 7,
    deterministicRejected: 2,
    groqFallbackCandidates: 2,
    groqFallbackSuccessful: 1,
    groqRateLimited: 1,
    groqDeferred: 0,
    groqFailed: 0,
    duplicates: 1,
    invalidEvents: 0,
    newEventsPersisted: 8,
  });
  assert.deepEqual(service.getStatus().lastExternalScanSummary, scan.summary);
  assert.equal(service.getStatus().lastExternalScanStatus, 'PARTIAL');

  const failed = service.recordExternalScan({
    scanId: 'n8n-scan-error',
    status: 'ERROR',
    scannedAt: '2026-08-24T12:05:00.000Z',
    source: 'n8n_google_news',
    articlesSeen: 0,
  });
  assert.deepEqual(failed.summary, { status: 'FAILED', articlesFetched: 0 });
  assert.deepEqual(service.getStatus().lastExternalScanSummary, { status: 'FAILED', articlesFetched: 0 });
  assert.equal(service.getStatus().lastExternalScanStatus, 'FAILED');
});

test('n8n refresh trigger posts to the configured server-side webhook and rejects failures', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const trigger = createN8nMonitoringRefreshTrigger(async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ message: 'Workflow was started' }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const previousUrl = process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL;
  process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL = 'http://n8n.test/webhook/orbit-geopolitical-monitor-refresh';
  try {
    await trigger.trigger('2026-08-24T12:01:00.000Z');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://n8n.test/webhook/orbit-geopolitical-monitor-refresh');
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal((calls[0].init?.headers as Record<string, string>)['X-ORBIT-Refresh'], 'true');
    assert.match(String(calls[0].init?.body), /2026-08-24T12:01:00\.000Z/);
  } finally {
    if (previousUrl === undefined) delete process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL;
    else process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL = previousUrl;
  }

  const failedTrigger = createN8nMonitoringRefreshTrigger(async () => new Response('n8n unavailable', { status: 503 }));
  process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL = 'http://n8n.test/webhook/orbit-geopolitical-monitor-refresh';
  try {
    await assert.rejects(() => failedTrigger.trigger('2026-08-24T12:02:00.000Z'), MonitoringRefreshTriggerError);
  } finally {
    if (previousUrl === undefined) delete process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL;
    else process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL = previousUrl;
  }
});

test('concurrent manual refresh requests share one n8n trigger and a failed trigger does not update Last external scan', async () => {
  let triggerCalls = 0;
  let rejectTrigger: ((error: Error) => void) | undefined;
  const trigger = {
    trigger: async (): Promise<void> => {
      triggerCalls += 1;
      await new Promise<void>((_resolve, reject) => { rejectTrigger = reject; });
    },
  };
  const service = new GeopoliticalMonitoringService(database, new MockAgent(), { enabled: false }, undefined, trigger);
  const previousExternalScan = service.getStatus().lastSuccessfulExternalScan;
  const first = service.triggerExternalRefresh();
  const second = service.triggerExternalRefresh();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(triggerCalls, 1);
  rejectTrigger?.(new Error('n8n timeout'));
  await assert.rejects(() => first, /n8n timeout/);
  await assert.rejects(() => second, /n8n timeout/);
  assert.equal(service.getStatus().lastSuccessfulExternalScan, previousExternalScan);
});

test('monitoring refresh and scan-completion APIs return structured results', async () => {
  const apiDatabasePath = path.join(temporaryDirectory, 'refresh-api.sqlite');
  const apiDatabase = openPhase2Database({ dbPath: apiDatabasePath });
  const repository = new Phase2Repository(apiDatabase);
  const apiRuntime = createDigitalTwinRuntime(repository);
  const trigger = { async trigger(): Promise<void> {} };
  const service = new GeopoliticalMonitoringService(apiDatabase, new MockAgent(), { enabled: false }, undefined, trigger);
  const app = createApp(repository, apiRuntime, new MockAgent(), service);
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const refresh = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/refresh`, { method: 'POST' });
    assert.equal(refresh.status, 202);
    assert.equal((await refresh.json() as { status: string }).status, 'TRIGGERED');

    const scan = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/scans`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scanId: 'api-scan', status: 'SUCCESS', scannedAt: '2026-08-24T12:03:00.000Z', source: 'n8n_google_news', articlesSeen: 4 }),
    });
    assert.equal(scan.status, 201);
    const status = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/status`);
    const statusBody = await status.json() as { monitoring: { lastSuccessfulExternalScan?: string; lastExternalScanArticlesSeen?: number } };
    assert.equal(statusBody.monitoring.lastSuccessfulExternalScan, '2026-08-24T12:03:00.000Z');
    assert.equal(statusBody.monitoring.lastExternalScanArticlesSeen, 4);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    apiDatabase.close();
    rmSync(apiDatabasePath, { force: true });
  }
});

test('n8n workflow preserves the scheduled trigger and includes the manual refresh and scan-completion path', () => {
  const workflow = JSON.parse(readFileSync(path.join(process.cwd(), 'n8n/orbit-phase4-energy-monitoring.json'), 'utf8')) as {
    nodes: Array<{ name: string; type: string; parameters?: { path?: string; url?: string } }>;
    connections: Record<string, { main?: Array<Array<{ node: string }>> }>;
  };
  const manualRefresh = workflow.nodes.find((node) => node.name === 'Manual Refresh - ORBIT');
  const scanSummary = workflow.nodes.find((node) => node.name === 'POST Scan Summary to ORBIT');
  assert.equal(manualRefresh?.type, 'n8n-nodes-base.webhook');
  assert.equal(manualRefresh?.parameters?.path, 'orbit-geopolitical-monitor-refresh');
  assert.ok(workflow.nodes.some((node) => node.name === 'Schedule - Every 15 Minutes'));
  assert.equal(scanSummary?.parameters?.url, 'http://127.0.0.1:3000/api/geopolitical-risk/monitor/scans');
  assert.ok('Manual Refresh - ORBIT' in workflow.connections);
  assert.ok('Build External Scan Summary' in workflow.connections);
  const fetchConnections = workflow.connections['Fetch Google News RSS']?.main?.[0] || [];
  assert.deepEqual(fetchConnections.map((connection) => connection.node).sort(), [
    'Build External Scan Summary',
    'Normalize and Filter Energy Candidates',
  ]);
});

test('external candidate ingestion enforces maxArticlesPerScan candidate budget and rejects MAX + 1 before deterministic extraction or Groq', async () => {
  const newsProvider = new NewsProviderStub(newsEvent());
  const service = new GeopoliticalMonitoringService(
    database,
    new MockAgent(),
    { enabled: false, maxArticlesPerScan: 3 },
    undefined,
    { async trigger(): Promise<void> {} },
    { runtime, newsProvider },
  );

  await service.triggerExternalRefresh();

  // Candidates 1 to 3: distinct valid energy candidates
  const c1 = await service.ingestExternal({ id: 'c1', title: 'Saudi Arabia oil export disruption', source: 'Wire 1', publishedAt: '2026-08-21T12:00:00Z' });
  const c2 = await service.ingestExternal({ id: 'c2', title: 'Russia crude oil pipeline outage', source: 'Wire 2', publishedAt: '2026-08-21T12:00:00Z' });
  const c3 = await service.ingestExternal({ id: 'c3', title: 'Nigeria oil terminal shutdown', source: 'Wire 3', publishedAt: '2026-08-21T12:00:00Z' });

  assert.ok(c1);
  assert.ok(c2);
  assert.ok(c3);

  // Candidate 4 (MAX + 1): must throw ExternalCandidateBudgetExceededError BEFORE Groq or deterministic extraction
  await assert.rejects(
    () => service.ingestExternal({ id: 'c4', title: 'Iraq oil exports disruption', source: 'Wire 4', publishedAt: '2026-08-21T12:00:00Z' }),
    (error: unknown) => error instanceof ExternalCandidateBudgetExceededError && error.maxCandidates === 3,
  );

  // Check that Groq was called at most 3 times (only for accepted candidates), never for c4
  assert.ok(newsProvider.calls.length <= 3);
});

test('duplicates do not consume candidate budget and concurrent webhook ingestion cannot exceed candidate budget', async () => {
  const newsProvider = new NewsProviderStub(newsEvent());
  const service = new GeopoliticalMonitoringService(
    database,
    new MockAgent(),
    { enabled: false, maxArticlesPerScan: 2 },
    undefined,
    { async trigger(): Promise<void> {} },
    { runtime, newsProvider },
  );

  await service.triggerExternalRefresh();

  // Ingest c1
  await service.ingestExternal({ id: 'conc-1', title: 'Persian Gulf oil tanker attack', source: 'Wire 1', publishedAt: '2026-08-21T12:00:00Z' });

  // Duplicate of c1 should be rejected as duplicate, NOT consuming candidate budget slot #2
  await assert.rejects(
    () => service.ingestExternal({ id: 'conc-1', title: 'Persian Gulf oil tanker attack', source: 'Wire 1', publishedAt: '2026-08-21T12:00:00Z' }),
    DuplicateMonitoredEventError,
  );

  // Candidate slot #2 is still available for a new unique candidate
  const c2 = await service.ingestExternal({ id: 'conc-2', title: 'Red Sea shipping lane disruption', source: 'Wire 2', publishedAt: '2026-08-21T12:00:00Z' });
  assert.ok(c2);

  // Concurrent ingestion of 2 candidates when budget (2) is exhausted
  const concurrentResults = await Promise.allSettled([
    service.ingestExternal({ id: 'conc-3', title: 'Suez Canal oil tanker blockade', source: 'Wire 3', publishedAt: '2026-08-21T12:00:00Z' }),
    service.ingestExternal({ id: 'conc-4', title: 'Venezuela crude oil sanctions restriction', source: 'Wire 4', publishedAt: '2026-08-21T12:00:00Z' }),
  ]);

  // Both concurrent candidates must be rejected with ExternalCandidateBudgetExceededError
  for (const res of concurrentResults) {
    assert.equal(res.status, 'rejected');
    if (res.status === 'rejected') {
      assert.ok(res.reason instanceof ExternalCandidateBudgetExceededError);
    }
  }
});

test('HTTP POST /api/geopolitical-risk/monitor/events returns 429 when candidate budget is exceeded', async () => {
  const apiDatabasePath = path.join(temporaryDirectory, 'budget-api.sqlite');
  const apiDatabase = openPhase2Database({ dbPath: apiDatabasePath });
  const repository = new Phase2Repository(apiDatabase);
  const apiRuntime = createDigitalTwinRuntime(repository);
  const trigger = { async trigger(): Promise<void> {} };
  const newsProvider = new NewsProviderStub(newsEvent());
  const service = new GeopoliticalMonitoringService(apiDatabase, new MockAgent(), { enabled: false, maxArticlesPerScan: 1 }, undefined, trigger, { runtime: apiRuntime, newsProvider });
  const app = createApp(repository, apiRuntime, new MockAgent(), service);
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const res1 = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'http-c1', title: 'Saudi Arabia crude oil export disruption', source: 'Wire', publishedAt: '2026-08-21T12:00:00Z' }),
    });
    assert.equal(res1.status, 201);

    const res2 = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'http-c2', title: 'Russia oil refinery outage disruption', source: 'Wire', publishedAt: '2026-08-21T12:00:00Z' }),
    });
    assert.equal(res2.status, 429);
    const body2 = await res2.json() as { status: string; code: string; maxCandidates: number };
    assert.equal(body2.status, 'ERROR');
    assert.equal(body2.code, 'EXTERNAL_CANDIDATE_BUDGET_EXCEEDED');
    assert.equal(body2.maxCandidates, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    apiDatabase.close();
    rmSync(apiDatabasePath, { force: true });
  }
});
