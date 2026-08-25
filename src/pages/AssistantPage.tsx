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
  Compass,
  ExternalLink,
  Filter,
  Globe2,
  Layers,
  Loader2,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
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
  'What is the impact of a maritime blockade in the Bab el-Mandeb Strait?',
  'Evaluate energy supply vulnerability from a disruption at the Port of Ras Tanura.',
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

  if (hasRecentExternalEvent) return { state: 'ACTIVE', message: 'External ingestion pipeline active' };
  if (externalEvents.length > 0) {
    const latestEventAt = latestExternalEvent?.detectedAt;
    return {
      state: 'STANDBY',
      message: 'Monitoring standby - no recent external webhooks',
      ...(latestEventAt && Number.isFinite(Date.parse(latestEventAt)) ? { latestEventAt } : {}),
    };
  }
  return { state: 'WAITING', message: 'Waiting for external ingestion events' };
};

export const formatExternalMonitoringEventTime = (timestamp?: string): string => {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const monitoringRecordKey = (record: MonitoredEventRecord): string =>
  record.article?.id || record.detectedAt || `${record.article?.title || 'event'}-${record.article?.publishedAt || ''}`;

const valueOrUnavailable = (value: unknown): string => (typeof value === 'string' && value.trim() ? value : 'Not available');

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
      if (boldMatch) return <strong key={`${lineIndex}-bold-${partIndex}`} className="font-semibold text-slate-100">{boldMatch[1]}</strong>;
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

const normalizedRiskLevel = (level?: string): 'low' | 'medium' | 'high' | 'critical' | 'unknown' => {
  const normalized = level?.toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical') {
    return normalized;
  }
  return 'unknown';
};

type MonitoringSnapshot = {
  monitoring?: MonitoringStatusResponse['monitoring'];
  events: MonitoredEventRecord[];
};

const riskBadgeConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'LOW RISK' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'MODERATE' },
  high: { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-400', label: 'HIGH RISK' },
  critical: { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', label: 'CRITICAL' },
  unknown: { bg: 'bg-slate-800/40', border: 'border-slate-700/40', text: 'text-slate-400', label: 'UNKNOWN' },
};

const humanizeReason = (reason: string): string => {
  const cleaned = humanizeTechnicalText(reason)
    .replace(/\b(?:geographic|geographical|energy|severity|location|country|classification|relevance|impact|match|aggregation)\s+rule\s*:\s*/gi, '')
    .replace(/\b(?:match|impact|aggregation)\s+rule\s*:\s*/gi, '')
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Additional assessment detail.';
};

const compactAssessmentText = (value: unknown): string => {
  const cleaned = humanizeTechnicalText(value, true);
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3).join(' ');
  return sentences.length > 420 ? `${sentences.slice(0, 417).trimEnd()}...` : sentences;
};

