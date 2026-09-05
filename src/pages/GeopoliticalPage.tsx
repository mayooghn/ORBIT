import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Globe2,
  Loader2,
  Network,
  Search,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  fetchCriticalMonitoringAlerts,
  fetchHighRiskMonitoringAlerts,
  fetchMonitoredEvents,
  fetchMonitoringStatus,
  type GeopoliticalRiskAgentResponse,
  type MonitoredEventRecord,
  type MonitoringStatusResponse,
} from '../services/api';
import {
  formatMeasurementParts,
  friendlyNodeLabel,
  humanizeLabel,
  normalizedRiskLevel,
  riskBadgeConfig,
  renderSafeAssessmentMarkdown,
  compactAssessmentText,
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
  const [activeTab, setActiveTab] = useState<'assess' | 'monitor'>('assess');
  const [selectedRecord, setSelectedRecord] = useState<MonitoredEventRecord | null>(null);

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

      if (!selectedRecord && mergedEvents.length > 0) {
        // Default selected to first high or critical alert, or first event
        const prominent = mergedEvents.find((e) => {
          const lvl = normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel);
          return lvl === 'critical' || lvl === 'high';
        }) || mergedEvents[0];
        setSelectedRecord(prominent);
      }

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

  const currentAnalysis = selectedRecord?.analysis;
  const currentRiskLevel = normalizedRiskLevel(selectedRecord?.alertLevel || currentAnalysis?.risk?.riskLevel);
  const currentRiskScore = typeof currentAnalysis?.risk?.riskScore === 'number' ? currentAnalysis.risk.riskScore : null;
  const cfg = riskBadgeConfig[currentRiskLevel] || riskBadgeConfig.unknown;

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
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'monitor'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-800 text-orange-400 border border-orange-500/30'
                }`}
              >
                {monitoredEvents.length}
              </span>
            )}
          </button>
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: RISK ASSESSMENT                                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'assess' && (
        <div className="space-y-6">
          {/* Active Event Selector / Quick Switcher */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1019] p-5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-200">
                  Evaluated Threat Scenarios & Monitored Events
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Select an event to inspect its full supply chain impact
              </span>
            </div>

            {monitoringLoading ? (
              <div className="p-6 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span>Loading evaluated intelligence records...</span>
              </div>
            ) : monitoredEvents.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-slate-400">
                No active monitored events available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {monitoredEvents.slice(0, 9).map((record) => {
                  const isSelected = selectedRecord === record;
                  const lvl = normalizedRiskLevel(record.alertLevel || record.analysis?.risk?.riskLevel);
                  const badge = riskBadgeConfig[lvl] || riskBadgeConfig.unknown;
                  const title = record.article?.title || record.analysis?.event?.title || 'Geopolitical Event';

                  return (
                    <button
                      key={record.article?.id || record.detectedAt}
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500/80 bg-orange-500/10 text-white shadow-md'
                          : 'border-slate-800/80 bg-[#070a10] hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${badge.bg} ${badge.border} ${badge.text} border`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {record.detectedAt ? new Date(record.detectedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs font-medium line-clamp-2 leading-snug">{title}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assessment Detailed View */}
          {selectedRecord && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Hero Banner */}
              <div className={`rounded-xl border ${cfg.border} bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden`}>
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                  {/* Risk Score Circle & Badges */}
                  <div className="flex items-center gap-5 pr-6 border-b lg:border-b-0 lg:border-r border-slate-800 pb-5 lg:pb-0">
                    <div className="relative flex items-center justify-center">
                      <div className={`w-24 h-24 rounded-2xl border ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center shadow-lg`}>
                        <span className={`text-4xl font-black font-mono tracking-tight ${cfg.text}`}>
                          {currentRiskScore !== null ? currentRiskScore : '—'}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">/ 100</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          level={
                            currentRiskLevel === 'critical'
                              ? 'CRITICAL'
                              : currentRiskLevel === 'high'
                              ? 'ELEVATED'
                              : currentRiskLevel === 'medium'
                              ? 'MODERATE'
                              : 'AVAILABLE'
                          }
                          label={cfg.label}
                          size="md"
                        />
                      </div>
                      <h3 className="text-lg font-bold text-slate-100">
                        {selectedRecord.article?.title || currentAnalysis?.event?.title || 'Geopolitical Threat Evaluation'}
                      </h3>
                      <p className="text-xs font-mono text-slate-400">
                        Evaluated by ORBIT Supply Chain Intelligence Engine
                      </p>
                    </div>
                  </div>

                  {/* Impact Quick Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                    <div className="p-3 rounded-lg border border-slate-800 bg-[#070a10]">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Affected Assets</span>
                      <span className="text-base font-bold font-mono text-slate-200 mt-1 block">
                        {currentAnalysis?.digitalTwinImpact?.affectedNodeIds?.length || 0} Nodes
                      </span>
                    </div>
                    {(() => {
                      const flowParts = formatMeasurementParts(currentAnalysis?.digitalTwinImpact?.affectedFlow);
                      const capacityParts = formatMeasurementParts(currentAnalysis?.digitalTwinImpact?.affectedCapacity);
                      return (
                        <>
                          <div className="p-3 rounded-lg border border-slate-800 bg-[#070a10]">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Flow Reduction</span>
                            <span className="text-base font-bold font-mono text-orange-400 mt-1 block">
                              {flowParts.value}
                            </span>
                            {flowParts.unit && (
                              <span className="text-xs font-mono text-orange-400/80 block mt-0.5 leading-snug">
                                {flowParts.unit}
                              </span>
                            )}
                          </div>
                          <div className="p-3 rounded-lg border border-slate-800 bg-[#070a10] col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Capacity Exposed</span>
                            <span className="text-base font-bold font-mono text-amber-400 mt-1 block">
                              {capacityParts.value}
                            </span>
                            {capacityParts.unit && (
                              <span className="text-xs font-mono text-amber-400/80 block mt-0.5 leading-snug">
                                {capacityParts.unit}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Executive Assessment Narrative */}
              {currentAnalysis?.explanation && (
                <div className="rounded-xl border border-slate-800/80 bg-[#0c1019] p-6 shadow-lg">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
                    <BrainCircuit className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-semibold font-mono text-slate-200 uppercase tracking-wider">
                      Executive Threat Assessment
                    </h3>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed space-y-3 font-sans">
                    {renderSafeAssessmentMarkdown(compactAssessmentText(currentAnalysis.explanation))}
                  </div>
                </div>
              )}

              {/* Organized 2-Column Grid for Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Infrastructure Impact */}
                <div className="rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-orange-400" />
                      <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-200">
                        Impacted Supply Chain Assets
                      </h4>
                    </div>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('/app/network')}
                        className="text-xs font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Digital Twin →</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 text-xs">
                    {currentAnalysis?.digitalTwinImpact?.affectedNodeIds?.length ? (
                      <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {currentAnalysis.digitalTwinImpact.affectedNodeIds.map((nodeId, idx) => {
                          const nodeType = currentAnalysis.digitalTwinImpact?.affectedNodeTypes?.[idx];
                          const nodeName = currentAnalysis.digitalTwinImpact?.affectedNodeNames?.[idx];
                          const label = friendlyNodeLabel(nodeId, nodeType, nodeName);
                          return (
                            <li
                              key={`${nodeId}-${idx}`}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10] font-mono text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                                <span className="font-semibold text-slate-200">{label}</span>
                              </div>
                              {nodeType && (
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700/50">
                                  {humanizeLabel(nodeType)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">No specific nodes directly impacted</span>
                    )}
                  </div>
                </div>

                {/* 2. Event Classification & Metadata */}
                <div className="rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Globe2 className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-200">
                      Geopolitical Classification
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <ul className="divide-y divide-slate-800/80 rounded-lg border border-slate-800/80 bg-[#070a10] overflow-hidden font-mono">
                      <li className="flex items-center justify-between p-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Region</span>
                        <span className="font-semibold text-slate-200">{humanizeLabel(currentAnalysis?.classification?.region)}</span>
                      </li>
                      <li className="flex items-center justify-between p-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Category</span>
                        <span className="font-semibold text-slate-200">{humanizeLabel(currentAnalysis?.classification?.category)}</span>
                      </li>
                      <li className="flex items-center justify-between p-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Severity</span>
                        <span className="font-semibold text-orange-400">{humanizeLabel(currentAnalysis?.classification?.severity)}</span>
                      </li>
                      <li className="flex items-center justify-between p-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Energy Relevance</span>
                        <span className="font-semibold text-emerald-400">
                          {currentAnalysis?.classification?.energyRelevant ? 'Confirmed' : 'Indirect'}
                        </span>
                      </li>
                    </ul>

                    {selectedRecord.article?.description && (
                      <div className="pt-2 border-t border-slate-800/60 text-xs">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Source Summary</span>
                        <p className="text-slate-400 leading-relaxed text-[11px] font-sans">{selectedRecord.article.description}</p>
                      </div>
                    )}
                  </div>
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
            onSelectEvent={(record) => {
              setSelectedRecord(record);
              setActiveTab('assess');
            }}
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
  onSelectEvent: (record: MonitoredEventRecord) => void;
}> = ({ events, riskFilter, searchQuery, loading, error, onSelectEvent }) => {
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
            onSelect={() => onSelectEvent(record)}
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
  onSelect: () => void;
}> = ({ record, onSelect }) => {
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

          <h3
            onClick={onSelect}
            className="text-sm font-semibold text-slate-100 leading-snug hover:text-orange-300 transition-colors cursor-pointer"
          >
            {renderSafeAssessmentMarkdown(title)}
          </h3>
        </div>

        <button
          type="button"
          onClick={onSelect}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs font-mono text-orange-400 hover:text-orange-300 cursor-pointer self-start shrink-0"
        >
          <span>Inspect Analysis</span>
          <ArrowRight className="w-3 h-3" />
        </button>
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
