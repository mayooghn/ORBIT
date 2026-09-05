import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Globe2,
  Loader2,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import {
  fetchCriticalMonitoringAlerts,
  fetchHighRiskMonitoringAlerts,
  fetchMonitoredEvents,
  fetchMonitoringStatus,
  type MonitoredEventRecord,
  type MonitoringStatusResponse,
} from '../services/api';
import {
  friendlyNodeLabel,
  normalizedRiskLevel,
  riskBadgeConfig,
  renderSafeAssessmentMarkdown,
  monitoringRecordKey,
  getPageNumbers,
  EXTERNAL_MONITORING_FRESHNESS_MS,
  getExternalMonitoringStatus,
  formatExternalMonitoringEventTime,
  EXAMPLE_PROMPTS,
  INITIAL_ASSISTANT_REQUEST,
} from '../utils/assessmentFormatting';

export {
  EXTERNAL_MONITORING_FRESHNESS_MS,
  getExternalMonitoringStatus,
  formatExternalMonitoringEventTime,
  EXAMPLE_PROMPTS,
  INITIAL_ASSISTANT_REQUEST,
  getPageNumbers,
  renderSafeAssessmentMarkdown,
};

interface GeopoliticalPageProps {
  onNavigate?: (path: string) => void;
}

type MonitoringSnapshot = {
  monitoring?: MonitoringStatusResponse['monitoring'];
  events: MonitoredEventRecord[];
};

