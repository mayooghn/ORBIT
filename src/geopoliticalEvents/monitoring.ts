import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { canonicalArticleUrlForDedup, ENERGY_MONITORING_QUERIES, fetchGoogleNews, type GoogleNewsFetchOptions, type NewsApiResponse, type NewsArticleSourceType, type RawNewsArticle } from '../services/dataIngestion/googleNews';
import { analyzeGeopoliticalEventDeterministically, type GeopoliticalRiskAgent, type GeopoliticalRiskAgentResponse } from './agent';
import { areEventDatesWithinWindow, areLikelySameEvent, buildArticleFingerprint, buildEventFingerprint, type DeduplicationEventInput } from './deduplication';
import type { DigitalTwinRuntime } from '../digitalTwin/runtime';
import { GeopoliticalEventIngestionStore } from './ingestion';
import { GroqRateLimitError, type GroqServiceContract } from './groq';
import { GeopoliticalEventValidationError, type GeopoliticalEvent } from './model';
import { extractDeterministicGeopoliticalEvent, type DeterministicExtractionResult } from './deterministicExtractor';

export type MonitoringAlertLevel = 'informational' | 'low' | 'medium' | 'high' | 'critical';
export type MonitoringServiceState = 'DISABLED' | 'IDLE' | 'RUNNING' | 'READY' | 'ERROR';
export type MonitoringSourceType = NewsArticleSourceType | 'external_webhook';

export interface MonitoringArticleSourceReference {
  source: string;
  url?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  retrievedAt?: string;
  sourceType?: MonitoringSourceType;
  feedUrl?: string;
}

export interface MonitoringArticle {
  id: string;
  title: string;
  url?: string;
  source: string;
  publishedAt?: string;
  description?: string;
  retrievedAt: string;
  query?: string;
  sourceType: MonitoringSourceType;
  feedUrl?: string;
  sources?: string[];
  sourceReferences?: MonitoringArticleSourceReference[];
}

export interface MonitoredEventRecord {
  article: MonitoringArticle;
  detectedAt: string;
  alertLevel: MonitoringAlertLevel;
  analysis: GeopoliticalRiskAgentResponse;
  duplicateOf?: string;
}

export interface MonitoringStatus {
  enabled: boolean;
  state: MonitoringServiceState;
  source: string;
  sources: MonitoringSourceType[];
  pollIntervalMs: number;
  maxArticlesPerScan: number;
  lastSuccessfulScan?: string;
  lastSuccessfulExternalScan?: string;
  lastExternalScanArticlesSeen?: number;
  lastExternalScanStatus?: MonitoringScanStatus;
  lastExternalScanSummary?: MonitoringExternalScanSummary;
  lastScanStatus?: MonitoringScanStatus;
  lastScanSummary?: MonitoringScanSummary;
  lastError?: string;
  detectedEvents: number;
  relevantEvents: number;
  highRiskAlerts: number;
  criticalAlerts: number;
}

export type MonitoringScanStatus = 'SUCCESS' | 'PARTIAL' | 'NO_NEW_EVENTS' | 'FAILED';

export interface MonitoringScanSummary {
  status: MonitoringScanStatus;
  articlesFetched: number;
  candidatesAfterFiltering: number;
  deterministicHighConfidence: number;
  deterministicRejected: number;
  groqFallbackCandidates: number;
  groqFallbackSuccessful: number;
  groqRateLimited: number;
  groqDeferred: number;
  groqFailed: number;
  duplicates: number;
  invalidEvents: number;
  newEventsPersisted: number;
}

export interface MonitoringExternalScanSummary {
  status: MonitoringScanStatus;
  articlesFetched: number;
  candidatesAfterFiltering?: number;
  deterministicHighConfidence?: number;
  deterministicRejected?: number;
  groqFallbackCandidates?: number;
  groqFallbackSuccessful?: number;
  groqRateLimited?: number;
  groqDeferred?: number;
  groqFailed?: number;
  duplicates?: number;
  invalidEvents?: number;
  newEventsPersisted?: number;
}

export interface MonitoringScanResult extends MonitoringScanSummary {
  retrievedAt: string;
  articlesSeen: number;
  eventsProcessed: number;
  eventsSkipped: number;
  failedEvents: number;
  alertsCreated: number;
}

export type MonitoringProcessingOutcome =
  | 'DETERMINISTIC'
  | 'GROQ_FALLBACK_SUCCESS'
  | 'GROQ_RATE_LIMITED'
  | 'GROQ_DEFERRED'
  | 'GROQ_FAILED'
  | 'DUPLICATE'
  | 'INVALID_EVENT'
  | 'BUDGET_EXCEEDED';

export interface MonitoringProcessingResult {
  outcome: MonitoringProcessingOutcome;
  analysis?: GeopoliticalRiskAgentResponse;
  error?: unknown;
  retryAt?: string;
}

export interface MonitoringAnalysisOptions {
  /** Production monitoring uses this runtime for deterministic extraction and ORBIT analysis. */
  runtime?: DigitalTwinRuntime;
  /** NEWS-only extraction provider. It must not be used for user-facing explanations. */
  newsProvider?: Pick<GroqServiceContract, 'extractEvent'>;
}

export interface MonitoringConfig {
  enabled?: boolean;
  pollIntervalMs?: number;
  queries?: readonly string[];
  feedUrls?: readonly string[];
  maxArticlesPerScan?: number;
}

export interface MonitoringArticleSource {
  fetch(): Promise<NewsApiResponse>;
}

export interface ExternalMonitoringEventInput {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  source?: unknown;
  sourceUrl?: unknown;
  publishedAt?: unknown;
}

export interface ExternalMonitoringScanInput {
  scanId?: unknown;
  status?: unknown;
  scannedAt?: unknown;
  source?: unknown;
  articlesSeen?: unknown;
  articlesFetched?: unknown;
  candidatesAfterFiltering?: unknown;
  deterministicHighConfidence?: unknown;
  deterministicRejected?: unknown;
  groqFallbackCandidates?: unknown;
  groqFallbackSuccessful?: unknown;
  groqRateLimited?: unknown;
  groqDeferred?: unknown;
  groqFailed?: unknown;
  duplicates?: unknown;
  invalidEvents?: unknown;
  newEventsPersisted?: unknown;
}

export interface MonitoringRefreshResult {
  requestedAt: string;
  trigger: 'n8n';
}

export interface MonitoringRefreshTrigger {
  trigger(requestedAt: string): Promise<void>;
}

export class MonitoringRefreshConfigurationError extends Error {
  constructor() {
    super('Manual monitoring refresh is not configured. Set ORBIT_N8N_REFRESH_WEBHOOK_URL on the ORBIT server.');
    this.name = 'MonitoringRefreshConfigurationError';
  }
}

export class MonitoringRefreshTriggerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitoringRefreshTriggerError';
  }
}

