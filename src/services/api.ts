import type { DigitalTwinImpactResult } from '../digitalTwin/impact';
import type { DigitalTwinGraph, OperationalState } from '../digitalTwin/model';
import type { DigitalTwinNodeState } from '../digitalTwin/state';
import type { MonitoringSourceType } from '../geopoliticalEvents/monitoring';
import type {
  ScenarioInput,
  ScenarioNodeListResponse,
  ScenarioResult,
} from '../scenarios/model';
import type { ProcurementResult } from '../procurement/model';
import type {
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
  StrategicReserveState,
  RealAlternativeProcurementState,
  ProcurementProvenance,
} from '../reserves/model';
import type { OrbitAssessment, OrbitAssessmentResponse } from '../types/orbitAssessment';

export type { OrbitAssessment, OrbitAssessmentResponse } from '../types/orbitAssessment';

export type ServerHealthStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type CapabilityStatus = 'READY' | 'NOT_CONNECTED' | 'UNKNOWN';
export type NewsIngestionStatus = 'READY' | 'NOT_CONNECTED' | 'ERROR';

export interface RawNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
  retrievedAt: string;
  query?: string;
  sourceType?: 'google_news' | 'direct_rss';
  feedUrl?: string;
}

export interface NewsApiResponse {
  status: 'AVAILABLE' | 'ERROR';
  source: 'Google News RSS' | 'Direct RSS' | 'Google News + Direct RSS';
  retrievedAt: string;
  count: number;
  articles: RawNewsArticle[];
  sources?: Array<'google_news' | 'direct_rss'>;
  failedFeeds?: string[];
}

export interface GeopoliticalRiskAgentResponse {
  status?: 'AVAILABLE' | 'ERROR';
  request?: string;
  event?: {
    id?: string;
    title?: string;
    description?: string;
    timestamp?: string;
    source?: string;
    sourceUrl?: string;
    location?: string;
    countriesInvolved?: string[];
    category?: string;
    severity?: string;
  };
  classification?: {
    eventId?: string;
    category?: string;
    severity?: string;
    energyRelevant?: boolean;
    countriesInvolved?: string[];
    location?: string;
    region?: string;
    classificationReasons?: string[];
  };
  relevance?: {
    eventId?: string;
    relevant?: boolean;
    matchedNodeIds?: string[];
    matchedNodeTypes?: string[];
    matchedLocations?: string[];
    matchedCountries?: string[];
    relevanceReasons?: string[];
  };
  risk?: {
    eventId?: string;
    riskLevel?: string;
    riskScore?: number;
    factors?: Array<{ name?: string; points?: number; explanation?: string }>;
    reasoning?: string[];
    matchedNodeIds?: string[];
    energyRelevant?: boolean;
  };
  digitalTwinImpact?: {
    eventId?: string;
    relevant?: boolean;
    riskLevel?: string;
    riskScore?: number;
    matchedNodeIds?: string[];
    affectedNodeIds?: string[];
    affectedNodeNames?: string[];
    affectedEdgeIds?: string[];
    affectedNodeTypes?: string[];
    affectedCapacity?: MeasurementSummary;
    affectedFlow?: MeasurementSummary;
    impactReasons?: string[];
  };
  explanation?: string;
}

export interface MonitoredEventRecord {
  article?: {
    id?: string;
    title?: string;
    url?: string;
    source?: string;
    publishedAt?: string;
    description?: string;
    retrievedAt?: string;
    query?: string;
    sourceType?: MonitoringSourceType;
    feedUrl?: string;
  };
  detectedAt?: string;
  alertLevel?: string;
  analysis?: GeopoliticalRiskAgentResponse;
  duplicateOf?: string;
}