export const AssistantPage: React.FC<AssistantPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'assess' | 'monitor'>('assess');
  const [request, setRequest] = useState(INITIAL_ASSISTANT_REQUEST);
  const [result, setResult] = useState<GeopoliticalRiskAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Monitoring State
  const [monitoring, setMonitoring] = useState<MonitoringStatusResponse['monitoring']>();
  const [monitoredEvents, setMonitoredEvents] = useState<MonitoredEventRecord[]>([]);
  const [monitoringAlerts, setMonitoringAlerts] = useState<MonitoredEventRecord[]>([]);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [monitoringRefreshing, setMonitoringRefreshing] = useState(false);
  const [monitoringRefreshMessage, setMonitoringRefreshMessage] = useState<string | null>(null);

  // Feed Filter & Search
  const [feedRiskFilter, setFeedRiskFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        setMonitoringRefreshMessage('Refresh triggered. External scan in progress.');
      } else {
        const hasNewEvents = snapshot?.events.some((record) => !previousEventKeys.has(monitoringRecordKey(record))) || false;
        setMonitoringRefreshMessage(hasNewEvents ? 'News refreshed successfully.' : 'Scan complete. No new events found.');
      }
    } catch {
      setMonitoringRefreshMessage('Scan requested. Waiting for updates.');
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
      const res = await analyzeGeopoliticalRisk(normalizedRequest);
      setResult(res);
      setActiveTab('assess');
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : 'The geopolitical risk agent could not complete the analysis.');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = normalizedRiskLevel(result?.risk?.riskLevel);
  const riskScore = typeof result?.risk?.riskScore === 'number' ? result.risk.riskScore : null;
  const cfg = riskBadgeConfig[riskLevel] || riskBadgeConfig.unknown;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title Header */}
      <PageHeader
        title="Geopolitical Risk Agent"
        subtitle="Evaluate energy supply-chain vulnerabilities, simulate crisis scenarios, and monitor real-time global disruptions."
      />

      {/* Navigation & Tab Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-1.5 rounded-xl border border-slate-800 bg-[#090d16]/90 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-lg border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('assess')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
              activeTab === 'assess'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Risk Assessment</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
              activeTab === 'monitor'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>Live Intelligence Feed</span>
            {monitoredEvents.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'monitor' ? 'bg-white/20 text-white' : 'bg-slate-800 text-orange-400 border border-orange-500/30'
              }`}>
                {monitoredEvents.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        {activeTab === 'monitor' && (
          <div className="flex items-center gap-3 px-3">
            <button
              type="button"
              onClick={handleRefreshNews}
              disabled={monitoringRefreshing}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-orange-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${monitoringRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span>{monitoringRefreshing ? 'Scanning Live Intelligence...' : 'Refresh News'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: AD-HOC RISK SCENARIO ASSESSMENT                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'assess' && (
        <div className="space-y-6">
          {/* Input Form Card */}
          <section className="rounded-xl border border-slate-800/90 bg-[#0c1019] p-5 sm:p-7 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    Geopolitical Event Assessment Simulator
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter any geopolitical conflict, chokepoint shutdown, or supply disruption scenario to run real-time impact scoring.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="geopolitical-risk-request" className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Scenario Prompt
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">Real-time Digital Twin evaluation</span>
                </div>
                <div className="relative">
                  <textarea
                    id="geopolitical-risk-request"
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder="e.g. Assess the energy supply-chain impact of an escalating blockade in the Strait of Hormuz..."
                    rows={3}
                    disabled={loading}
                    className="w-full resize-none p-4 rounded-lg border border-slate-800 bg-[#070a10] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/50 transition-all font-sans leading-relaxed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Quick Preset Prompts */}
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">Quick Presets:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setRequest(prompt)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-orange-500/40 text-xs text-slate-300 hover:text-orange-300 transition-all cursor-pointer text-left flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading || !request.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Computing Digital Twin Impact...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Analyze Risk Scenario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Analysis Exception</p>
                <p className="mt-1 text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* Assessment Loading State */}
          {loading && (
            <div className="p-8 rounded-xl border border-orange-500/30 bg-orange-500/5 text-center flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
                <BrainCircuit className="w-6 h-6 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-semibold text-slate-200 font-mono">Running Geopolitical Risk Engine...</p>
              <p className="text-xs text-slate-400 max-w-md">Matching scenario against maritime chokepoints, refinery networks, and strategic reserves...</p>
            </div>
          )}

          {/* Assessment Results Section */}
          {result && !loading && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Hero Banner */}
              <div className={`rounded-xl border ${cfg.border} bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden`}>
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                  {/* Risk Score Circle & Badges */}
                  <div className="flex items-center gap-5 pr-6 border-b lg:border-b-0 lg:border-r border-slate-800 pb-5 lg:pb-0">
                    <div className="relative flex items-center justify-center">
                      <div className={`w-24 h-24 rounded-2xl border ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center shadow-lg`}>
                        <span className={`text-4xl font-black font-mono tracking-tight ${cfg.text}`}>
                          {riskScore !== null ? riskScore : '—'}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">/ 100</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          level={riskLevel === 'critical' ? 'CRITICAL' : riskLevel === 'high' ? 'ELEVATED' : riskLevel === 'medium' ? 'MODERATE' : 'AVAILABLE'}
                          label={cfg.label}
                          size="md"
                        />
                      </div>
                      <h3 className="text-lg font-bold text-slate-100">
                        {result.event?.title || 'Geopolitical Risk Assessment'}
                      </h3>
                      <p className="text-xs font-mono text-slate-400">
                        Evaluated by ORBIT Supply Chain Intelligence Engine
                      </p>
                    </div>
                  </div>

                  {/* Impact Quick Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                    <div className="p-3 rounded-lg border border-slate-800 bg-[#070a10]">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Affected Assets</span>
                      <span className="text-base font-bold font-mono text-slate-200 mt-1 block">
                        {result.digitalTwinImpact?.affectedNodeIds?.length || 0} Nodes
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-[#070a10]">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Flow Reduction</span>
                      <span className="text-base font-bold font-mono text-orange-400 mt-1 block">
                        {formatMeasurement(result.digitalTwinImpact?.affectedFlow)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-[#070a10] col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Capacity Exposed</span>
                      <span className="text-base font-bold font-mono text-amber-400 mt-1 block truncate">
                        {formatMeasurement(result.digitalTwinImpact?.affectedCapacity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Assessment Narrative */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1019] p-6 shadow-lg">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
                  <BrainCircuit className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-semibold font-mono text-slate-200 uppercase tracking-wider">
                    Executive Threat Assessment
                  </h3>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed space-y-3 font-sans">
                  {renderSafeAssessmentMarkdown(compactAssessmentText(result.explanation))}
                </div>
              </div>

              {/* Organized 3-Column Bento Grid for Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Infrastructure Impact */}
                <div className="rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Network className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-200">
                      Impacted Supply Chain
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Impacted Assets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.digitalTwinImpact?.affectedNodeIds?.length ? (
                          result.digitalTwinImpact.affectedNodeIds.map((nodeId, idx) => (
                            <span key={nodeId} className="px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900 text-[11px] font-mono text-slate-300">
                              {friendlyNodeLabel(nodeId, result.digitalTwinImpact?.affectedNodeTypes?.[idx])}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">No specific nodes impacted</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Key Impact Drivers</span>
                      <ul className="space-y-1.5">
                        {result.digitalTwinImpact?.impactReasons?.slice(0, 3).map((reason, i) => (
                          <li key={i} className="text-slate-400 text-[11px] leading-relaxed pl-2.5 border-l-2 border-orange-500/40">
                            {humanizeReason(reason)}
                          </li>
                        )) || <li className="text-slate-500">Standard flow impact</li>}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2. Risk Scoring Factors */}
                <div className="rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-200">
                      Risk Drivers & Factors
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {result.risk?.factors?.length ? (
                      result.risk.factors.map((factor, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-1">
                            <span>{humanizeLabel(factor.name)}</span>
                            <span className="font-mono text-orange-400">+{factor.points} pts</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {humanizeTechnicalText(factor.explanation)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Deterministic risk calculation applied.</p>
                    )}
                  </div>
                </div>

                {/* 3. Event Classification & Metadata */}
                <div className="rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Globe2 className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-200">
                      Geopolitical Classification
                    </h4>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
                      <dt className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Region</dt>
                      <dd className="font-semibold text-slate-200 mt-0.5">{humanizeLabel(result.classification?.region)}</dd>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
                      <dt className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Category</dt>
                      <dd className="font-semibold text-slate-200 mt-0.5">{humanizeLabel(result.classification?.category)}</dd>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
                      <dt className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Severity</dt>
                      <dd className="font-semibold text-orange-400 mt-0.5">{humanizeLabel(result.classification?.severity)}</dd>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
                      <dt className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Energy Relevance</dt>
                      <dd className="font-semibold text-emerald-400 mt-0.5">
                        {result.classification?.energyRelevant ? 'Confirmed' : 'Indirect'}
                      </dd>
                    </div>
                  </dl>

                  {result.event?.description && (
                    <div className="pt-2 border-t border-slate-800/60 text-xs">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Scenario Description</span>
                      <p className="text-slate-400 leading-relaxed text-[11px]">{result.event.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: LIVE GLOBAL INTELLIGENCE FEED                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'monitor' && (
        <div className="space-y-6">
          {/* Status Metric Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Total Monitored</span>
              <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
                {monitoring?.detectedEvents ?? monitoredEvents.length}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">Live external stream</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Energy Relevant</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                {monitoring?.relevantEvents ?? monitoredEvents.filter((e) => e.analysis?.classification?.energyRelevant).length}
              </span>
              <span className="text-[10px] font-mono text-emerald-400/80 mt-1 block">Supply chain matched</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">High Risk Alerts</span>
              <span className="text-2xl font-bold font-mono text-orange-400 mt-1 block">
                {monitoring?.highRiskAlerts ?? monitoredEvents.filter((e) => normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel) === 'high').length}
              </span>
              <span className="text-[10px] font-mono text-orange-400/80 mt-1 block">Elevated priority</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Critical Threats</span>
              <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
                {monitoring?.criticalAlerts ?? monitoredEvents.filter((e) => normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel) === 'critical').length}
              </span>
              <span className="text-[10px] font-mono text-red-400/80 mt-1 block">Immediate action required</span>
            </div>
          </div>

          {/* Filter & Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-[#0c1019]">
            {/* Risk Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {(['all', 'critical', 'high'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFeedRiskFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                    feedRiskFilter === filter
                      ? 'bg-slate-800 text-orange-400 border border-orange-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headline or location..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 bg-[#070a10] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/80"
              />
            </div>
          </div>

          {/* Refresh Message */}
          {monitoringRefreshMessage && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{monitoringRefreshMessage}</span>
            </div>
          )}

          {/* Events Feed Container */}
          <FilteredMonitoredFeed
            events={monitoredEvents}
            alerts={monitoringAlerts}
            riskFilter={feedRiskFilter}
            searchQuery={searchQuery}
            loading={monitoringLoading}
            error={monitoringError}
          />
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// Clean Filtered Monitored Event Feed Component
// -------------------------------------------------------------------
const FilteredMonitoredFeed: React.FC<{
  events: MonitoredEventRecord[];
  alerts: MonitoredEventRecord[];
  riskFilter: 'all' | 'critical' | 'high';
  searchQuery: string;
  loading: boolean;
  error: string | null;
}> = ({ events, riskFilter, searchQuery, loading, error }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filtered = events.filter((record) => {
    const level = normalizedRiskLevel(record.alertLevel || record.analysis?.risk?.riskLevel);
    if (riskFilter === 'critical' && level !== 'critical') return false;
    if (riskFilter === 'high' && level !== 'high') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = record.article?.title?.toLowerCase() || '';
      const location = record.analysis?.event?.location?.toLowerCase() || '';
      const category = record.analysis?.classification?.category?.toLowerCase() || '';
      return title.includes(q) || location.includes(q) || category.includes(q);
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <div className="p-12 text-center rounded-xl border border-slate-800 bg-[#0c1019] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
        <span className="text-xs font-mono text-slate-400">Loading live geopolitical telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center gap-2 font-mono">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!total) {
    return (
      <div className="p-12 text-center rounded-xl border border-slate-800 bg-[#0c1019] space-y-2">
        <Globe2 className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-300">No events matched your criteria</p>
        <p className="text-xs text-slate-500">Try adjusting the risk filter or search keywords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>Showing {paged.length} of {total} monitored events</span>
        <span>Real-time Google News & RSS Stream</span>
      </div>

      <div className="space-y-3">
        {paged.map((record) => (
          <FeedCard key={record.article?.id || record.detectedAt} record={record} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// Individual Feed Card Component (Anti-Clutter, Premium UI)
// -------------------------------------------------------------------
const FeedCard: React.FC<{ record: MonitoredEventRecord }> = ({ record }) => {
  const analysis = record.analysis;
  const level = normalizedRiskLevel(record.alertLevel || analysis?.risk?.riskLevel);
  const cfg = riskBadgeConfig[level] || riskBadgeConfig.unknown;

  const affectedNodes = analysis?.digitalTwinImpact?.affectedNodeIds || [];
  const sourceUrl = record.article?.url;
  const title = record.article?.title || 'Geopolitical Event';
  const publishedAt = record.article?.publishedAt ? new Date(record.article.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
  const location = analysis?.event?.location || analysis?.classification?.region || 'Global';

  return (
    <article className="rounded-xl border border-slate-800/90 bg-[#0c1019] hover:border-slate-700/80 p-5 transition-all shadow-md hover:shadow-lg space-y-3">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wider ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              {cfg.label}
            </span>
            {typeof analysis?.risk?.riskScore === 'number' && (
              <span className="text-xs font-mono font-bold text-slate-300">
                Score: <span className={cfg.text}>{analysis.risk.riskScore}</span>/100
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-500">· {publishedAt}</span>
            <span className="text-[11px] font-mono text-slate-500">· {location}</span>
          </div>

          <h3 className="text-sm font-semibold text-slate-100 leading-snug hover:text-orange-300 transition-colors">
            {renderSafeAssessmentMarkdown(title)}
          </h3>
        </div>
      </div>

      {/* Narrative Explanation */}
      {analysis?.explanation && (
        <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
          {renderSafeAssessmentMarkdown(compactAssessmentText(analysis.explanation))}
        </p>
      )}

      {/* Impacted Assets Pills & Source Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          {affectedNodes.slice(0, 3).map((nodeId, idx) => (
            <span key={nodeId} className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-400">
              {friendlyNodeLabel(nodeId, analysis?.digitalTwinImpact?.affectedNodeTypes?.[idx])}
            </span>
          ))}
          {affectedNodes.length > 3 && (
            <span className="text-[10px] font-mono text-slate-500">+{affectedNodes.length - 3} more</span>
          )}
        </div>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-orange-400 hover:text-orange-300 transition-colors"
          >
            <span>Source Article</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </article>
  );
};

// Exported pagination helper
export const getPageNumbers = (current: number, total: number): Array<number | '...'> => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
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
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === '...') return <span key={idx} className="px-2 text-xs text-slate-600 font-mono">...</span>;
          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                isCurrent
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Next <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
};

export const NodeIdList: React.FC<{ label: string; nodeIds?: string[]; nodeTypes?: string[]; onViewDigitalTwin?: () => void }> = ({ label, nodeIds, nodeTypes, onViewDigitalTwin }) => {
  const friendlyLabels = [...new Set((nodeIds || []).map((nodeId, index) => friendlyNodeLabel(nodeId, nodeTypes?.[index])))];
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">{label}</p>
        {onViewDigitalTwin && nodeIds?.length ? (
          <button type="button" onClick={onViewDigitalTwin} className="text-[10px] font-mono text-orange-400 hover:text-orange-300 cursor-pointer">
            Open network
          </button>
        ) : null}
      </div>
      {nodeIds?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {friendlyLabels.map((labelText) => (
            <span key={labelText} className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] text-slate-300 font-mono">
              {labelText}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Not available</p>
      )}
    </div>
  );
};
