import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Globe2,
  Loader2,
  Network,
  RefreshCw,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  analyzeGeopoliticalRisk,
  fetchCriticalMonitoringAlerts,
  fetchHighRiskMonitoringAlerts,
  fetchMonitoredEvents,
  fetchMonitoringStatus,
  refreshGeopoliticalMonitoring,
  type GeopoliticalRiskAgentResponse,
  type MeasurementSummary,
  type MonitoredEventRecord,
  type MonitoringStatusResponse,
} from '../services/api';

interface AssistantPageProps {
  onNavigate?: (path: string) => void;
}

export const EXAMPLE_PROMPTS = [
  'What happens if the Strait of Hormuz is disrupted?',
  'Assess the supply-chain risk of a disruption in Saudi Arabian crude exports.',
];

export const INITIAL_ASSISTANT_REQUEST = '';

export const EXTERNAL_MONITORING_FRESHNESS_MS = 30 * 60 * 1000;

export type ExternalMonitoringStatus = {
  state: 'ACTIVE' | 'STANDBY' | 'WAITING';
  message: string;
  latestEventAt?: string;
};

export const getExternalMonitoringStatus = (
  events: readonly MonitoredEventRecord[],
  now = Date.now(),
): ExternalMonitoringStatus => {
  const externalEvents = events.filter((record) => record.article?.sourceType === 'external_webhook');
  const latestExternalEvent = externalEvents.reduce<MonitoredEventRecord | undefined>((latest, record) => {
    if (!latest) return record;
    const latestDetectedAt = Date.parse(latest.detectedAt || '');
    const detectedAt = Date.parse(record.detectedAt || '');
    return Number.isFinite(detectedAt) && (!Number.isFinite(latestDetectedAt) || detectedAt > latestDetectedAt) ? record : latest;
  }, undefined);
  const hasRecentExternalEvent = externalEvents.some((record) => {
    if (record.article?.sourceType !== 'external_webhook') return false;
    const detectedAt = Date.parse(record.detectedAt || '');
    const age = now - detectedAt;
    return Number.isFinite(detectedAt) && age >= 0 && age <= EXTERNAL_MONITORING_FRESHNESS_MS;
  });

  if (hasRecentExternalEvent) return { state: 'ACTIVE', message: 'External ingestion pipeline is receiving events.' };
  if (externalEvents.length > 0) {
    const latestEventAt = latestExternalEvent?.detectedAt;
    return {
      state: 'STANDBY',
      message: 'No new external events recently.',
      ...(latestEventAt && Number.isFinite(Date.parse(latestEventAt)) ? { latestEventAt } : {}),
    };
  }
  return { state: 'WAITING', message: 'Waiting for the first event from the external ingestion pipeline.' };
};

export const formatExternalMonitoringEventTime = (timestamp?: string): string => {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const monitoringRecordKey = (record: MonitoredEventRecord): string => record.article?.id || record.detectedAt || `${record.article?.title || 'event'}-${record.article?.publishedAt || ''}`;

const valueOrUnavailable = (value: unknown): string => typeof value === 'string' && value.trim() ? value : 'Not available';

const humanizeLabel = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return 'Not available';
  let label = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return label
    .replace(/\bhormuz\b/gi, 'Hormuz')
    .replace(/\bindia\b/gi, 'India')
    .replace(/\bsaudi arabia\b/gi, 'Saudi Arabia')
    .replace(/\bmiddle east\b/gi, 'Middle East');
};

const nodeTypePrefixes: Array<[string, string]> = [
  ['shipping-route', 'Shipping route'],
  ['shipping_route', 'Shipping route'],
  ['chokepoint', 'Chokepoint'],
  ['refinery', 'Refinery'],
  ['supplier', 'Supplier'],
  ['pipeline', 'Pipeline'],
  ['terminal', 'Terminal'],
  ['storage', 'Storage'],
  ['reserve', 'Strategic reserve'],
  ['port', 'Port'],
];

const friendlyNodeLabel = (nodeId: string, nodeType?: string): string => {
  const normalizedId = nodeId.trim().toLowerCase();
  const prefix = nodeTypePrefixes.find(([candidate]) => normalizedId.startsWith(`${candidate}-`));
  const typeLabel = nodeType ? humanizeLabel(nodeType) : prefix?.[1];
  if (!typeLabel) return 'Supply Chain Asset';

  const suffix = prefix ? nodeId.slice(prefix[0].length + 1).replace(/[_-]+/g, ' ').trim() : '';
  const compactSuffix = suffix.replace(/\s/g, '');
  const opaqueSuffix = compactSuffix.length >= 16 && /^[a-z0-9]+$/i.test(compactSuffix) && /\d/.test(compactSuffix);
  if (suffix && !opaqueSuffix && (typeLabel === 'Shipping route' || typeLabel === 'Chokepoint')) {
    return `${typeLabel}: ${humanizeLabel(suffix)}`;
  }
  return typeLabel;
};