export const GeopoliticalPage: React.FC<GeopoliticalPageProps> = ({ onNavigate }) => {
  // Live Monitoring State
  const [monitoring, setMonitoring] = useState<MonitoringStatusResponse['monitoring']>();
  const [monitoredEvents, setMonitoredEvents] = useState<MonitoredEventRecord[]>([]);
  const [monitoringAlerts, setMonitoringAlerts] = useState<MonitoredEventRecord[]>([]);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(true);

  // Feed Filter & Search
  const [feedRiskFilter, setFeedRiskFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      const mergedEvents = [...byId.values()].sort((left, right) =>
        String(right.detectedAt || '').localeCompare(String(left.detectedAt || ''))
      );
      setMonitoredEvents(mergedEvents);

      const alertsById = new Map<string, MonitoredEventRecord>();
      alerts.forEach((record) => {
        const key = monitoringRecordKey(record);
        if (!alertsById.has(key)) alertsById.set(key, record);
      });
      setMonitoringAlerts(
        [...alertsById.values()].sort((left, right) =>
          String(right.detectedAt || '').localeCompare(String(left.detectedAt || ''))
        )
      );
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
    void loadMonitoring();
    const timer = window.setInterval(() => {
      void loadMonitoring();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title Header */}
      <PageHeader
        title="Geopolitical Risk Agent"
        subtitle="Monitor real-time global disruptions, evaluate energy supply-chain vulnerabilities, and track threat intelligence."
      />

      {/* Top Controls & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 rounded-xl border border-slate-800 bg-[#090d16]/90 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
              Live Global Intelligence Feed
            </span>
          </div>
          {monitoredEvents.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-orange-400 border border-orange-500/30">
              {monitoredEvents.length} Events Active
            </span>
          )}
        </div>

        {/* AI Assistant Link Banner */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('/app/assistant')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-800 bg-[#0c1019] hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-orange-300 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Interactive Queries? Open ORBIT AI Assistant</span>
            <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
          </button>
        )}
      </div>

      {/* Live Global Intelligence Feed Dashboard */}
      <div className="space-y-6">
        {/* Status Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Total Monitored</span>
            <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
              {monitoring?.totalArticlesScanned ?? monitoredEvents.length}
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
              {monitoring?.highRiskAlerts ??
                monitoredEvents.filter((e) => normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel) === 'high').length}
            </span>
            <span className="text-[10px] font-mono text-orange-400/80 mt-1 block">Elevated priority</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Critical Threats</span>
            <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
              {monitoring?.criticalAlerts ??
                monitoredEvents.filter((e) => normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel) === 'critical').length}
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headline or location..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 bg-[#070a10] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/80"
            />
          </div>
        </div>

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

  const totalEvents = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(page * pageSize, totalEvents);

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
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!totalEvents) {
    return (
      <div className="p-12 text-center rounded-xl border border-slate-800 bg-[#0c1019] space-y-2">
        <Globe2 className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-300">No events matched your criteria</p>
        <p className="text-xs text-slate-400">Try adjusting the risk filter or search keywords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>
          Showing {startIndex + 1}–{endIndex} of {totalEvents} monitored events
        </span>
        <span>Real-time Google News & RSS Stream</span>
      </div>

      <div className="space-y-3">
        {paged.map((record) => (
          <FeedCard
            key={record.article?.id || record.detectedAt}
            record={record}
          />
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
const FeedCard: React.FC<{
  record: MonitoredEventRecord;
}> = ({ record }) => {
  const analysis = record.analysis;
  const level = normalizedRiskLevel(record.alertLevel || analysis?.risk?.riskLevel);
  const cfg = riskBadgeConfig[level] || riskBadgeConfig.unknown;

  const affectedNodes = analysis?.digitalTwinImpact?.affectedNodeIds || [];
  const sourceUrl = record.article?.url;
  const title = record.article?.title || 'Geopolitical Event';
  const publishedAt = record.article?.publishedAt
    ? new Date(record.article.publishedAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';
  const location = analysis?.event?.location || analysis?.classification?.region || 'Global';

  return (
    <article className="rounded-xl border border-slate-800/90 bg-[#0c1019] hover:border-slate-700/80 p-5 transition-all shadow-md hover:shadow-lg space-y-3">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wider ${cfg.bg} ${cfg.border} ${cfg.text}`}
            >
              {cfg.label}
            </span>
            <span className="text-[11px] font-mono text-slate-400">· {publishedAt}</span>
            <span className="text-[11px] font-mono text-slate-400">· {location}</span>
          </div>

          <h3 className="text-sm font-semibold text-slate-100 leading-snug">
            {renderSafeAssessmentMarkdown(title)}
          </h3>
        </div>
      </div>

      {/* Impacted Assets Pills & Source Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          {affectedNodes.slice(0, 3).map((nodeId, idx) => (
            <span
              key={nodeId}
              className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-400"
            >
              {friendlyNodeLabel(
                nodeId,
                analysis?.digitalTwinImpact?.affectedNodeTypes?.[idx],
                analysis?.digitalTwinImpact?.affectedNodeNames?.[idx]
              )}
            </span>
          ))}
          {affectedNodes.length > 3 && (
            <span className="text-[10px] font-mono text-slate-400">+{affectedNodes.length - 3} more</span>
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

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Monitored events pagination" className="flex items-center justify-between gap-3 pt-4">
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
          if (p === '...')
            return (
              <span key={idx} className="px-2 text-xs text-slate-600 font-mono">
                ...
              </span>
            );
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

export const NodeIdList: React.FC<{
  label: string;
  nodeIds?: string[];
  nodeTypes?: string[];
  nodeNames?: string[];
  onViewDigitalTwin?: () => void;
}> = ({ label, nodeIds, nodeTypes, nodeNames, onViewDigitalTwin }) => {
  const friendlyLabels = [
    ...new Set(
      (nodeIds || []).map((nodeId, index) =>
        friendlyNodeLabel(nodeId, nodeTypes?.[index], nodeNames?.[index])
      )
    ),
  ];
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">{label}</p>
        {onViewDigitalTwin && nodeIds?.length ? (
          <button
            type="button"
            onClick={onViewDigitalTwin}
            className="text-[10px] font-mono text-orange-400 hover:text-orange-300 cursor-pointer"
          >
            Open network
          </button>
        ) : null}
      </div>
      {nodeIds?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {friendlyLabels.map((labelText) => (
            <span
              key={labelText}
              className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] text-slate-300 font-mono"
            >
              {labelText}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Not available</p>
      )}
    </div>
  );
};