export interface MonitoringStatusResponse {
  status?: 'AVAILABLE' | 'ERROR';
  monitoring?: {
    enabled?: boolean;
    state?: string;
    source?: string;
    sources?: MonitoringSourceType[];
    pollIntervalMs?: number;
    maxArticlesPerScan?: number;
    lastSuccessfulScan?: string;
    lastSuccessfulExternalScan?: string;
    lastExternalScanArticlesSeen?: number;
    lastExternalScanStatus?: 'SUCCESS' | 'PARTIAL' | 'NO_NEW_EVENTS' | 'FAILED';
    lastExternalScanSummary?: {
      status?: 'SUCCESS' | 'PARTIAL' | 'NO_NEW_EVENTS' | 'FAILED';
      articlesFetched?: number;
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
    };
    lastScanStatus?: 'SUCCESS' | 'PARTIAL' | 'NO_NEW_EVENTS' | 'FAILED';
    lastScanSummary?: {
      status?: 'SUCCESS' | 'PARTIAL' | 'NO_NEW_EVENTS' | 'FAILED';
      articlesFetched?: number;
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
    };
    lastError?: string;
    detectedEvents?: number;
    relevantEvents?: number;
    highRiskAlerts?: number;
    criticalAlerts?: number;
  };
}

export interface MonitoringEventsResponse {
  status?: 'AVAILABLE' | 'ERROR';
  count?: number;
  events?: MonitoredEventRecord[];
}

export interface MonitoringAlertsResponse {
  status?: 'AVAILABLE' | 'ERROR';
  count?: number;
  alerts?: MonitoredEventRecord[];
}

export interface MonitoringRefreshResponse {
  status?: 'TRIGGERED' | 'ERROR';
  refresh?: {
    requestedAt?: string;
    trigger?: 'n8n';
  };
  error?: string;
}

export interface MonitoringRelevantEventsResponse {
  status?: 'AVAILABLE' | 'ERROR';
  count?: number;
  events?: MonitoredEventRecord[];
}

export interface MeasurementSummary {
  nodeTotals?: Array<{ value?: number; unit?: string }>;
  edgeTotals?: Array<{ value?: number; unit?: string }>;
}

export interface HealthApiResponse {
  status: ServerHealthStatus;
  service: string;
  phase: string;
  timestamp: string;
  capabilities: {
    authentication: CapabilityStatus;
    newsIngestion: NewsIngestionStatus;
    phase2DataLayer: CapabilityStatus;
    digitalTwin: CapabilityStatus;
    mlInference: CapabilityStatus;
    geminiAssistant: CapabilityStatus;
  };
}

export interface DigitalTwinResetResponse {
  status: 'AVAILABLE';
  graph: DigitalTwinGraph;
  summary: {
    nodeCount: number;
    byState: Record<OperationalState, number>;
  };
}

export interface ScenarioProcurementResponse {
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNAVAILABLE' | 'ERROR';
  scenario?: ScenarioResult;
  procurement?: ProcurementResult;
  source?: string;
  error?: string;
}

export interface StrategicReserveStateResponse {
  status: 'AVAILABLE' | 'ERROR';
  state?: StrategicReserveState;
  error?: string;
}

export interface StrategicReserveHistoryResponse {
  status: 'AVAILABLE' | 'ERROR';
  count?: number;
  runs?: Array<{
    optimizationId: string;
    requestedAt: string;
    input: StrategicReserveOptimizationInput;
    result: StrategicReserveOptimizationResult;
  }>;
  error?: string;
}

export interface StrategicReserveOptimizationResponse {
  status: 'AVAILABLE' | 'ERROR';
  optimizationId?: string;
  reserve?: StrategicReserveOptimizationResult;
  procurementProvenance?: ProcurementProvenance;
  error?: string;
}

export interface RealAlternativeProcurementResponse {
  status: 'AVAILABLE' | 'ERROR';
  procurement?: RealAlternativeProcurementState;
  error?: string;
}

export interface PipelineExecutionResponse {
  status: 'AVAILABLE' | 'ERROR';
  pipeline?: {
    pipelineId: string;
    completedAt: string;
    stages: {
      geopoliticalAnalysis: GeopoliticalRiskAgentResponse;
      scenarioSimulation: ScenarioResult;
      procurementAlternatives: {
        resolutionStatus: string;
        source: string;
        procurement: ProcurementResult | null;
      };
      reserveOptimization: {
        optimizationId: string;
        input: StrategicReserveOptimizationInput;
        result: StrategicReserveOptimizationResult;
      };
    };
  };
  /** Phase 2 unified assessment payload (supersedes `pipeline` once the UI migrates). */
  assessment?: OrbitAssessment;
  error?: string;
}

const requestJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  let body: ({ error?: string } & Record<string, unknown>) | null = null;
  const rawText = await response.text();
  if (rawText && rawText.trim()) {
    try {
      body = JSON.parse(rawText) as { error?: string } & Record<string, unknown>;
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const errorMsg = typeof body?.error === 'string' ? body.error : `Request failed with HTTP status ${response.status}.`;
    throw new Error(errorMsg);
  }

  if (!body) {
    throw new Error('Server returned an unexpected response format. Please try again.');
  }

  return body as T;
};

const unavailableHealthResponse = (): HealthApiResponse => ({
  status: 'UNAVAILABLE',
  service: 'ORBIT application server',
  phase: 'Phase 2 - Real Data Ingestion',
  timestamp: new Date().toISOString(),
  capabilities: {
    authentication: 'UNKNOWN',
    newsIngestion: 'NOT_CONNECTED',
    phase2DataLayer: 'NOT_CONNECTED',
    digitalTwin: 'UNKNOWN',
    mlInference: 'UNKNOWN',
    geminiAssistant: 'UNKNOWN'
  }
});

/** The health endpoint reports server availability, not operational-data readiness. */
export async function checkBackendHealth(): Promise<HealthApiResponse> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Health check returned HTTP ${response.status}`);
    }

    return (await response.json()) as HealthApiResponse;
  } catch (error) {
    console.warn('[ORBIT API] Application server health check failed:', error);
    return unavailableHealthResponse();
  }
}

/** Fetches normalized real news from the ORBIT backend ingestion service. */
export async function fetchNews(): Promise<NewsApiResponse> {
  try {
    const response = await fetch('/api/news', {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`News request returned HTTP ${response.status}`);
    }

    return (await response.json()) as NewsApiResponse;
  } catch (error) {
    console.warn('[ORBIT API] News ingestion request failed:', error);
    return {
      status: 'ERROR',
      source: 'Google News RSS',
      retrievedAt: new Date().toISOString(),
      count: 0,
      articles: []
    };
  }
}

export async function analyzeGeopoliticalRisk(request: string): Promise<GeopoliticalRiskAgentResponse> {
  const body = await requestJson<GeopoliticalRiskAgentResponse>('/api/geopolitical-risk/agent', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ request })
  });
  if (body.status !== 'AVAILABLE') throw new Error('Geopolitical risk agent returned an unavailable response.');
  return body;
}

export async function fetchMonitoringStatus(): Promise<MonitoringStatusResponse> {
  return requestJson<MonitoringStatusResponse>('/api/geopolitical-risk/monitor/status', {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
}

export async function refreshGeopoliticalMonitoring(): Promise<MonitoringRefreshResponse> {
  return requestJson<MonitoringRefreshResponse>('/api/geopolitical-risk/monitor/refresh', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function fetchMonitoredEvents(limit = 20): Promise<MonitoringEventsResponse> {
  return requestJson<MonitoringEventsResponse>(`/api/geopolitical-risk/monitor/events?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
}