const humanizeTechnicalText = (value: unknown, preserveMarkdown = false): string => {
  let text = valueOrUnavailable(value)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\bevt-[a-z0-9-]+\b/gi, 'the event')
    .replace(/\b(?:rel|edge)-[a-z0-9-]+\b/gi, 'connected relationship');
  const technicalIdentifierPattern = /\b(?:shipping[-_]route|chokepoint|supplier|port|refinery|pipeline|terminal|storage|reserve|node|edge)[-_][a-z0-9_-]+\b/gi;
  text = text.replace(technicalIdentifierPattern, (identifier) => friendlyNodeLabel(identifier));
  return (preserveMarkdown ? text : text.replace(/\*\*/g, '')).replace(/[^\S\r\n]+/g, ' ').trim();
};

export const renderSafeAssessmentMarkdown = (value: unknown): React.ReactNode => {
  const lines = humanizeTechnicalText(value, true).split(/\r?\n/);
  return lines.flatMap((line, lineIndex) => {
    const inlineParts = line.split(/(\*\*[^*]+?\*\*)/g).map((part, partIndex) => {
      const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
      if (boldMatch) return <strong key={`${lineIndex}-bold-${partIndex}`} className="font-semibold text-[#EDEDED]">{boldMatch[1]}</strong>;
      return <React.Fragment key={`${lineIndex}-text-${partIndex}`}>{part.replace(/\*\*/g, '')}</React.Fragment>;
    });
    return lineIndex < lines.length - 1 ? [...inlineParts, <br key={`${lineIndex}-break`} />] : inlineParts;
  });
};

const listOrUnavailable = (values: unknown): string => {
  if (!Array.isArray(values)) return 'Not available';
  const items = values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return items.length ? items.join(', ') : 'Not available';
};

const humanizedListOrUnavailable = (values: unknown): string => {
  if (!Array.isArray(values)) return 'Not available';
  const items = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => humanizeLabel(value));
  return items.length ? items.join(', ') : 'Not available';
};

const formatMeasurement = (summary?: MeasurementSummary): string => {
  const values = [...(summary?.nodeTotals || []), ...(summary?.edgeTotals || [])]
    .filter((measurement) => typeof measurement.value === 'number' && typeof measurement.unit === 'string' && measurement.unit.trim());
  return values.length
    ? values.map((measurement) => `${measurement.value?.toLocaleString()} ${measurement.unit?.replaceAll('_', ' ')}`).join(' · ')
    : 'Not available';
};

const normalizedRiskLevel = (level?: string): string => {
  const normalized = level?.toLowerCase();
  return normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical' ? normalized : 'unknown';
};

type MonitoringSnapshot = {
  monitoring?: MonitoringStatusResponse['monitoring'];
  events: MonitoredEventRecord[];
};

const riskCardClasses: Record<string, string> = {
  low: 'border-emerald-500/30 bg-emerald-500/5',
  medium: 'border-amber-500/30 bg-amber-500/5',
  high: 'border-orange-500/40 bg-orange-500/5',
  critical: 'border-red-500/40 bg-red-500/5',
  unknown: 'border-[#333333] bg-[#121212]',
};

const riskTextClasses: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
  unknown: 'text-[#999999]',
};

const humanizeReason = (reason: string): string => {
  const cleaned = humanizeTechnicalText(reason)
    .replace(/\b(?:geographic|geographical|energy|severity|location|country|classification|relevance|impact|match|aggregation)\s+rule\s*:\s*/gi, '')
    .replace(/\b(?:match|impact|aggregation)\s+rule\s*:\s*/gi, '')
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Additional assessment detail.';
};

const uniqueSummaryItems = (items: string[]): string[] => [...new Set(items.filter((item) => item.trim()))].slice(0, 4);

const classificationSummary = (result: GeopoliticalRiskAgentResponse): string[] => uniqueSummaryItems([
  result.classification?.energyRelevant === true ? 'The event could affect energy supply continuity.' : '',
  result.classification?.energyRelevant === false ? 'The event is not currently matched to energy supply continuity.' : '',
  result.classification?.region ? `Location places the event in ${humanizeLabel(result.classification.region)}.` : '',
  result.classification?.category ? `Classified as ${humanizeLabel(result.classification.category)}.` : '',
  ...(result.classification?.classificationReasons?.length ? [humanizeReason(result.classification.classificationReasons[0])] : []),
]);

const relevanceSummary = (result: GeopoliticalRiskAgentResponse): string[] => {
  const nodeTypes = (result.relevance?.matchedNodeTypes || []).map((type) => type.toLowerCase());
  const matchedCount = result.relevance?.matchedNodeIds?.length || 0;
  return uniqueSummaryItems([
    nodeTypes.some((type) => type.includes('chokepoint')) ? 'The event affects a major energy chokepoint.' : '',
    nodeTypes.length && !nodeTypes.some((type) => type.includes('chokepoint')) ? 'The event matches existing energy supply-chain infrastructure.' : '',
    result.relevance?.matchedLocations?.length || result.relevance?.matchedCountries?.length ? 'The location or countries involved match existing supply-chain exposure.' : '',
    matchedCount ? `${matchedCount} supply chain asset${matchedCount === 1 ? '' : 's'} match the event.` : '',
    result.relevance?.relevant === true ? 'The event is relevant to energy supply continuity.' : '',
  ]);
};