export class DuplicateMonitoredEventError extends Error {
  constructor(articleId: string) {
    super(`Monitored event already exists: ${articleId}`);
    this.name = 'DuplicateMonitoredEventError';
  }
}

export class IrrelevantMonitoringCandidateError extends Error {
  constructor() {
    super('Monitoring candidate was rejected before LLM processing because it does not contain an energy/geopolitical supply threat.');
    this.name = 'IrrelevantMonitoringCandidateError';
  }
}

export class ExternalCandidateBudgetExceededError extends Error {
  readonly maxCandidates: number;
  constructor(maxCandidates: number) {
    super(`External candidate budget exceeded for this refresh scan. Maximum allowed candidates per refresh is ${maxCandidates}.`);
    this.name = 'ExternalCandidateBudgetExceededError';
    this.maxCandidates = maxCandidates;
  }
}

const DEFAULT_MONITORING_QUERIES = ENERGY_MONITORING_QUERIES;

const DEFAULT_POLL_INTERVAL_MS = 15 * 60 * 1000;
const MAX_POLL_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ARTICLES_PER_SCAN = 5;
const MAX_ARTICLES_PER_SCAN = 100;

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true';

const positiveInteger = (value: number | undefined, fallback: number): number =>
  Number.isInteger(value) && value && value >= 10_000 && value <= MAX_POLL_INTERVAL_MS ? value : fallback;

const boundedArticleCount = (value: number | undefined, fallback: number): number =>
  Number.isInteger(value) && value && value >= 1 && value <= MAX_ARTICLES_PER_SCAN ? value : fallback;

const envList = (value: string | undefined): string[] => value
  ? value.split(',').map((item) => item.trim()).filter(Boolean)
  : [];

const emptyScanSummary = (status: MonitoringScanStatus): MonitoringScanSummary => ({
  status,
  articlesFetched: 0,
  candidatesAfterFiltering: 0,
  deterministicHighConfidence: 0,
  deterministicRejected: 0,
  groqFallbackCandidates: 0,
  groqFallbackSuccessful: 0,
  groqRateLimited: 0,
  groqDeferred: 0,
  groqFailed: 0,
  duplicates: 0,
  invalidEvents: 0,
  newEventsPersisted: 0,
});

const scanResult = (
  retrievedAt: string,
  summary: MonitoringScanSummary,
  eventsSkipped: number,
  alertsCreated: number,
): MonitoringScanResult => ({
  ...summary,
  retrievedAt,
  articlesSeen: summary.articlesFetched,
  eventsProcessed: summary.newEventsPersisted,
  eventsSkipped,
  failedEvents: summary.groqRateLimited + summary.groqDeferred + summary.groqFailed + summary.invalidEvents,
  alertsCreated,
});

const scanSummaryFromMeta = (value: string | undefined): MonitoringScanSummary | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<MonitoringScanSummary>;
    if (
      (parsed.status === 'SUCCESS' || parsed.status === 'PARTIAL' || parsed.status === 'NO_NEW_EVENTS' || parsed.status === 'FAILED') &&
      Object.entries(parsed).every(([key, entry]) => key === 'status' || typeof entry === 'number' && Number.isFinite(entry) && entry >= 0)
    ) {
      return parsed as MonitoringScanSummary;
    }
  } catch {
    // Ignore malformed legacy metadata and keep the status endpoint available.
  }
  return undefined;
};

const externalScanSummaryFromMeta = (value: string | undefined): MonitoringExternalScanSummary | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<MonitoringExternalScanSummary>;
    if (
      (parsed.status === 'SUCCESS' || parsed.status === 'PARTIAL' || parsed.status === 'NO_NEW_EVENTS' || parsed.status === 'FAILED') &&
      typeof parsed.articlesFetched === 'number' && Number.isFinite(parsed.articlesFetched) && parsed.articlesFetched >= 0 &&
      Object.entries(parsed).every(([key, entry]) => key === 'status' || typeof entry === 'number' && Number.isFinite(entry) && entry >= 0)
    ) {
      return parsed as MonitoringExternalScanSummary;
    }
  } catch {
    // Ignore malformed legacy metadata and keep the status endpoint available.
  }
  return undefined;
};

export const getMonitoringConfig = (overrides: MonitoringConfig = {}): Required<MonitoringConfig> => ({
  enabled: overrides.enabled ?? isTrue(process.env.ORBIT_MONITORING_ENABLED),
  pollIntervalMs: positiveInteger(overrides.pollIntervalMs ?? Number(process.env.ORBIT_MONITORING_INTERVAL_MS || process.env.ORBIT_MONITORING_POLL_INTERVAL_MS), DEFAULT_POLL_INTERVAL_MS),
  queries: overrides.queries?.length ? [...overrides.queries] : (envList(process.env.ORBIT_MONITORING_QUERIES).length ? envList(process.env.ORBIT_MONITORING_QUERIES) : [...DEFAULT_MONITORING_QUERIES]),
  feedUrls: overrides.feedUrls?.length ? [...overrides.feedUrls] : envList(process.env.ORBIT_MONITORING_RSS_FEEDS),
  maxArticlesPerScan: boundedArticleCount(overrides.maxArticlesPerScan ?? Number(process.env.ORBIT_MONITORING_MAX_ARTICLES_PER_SCAN), DEFAULT_MAX_ARTICLES_PER_SCAN),
});

const toMonitoringArticle = (article: RawNewsArticle): MonitoringArticle => ({
  ...article,
  sourceType: article.sourceType || 'google_news',
  sources: [article.source],
  sourceReferences: [{
    source: article.source,
    url: article.url,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    retrievedAt: article.retrievedAt,
    sourceType: article.sourceType || 'google_news',
    feedUrl: article.feedUrl,
  }],
});

const ENERGY_ARTICLE_TERMS = /\b(?:energy|crude oil|oil|gas|natural gas|oil exports?|oil imports?|exports?|imports?|sanctions?|oil tanker|tankers?|refiner(?:y|ies)|pipelines?|oilfield|oil terminal|oil flows?|barrels?|petroleum|opec|lng|lpg|fuel shipment|export route|shipping lane)\b/i;
const ENERGY_TRANSIT_TERMS = /strait of hormuz|persian gulf|red sea|suez/i;
const GEOPOLITICAL_ENERGY_TERMS = /\b(?:iran|iraq|oman|saudi arabia|united arab emirates|uae|russia|yemen|qatar|kuwait|nigeria|venezuela)\b/i;
const SUPPLY_THREAT_TERMS = /\b(?:sanction(?:s|ed)?|embargo|disrupt(?:ion|ed)?|attack(?:ed)?|strike|conflict|war|tension|blockade|closure|outage|shutdown|seiz(?:e|ed|ure)|military|missile|drone|geopolitical|restriction|shortage|supply cut|production cut|reroute|avoid|alternative route|flows? stall(?:ed)?|halt(?:ed)?|hit|pirat(?:e|es)|fire|warning|alert|risk)\b/i;