export async function fetchMonitoringAlerts(limit = 20): Promise<MonitoringAlertsResponse> {
  return requestJson<MonitoringAlertsResponse>(`/api/geopolitical-risk/monitor/alerts?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
}

export async function fetchRelevantMonitoredEvents(limit = 20): Promise<MonitoringRelevantEventsResponse> {
  return requestJson<MonitoringRelevantEventsResponse>(`/api/geopolitical-risk/monitor/relevant-events?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
}

export async function fetchHighRiskMonitoringAlerts(limit = 20): Promise<MonitoringAlertsResponse> {
  return requestJson<MonitoringAlertsResponse>(`/api/geopolitical-risk/monitor/alerts/high?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
}

export async function fetchCriticalMonitoringAlerts(limit = 20): Promise<MonitoringAlertsResponse> {
  return requestJson<MonitoringAlertsResponse>(`/api/geopolitical-risk/monitor/alerts/critical?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
}

export async function fetchDigitalTwin(): Promise<DigitalTwinGraph> {
  const body = await requestJson<{ graph?: DigitalTwinGraph }>('/api/digital-twin', {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  if (!body.graph) throw new Error('Digital Twin response did not include a graph.');
  return body.graph;
}

export async function fetchScenarioNodes(): Promise<ScenarioNodeListResponse> {
  const body = await requestJson<ScenarioNodeListResponse>('/api/scenarios/nodes', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (
    body.status !== 'AVAILABLE' ||
    !Array.isArray(body.nodes) ||
    !body.totals ||
    !body.typeCounts
  ) {
    throw new Error('Scenario node response did not include selectable assets.');
  }

  return body;
}

export async function runScenarioProcurement(
  input: ScenarioInput,
  useDemoData = false,
): Promise<ScenarioProcurementResponse> {
  const query = useDemoData ? '?dataSource=demo' : '';
  const response = await fetch(`/api/scenarios/procurement${query}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const contentType = response.headers.get('content-type') || 'unknown content type';
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(`Procurement request returned an empty response (HTTP ${response.status}).`);
  }

  let body: ScenarioProcurementResponse;
  try {
    body = JSON.parse(text) as ScenarioProcurementResponse;
  } catch {
    throw new Error(
      `Procurement request returned invalid JSON (HTTP ${response.status}, ${contentType}).`,
    );
  }

  if (!response.ok && body.status !== 'UNAVAILABLE') {
    throw new Error(
      body.error || `Procurement request failed (HTTP ${response.status}).`,
    );
  }

  return body;
}

export async function optimizeStrategicReserve(
  input: StrategicReserveOptimizationInput,
): Promise<StrategicReserveOptimizationResult & { procurementProvenance?: ProcurementProvenance; optimizationId?: string }> {
  const body = await requestJson<StrategicReserveOptimizationResponse>(
    '/api/reserves/optimize',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  if (body.status !== 'AVAILABLE' || !body.reserve) {
    throw new Error(body.error || 'Strategic reserve optimization returned no result.');
  }

  return {
    ...body.reserve,
    procurementProvenance: body.procurementProvenance,
    optimizationId: body.optimizationId,
  };
}

export async function fetchRealAlternativeProcurement(params?: {
  excludedCountry?: string;
  financialYear?: string;
  limit?: number;
}): Promise<RealAlternativeProcurementState> {
  const query = new URLSearchParams();
  if (params?.excludedCountry) query.set('excludedCountry', params.excludedCountry);
  if (params?.financialYear) query.set('financialYear', params.financialYear);
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  const body = await requestJson<RealAlternativeProcurementResponse>(
    `/api/reserves/alternative-procurement${qs}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );

  if (body.status !== 'AVAILABLE' || !body.procurement) {
    throw new Error(body.error || 'Failed to retrieve real alternative procurement from SQLite.');
  }

  return body.procurement;
}

export async function commitProcurement(dailyTonnes: number): Promise<{ status: 'AVAILABLE' }> {
  const body = await requestJson<{ status: 'AVAILABLE' | 'ERROR'; error?: string }>('/api/reserves/commit-procurement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dailyTonnes }),
  });

  if (body.status !== 'AVAILABLE') {
    throw new Error(body.error || 'Failed to commit procurement.');
  }

  return { status: 'AVAILABLE' };
}

export async function fetchStrategicReserveState(): Promise<StrategicReserveStateResponse['state']> {
  const body = await requestJson<StrategicReserveStateResponse>(
    '/api/reserves/state',
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );

  if (body.status !== 'AVAILABLE' || !body.state) {
    throw new Error(body.error || 'Failed to retrieve strategic reserve state.');
  }

  return body.state;
}

export async function fetchStrategicReserveHistory(limit = 20): Promise<NonNullable<StrategicReserveHistoryResponse['runs']>> {
  const body = await requestJson<StrategicReserveHistoryResponse>(
    `/api/reserves/history?limit=${limit}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );

  if (body.status !== 'AVAILABLE' || !body.runs) {
    throw new Error(body.error || 'Failed to retrieve strategic reserve optimization history.');
  }

  return body.runs;
}

export async function runPipelineOptimization(
  params: {
    text?: string;
    event?: unknown;
    affectedNodeId?: string;
    durationDays?: number;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    capacityReductionPercent?: number;
    currentReserve?: number;
    demand?: number;
    minimumReserveThreshold?: number;
    replenishmentRate?: number;
    dataSource?: 'sqlite' | 'demo';
  },
): Promise<NonNullable<PipelineExecutionResponse['pipeline']>> {
  const body = await requestJson<PipelineExecutionResponse>(
    '/api/pipeline/run',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
  );

  if (body.status !== 'AVAILABLE' || !body.pipeline) {
    throw new Error(body.error || 'End-to-end pipeline execution failed.');
  }

  return body.pipeline;
}

export interface OrbitAssessmentRunParams {
  text?: string;
  request?: string;
  event?: unknown;
  monitoredEventId?: string;
  affectedNodeId?: string;
  durationDays?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  capacityReductionPercent?: number;
  currentReserve?: number;
  demand?: number;
  minimumReserveThreshold?: number;
  replenishmentRate?: number;
  alternativeProcurement?: number;
  dataSource?: 'sqlite' | 'demo';
}

/** Runs the end-to-end pipeline over HTTP and returns the unified, persisted assessment. */
export async function requestOrbitAssessment(params: OrbitAssessmentRunParams): Promise<OrbitAssessment> {
  const body = await requestJson<OrbitAssessmentResponse>('/api/pipeline/run', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!body.assessment) {
    throw new Error(body.error || 'End-to-end assessment execution failed.');
  }

  return body.assessment;
}

/** Fetches a single persisted assessment by its stable id. */
export async function fetchOrbitAssessment(assessmentId: string): Promise<OrbitAssessment> {
  const body = await requestJson<OrbitAssessmentResponse>(
    `/api/assessments/${encodeURIComponent(assessmentId)}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );

  if (!body.assessment) {
    throw new Error(body.error || 'Failed to retrieve orbit assessment.');
  }

  return body.assessment;
}

/** Returns the most recent assessment, or null when none has been recorded yet. */
export async function fetchLatestOrbitAssessment(): Promise<OrbitAssessment | null> {
  const body = await requestJson<OrbitAssessmentResponse>('/api/assessments/latest', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  return body.assessment ?? null;
}

export interface OrbitAssessmentListResponse {
  status: 'AVAILABLE' | 'ERROR';
  count?: number;
  assessments?: OrbitAssessment[];
  error?: string;
}

/** Lists recent assessments (newest first) from GET /api/assessments. */
export async function fetchOrbitAssessments(limit = 20): Promise<OrbitAssessment[]> {
  const body = await requestJson<OrbitAssessmentListResponse>(`/api/assessments?limit=${limit}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (body.status !== 'AVAILABLE' || !body.assessments) {
    throw new Error(body.error || 'Failed to retrieve orbit assessments.');
  }

  return body.assessments;
}

export async function fetchDigitalTwinNodeState(nodeId: string): Promise<DigitalTwinNodeState> {
  const body = await requestJson<{ state?: DigitalTwinNodeState }>(`/api/digital-twin/state/${encodeURIComponent(nodeId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  if (!body.state) throw new Error('Digital Twin state response did not include node state.');
  return body.state;
}

export async function updateDigitalTwinNodeState(nodeId: string, state: OperationalState): Promise<DigitalTwinNodeState> {
  const body = await requestJson<{ state?: DigitalTwinNodeState }>('/api/digital-twin/state', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId, state })
  });
  if (!body.state) throw new Error('Digital Twin state response did not include updated node state.');
  return body.state;
}

export async function resetDigitalTwin(): Promise<DigitalTwinResetResponse> {
  return requestJson<DigitalTwinResetResponse>('/api/digital-twin/reset', {
    method: 'POST',
    headers: { Accept: 'application/json' }
  });
}

export async function analyzeDigitalTwinImpact(nodeId: string): Promise<DigitalTwinImpactResult> {
  const body = await requestJson<{ impact?: DigitalTwinImpactResult }>('/api/digital-twin/impact', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId })
  });
  if (!body.impact) throw new Error('Digital Twin impact response did not include an impact result.');
  return body.impact;
}

export interface OptimizedReplacementSupplyResponse {
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNAVAILABLE' | 'ERROR';
  procurement?: ProcurementResult;
  source?: string;
  error?: string;
}

export async function fetchOptimizedReplacementSupply(params: {
  supplyGap: number;
  disruptionDuration: number;
  affectedNodeId?: string;
}): Promise<OptimizedReplacementSupplyResponse> {
  return requestJson<OptimizedReplacementSupplyResponse>('/api/procurement/optimize-gap', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
}