const impactSummary = (result: GeopoliticalRiskAgentResponse): string[] => {
  const affectedNodes = result.digitalTwinImpact?.affectedNodeIds?.length || 0;
  const affectedEdges = result.digitalTwinImpact?.affectedEdgeIds?.length || 0;
  const capacity = formatMeasurement(result.digitalTwinImpact?.affectedCapacity);
  return uniqueSummaryItems([
    affectedNodes ? `The supply chain network identifies ${affectedNodes} affected asset${affectedNodes === 1 ? '' : 's'}.` : '',
    affectedEdges ? `${affectedEdges} connected relationship${affectedEdges === 1 ? '' : 's'} are exposed.` : '',
    capacity !== 'Not available' ? `Affected capacity totals ${capacity}.` : '',
    ...(result.digitalTwinImpact?.impactReasons?.length ? [humanizeReason(result.digitalTwinImpact.impactReasons[0])] : []),
  ]);
};

const compactAssessmentText = (value: unknown): string => {
  const cleaned = humanizeTechnicalText(value, true);
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3).join(' ');
  return sentences.length > 420 ? `${sentences.slice(0, 417).trimEnd()}...` : sentences;
};

const ScoreCalculation: React.FC<{ score: number | null; factors?: Array<{ name?: string; points?: number }>; reasoning?: string[] }> = ({ score, factors, reasoning }) => {
  const parts = (factors || [])
    .filter((factor) => typeof factor.points === 'number')
    .map((factor) => `${factor.points} ${humanizeLabel(factor.name).toLowerCase()}`);
  return (
    <div className="mt-5 pt-4 border-t border-[#252525] space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">How the score was calculated</p>
      <p className="text-xs text-[#B0B0B0] leading-relaxed font-mono">{score === null ? 'Score calculation not available.' : `${score} = ${parts.length ? parts.join(' + ') : 'deterministic factors'}`}</p>
      <p className="text-[11px] text-[#777777] leading-relaxed"><span className="font-semibold text-[#999999]">Risk threshold:</span> 0–24 Low · 25–49 Medium · 50–79 High · 80–100 Critical</p>
      {reasoning?.length ? <details className="text-xs">
        <summary className="cursor-pointer text-[#777777] hover:text-orange-300 font-mono">View detailed score reasoning</summary>
        <ul className="mt-2 space-y-1.5">{reasoning.map((reason, index) => <li key={`${reason}-${index}`} className="text-[11px] text-[#888888] leading-relaxed pl-3 border-l border-[#333333]">{humanizeReason(reason)}</li>)}</ul>
      </details> : null}
    </div>
  );
};