export const isEnergyMonitoringCandidate = (article: Pick<MonitoringArticle, 'title' | 'description'>): boolean => {
  const text = `${article.title} ${article.description || ''}`;
  return (ENERGY_ARTICLE_TERMS.test(text) || ENERGY_TRANSIT_TERMS.test(text) || GEOPOLITICAL_ENERGY_TERMS.test(text)) && SUPPLY_THREAT_TERMS.test(text);
};

const isEnergySupplyChainRelevant = (analysis: GeopoliticalRiskAgentResponse): boolean =>
  analysis.classification.energyRelevant && analysis.relevance.relevant && analysis.risk.energyRelevant;

const articleRequest = (article: MonitoringArticle): string => JSON.stringify({
  title: article.title,
  ...(article.description ? { description: article.description } : {}),
  ...(article.source ? { source: article.source } : {}),
  ...(article.publishedAt ? { publishedAt: article.publishedAt } : {}),
  ...(article.url ? { sourceUrl: article.url } : {}),
});

const alertLevelFor = (analysis: GeopoliticalRiskAgentResponse): MonitoringAlertLevel => {
  if (!isEnergySupplyChainRelevant(analysis)) return 'informational';
  return analysis.risk.riskLevel;
};

const stableExternalArticleId = (input: ExternalMonitoringEventInput, title: string, source: string, publishedAt: string): string => {
  if (typeof input.id === 'string' && input.id.trim()) return `external-${input.id.trim()}`;
  if (typeof input.sourceUrl === 'string' && input.sourceUrl.trim()) {
    return `external-url-${createHash('sha256').update(canonicalArticleUrlForDedup(input.sourceUrl.trim())).digest('hex').slice(0, 24)}`;
  }
  const identity = `${title}\n${source}\n${publishedAt}`;
  return `external-${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`;
};

const textField = (value: unknown, field: string, required = false): string => {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string' || (required && !value.trim())) throw new Error(`${field} is ${required ? 'required' : 'invalid'}.`);
  return value.trim();
};

const nonNegativeIntegerField = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`${field} is invalid.`);
  return value;
};

export const createN8nMonitoringRefreshTrigger = (fetchImplementation: typeof fetch = fetch): MonitoringRefreshTrigger => ({
  async trigger(requestedAt: string): Promise<void> {
    const url = process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL?.trim();
    if (!url) throw new MonitoringRefreshConfigurationError();

    let response: Response;
    try {
      response = await fetchImplementation(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-ORBIT-Refresh': 'true' },
        body: JSON.stringify({ source: 'orbit', requestedAt }),
      });
    } catch (error) {
      throw new MonitoringRefreshTriggerError(error instanceof Error ? `n8n refresh trigger failed: ${error.message}` : 'n8n refresh trigger failed.');
    }

    const body = await response.text();
    if (!response.ok) throw new MonitoringRefreshTriggerError(`n8n refresh trigger returned HTTP ${response.status}.`);
    if (body.trim()) {
      try {
        JSON.parse(body);
      } catch {
        throw new MonitoringRefreshTriggerError('n8n refresh trigger returned an invalid response.');
      }
    }
  },
});