export const AssistantPage: React.FC<AssistantPageProps> = ({ onNavigate }) => {
  const [request, setRequest] = useState(INITIAL_ASSISTANT_REQUEST);
  const [result, setResult] = useState<GeopoliticalRiskAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringStatusResponse['monitoring']>();
  const [monitoredEvents, setMonitoredEvents] = useState<MonitoredEventRecord[]>([]);
  const [monitoringAlerts, setMonitoringAlerts] = useState<MonitoredEventRecord[]>([]);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [monitoringRefreshing, setMonitoringRefreshing] = useState(false);
  const [monitoringRefreshMessage, setMonitoringRefreshMessage] = useState<string | null>(null);
  const [monitoringRefreshError, setMonitoringRefreshError] = useState<string | null>(null);

  const viewDigitalTwin = () => onNavigate?.('/app/network');

  const loadMonitoring = async (): Promise<MonitoringSnapshot | undefined> => {
    try {
      const [statusResponse, eventsResponse, highAlertsResponse, criticalAlertsResponse] = await Promise.all([
        fetchMonitoringStatus(),
        fetchMonitoredEvents(200),
        fetchHighRiskMonitoringAlerts(10),
        fetchCriticalMonitoringAlerts(10),
      ]);
      setMonitoring(statusResponse.monitoring);
      const events = eventsResponse.events || [];
      const alerts = [...(highAlertsResponse.alerts || []), ...(criticalAlertsResponse.alerts || [])];
      const byId = new Map<string, MonitoredEventRecord>();
      [...events, ...alerts].forEach((record) => {
        const key = monitoringRecordKey(record);
        if (!byId.has(key)) byId.set(key, record);
      });
      const mergedEvents = [...byId.values()].sort((left, right) => String(right.detectedAt || '').localeCompare(String(left.detectedAt || '')));
      setMonitoredEvents(mergedEvents);
      const alertsById = new Map<string, MonitoredEventRecord>();
      alerts.forEach((record) => {
        const key = monitoringRecordKey(record);
        if (!alertsById.has(key)) alertsById.set(key, record);
      });
      setMonitoringAlerts([...alertsById.values()].sort((left, right) => String(right.detectedAt || '').localeCompare(String(left.detectedAt || ''))));
      setMonitoringError(null);
      return { monitoring: statusResponse.monitoring, events: mergedEvents };
    } catch (monitorError) {
      setMonitoringError(monitorError instanceof Error ? monitorError.message : 'Monitoring data could not be loaded.');
      return undefined;
    } finally {
      setMonitoringLoading(false);
    }
  };

  useEffect(() => {
    setRequest(INITIAL_ASSISTANT_REQUEST);
    setResult(null);
    setLoading(false);
    setError(null);
    void loadMonitoring();
    const timer = window.setInterval(() => { void loadMonitoring(); }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRefreshNews = async () => {
    if (monitoringRefreshing) return;
    const previousEventKeys = new Set(monitoredEvents.map(monitoringRecordKey));
    setMonitoringRefreshing(true);
    setMonitoringRefreshMessage(null);
    setMonitoringRefreshError(null);
    try {
      const refreshResponse = await refreshGeopoliticalMonitoring();
      const requestedAt = refreshResponse.refresh?.requestedAt;
      let snapshot = await loadMonitoring();
      let externalScanCompleted = Boolean(
        requestedAt && snapshot?.monitoring?.lastSuccessfulExternalScan &&
        Date.parse(snapshot.monitoring.lastSuccessfulExternalScan) >= Date.parse(requestedAt),
      );
      const deadline = Date.now() + 30_000;
      while (!externalScanCompleted && Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        snapshot = await loadMonitoring();
        externalScanCompleted = Boolean(
          requestedAt && snapshot?.monitoring?.lastSuccessfulExternalScan &&
          Date.parse(snapshot.monitoring.lastSuccessfulExternalScan) >= Date.parse(requestedAt),
        );
      }
      if (!externalScanCompleted) {
        setMonitoringRefreshMessage('Refresh triggered. Waiting for the external scan to complete.');
      } else {
        const hasNewEvents = snapshot?.events.some((record) => !previousEventKeys.has(monitoringRecordKey(record))) || false;
        setMonitoringRefreshMessage(hasNewEvents ? 'News refreshed successfully.' : 'External scan complete. No new external events found.');
      }
    } catch (refreshError) {
      setMonitoringRefreshError(refreshError instanceof Error ? refreshError.message : 'News refresh failed.');
    } finally {
      setMonitoringRefreshing(false);
    }
  };

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedRequest = request.trim();
    if (!normalizedRequest) {
      setError('Describe a geopolitical event before starting the analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setResult(await analyzeGeopoliticalRisk(normalizedRequest));
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : 'The geopolitical risk agent could not complete the analysis.');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = normalizedRiskLevel(result?.risk?.riskLevel);
  const riskScore = typeof result?.risk?.riskScore === 'number' ? result.risk.riskScore : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geopolitical Risk Agent"
        subtitle="Describe a geopolitical event to assess its energy supply-chain relevance, risk, and infrastructure impact."
      />

      <section className="rounded-lg border border-[#222222] bg-[#121212] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <BrainCircuit className="w-4.5 h-4.5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#EDEDED]">Geopolitical Event Analysis</h2>
            <p className="text-sm text-[#888888] mt-1">Describe the event, location, or disruption you want to assess.</p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="mt-6 space-y-4">
          <label htmlFor="geopolitical-risk-request" className="block text-xs uppercase tracking-widest text-[#666666] font-mono">Describe the event or disruption</label>
          <textarea
            id="geopolitical-risk-request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="Describe the event or disruption you want ORBIT to assess."
            rows={4}
            disabled={loading}
            className="w-full resize-y min-h-28 px-3 py-3 rounded-md border border-[#333333] bg-[#0D0D0D] text-sm text-[#EDEDED] placeholder:text-[#555555] focus:outline-none focus:border-orange-500 disabled:opacity-60"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setRequest(prompt)}
                  disabled={loading}
                  className="text-left px-3 py-2 rounded-md border border-[#333333] text-xs text-[#999999] hover:text-orange-300 hover:border-orange-500/50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading || !request.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {loading ? 'Analyzing Risk...' : 'Analyze Risk'}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><p className="font-semibold">Analysis unavailable</p><p className="mt-1 text-red-300/80">{error}</p></div>
        </div>
      )}

      {!result && !loading && !error && (
        <EmptyState
          title="Ready for geopolitical analysis"
          description="Describe a geopolitical event or disruption and ORBIT will assess its energy supply-chain impact."
          icon={Bot}
        />
      )}

      {loading && <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-300 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Preparing your assessment.</div>}

      {result && (
        <section aria-labelledby="geopolitical-assessment-title" className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-[#252525]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70 font-mono">Analysis result</p>
              <h2 id="geopolitical-assessment-title" className="text-lg sm:text-xl font-semibold text-[#EDEDED] mt-1">Geopolitical Assessment</h2>
              <p className="text-sm text-[#888888] mt-1">Structured risk, relevance, and infrastructure impact for the submitted event.</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">User analysis</span>
          </div>

          <div className="mt-6 space-y-6">
          <section className={`rounded-lg border p-4 sm:p-5 ${riskCardClasses[riskLevel]}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#777777] font-mono">Risk summary</p>
                <p className="text-xs text-[#888888] mt-1">Deterministic risk assessment</p>
                <div className="flex items-center gap-3 mt-3">
                  <StatusBadge level={riskLevel === 'critical' ? 'CRITICAL' : riskLevel === 'high' ? 'ELEVATED' : riskLevel === 'medium' ? 'MODERATE' : riskLevel === 'low' ? 'AVAILABLE' : 'UNKNOWN'} label={riskLevel.toUpperCase()} size="md" />
                  <span className={`text-3xl font-semibold font-mono ${riskTextClasses[riskLevel]}`}>{riskScore === null ? '—' : riskScore}</span>
                  <span className="text-xs text-[#888888] font-mono">/ 100 risk score</span>
                </div>
              </div>
              {onNavigate && <button type="button" onClick={viewDigitalTwin} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#EDEDED] hover:border-orange-500/60 hover:text-orange-300 cursor-pointer"><Network className="w-3.5 h-3.5" /> View in Digital Twin <ArrowUpRight className="w-3.5 h-3.5" /></button>}
            </div>
          </section>

          <ResultSection title="Executive Assessment" icon={BrainCircuit} emphasis="primary">
            <p className="text-sm leading-7 text-[#D4D4D4]">{renderSafeAssessmentMarkdown(compactAssessmentText(result.explanation))}</p>
          </ResultSection>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ResultSection title="Event" icon={ClipboardList}>
              <DetailGrid items={[
                ['Title', result.event?.title],
                ['Category', humanizeLabel(result.event?.category)],
                ['Severity', humanizeLabel(result.event?.severity)],
                ['Location', result.event?.location],
                ['Countries', listOrUnavailable(result.event?.countriesInvolved)],
                ['Source', result.event?.source],
              ]} />
              <LongText label="Description" value={result.event?.description} />
              {result.event?.timestamp && <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-[#777777] hover:text-orange-300 font-mono">View event timestamp</summary>
                <p className="mt-2 text-[#B0B0B0]">{result.event.timestamp}</p>
              </details>}
            </ResultSection>

            <ResultSection title="Classification" icon={Globe2}>
              <DetailGrid items={[
                ['Energy relevance', result.classification?.energyRelevant === undefined ? undefined : result.classification.energyRelevant ? 'Relevant' : 'Not relevant'],
                ['Region', humanizeLabel(result.classification?.region)],
                ['Category', humanizeLabel(result.classification?.category)],
                ['Severity', humanizeLabel(result.classification?.severity)],
              ]} />
              <ReasonList label="Classification summary" values={result.classification?.classificationReasons} summary={classificationSummary(result)} detailsLabel="View classification reasoning" />
            </ResultSection>
          </div>

          <ResultSection title="Supply-chain Relevance" icon={Target}>
            <DetailGrid items={[
              ['Relevant', result.relevance?.relevant === undefined ? undefined : result.relevance.relevant ? 'Yes' : 'No'],
              ['Matched node types', humanizedListOrUnavailable(result.relevance?.matchedNodeTypes)],
              ['Matched locations', listOrUnavailable(result.relevance?.matchedLocations)],
              ['Matched countries', listOrUnavailable(result.relevance?.matchedCountries)],
            ]} />
            <NodeIdList label="Matched assets" nodeIds={result.relevance?.matchedNodeIds} nodeTypes={result.relevance?.matchedNodeTypes} onViewDigitalTwin={onNavigate ? viewDigitalTwin : undefined} />
            <ReasonList label="Why this matters" values={result.relevance?.relevanceReasons} summary={relevanceSummary(result)} detailsLabel="View detailed reasoning" />
          </ResultSection>

          <ResultSection title="Supply Chain Impact" icon={Network}>
            <DetailGrid items={[
              ['Affected assets', result.digitalTwinImpact?.affectedNodeIds?.length],
              ['Affected connections', result.digitalTwinImpact?.affectedEdgeIds?.length],
              ['Asset types', humanizedListOrUnavailable(result.digitalTwinImpact?.affectedNodeTypes)],
              ['Capacity', formatMeasurement(result.digitalTwinImpact?.affectedCapacity)],
              ['Current flow', formatMeasurement(result.digitalTwinImpact?.affectedFlow)],
            ]} />
            <NodeIdList label="Affected assets" nodeIds={result.digitalTwinImpact?.affectedNodeIds} nodeTypes={result.digitalTwinImpact?.affectedNodeTypes} onViewDigitalTwin={onNavigate ? viewDigitalTwin : undefined} />
            <NodeIdList label="Affected connections" nodeIds={result.digitalTwinImpact?.affectedEdgeIds} />
            <ReasonList label="Impact summary" values={result.digitalTwinImpact?.impactReasons} summary={impactSummary(result)} detailsLabel="View detailed impact reasoning" />
          </ResultSection>

          <ResultSection title="Risk Factors and Reasoning" icon={CheckCircle2}>
            {result.risk?.factors?.length ? (
              <div className="space-y-2">
                {result.risk.factors.map((factor, index) => (
                  <div key={`${factor.name || 'factor'}-${index}`} className="flex items-start justify-between gap-4 p-3 rounded-md border border-[#222222] bg-[#0D0D0D]">
                    <div><p className="text-xs font-semibold text-[#D4D4D4]">{humanizeLabel(factor.name)}</p><p className="text-[11px] text-[#888888] mt-1 leading-relaxed">{renderSafeAssessmentMarkdown(factor.explanation)}</p></div>
                    <span className="text-xs font-mono text-orange-300 whitespace-nowrap">{typeof factor.points === 'number' ? `+${factor.points}` : 'N/A'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-[#888888]">Not available</p>}
            <ScoreCalculation score={riskScore} factors={result.risk?.factors} reasoning={result.risk?.reasoning} />
          </ResultSection>
          </div>
        </section>
      )}

      <div className="pt-10 sm:pt-14 border-t border-[#252525]">
        <MonitoringSection
          status={monitoring}
          events={monitoredEvents}
          loading={monitoringLoading}
          error={monitoringError}
          alerts={monitoringAlerts}
          onRefreshNews={handleRefreshNews}
          refreshing={monitoringRefreshing}
          refreshMessage={monitoringRefreshMessage}
          refreshError={monitoringRefreshError}
          onViewDigitalTwin={onNavigate ? viewDigitalTwin : undefined}
        />
      </div>
    </div>
  );
};

export const getPageNumbers = (current: number, total: number): Array<number | '...'> => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Monitored events pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#222222]">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#B0B0B0] hover:text-[#EDEDED] hover:border-[#555555] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Previous
      </button>

      <div className="flex items-center gap-1 flex-wrap">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs font-mono text-[#555555]">
                ...
              </span>
            );
          }
          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-colors ${
                isCurrent
                  ? 'border border-orange-500/60 bg-orange-500/10 text-orange-300 font-semibold'
                  : 'border border-[#252525] bg-[#0D0D0D] text-[#888888] hover:text-[#EDEDED] hover:border-[#444444]'
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#B0B0B0] hover:text-[#EDEDED] hover:border-[#555555] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Next <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
};

const MonitoringSection: React.FC<{
  status?: MonitoringStatusResponse['monitoring'];
  events: MonitoredEventRecord[];
  alerts: MonitoredEventRecord[];
  loading: boolean;
  error: string | null;
  onRefreshNews: () => void;
  refreshing: boolean;
  refreshMessage: string | null;
  refreshError: string | null;
  onViewDigitalTwin?: () => void;
}> = ({ status, events, alerts, loading, error, onRefreshNews, refreshing, refreshMessage, refreshError, onViewDigitalTwin }) => {
  const externalStatus = getExternalMonitoringStatus(events);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [events.length, events[0]?.article?.id]);

  const totalEvents = events.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEvents);
  const pagedEvents = events.slice(startIndex, endIndex);

  return (
    <section className="rounded-lg border border-[#222222] bg-[#121212] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-orange-400" /><div><p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70 font-mono">Live external intelligence</p><h2 className="text-base font-semibold text-[#EDEDED] mt-1">Automatic Geopolitical Monitoring</h2><p className="text-sm text-[#777777] mt-1">Source-linked energy and geopolitical events for the command overview.</p></div></div><button type="button" onClick={onRefreshNews} disabled={refreshing || loading} className="inline-flex items-center justify-center gap-2 rounded-md border border-orange-500/40 px-3 py-2 text-xs font-mono text-orange-300 hover:border-orange-400 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto">{refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{refreshing ? 'Refreshing...' : 'Refresh News'}</button></div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <StatusBadge level={externalStatus.state === 'ACTIVE' ? 'AVAILABLE' : externalStatus.state === 'STANDBY' ? 'MONITORING' : 'UNKNOWN'} label={externalStatus.state} size="sm" />
          <span className="text-[10px] text-[#666666] font-mono">{externalStatus.message}</span>
          {externalStatus.state === 'STANDBY' && externalStatus.latestEventAt && <span className="text-[10px] text-[#777777] font-mono">Last event: {formatExternalMonitoringEventTime(externalStatus.latestEventAt)}</span>}
        </div>
      </div>

      {loading ? <div className="py-5 text-xs text-[#888888] flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading monitoring status...</div> : error ? <div className="mt-4 flex items-start gap-2 text-xs text-amber-300"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <MonitoringMetric label="Detected" value={status?.detectedEvents} />
            <MonitoringMetric label="Relevant" value={status?.relevantEvents} />
            <MonitoringMetric label="High risk" value={status?.highRiskAlerts} color="text-orange-400" />
            <MonitoringMetric label="Critical" value={status?.criticalAlerts} color="text-red-400" />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-xs font-mono text-[#777777]">
            <span>Source: {valueOrUnavailable(status?.source)}</span>
            <span>Last external scan: {status?.lastSuccessfulExternalScan ? new Date(status.lastSuccessfulExternalScan).toLocaleString() : 'Not available'}</span>
            <span>UI refresh: 60s</span>
          </div>
          {refreshMessage && <p role="status" className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" />{refreshMessage}</p>}
          {refreshError && <p role="alert" className="mt-3 flex items-center gap-2 text-[11px] text-amber-300"><AlertCircle className="w-3.5 h-3.5" />{refreshError}</p>}
          <p className="mt-4 p-3 rounded-md border border-[#222222] bg-[#0D0D0D] text-[11px] text-[#888888]">{externalStatus.message}</p>
          {status?.lastError && <p className="mt-3 text-[11px] text-amber-300">Last monitor error: {status.lastError}</p>}
          {events.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xs uppercase tracking-widest text-[#777777] font-mono">Recent monitored events</h3>
                  <span className="text-xs text-orange-300/80 font-mono">
                    Showing {startIndex + 1}–{endIndex} of {totalEvents} monitored events
                  </span>
                </div>
                <span className="text-xs text-[#555555] font-mono">External sources only</span>
              </div>
              <div className="space-y-3">
                {pagedEvents.map((record) => (
                  <MonitoredEventCard key={record.article?.id || record.detectedAt} record={record} onViewDigitalTwin={onViewDigitalTwin} />
                ))}
              </div>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
          {alerts.length > 0 && <div className="mt-6 space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="text-xs uppercase tracking-widest text-red-300/80 font-mono">Recent high-risk alerts</h3><span className="text-xs text-[#555555] font-mono">High and critical risk only</span></div>{alerts.slice(0, 4).map((record) => <MonitoredEventCard key={`alert-${record.article?.id || record.detectedAt}`} record={record} onViewDigitalTwin={onViewDigitalTwin} />)}</div>}
        </>
      )}
    </section>
  );
};

const MonitoringMetric: React.FC<{ label: string; value?: number; color?: string }> = ({ label, value, color = 'text-[#EDEDED]' }) => (
  <div className="rounded-md border border-[#222222] bg-[#0D0D0D] p-2.5"><p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</p><p className={`mt-1 text-lg font-mono ${color}`}>{typeof value === 'number' ? value.toLocaleString() : '—'}</p></div>
);

const monitoredSourceLabel = (sourceType?: string): string => {
  if (sourceType === 'google_news') return 'Google News';
  if (sourceType === 'direct_rss') return 'Direct RSS';
  if (sourceType === 'external_webhook') return 'n8n / external webhook';
  return 'External monitoring';
};

const MonitoredEventCard: React.FC<{ record: MonitoredEventRecord; onViewDigitalTwin?: () => void }> = ({ record, onViewDigitalTwin }) => {
  const analysis = record.analysis;
  const level = normalizedRiskLevel(analysis?.risk?.riskLevel || record.alertLevel);
  const affectedNodes = analysis?.digitalTwinImpact?.affectedNodeIds || [];
  const affectedEdges = analysis?.digitalTwinImpact?.affectedEdgeIds || [];
  const sourceUrl = record.article?.url;
  const sourceName = valueOrUnavailable(record.article?.source);
  const sourceNames = record.article?.sources?.length ? record.article.sources : [sourceName];
  const sourceReferences = record.article?.sourceReferences || [];
  const sourceLinks = sourceReferences.filter((reference) => reference.url);
  const eventLocation = valueOrUnavailable(analysis?.event?.location);
  const hasDigitalTwinImpact = affectedNodes.length > 0 || affectedEdges.length > 0;
  const detailedReasons = [
    ...(analysis?.classification?.classificationReasons || []),
    ...(analysis?.relevance?.relevanceReasons || []),
    ...(analysis?.risk?.reasoning || []),
    ...(analysis?.digitalTwinImpact?.impactReasons || []),
  ];
  return (
    <article className="rounded-lg border border-[#222222] bg-[#0D0D0D] p-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-orange-300/80 font-mono">Monitored event</span>
            <StatusBadge level={level === 'critical' ? 'CRITICAL' : level === 'high' ? 'ELEVATED' : level === 'medium' ? 'MODERATE' : level === 'low' ? 'AVAILABLE' : 'UNKNOWN'} label={level.toUpperCase()} size="sm" />
          </div>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-[#EDEDED]">{renderSafeAssessmentMarkdown(record.article?.title)}</h3>
          <p className="mt-2 text-xs text-[#777777] font-mono">{record.article?.publishedAt ? new Date(record.article.publishedAt).toLocaleString() : 'Timestamp not available'} · {monitoredSourceLabel(record.article?.sourceType)}</p>
        </div>
        {onViewDigitalTwin && hasDigitalTwinImpact && <button type="button" onClick={onViewDigitalTwin} className="inline-flex items-center gap-1.5 text-xs font-mono text-orange-300 hover:text-orange-200 cursor-pointer flex-shrink-0"><Network className="w-3.5 h-3.5" /> View in Digital Twin</button>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs text-[#888888]">
        <div><span className="block text-[11px] uppercase tracking-wide text-[#666666] font-mono">Risk</span><span className="block mt-1 font-semibold">{level.toUpperCase()}</span></div>
        <div><span className="block text-[11px] uppercase tracking-wide text-[#666666] font-mono">Score</span><span className="block mt-1 font-mono text-[#D4D4D4]">{typeof analysis?.risk?.riskScore === 'number' ? analysis.risk.riskScore.toLocaleString() : 'Not available'}</span></div>
        <div><span className="block text-[11px] uppercase tracking-wide text-[#666666] font-mono">Location</span><span className="block mt-1 truncate" title={eventLocation}>{eventLocation}</span></div>
        <div><span className="block text-[11px] uppercase tracking-wide text-[#666666] font-mono">Category</span><span className="block mt-1 truncate">{humanizeLabel(analysis?.classification?.category)}</span></div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#B0B0B0]">{renderSafeAssessmentMarkdown(compactAssessmentText(analysis?.explanation))}</p>
      {detailedReasons.length > 0 && <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-[#777777] hover:text-orange-300 font-mono">View detailed assessment</summary>
        <ul className="mt-2 space-y-1.5">{detailedReasons.map((reason, index) => <li key={`${reason}-${index}`} className="text-[11px] text-[#888888] leading-relaxed pl-3 border-l border-[#333333]">{humanizeReason(reason)}</li>)}</ul>
      </details>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[#777777]">Sources: {sourceNames.join(' · ')}</span>
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-xs font-mono text-orange-300 hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 rounded">Open source</a>}
      </div>
      {sourceLinks.length > 1 && <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-[#777777] hover:text-orange-300 font-mono">Source coverage · {sourceLinks.length} links</summary>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {sourceLinks.map((reference) => <a key={`${reference.source}-${reference.url}`} href={reference.url} target="_blank" rel="noreferrer" className="text-orange-300 hover:text-orange-200 underline-offset-2 hover:underline">{reference.source}</a>)}
        </div>
      </details>}
      {hasDigitalTwinImpact && <details className="mt-4 rounded-md border border-[#222222] bg-[#121212]">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-mono text-[#B0B0B0] hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 rounded-md">
          <span className="inline-flex items-center gap-2"><Network className="w-3.5 h-3.5 text-orange-400" /> Supply Chain Impact · {affectedNodes.length} assets · {affectedEdges.length} connections</span>
        </summary>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 pb-3 text-xs">
          <NodeIdList label="Affected assets" nodeIds={affectedNodes} nodeTypes={analysis?.digitalTwinImpact?.affectedNodeTypes} />
          <NodeIdList label="Affected connections" nodeIds={affectedEdges} />
        </div>
      </details>}
    </article>
  );
};

const ResultSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; emphasis?: 'primary' | 'technical' }> = ({ title, icon: Icon, children, emphasis = 'technical' }) => (
  <section className={emphasis === 'primary' ? 'rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-4 sm:p-5' : 'border-t border-[#252525] pt-5'}>
    <div className={`flex items-center gap-2 ${emphasis === 'primary' ? 'pb-3 border-b border-[#252525]' : 'pb-2'}`}><Icon className={`w-4 h-4 ${emphasis === 'primary' ? 'text-orange-400' : 'text-[#777777]'}`} /><h2 className="text-sm font-semibold text-[#EDEDED]">{title}</h2></div>
    <div className="pt-4 space-y-4">{children}</div>
  </section>
);

const DetailGrid: React.FC<{ items: Array<[string, unknown]> }> = ({ items }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-xs">
    {items.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</dt><dd className="mt-1 text-[#D4D4D4] break-words">{typeof value === 'number' ? value.toLocaleString() : humanizeTechnicalText(value)}</dd></div>)}
  </dl>
);

const LongText: React.FC<{ label: string; value?: string }> = ({ label, value }) => <div><p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</p><p className="mt-1 text-xs text-[#B0B0B0] leading-relaxed">{renderSafeAssessmentMarkdown(value)}</p></div>;

const ReasonList: React.FC<{ label: string; values?: string[]; summary?: string[]; detailsLabel?: string }> = ({ label, values, summary, detailsLabel = 'View detailed reasoning' }) => {
  const visibleItems = summary?.length ? summary : values?.slice(0, 2).map(humanizeReason) || [];
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</p>
      {visibleItems.length ? <ul className="space-y-1.5">{visibleItems.map((value, index) => <li key={`${value}-${index}`} className="text-[11px] text-[#999999] leading-relaxed pl-3 border-l border-orange-500/30">{humanizeTechnicalText(value)}</li>)}</ul> : <p className="text-xs text-[#777777]">Not available</p>}
      {values?.length ? <details className="text-xs">
        <summary className="cursor-pointer text-[#777777] hover:text-orange-300 font-mono">{detailsLabel}</summary>
        <ul className="mt-2 space-y-1.5">{values.map((value, index) => <li key={`${value}-${index}`} className="text-[11px] text-[#888888] leading-relaxed pl-3 border-l border-[#333333]">{humanizeReason(value)}</li>)}</ul>
      </details> : null}
    </div>
  );
};

export const NodeIdList: React.FC<{ label: string; nodeIds?: string[]; nodeTypes?: string[]; onViewDigitalTwin?: () => void }> = ({ label, nodeIds, nodeTypes, onViewDigitalTwin }) => {
  const isConnectionList = /connection|edge/i.test(label);
  const technicalDetailsLabel = isConnectionList ? 'View affected network details' : 'View technical asset details';
  const friendlyLabels = [...new Set((nodeIds || []).map((nodeId, index) => friendlyNodeLabel(nodeId, nodeTypes?.[index])))];
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</p>{onViewDigitalTwin && nodeIds?.length ? <button type="button" onClick={onViewDigitalTwin} className="text-[10px] font-mono text-orange-300 hover:text-orange-200 cursor-pointer">Open network</button> : null}</div>
      {nodeIds?.length ? <>
        {isConnectionList ? <p className="mt-2 text-xs text-[#B0B0B0]">{nodeIds.length} connected relationship{nodeIds.length === 1 ? '' : 's'} affected</p> : <div className="flex flex-wrap gap-1.5 mt-2">{friendlyLabels.map((labelText) => <span key={labelText} className="px-2 py-1 rounded border border-[#333333] bg-[#0D0D0D] text-[10px] text-[#B0B0B0]">{labelText}</span>)}</div>}
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-[#777777] hover:text-orange-300 font-mono">{technicalDetailsLabel}</summary>
          <div className="flex flex-wrap gap-1.5 mt-2">{nodeIds.map((nodeId) => <span key={nodeId} className="px-2 py-1 rounded border border-[#333333] bg-[#0D0D0D] text-[10px] font-mono text-[#888888] break-all">{nodeId}</span>)}</div>
        </details>
      </> : <p className="mt-1 text-xs text-[#777777]">Not available</p>}
    </div>
  );
};