const ensureSchema = (database: DatabaseSync): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_results (
      article_id TEXT PRIMARY KEY,
      detected_at TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      event_id TEXT,
      event_fingerprint TEXT,
      article_fingerprint TEXT,
      article_url_key TEXT,
      relevant INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      record_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_processed (
      article_id TEXT PRIMARY KEY,
      event_id TEXT,
      processed_at TEXT NOT NULL,
      duplicate_of TEXT,
      event_fingerprint TEXT,
      article_fingerprint TEXT,
      article_url_key TEXT
    );
  `);
  const resultColumns = database.prepare('PRAGMA table_info(geopolitical_monitor_results)').all() as Array<{ name?: string }>;
  if (!resultColumns.some((column) => column.name === 'event_id')) database.exec('ALTER TABLE geopolitical_monitor_results ADD COLUMN event_id TEXT');
  if (!resultColumns.some((column) => column.name === 'event_fingerprint')) database.exec('ALTER TABLE geopolitical_monitor_results ADD COLUMN event_fingerprint TEXT');
  if (!resultColumns.some((column) => column.name === 'article_fingerprint')) database.exec('ALTER TABLE geopolitical_monitor_results ADD COLUMN article_fingerprint TEXT');
  if (!resultColumns.some((column) => column.name === 'article_url_key')) database.exec('ALTER TABLE geopolitical_monitor_results ADD COLUMN article_url_key TEXT');
  const processedColumns = database.prepare('PRAGMA table_info(geopolitical_monitor_processed)').all() as Array<{ name?: string }>;
  if (!processedColumns.some((column) => column.name === 'event_fingerprint')) database.exec('ALTER TABLE geopolitical_monitor_processed ADD COLUMN event_fingerprint TEXT');
  if (!processedColumns.some((column) => column.name === 'article_fingerprint')) database.exec('ALTER TABLE geopolitical_monitor_processed ADD COLUMN article_fingerprint TEXT');
  if (!processedColumns.some((column) => column.name === 'article_url_key')) database.exec('ALTER TABLE geopolitical_monitor_processed ADD COLUMN article_url_key TEXT');
  database.exec('CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_event_id ON geopolitical_monitor_results(event_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_event_fingerprint ON geopolitical_monitor_results(event_fingerprint)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_article_url_key ON geopolitical_monitor_results(article_url_key)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_processed_article_url_key ON geopolitical_monitor_processed(article_url_key)');
};

const readMeta = (database: DatabaseSync, key: string): string | undefined => {
  const row = database.prepare('SELECT value FROM geopolitical_monitor_metadata WHERE key = ?').get(key) as { value?: string } | undefined;
  return row?.value;
};

const writeMeta = (database: DatabaseSync, key: string, value: string): void => {
  database.prepare('INSERT INTO geopolitical_monitor_metadata(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
};

const cloneRecord = (record: MonitoredEventRecord): MonitoredEventRecord => structuredClone(record);

const eventInputFor = (article: MonitoringArticle, event: GeopoliticalEvent): DeduplicationEventInput => ({
  title: event.title || article.title,
  description: event.description || article.description,
  source: article.source,
  publishedAt: article.publishedAt,
  url: article.url,
  category: event.category,
  location: event.location,
  countriesInvolved: event.countriesInvolved,
  timestamp: event.timestamp,
});

const articleInputFor = (article: MonitoringArticle | MonitoringArticleSourceReference): DeduplicationEventInput => ({
  title: article.title || '',
  description: article.description,
  source: article.source,
  publishedAt: article.publishedAt,
  url: article.url,
});

const sourceReferenceFor = (article: MonitoringArticle): MonitoringArticleSourceReference => ({
  source: article.source,
  url: article.url,
  title: article.title,
  description: article.description,
  publishedAt: article.publishedAt,
  retrievedAt: article.retrievedAt,
  sourceType: article.sourceType,
  feedUrl: article.feedUrl,
});

const sourceReferencesFor = (article: MonitoringArticle): MonitoringArticleSourceReference[] => {
  const references = article.sourceReferences?.length ? [...article.sourceReferences] : [];
  if (!references.length || !references.some((reference) => reference.source === article.source && reference.url === article.url)) {
    references.unshift(sourceReferenceFor(article));
  }
  return references;
};

const sourceAuthorityScore = (reference: MonitoringArticleSourceReference): number => {
  const source = reference.source.toLowerCase();
  const url = reference.url?.toLowerCase() || '';
  let score = 0;
  if (/associated press|\bap news\b|\bap\b/.test(source) || /apnews\.com/.test(url)) score = 100;
  else if (/reuters/.test(source) || /reuters\.com/.test(url)) score = 95;
  else if (/bloomberg/.test(source) || /bloomberg\.com/.test(url)) score = 90;
  else if (/financial times|\bft\b/.test(source) || /ft\.com/.test(url)) score = 88;
  else if (/bbc/.test(source) || /bbc\.com/.test(url)) score = 84;
  else if (/al jazeera/.test(source) || /aljazeera\.com/.test(url)) score = 82;
  return score + (reference.url ? 2 : 0) + Math.min(10, Math.floor((reference.description?.length || 0) / 200));
};

const referenceKey = (reference: MonitoringArticleSourceReference): string => {
  const url = reference.url ? canonicalArticleUrlForDedup(reference.url) : '';
  const title = buildArticleFingerprint({ title: reference.title || '', description: reference.description, source: reference.source });
  return `${reference.source.toLowerCase()}|${url || title}`;
};

const latestIsoTimestamp = (values: Array<string | undefined>): string | undefined => {
  const valid = values.filter((value): value is string => Boolean(value && !Number.isNaN(Date.parse(value))));
  return valid.length ? valid.sort((left, right) => Date.parse(right) - Date.parse(left))[0] : values.find(Boolean);
};

const mergeArticleMetadata = (existing: MonitoringArticle, incoming: MonitoringArticle): MonitoringArticle => {
  const byKey = new Map<string, MonitoringArticleSourceReference>();
  for (const reference of [...sourceReferencesFor(existing), ...sourceReferencesFor(incoming)]) {
    const key = referenceKey(reference);
    const prior = byKey.get(key);
    if (!prior || sourceAuthorityScore(reference) > sourceAuthorityScore(prior) || (reference.description?.length || 0) > (prior.description?.length || 0)) {
      byKey.set(key, { ...reference });
    }
  }

  const references = [...byKey.values()].sort((left, right) => sourceAuthorityScore(right) - sourceAuthorityScore(left) || left.source.localeCompare(right.source));
  const primary = references[0] || sourceReferenceFor(existing);
  const sources = [...new Set(references.map((reference) => reference.source).filter(Boolean))];
  return {
    ...existing,
    title: [existing.title, incoming.title].sort((left, right) => right.length - left.length)[0] || existing.title,
    source: primary.source || existing.source,
    url: primary.url || existing.url,
    publishedAt: latestIsoTimestamp(references.map((reference) => reference.publishedAt)) || existing.publishedAt,
    description: [existing.description || '', incoming.description || ''].sort((left, right) => right.length - left.length)[0] || undefined,
    retrievedAt: latestIsoTimestamp([existing.retrievedAt, incoming.retrievedAt]) || existing.retrievedAt,
    query: primary.sourceType === existing.sourceType ? (incoming.query || existing.query) : existing.query,
    sourceType: primary.sourceType || existing.sourceType,
    feedUrl: primary.feedUrl || existing.feedUrl,
    sources: sources.length ? sources : [primary.source],
    sourceReferences: references,
  };
};

const eventFingerprintFor = (article: MonitoringArticle, analysis: GeopoliticalRiskAgentResponse): string =>
  buildEventFingerprint(eventInputFor(article, analysis.event));

const eventMatches = (article: MonitoringArticle, analysis: GeopoliticalRiskAgentResponse, existing: MonitoredEventRecord, storedEventFingerprint?: string): boolean => {
  const candidateFingerprint = eventFingerprintFor(article, analysis);
  const existingEvent = existing.analysis.event;
  if (storedEventFingerprint && storedEventFingerprint === candidateFingerprint && areEventDatesWithinWindow(analysis.event.timestamp, existingEvent.timestamp)) return true;
  if (existingEvent.id === analysis.event.id && areEventDatesWithinWindow(analysis.event.timestamp, existingEvent.timestamp)) return true;
  const incoming = eventInputFor(article, analysis.event);
  for (const reference of sourceReferencesFor(existing.article)) {
    if (areLikelySameEvent(incoming, {
      ...articleInputFor(reference),
      category: existingEvent.category,
      location: existingEvent.location,
      countriesInvolved: existingEvent.countriesInvolved,
      timestamp: existingEvent.timestamp,
    })) return true;
  }
  return areLikelySameEvent(incoming, eventInputFor(existing.article, existingEvent));
};

const rawArticleMatches = (article: MonitoringArticle, existing: MonitoredEventRecord): boolean => {
  const incoming = articleInputFor(article);
  const existingEvent = existing.analysis.event;
  return sourceReferencesFor(existing.article).some((reference) => areLikelySameEvent(incoming, {
    ...articleInputFor(reference),
    category: existingEvent.category,
    location: existingEvent.location,
    countriesInvolved: existingEvent.countriesInvolved,
    timestamp: existingEvent.timestamp,
  }));
};

const sourceLabel = (sourceTypes: readonly MonitoringSourceType[]): string => {
  const labels = new Set(sourceTypes);
  if (labels.has('google_news') && labels.has('direct_rss')) return 'Google News + direct RSS';
  if (labels.has('google_news')) return 'Google News RSS';
  if (labels.has('direct_rss')) return 'Direct RSS';
  if (labels.has('external_webhook')) return 'n8n/external webhook';
  return 'Monitoring sources';
};

export class GeopoliticalMonitoringService {
  private readonly config: Required<MonitoringConfig>;
  private readonly source: MonitoringArticleSource;
  private readonly analysisRuntime: DigitalTwinRuntime | undefined;
  private readonly newsProvider: Pick<GroqServiceContract, 'extractEvent'> | undefined;
  private state: MonitoringServiceState;
  private timer: ReturnType<typeof setInterval> | undefined;
  private scanPromise: Promise<MonitoringScanResult> | undefined;
  private refreshPromise: Promise<MonitoringRefreshResult> | undefined;
  private lastError: string | undefined;
  private groqBlockedUntil = 0;

  constructor(
    private readonly database: DatabaseSync,
    private readonly agent: GeopoliticalRiskAgent,
    config: MonitoringConfig = {},
    source?: MonitoringArticleSource,
    private readonly refreshTrigger: MonitoringRefreshTrigger = createN8nMonitoringRefreshTrigger(),
    analysisOptions: MonitoringAnalysisOptions = {},
  ) {
    ensureSchema(database);
    this.reconcilePersistedRecords();
    this.config = getMonitoringConfig(config);
    this.analysisRuntime = analysisOptions.runtime;
    this.newsProvider = analysisOptions.newsProvider;
    const fetchOptions: GoogleNewsFetchOptions = { queries: this.config.queries, feedUrls: this.config.feedUrls };
    this.source = source || { fetch: () => fetchGoogleNews(fetchOptions) };
    this.state = this.config.enabled ? 'IDLE' : 'DISABLED';
  }

  start(): void {
    if (!this.config.enabled || this.timer) return;
    this.state = 'IDLE';
    void this.scan();
    this.timer = setInterval(() => { void this.scan(); }, this.config.pollIntervalMs);
    if (typeof this.timer === 'object' && 'unref' in this.timer) this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (this.config.enabled) this.state = 'IDLE';
  }

  async scan(): Promise<MonitoringScanResult> {
    if (!this.config.enabled) {
      return scanResult(new Date().toISOString(), emptyScanSummary('NO_NEW_EVENTS'), 0, 0);
    }
    if (!this.analysisRuntime && this.groqBlockedUntil > Date.now()) {
      this.state = 'ERROR';
      this.lastError = `Automated monitoring is paused after a Groq rate limit until ${new Date(this.groqBlockedUntil).toISOString()}.`;
      const summary = emptyScanSummary('PARTIAL');
      return scanResult(new Date().toISOString(), summary, 0, 0);
    }
    if (this.groqBlockedUntil <= Date.now()) this.groqBlockedUntil = 0;
    if (this.scanPromise) return this.scanPromise;
    this.scanPromise = this.runScan();
    try { return await this.scanPromise; } finally { this.scanPromise = undefined; }
  }

  private activeExternalRefreshSession: { requestedAt: string; processedCandidateIds: Set<string>; candidateCount: number } | undefined;

  private getOrCreateExternalRefreshSession(): { requestedAt: string; processedCandidateIds: Set<string>; candidateCount: number } {
    const now = Date.now();
    if (!this.activeExternalRefreshSession || now - Date.parse(this.activeExternalRefreshSession.requestedAt) > 5 * 60 * 1000) {
      this.activeExternalRefreshSession = {
        requestedAt: new Date(now).toISOString(),
        processedCandidateIds: new Set<string>(),
        candidateCount: 0,
      };
    }
    return this.activeExternalRefreshSession;
  }

  async triggerExternalRefresh(): Promise<MonitoringRefreshResult> {
    if (this.refreshPromise) return this.refreshPromise;
    const requestedAt = new Date().toISOString();
    this.activeExternalRefreshSession = {
      requestedAt,
      processedCandidateIds: new Set<string>(),
      candidateCount: 0,
    };
    this.refreshPromise = this.refreshTrigger.trigger(requestedAt).then(() => ({ requestedAt, trigger: 'n8n' as const }));
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = undefined;
    }
  }

  private async analyzeArticle(article: MonitoringArticle): Promise<MonitoringProcessingResult> {
    // Keep the legacy injected-agent path available for existing callers that do
    // not provide the production monitoring runtime. The production server always
    // supplies analysisOptions.runtime, so external news uses deterministic-first
    // routing there.
    if (!this.analysisRuntime) {
      return {
        outcome: 'GROQ_FALLBACK_SUCCESS',
        analysis: await this.agent.analyze(articleRequest(article), { explanation: 'deterministic' }),
      };
    }

    const extraction: DeterministicExtractionResult = extractDeterministicGeopoliticalEvent(article, this.analysisRuntime.stateEngine.getCurrentTwin());
    if (extraction.route === 'DETERMINISTIC' && extraction.event) {
      return {
        outcome: 'DETERMINISTIC',
        analysis: analyzeGeopoliticalEventDeterministically(articleRequest(article), extraction.event, this.analysisRuntime),
      };
    }

    if (this.groqBlockedUntil > Date.now()) {
      return {
        outcome: 'GROQ_DEFERRED',
        retryAt: new Date(this.groqBlockedUntil).toISOString(),
        error: new Error(`NEWS Groq fallback is deferred until ${new Date(this.groqBlockedUntil).toISOString()}.`),
      };
    }

    if (!this.newsProvider) {
      return {
        outcome: 'GROQ_DEFERRED',
        error: new Error('NEWS Groq fallback is not configured.'),
      };
    }

    try {
      const extractedEvent = await this.newsProvider.extractEvent(articleRequest(article));
      const event = new GeopoliticalEventIngestionStore().ingest(extractedEvent);
      return {
        outcome: 'GROQ_FALLBACK_SUCCESS',
        analysis: analyzeGeopoliticalEventDeterministically(articleRequest(article), event, this.analysisRuntime),
      };
    } catch (error) {
      if (error instanceof GroqRateLimitError) {
        this.groqBlockedUntil = Date.now() + error.retryAfterMs;
        return { outcome: 'GROQ_RATE_LIMITED', error, retryAt: error.retryAt };
      }
      if (error instanceof GeopoliticalEventValidationError) {
        return { outcome: 'INVALID_EVENT', error };
      }
      return { outcome: 'GROQ_FAILED', error };
    }
  }

  private finalizeScan(
    retrievedAt: string,
    summary: MonitoringScanSummary,
    eventsSkipped: number,
    alertsCreated: number,
  ): MonitoringScanResult {
    writeMeta(this.database, 'lastScanSummary', JSON.stringify(summary));
    if (summary.status === 'SUCCESS' || summary.status === 'NO_NEW_EVENTS') {
      writeMeta(this.database, 'lastSuccessfulScan', retrievedAt);
    }
    return scanResult(retrievedAt, summary, eventsSkipped, alertsCreated);
  }

  private async runScan(): Promise<MonitoringScanResult> {
    const retrievedAt = new Date().toISOString();
    this.state = 'RUNNING';
    this.lastError = undefined;
    let news: NewsApiResponse;
    try {
      news = await this.source.fetch();
    } catch (error) {
      this.state = 'ERROR';
      this.lastError = error instanceof Error ? error.message : 'RSS source failed.';
      console.error('[ORBIT Monitoring] RSS source failed:', this.lastError);
      return this.finalizeScan(retrievedAt, emptyScanSummary('FAILED'), 0, 0);
    }
    if (news.status === 'ERROR') {
      this.state = 'ERROR';
      this.lastError = 'All configured RSS feeds failed.';
      const summary = emptyScanSummary('FAILED');
      summary.articlesFetched = news.articles.length;
      return this.finalizeScan(retrievedAt, summary, 0, 0);
    }
    if (news.failedFeeds?.length) this.lastError = `${news.failedFeeds.length} monitoring feed(s) failed; partial results were processed.`;

    let eventsSkipped = 0;
    let alertsCreated = 0;
    let rateLimitReached = false;
    let processingFailure = Boolean(news.failedFeeds?.length);
    const summary = emptyScanSummary('NO_NEW_EVENTS');
    summary.articlesFetched = news.articles.length;
    // Normalized RSS articles always carry sourceType. Keep the legacy fallback for
    // callers that construct RawNewsArticle values without it.
    const candidateArticles = news.articles.filter((rawArticle) => !rawArticle.sourceType || isEnergyMonitoringCandidate(toMonitoringArticle(rawArticle)));
    const articlesToProcess = candidateArticles.slice(0, this.config.maxArticlesPerScan);
    summary.candidatesAfterFiltering = candidateArticles.length;
    eventsSkipped += Math.max(0, news.articles.length - articlesToProcess.length);
    for (const rawArticle of articlesToProcess) {
      const article = toMonitoringArticle(rawArticle);
      if (this.hasArticle(article)) {
        summary.duplicates += 1;
        eventsSkipped += 1;
        continue;
      }
      const existingEvent = this.findMatchingEvent(article);
      if (existingEvent) {
        this.mergeIntoExisting(existingEvent, article);
        this.markProcessed(article, existingEvent.analysis.event.id, existingEvent.article.id);
        summary.duplicates += 1;
        eventsSkipped += 1;
        continue;
      }
      try {
        const processing = await this.analyzeArticle(article);
        if (processing.outcome === 'DETERMINISTIC') summary.deterministicHighConfidence += 1;
        else {
          summary.deterministicRejected += 1;
          summary.groqFallbackCandidates += 1;
        }
        if (processing.outcome === 'GROQ_FALLBACK_SUCCESS') summary.groqFallbackSuccessful += 1;
        if (processing.outcome === 'GROQ_RATE_LIMITED') summary.groqRateLimited += 1;
        if (processing.outcome === 'GROQ_DEFERRED') summary.groqDeferred += 1;
        if (processing.outcome === 'GROQ_FAILED') summary.groqFailed += 1;
        if (processing.outcome === 'INVALID_EVENT') summary.invalidEvents += 1;
        if (!processing.analysis) {
          processingFailure = true;
          const errorMessage = processing.error instanceof Error ? processing.error.message : `Monitoring outcome: ${processing.outcome}.`;
          this.lastError = processing.retryAt ? `${errorMessage} Retry after ${processing.retryAt}.` : errorMessage;
          this.state = 'ERROR';
          continue;
        }
        const analysis = processing.analysis;
        const matchingEvent = this.findMatchingEvent(article, analysis);
        if (matchingEvent) {
          this.mergeIntoExisting(matchingEvent, article, eventFingerprintFor(article, analysis));
          this.markProcessed(article, matchingEvent.analysis.event.id, matchingEvent.article.id);
          summary.duplicates += 1;
          eventsSkipped += 1;
          continue;
        }
        const record: MonitoredEventRecord = { article, detectedAt: new Date().toISOString(), alertLevel: alertLevelFor(analysis), analysis };
        this.saveRecord(record, buildArticleFingerprint(articleInputFor(article)), eventFingerprintFor(article, analysis));
        summary.newEventsPersisted += 1;
        if (record.alertLevel === 'high' || record.alertLevel === 'critical') alertsCreated += 1;
      } catch (error) {
        processingFailure = true;
        this.lastError = error instanceof Error ? error.message : 'Monitoring article processing failed.';
        this.state = 'ERROR';
        if (error instanceof GroqRateLimitError) {
          this.groqBlockedUntil = Date.now() + error.retryAfterMs;
          this.lastError = error.message;
          this.state = 'ERROR';
          summary.deterministicRejected += 1;
          summary.groqFallbackCandidates += 1;
          summary.groqRateLimited += 1;
          rateLimitReached = true;
          break;
        }
        console.warn(`[ORBIT Monitoring] Article failed: ${article.id}`, error instanceof Error ? error.message : error);
      }
    }
    if (rateLimitReached) processingFailure = true;
    summary.status = processingFailure
      ? 'PARTIAL'
      : summary.newEventsPersisted > 0
        ? 'SUCCESS'
        : 'NO_NEW_EVENTS';
    this.state = processingFailure ? 'ERROR' : 'READY';
    return this.finalizeScan(retrievedAt, summary, eventsSkipped, alertsCreated);
  }

  async ingestExternal(input: ExternalMonitoringEventInput): Promise<MonitoredEventRecord> {
    const title = textField(input.title, 'title', true);
    const source = textField(input.source, 'source', true);
    const description = textField(input.description, 'description');
    const sourceUrl = textField(input.sourceUrl, 'sourceUrl');
    const publishedAt = textField(input.publishedAt, 'publishedAt');
    if (sourceUrl) {
      try {
        const parsedUrl = new URL(sourceUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error('unsupported protocol');
      } catch {
        throw new Error('sourceUrl is invalid.');
      }
    }
    if (publishedAt && Number.isNaN(Date.parse(publishedAt))) throw new Error('publishedAt is invalid.');
    const article: MonitoringArticle = {
      id: stableExternalArticleId(input, title, source, publishedAt),
      title,
      source,
      retrievedAt: new Date().toISOString(),
      sourceType: 'external_webhook',
      sources: [source],
      ...(description ? { description } : {}),
      ...(sourceUrl ? { url: sourceUrl } : {}),
      ...(publishedAt ? { publishedAt: new Date(Date.parse(publishedAt)).toISOString() } : {}),
    };
    article.sourceReferences = [sourceReferenceFor(article)];
    if (this.hasArticle(article)) throw new DuplicateMonitoredEventError(article.id);
    const existingEvent = this.findMatchingEvent(article);
    if (existingEvent) {
      const merged = this.mergeIntoExisting(existingEvent, article);
      this.markProcessed(article, existingEvent.analysis.event.id, existingEvent.article.id);
      return cloneRecord(merged);
    }
    if (!isEnergyMonitoringCandidate(article)) throw new IrrelevantMonitoringCandidateError();
    const session = this.getOrCreateExternalRefreshSession();
    if (session.processedCandidateIds.has(article.id)) {
      throw new DuplicateMonitoredEventError(article.id);
    }
    if (session.candidateCount >= this.config.maxArticlesPerScan) {
      throw new ExternalCandidateBudgetExceededError(this.config.maxArticlesPerScan);
    }
    session.candidateCount += 1;
    session.processedCandidateIds.add(article.id);
    const processing = await this.analyzeArticle(article);
    if (!processing.analysis) {
      if (processing.error instanceof Error) throw processing.error;
      throw new Error(`Monitoring outcome: ${processing.outcome}.`);
    }
    const analysis = processing.analysis;
    const matchingEvent = this.findMatchingEvent(article, analysis);
    if (matchingEvent) {
      const merged = this.mergeIntoExisting(matchingEvent, article, eventFingerprintFor(article, analysis));
      this.markProcessed(article, matchingEvent.analysis.event.id, matchingEvent.article.id);
      return cloneRecord(merged);
    }
    const record: MonitoredEventRecord = { article, detectedAt: new Date().toISOString(), alertLevel: alertLevelFor(analysis), analysis };
    this.saveRecord(record, buildArticleFingerprint(articleInputFor(article)), eventFingerprintFor(article, analysis));
    return cloneRecord(record);
  }

  recordExternalScan(input: ExternalMonitoringScanInput): { scanId: string; scannedAt: string; articlesSeen: number; summary?: MonitoringExternalScanSummary } {
    const scanId = textField(input.scanId, 'scanId', true);
    const requestedStatus = textField(input.status, 'status', true);
    const scannedAt = textField(input.scannedAt, 'scannedAt', true);
    const source = textField(input.source, 'source', true);
    const status = requestedStatus === 'ERROR' ? 'FAILED' : requestedStatus;
    const articlesSeen = nonNegativeIntegerField(input.articlesSeen ?? input.articlesFetched, 'articlesSeen');
    const articlesFetched = input.articlesFetched === undefined
      ? articlesSeen
      : nonNegativeIntegerField(input.articlesFetched, 'articlesFetched');
    if (!['SUCCESS', 'PARTIAL', 'NO_NEW_EVENTS', 'FAILED'].includes(status)) throw new Error('status is invalid.');
    if (source !== 'n8n_google_news') throw new Error('source is invalid.');
    if (Number.isNaN(Date.parse(scannedAt))) throw new Error('scannedAt is invalid.');
    const normalizedScannedAt = new Date(Date.parse(scannedAt)).toISOString();
    if (status === 'SUCCESS' || status === 'NO_NEW_EVENTS') writeMeta(this.database, 'lastSuccessfulExternalScan', normalizedScannedAt);
    writeMeta(this.database, 'lastExternalScanArticlesSeen', String(articlesSeen));
    writeMeta(this.database, 'lastExternalScanStatus', status);

    const summaryFields: Array<keyof Omit<MonitoringExternalScanSummary, 'status' | 'articlesFetched'>> = [
      'candidatesAfterFiltering',
      'deterministicHighConfidence',
      'deterministicRejected',
      'groqFallbackCandidates',
      'groqFallbackSuccessful',
      'groqRateLimited',
      'groqDeferred',
      'groqFailed',
      'duplicates',
      'invalidEvents',
      'newEventsPersisted',
    ];
    const hasSummary = input.articlesFetched !== undefined || summaryFields.some((field) => input[field] !== undefined);
    if (!hasSummary && status === 'SUCCESS') return { scanId, scannedAt: normalizedScannedAt, articlesSeen };

    const summary: MonitoringExternalScanSummary = {
      status: status as MonitoringScanStatus,
      articlesFetched,
    };
    for (const field of summaryFields) {
      if (input[field] !== undefined) summary[field] = nonNegativeIntegerField(input[field], field);
    }
    writeMeta(this.database, 'lastExternalScanSummary', JSON.stringify(summary));
    return { scanId, scannedAt: normalizedScannedAt, articlesSeen, summary };
  }

  getStatus(): MonitoringStatus {
    const records = this.readAllRecords();
    const relevantRecords = records.filter((record) => isEnergySupplyChainRelevant(record.analysis));
    const lastScanSummary = scanSummaryFromMeta(readMeta(this.database, 'lastScanSummary'));
    const lastExternalScanSummary = externalScanSummaryFromMeta(readMeta(this.database, 'lastExternalScanSummary'));
    const storedExternalScanStatus = readMeta(this.database, 'lastExternalScanStatus');
    const lastExternalScanStatus = storedExternalScanStatus === 'SUCCESS' || storedExternalScanStatus === 'PARTIAL' || storedExternalScanStatus === 'NO_NEW_EVENTS' || storedExternalScanStatus === 'FAILED'
      ? storedExternalScanStatus
      : undefined;
    const sources: MonitoringSourceType[] = ['google_news'];
    if (this.config.feedUrls.length) sources.push('direct_rss');
    for (const record of this.readRecords(200)) {
      if (record.article.sourceType && !sources.includes(record.article.sourceType)) sources.push(record.article.sourceType);
    }
    return {
      enabled: this.config.enabled,
      state: this.state,
      source: sourceLabel(sources),
      sources,
      pollIntervalMs: this.config.pollIntervalMs,
      maxArticlesPerScan: this.config.maxArticlesPerScan,
      lastSuccessfulScan: readMeta(this.database, 'lastSuccessfulScan'),
      lastSuccessfulExternalScan: readMeta(this.database, 'lastSuccessfulExternalScan'),
      lastExternalScanArticlesSeen: Number(readMeta(this.database, 'lastExternalScanArticlesSeen')) || undefined,
      ...(lastExternalScanStatus ? { lastExternalScanStatus } : {}),
      ...(lastExternalScanSummary ? { lastExternalScanSummary } : {}),
      ...(lastScanSummary ? {
        lastScanStatus: lastScanSummary.status,
        lastScanSummary,
      } : {}),
      lastError: this.lastError,
      detectedEvents: records.length,
      relevantEvents: relevantRecords.length,
      highRiskAlerts: relevantRecords.filter((record) => record.alertLevel === 'high').length,
      criticalAlerts: relevantRecords.filter((record) => record.alertLevel === 'critical').length,
    };
  }

  getEvents(limit = 50): MonitoredEventRecord[] { return this.readRecords(limit); }

  getRelevantEvents(limit = 50): MonitoredEventRecord[] { return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant(record.analysis)); }

  getAlerts(limit = 50): MonitoredEventRecord[] { return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant(record.analysis) && (record.alertLevel === 'high' || record.alertLevel === 'critical')); }

  getHighRiskAlerts(limit = 50): MonitoredEventRecord[] { return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant(record.analysis) && record.alertLevel === 'high'); }

  getCriticalAlerts(limit = 50): MonitoredEventRecord[] { return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant(record.analysis) && record.alertLevel === 'critical'); }

  private reconcilePersistedRecords(): void {
    const rows = this.database.prepare('SELECT article_id, detected_at, event_fingerprint, record_json FROM geopolitical_monitor_results ORDER BY detected_at ASC, article_id ASC').all() as Array<{ article_id: string; detected_at: string; event_fingerprint?: string; record_json: string }>;
    const kept: Array<{ articleId: string; record: MonitoredEventRecord; eventFingerprint: string }> = [];
    this.database.exec('BEGIN');
    try {
      for (const row of rows) {
        const record = JSON.parse(row.record_json) as MonitoredEventRecord;
        const eventFingerprint = row.event_fingerprint || eventFingerprintFor(record.article, record.analysis);
        const duplicate = kept.find((candidate) => canonicalArticleUrlForDedup(record.article.url || '') === canonicalArticleUrlForDedup(candidate.record.article.url || '') && record.article.url && candidate.record.article.url)
          || kept.find((candidate) => eventMatches(record.article, record.analysis, candidate.record, candidate.eventFingerprint));
        if (!duplicate) {
          const articleFingerprint = buildArticleFingerprint(articleInputFor(record.article));
          this.updateStoredRecord(row.article_id, record, articleFingerprint, eventFingerprint);
          kept.push({ articleId: row.article_id, record, eventFingerprint });
          continue;
        }

        const mergedRecord: MonitoredEventRecord = {
          ...duplicate.record,
          article: mergeArticleMetadata(duplicate.record.article, record.article),
        };
        const mergedArticleFingerprint = buildArticleFingerprint(articleInputFor(mergedRecord.article));
        this.updateStoredRecord(duplicate.articleId, mergedRecord, mergedArticleFingerprint, duplicate.eventFingerprint);
        this.database.prepare('DELETE FROM geopolitical_monitor_results WHERE article_id = ?').run(row.article_id);
        this.markProcessed(record.article, duplicate.record.analysis.event.id, duplicate.articleId, duplicate.eventFingerprint);
        duplicate.record = mergedRecord;
      }
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  private hasArticle(article: MonitoringArticle): boolean {
    const articleUrlKey = article.url ? canonicalArticleUrlForDedup(article.url) : '';
    if (this.database.prepare('SELECT article_id FROM geopolitical_monitor_processed WHERE article_id = ? OR (? <> \'\' AND article_url_key = ?) LIMIT 1').get(article.id, articleUrlKey, articleUrlKey)) return true;
    if (this.database.prepare('SELECT article_id FROM geopolitical_monitor_results WHERE article_id = ? OR (? <> \'\' AND article_url_key = ?) LIMIT 1').get(article.id, articleUrlKey, articleUrlKey)) return true;

    const rows = this.database.prepare('SELECT article_id, source_url, record_json FROM geopolitical_monitor_results').all() as Array<{ article_id: string; source_url?: string; record_json: string }>;
    return rows.some((row) => row.article_id === article.id || (articleUrlKey && canonicalArticleUrlForDedup(row.source_url || '') === articleUrlKey) || (JSON.parse(row.record_json) as MonitoredEventRecord).article.id === article.id);
  }

  private findMatchingEvent(article: MonitoringArticle, analysis?: GeopoliticalRiskAgentResponse): MonitoredEventRecord | undefined {
    const rows = this.database.prepare('SELECT record_json, event_fingerprint FROM geopolitical_monitor_results ORDER BY detected_at ASC').all() as Array<{ record_json: string; event_fingerprint?: string }>;
    for (const row of rows) {
      const record = JSON.parse(row.record_json) as MonitoredEventRecord;
      if (analysis ? eventMatches(article, analysis, record, row.event_fingerprint) : rawArticleMatches(article, record)) return record;
    }
    return undefined;
  }

  private markProcessed(article: MonitoringArticle, eventId: string, duplicateOf?: string, eventFingerprint?: string): void {
    const articleUrlKey = article.url ? canonicalArticleUrlForDedup(article.url) : null;
    const articleFingerprint = buildArticleFingerprint(articleInputFor(article));
    this.database.prepare(`
      INSERT INTO geopolitical_monitor_processed(article_id, event_id, processed_at, duplicate_of, event_fingerprint, article_fingerprint, article_url_key)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(article_id) DO UPDATE SET
        event_id = excluded.event_id,
        processed_at = excluded.processed_at,
        duplicate_of = COALESCE(excluded.duplicate_of, geopolitical_monitor_processed.duplicate_of),
        event_fingerprint = COALESCE(excluded.event_fingerprint, geopolitical_monitor_processed.event_fingerprint),
        article_fingerprint = COALESCE(excluded.article_fingerprint, geopolitical_monitor_processed.article_fingerprint),
        article_url_key = COALESCE(excluded.article_url_key, geopolitical_monitor_processed.article_url_key)
    `).run(article.id, eventId, new Date().toISOString(), duplicateOf || null, eventFingerprint || null, articleFingerprint, articleUrlKey);
  }

  private updateStoredRecord(articleId: string, record: MonitoredEventRecord, articleFingerprint: string, eventFingerprint: string): void {
    const articleUrlKey = record.article.url ? canonicalArticleUrlForDedup(record.article.url) : null;
    this.database.prepare(`UPDATE geopolitical_monitor_results SET title = ?, source = ?, source_url = ?, event_id = ?, event_fingerprint = ?, article_fingerprint = ?, article_url_key = ?, relevant = ?, risk_level = ?, risk_score = ?, record_json = ? WHERE article_id = ?`).run(
      record.article.title,
      record.article.source,
      record.article.url || null,
      record.analysis.event.id,
      eventFingerprint,
      articleFingerprint,
      articleUrlKey,
      isEnergySupplyChainRelevant(record.analysis) ? 1 : 0,
      record.analysis.risk.riskLevel,
      record.analysis.risk.riskScore,
      JSON.stringify(record),
      articleId,
    );
  }

  private mergeIntoExisting(existing: MonitoredEventRecord, incoming: MonitoringArticle, eventFingerprint?: string): MonitoredEventRecord {
    const merged: MonitoredEventRecord = {
      ...existing,
      article: mergeArticleMetadata(existing.article, incoming),
    };
    this.updateStoredRecord(
      existing.article.id,
      merged,
      buildArticleFingerprint(articleInputFor(merged.article)),
      eventFingerprint || eventFingerprintFor(existing.article, existing.analysis),
    );
    return merged;
  }

  private saveRecord(record: MonitoredEventRecord, articleFingerprint: string, eventFingerprint: string): void {
    const articleUrlKey = record.article.url ? canonicalArticleUrlForDedup(record.article.url) : null;
    this.database.prepare(`INSERT INTO geopolitical_monitor_results(article_id, detected_at, title, source, source_url, event_id, event_fingerprint, article_fingerprint, article_url_key, relevant, risk_level, risk_score, record_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.article.id,
      record.detectedAt,
      record.article.title,
      record.article.source,
      record.article.url || null,
      record.analysis.event.id,
      eventFingerprint,
      articleFingerprint,
      articleUrlKey,
      isEnergySupplyChainRelevant(record.analysis) ? 1 : 0,
      record.analysis.risk.riskLevel,
      record.analysis.risk.riskScore,
      JSON.stringify(record),
    );
    this.markProcessed(record.article, record.analysis.event.id, undefined, eventFingerprint);
  }

  private readRecords(limit: number): MonitoredEventRecord[] {
    const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 50;
    const rows = this.database.prepare('SELECT record_json FROM geopolitical_monitor_results ORDER BY detected_at DESC LIMIT ?').all(boundedLimit) as Array<{ record_json: string }>;
    return rows.map((row) => cloneRecord(JSON.parse(row.record_json) as MonitoredEventRecord));
  }

  private readAllRecords(): MonitoredEventRecord[] {
    const rows = this.database.prepare('SELECT record_json FROM geopolitical_monitor_results ORDER BY detected_at DESC').all() as Array<{ record_json: string }>;
    return rows.map((row) => cloneRecord(JSON.parse(row.record_json) as MonitoredEventRecord));
  }
}
