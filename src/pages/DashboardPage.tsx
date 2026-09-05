import React, { useEffect, useState, useCallback } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { deriveModuleServiceStatuses } from '../services/moduleServices';
import {
  checkBackendHealth,
  fetchLatestOrbitAssessment,
  fetchMonitoringStatus,
  fetchOrbitAssessments,
  fetchStrategicReserveState,
  type HealthApiResponse,
  type MonitoringStatusResponse,
} from '../services/api';
import type { OrbitAssessment } from '../types/orbitAssessment';
import type { StrategicReserveState } from '../reserves/model';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Lock,
  Network,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

interface OrbitOverview {
  loaded: boolean;
  refreshing: boolean;
  health: HealthApiResponse | null;
  monitoring: MonitoringStatusResponse['monitoring'] | null;
  reserveState: StrategicReserveState | null;
  latestAssessment: OrbitAssessment | null;
  assessmentsAvailable: boolean;
  recentAssessments: OrbitAssessment[];
  error?: string | null;
}

const INITIAL_OVERVIEW: OrbitOverview = {
  loaded: false,
  refreshing: false,
  health: null,
  monitoring: null,
  reserveState: null,
  latestAssessment: null,
  assessmentsAvailable: false,
  recentAssessments: [],
  error: null,
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<OrbitOverview>(INITIAL_OVERVIEW);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const loadData = useCallback(async (isRefresh = false): Promise<void> => {
    if (isRefresh) {
      setOverview((prev) => ({ ...prev, refreshing: true }));
    }

    const [health, monitoringStatus, reserveState, assessmentList, latest] = await Promise.allSettled([
      checkBackendHealth(),
      fetchMonitoringStatus(),
      fetchStrategicReserveState(),
      fetchOrbitAssessments(50),
      fetchLatestOrbitAssessment(),
    ]);

    setOverview({
      loaded: true,
      refreshing: false,
      health: health.status === 'fulfilled' ? health.value : null,
      monitoring: monitoringStatus.status === 'fulfilled' ? monitoringStatus.value.monitoring ?? null : null,
      reserveState: reserveState.status === 'fulfilled' ? reserveState.value ?? null : null,
      latestAssessment: latest.status === 'fulfilled' ? latest.value : null,
      assessmentsAvailable: assessmentList.status === 'fulfilled',
      recentAssessments: assessmentList.status === 'fulfilled' ? assessmentList.value : [],
      error: health.status === 'rejected' ? 'Failed to establish backend health connection' : null,
    });
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().slice(0, 19).replace('T', ' ') + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const backendAvailable = overview.health?.status === 'AVAILABLE';
  const dataLayerCapability = overview.health?.capabilities?.phase2DataLayer ?? 'UNKNOWN';
  const moduleStatuses = deriveModuleServiceStatuses({
    health: overview.health,
    monitoring: overview.monitoring,
    reserveStateAvailable: Boolean(overview.reserveState),
    latestAssessment: overview.latestAssessment,
  });

  const latest = overview.latestAssessment;
  const activeDisruptions = overview.recentAssessments.filter((a) => {
    const createdAtMs = Date.parse(a.createdAt);
    return (
      Number.isFinite(createdAtMs) &&
      createdAtMs >= Date.now() - 24 * 60 * 60 * 1000 &&
      (a.overallRisk === 'high' || a.overallRisk === 'critical')
    );
  }).length;

  const criticalAlerts = overview.monitoring?.criticalAlerts ?? null;
  const highAlerts = overview.monitoring?.highRiskAlerts ?? null;
  const riskAlertsCount =
    criticalAlerts === null && highAlerts === null ? null : (criticalAlerts ?? 0) + (highAlerts ?? 0);

  // Derived real data from latest assessment
  const overallRiskLevel = latest?.overallRisk?.toUpperCase() ?? (latest?.geopolitical?.risk.riskLevel.toUpperCase() ?? null);
  const affectedNodeNames =
    latest?.geopolitical?.digitalTwinImpact?.affectedNodeNames?.filter(Boolean) ??
    latest?.geopolitical?.digitalTwinImpact?.affectedNodeIds ??
    (latest?.disruption?.affectedNodeId ? [latest.disruption.affectedNodeId] : []);
  const affectedEdgeIds = latest?.geopolitical?.digitalTwinImpact?.affectedEdgeIds ?? [];
  const reserveCoverageStatus = latest?.reserve?.result.coverageStatus ?? null;
  const digitalTwinImpact = latest?.geopolitical?.digitalTwinImpact;

  // Selected assessment for detail viewing if user clicks a row in table
  const displayedAssessment = selectedAssessmentId
    ? overview.recentAssessments.find((a) => a.assessmentId === selectedAssessmentId) ?? latest
    : latest;

  return (
    <div className="min-h-screen bg-[#000000] text-[#EDEDED] font-sans antialiased p-3 sm:p-5 lg:p-6 space-y-5">
      {/* -------------------------------------------------------------
          TOP OPERATIONAL STATUS STRIP
         ------------------------------------------------------------- */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-[#060606] border border-[#1a1a1a] rounded text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4 text-[#888888]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              }`}
            />
            <span className="font-semibold tracking-wider text-[#CCCCCC]">
              {backendAvailable ? 'SYSTEM ONLINE' : 'SYSTEM DEGRADED'}
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-[#222222]" />

          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#f97316]" />
            <span>
              MONITORING:{' '}
              <strong className="text-[#EDEDED]">
                {overview.monitoring ? `${overview.monitoring.detectedEvents ?? 0} DETECTED` : 'N/A'}
              </strong>
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-[#222222]" />

          <div className="flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-[#10b981]" />
            <span>
              DATA LAYER:{' '}
              <strong className="text-[#EDEDED]">{dataLayerCapability}</strong>
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-[#222222]" />

          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>
              RESERVE:{' '}
              <strong className="text-[#EDEDED]">
                {overview.reserveState?.currentReserve != null
                  ? `${(overview.reserveState.currentReserve / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k ${overview.reserveState.unit || 'tonnes'}`
                  : 'N/A'}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[#666666]">
          <span>{currentTime || 'SYNCING UTC…'}</span>
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={overview.refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#111111] hover:bg-[#1c1c1c] text-[#CCCCCC] hover:text-white border border-[#262626] rounded transition-colors text-[11px] disabled:opacity-50 cursor-pointer"
            title="Refresh dashboard intelligence from backend APIs"
          >
            <RefreshCw className={`w-3 h-3 ${overview.refreshing ? 'animate-spin text-[#f97316]' : ''}`} />
            <span>{overview.refreshing ? 'REFRESHING' : 'REFRESH'}</span>
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          DASHBOARD TITLE & ACTIONS
         ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a1a1a] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FFFFFF] font-mono">
              COMMAND OVERVIEW
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold tracking-widest uppercase bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30 rounded">
              OPERATIONAL INTELLIGENCE
            </span>
          </div>
          <p className="text-xs text-[#888888] mt-1 font-mono">
            Real-time geopolitical risk monitoring, digital twin network degradation, and strategic reserve optimization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/app/assistant')}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-xs font-mono text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-[#f97316]" />
            <span>Risk Agent</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/app/network')}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-xs font-mono text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Network className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Digital Twin</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/app/reserves')}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-xs font-mono text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Reserves</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          1. TOP SUMMARY METRIC CARDS
         ------------------------------------------------------------- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Overall Risk Card */}
        <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 flex flex-col justify-between hover:border-[#2a2a2a] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider">Overall Risk</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH'
                  ? 'text-red-500'
                  : overallRiskLevel === 'MEDIUM'
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            />
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-bold font-mono ${
                overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH'
                  ? 'text-red-400'
                  : overallRiskLevel === 'MEDIUM'
                  ? 'text-amber-400'
                  : overallRiskLevel === 'LOW'
                  ? 'text-emerald-400'
                  : 'text-[#888888]'
              }`}
            >
              {overallRiskLevel ?? 'NO RISK'}
            </div>
            <div className="text-[11px] text-[#666666] font-mono mt-0.5">
              {latest?.geopolitical?.risk.riskScore != null
                ? `Score: ${(latest.geopolitical.risk.riskScore * 100).toFixed(0)}% · factors: ${
                    latest.geopolitical.risk.factors?.length ?? 0
                  }`
                : 'Real telemetry sync'}
            </div>
          </div>
          <div className="text-[10px] text-[#555555] font-mono border-t border-[#141414] pt-2">
            {latest ? `Latest assessment: ${latest.assessmentId.slice(0, 18)}…` : 'Awaiting event ingest'}
          </div>
        </div>

        {/* Active Events Card */}
        <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 flex flex-col justify-between hover:border-[#2a2a2a] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider">Active Events</span>
            <Activity className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-[#EDEDED]">
              {overview.monitoring?.detectedEvents != null ? overview.monitoring.detectedEvents : 'N/A'}
            </div>
            <div className="text-[11px] text-[#666666] font-mono mt-0.5">
              {overview.monitoring
                ? `${overview.monitoring.relevantEvents ?? 0} relevant · ${riskAlertsCount ?? 0} elevated`
                : 'Feed offline'}
            </div>
          </div>
          <div className="text-[10px] text-[#555555] font-mono border-t border-[#141414] pt-2">
            {activeDisruptions > 0
              ? `${activeDisruptions} high/critical in 24h`
              : 'Zero active disruptions in 24h'}
          </div>
        </div>

        {/* Affected Assets Card */}
        <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 flex flex-col justify-between hover:border-[#2a2a2a] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider">Affected Assets</span>
            <Network className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-[#EDEDED]">
              {affectedNodeNames.length > 0 ? affectedNodeNames.length : 0}
            </div>
            <div className="text-[11px] text-[#666666] font-mono mt-0.5 truncate" title={affectedNodeNames.join(', ')}>
              {affectedNodeNames.length > 0
                ? `${affectedNodeNames.slice(0, 2).join(', ')}${affectedNodeNames.length > 2 ? '…' : ''}`
                : 'All corridors nominal'}
            </div>
          </div>
          <div className="text-[10px] text-[#555555] font-mono border-t border-[#141414] pt-2">
            {affectedEdgeIds.length > 0 ? `${affectedEdgeIds.length} maritime transit edges degraded` : 'Nominal corridor routing'}
          </div>
        </div>

        {/* Reserve Coverage Card */}
        <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 flex flex-col justify-between hover:border-[#2a2a2a] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider">Reserve Coverage</span>
            <Database className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="my-2">
            <div
              className={`text-base font-bold font-mono truncate ${
                reserveCoverageStatus === 'FULLY_COVERED' || reserveCoverageStatus === 'NO_EFFECTIVE_GAP'
                  ? 'text-emerald-400'
                  : reserveCoverageStatus === 'PARTIALLY_COVERED'
                  ? 'text-amber-400'
                  : reserveCoverageStatus === 'INSUFFICIENT_COVERAGE'
                  ? 'text-red-400'
                  : 'text-[#AAAAAA]'
              }`}
              title={reserveCoverageStatus ?? 'N/A'}
            >
              {reserveCoverageStatus ?? (overview.reserveState ? 'MONITORED' : 'N/A')}
            </div>
            <div className="text-[11px] text-[#666666] font-mono mt-0.5">
              {latest?.reserve?.result
                ? `Drawdown: ${(latest.reserve.result.recommendedReserveDrawdown ?? latest.reserve.result.drawdownRate ?? 0).toLocaleString()} t/d`
                : overview.reserveState?.currentReserve != null
                ? `Stock: ${overview.reserveState.currentReserve.toLocaleString()} ${overview.reserveState.unit || 'tonnes'}`
                : 'Reserve telemetry offline'}
            </div>
          </div>
          <div className="text-[10px] text-[#555555] font-mono border-t border-[#141414] pt-2">
            {latest?.reserve?.input?.minimumReserveThreshold != null
              ? `Safety threshold: ${latest.reserve.input.minimumReserveThreshold.toLocaleString()} t`
              : overview.reserveState?.minimumReserveThreshold != null
              ? `Min threshold: ${overview.reserveState.minimumReserveThreshold.toLocaleString()} ${overview.reserveState.unit || 'tonnes'}`
              : 'Constraint inactive'}
          </div>
        </div>

        {/* Latest Assessment Status Card */}
        <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 flex flex-col justify-between hover:border-[#2a2a2a] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider">Assessment Status</span>
            <Clock className="w-4 h-4 text-[#888888]" />
          </div>
          <div className="my-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  latest?.status === 'COMPLETED'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : latest?.status === 'PARTIAL'
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    : latest?.status === 'FAILED'
                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    : 'bg-[#444444]'
                }`}
              />
              <span className="text-base font-bold font-mono text-[#EDEDED]">
                {latest?.status ?? 'NO ASSESSMENTS'}
              </span>
            </div>
            <div className="text-[11px] text-[#666666] font-mono mt-0.5">
              {latest?.completedAt
                ? new Date(latest.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
                : latest?.createdAt
                ? new Date(latest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC'
                : 'Awaiting run'}
            </div>
          </div>
          <div className="text-[10px] text-[#555555] font-mono border-t border-[#141414] pt-2">
            {latest?.trigger === 'monitored_event' ? 'Trigger: n8n automated monitor' : latest ? 'Trigger: Manual intake request' : 'Standby'}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. ORCHESTRATOR FLOW PIPELINE (News -> n8n -> ORBIT -> GEO -> Digital Twin -> Reserve -> Assessment)
         ------------------------------------------------------------- */}
      <section className="bg-[#060606] border border-[#1a1a1a] rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f97316]" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-[#CCCCCC] uppercase">
              ORCHESTRATOR PIPELINE FLOW
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#666666]">
            Architectural Stage Ledger · Deterministic Hand-off
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Stage 1: NEWS */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">1. NEWS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="my-1.5">
              <span className="text-xs font-mono font-bold text-emerald-400">READY</span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                {overview.monitoring?.detectedEvents != null
                  ? `${overview.monitoring.detectedEvents} feed items`
                  : 'Google News RSS'}
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">Source Ingestion</div>
          </div>

          {/* Stage 2: n8n */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">2. n8n</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="my-1.5">
              <span className="text-xs font-mono font-bold text-emerald-400">
                {overview.monitoring?.status === 'ACTIVE' ? 'ACTIVE' : 'READY'}
              </span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                {overview.monitoring?.lastScan?.scannedAt
                  ? `Scan ${new Date(overview.monitoring.lastScan.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : '15m poll / webhook'}
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">Energy Monitor</div>
          </div>

          {/* Stage 3: ORBIT */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">3. ORBIT</span>
              <span className={`w-1.5 h-1.5 rounded-full ${backendAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </div>
            <div className="my-1.5">
              <span className={`text-xs font-mono font-bold ${backendAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
                {backendAvailable ? 'ONLINE' : 'DEGRADED'}
              </span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                /api/pipeline/run
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">Fast HTTP Adapter</div>
          </div>

          {/* Stage 4: GEO */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">4. GEO</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latest?.stages?.find((s) => s.stage === 'geopoliticalAnalysis')?.status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : latest?.stages?.find((s) => s.stage === 'geopoliticalAnalysis')?.status === 'FAILED'
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="my-1.5">
              <span
                className={`text-xs font-mono font-bold ${
                  latest?.stages?.find((s) => s.stage === 'geopoliticalAnalysis')?.status === 'FAILED'
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {latest?.stages?.find((s) => s.stage === 'geopoliticalAnalysis')?.status ?? 'READY'}
              </span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                {latest?.geopolitical?.risk.riskScore != null
                  ? `Score: ${(latest.geopolitical.risk.riskScore * 100).toFixed(0)}%`
                  : 'Groq/Rule Agent'}
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">Risk Quantification</div>
          </div>

          {/* Stage 5: DIGITAL TWIN */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">5. TWIN</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latest?.stages?.find((s) => s.stage === 'networkImpactResolution')?.status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : latest?.stages?.find((s) => s.stage === 'networkImpactResolution')?.status === 'FAILED'
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="my-1.5">
              <span
                className={`text-xs font-mono font-bold ${
                  latest?.stages?.find((s) => s.stage === 'networkImpactResolution')?.status === 'FAILED'
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {latest?.stages?.find((s) => s.stage === 'networkImpactResolution')?.status ?? 'READY'}
              </span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                {affectedNodeNames.length > 0 ? `${affectedNodeNames.length} nodes bound` : 'Graph Resolution'}
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">Network Impact</div>
          </div>

          {/* Stage 6: RESERVE */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">6. RESERVE</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latest?.stages?.find((s) => s.stage === 'reserveOptimization')?.status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : latest?.stages?.find((s) => s.stage === 'reserveOptimization')?.status === 'FAILED'
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="my-1.5">
              <span
                className={`text-xs font-mono font-bold ${
                  latest?.stages?.find((s) => s.stage === 'reserveOptimization')?.status === 'FAILED'
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {latest?.stages?.find((s) => s.stage === 'reserveOptimization')?.status ?? 'READY'}
              </span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                {latest?.reserve?.result
                  ? `${(latest.reserve.result.recommendedReserveDrawdown ?? latest.reserve.result.drawdownRate ?? 0).toLocaleString()} t/d`
                  : 'Optimizer Engine'}
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">Safety Constraints</div>
          </div>

          {/* Stage 7: ASSESSMENT */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
              <span className="font-semibold text-[#CCCCCC]">7. PERSIST</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latest?.status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : latest?.status === 'PARTIAL'
                    ? 'bg-amber-500'
                    : latest?.status === 'FAILED'
                    ? 'bg-red-500'
                    : 'bg-[#444444]'
                }`}
              />
            </div>
            <div className="my-1.5">
              <span
                className={`text-xs font-mono font-bold ${
                  latest?.status === 'COMPLETED'
                    ? 'text-emerald-400'
                    : latest?.status === 'PARTIAL'
                    ? 'text-amber-400'
                    : latest?.status === 'FAILED'
                    ? 'text-red-400'
                    : 'text-[#888888]'
                }`}
              >
                {latest?.status ?? 'STANDBY'}
              </span>
              <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                {overview.recentAssessments.length} stored records
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#555555]">SQLite Persistence</div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          2. LIVE ASSESSMENT PANEL & IMPACT (Split Grid)
         ------------------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Main: Live Assessment Detail */}
        <div className="lg:col-span-7 bg-[#060606] border border-[#1a1a1a] rounded p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141414] pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#f97316]" />
              <h2 className="text-sm font-mono font-bold text-[#FFFFFF] tracking-wider uppercase">
                LIVE ORBIT ASSESSMENT
              </h2>
            </div>
            {displayedAssessment ? (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 bg-[#141414] border border-[#222222] text-[#AAAAAA] rounded">
                  {displayedAssessment.assessmentId}
                </span>
                <StatusBadge
                  level={
                    displayedAssessment.status === 'COMPLETED'
                      ? 'AVAILABLE'
                      : displayedAssessment.status === 'PARTIAL'
                      ? 'CONSTRAINED'
                      : 'CRITICAL'
                  }
                  label={displayedAssessment.status}
                  size="sm"
                />
              </div>
            ) : (
              <span className="text-xs font-mono text-[#666666]">NO DATA</span>
            )}
          </div>

          {!displayedAssessment ? (
            <div className="py-12 text-center text-xs font-mono text-[#666666] space-y-2">
              <p>No assessment records found in the database.</p>
              <p className="text-[11px] text-[#444444]">
                Trigger an assessment from the Geopolitical Risk Agent or let n8n detect incoming energy disruptions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Event & Location Title */}
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#f97316]">
                  <span>EVENT DISRUPTION PROFILE</span>
                  <span>·</span>
                  <span>
                    {displayedAssessment.geopolitical?.classification.location ||
                      displayedAssessment.geopolitical?.event.location ||
                      'Global Energy Corridor'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#EDEDED] mt-1 font-mono">
                  {displayedAssessment.geopolitical?.event.title ||
                    displayedAssessment.article?.title ||
                    displayedAssessment.summary}
                </h3>
              </div>

              {/* Grid of Key Assessment Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
                  <div className="text-[10px] text-[#666666] uppercase">Overall Risk</div>
                  <div
                    className={`font-bold mt-0.5 ${
                      displayedAssessment.overallRisk === 'critical' || displayedAssessment.overallRisk === 'high'
                        ? 'text-red-400'
                        : displayedAssessment.overallRisk === 'medium'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {displayedAssessment.overallRisk?.toUpperCase() ?? 'N/A'}
                  </div>
                </div>

                <div className="p-2.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
                  <div className="text-[10px] text-[#666666] uppercase">Disruption Severity</div>
                  <div className="font-bold text-[#EDEDED] mt-0.5">
                    {displayedAssessment.disruption?.severity ??
                      displayedAssessment.geopolitical?.classification.severity ??
                      'N/A'}
                  </div>
                </div>

                <div className="p-2.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
                  <div className="text-[10px] text-[#666666] uppercase">Duration</div>
                  <div className="font-bold text-[#EDEDED] mt-0.5">
                    {displayedAssessment.disruption?.durationDays != null
                      ? `${displayedAssessment.disruption.durationDays} Days`
                      : displayedAssessment.geopolitical?.event.durationDays != null
                      ? `${displayedAssessment.geopolitical.event.durationDays} Days`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-2.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
                  <div className="text-[10px] text-[#666666] uppercase">Capacity Reduction</div>
                  <div className="font-bold text-[#f97316] mt-0.5">
                    {displayedAssessment.disruption?.capacityReductionPercent != null
                      ? `-${displayedAssessment.disruption.capacityReductionPercent}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Geopolitical Assessment Reasoning */}
              <div className="space-y-1.5 text-xs font-mono">
                <span className="text-[11px] text-[#888888] font-semibold uppercase tracking-wider">
                  Geopolitical Analysis:
                </span>
                <p className="text-[#CCCCCC] leading-relaxed bg-[#0a0a0a] p-3 rounded border border-[#1a1a1a]">
                  {displayedAssessment.geopolitical?.risk.reasoning ||
                    displayedAssessment.geopolitical?.classification.classificationReasons.join('; ') ||
                    displayedAssessment.summary}
                </p>
              </div>

              {/* Operational Recommendation Box */}
              {displayedAssessment.recommendation && (
                <div className="p-3 bg-[#f97316]/5 border border-[#f97316]/20 rounded text-xs font-mono space-y-1">
                  <div className="flex items-center gap-1.5 text-[#f97316] font-semibold uppercase tracking-wide text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Recommended Reserve Action</span>
                  </div>
                  <p className="text-[#EDEDED] leading-relaxed">
                    {displayedAssessment.recommendation}
                  </p>
                </div>
              )}

              {/* Metadata Provenance Row */}
              <div className="pt-2 border-t border-[#141414] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#666666]">
                <div className="flex items-center gap-2">
                  <span>Trigger: {displayedAssessment.trigger}</span>
                  {displayedAssessment.monitoredEventId && (
                    <span>· Monitored ID: {displayedAssessment.monitoredEventId}</span>
                  )}
                </div>
                {displayedAssessment.article?.sourceUrl && (
                  <a
                    href={displayedAssessment.article.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#f97316] hover:underline"
                  >
                    <span>Source: {displayedAssessment.article.source || 'Original News'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Network Impact & Reserve Section */}
        <div className="lg:col-span-5 space-y-4">
          {/* 5. NETWORK / IMPACT SECTION */}
          <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141414] pb-2">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-xs font-mono font-bold text-[#FFFFFF] tracking-wider uppercase">
                  NETWORK & DIGITAL TWIN IMPACT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/app/network')}
                className="text-[11px] font-mono text-[#f97316] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Graph</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {digitalTwinImpact ? (
              <div className="space-y-2.5 text-xs font-mono">
                {/* Affected Nodes */}
                <div>
                  <div className="text-[10px] text-[#666666] uppercase mb-1">Affected Nodes / Chokepoints</div>
                  <div className="flex flex-wrap gap-1.5">
                    {affectedNodeNames.map((node) => (
                      <span
                        key={node}
                        className="px-2 py-0.5 bg-[#141414] border border-[#2a2a2a] text-[#10b981] rounded text-[11px]"
                      >
                        {node}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Affected Edges */}
                {affectedEdgeIds.length > 0 && (
                  <div>
                    <div className="text-[10px] text-[#666666] uppercase mb-1">Affected Shipping Corridors</div>
                    <div className="flex flex-wrap gap-1.5">
                      {affectedEdgeIds.map((edge) => (
                        <span
                          key={edge}
                          className="px-2 py-0.5 bg-[#141414] border border-[#2a2a2a] text-[#f97316] rounded text-[10px]"
                        >
                          {edge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flow and Capacity Measurements */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666]">Node Flow Impact</div>
                    <div className="font-bold text-[#EDEDED] mt-0.5">
                      {digitalTwinImpact.affectedFlow?.nodeTotals?.[0]?.value != null
                        ? `${digitalTwinImpact.affectedFlow.nodeTotals[0].value.toLocaleString()} ${
                            digitalTwinImpact.affectedFlow.nodeTotals[0].unit || 't/d'
                          }`
                        : 'Calculated in Twin'}
                    </div>
                  </div>
                  <div className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666]">Edge Flow Impact</div>
                    <div className="font-bold text-[#EDEDED] mt-0.5">
                      {digitalTwinImpact.affectedFlow?.edgeTotals?.[0]?.value != null
                        ? `${digitalTwinImpact.affectedFlow.edgeTotals[0].value.toLocaleString()} ${
                            digitalTwinImpact.affectedFlow.edgeTotals[0].unit || 't/d'
                          }`
                        : 'Corridor rerouting'}
                    </div>
                  </div>
                </div>

                {/* Impact Reasons */}
                {digitalTwinImpact.impactReasons && digitalTwinImpact.impactReasons.length > 0 && (
                  <div className="text-[11px] text-[#888888] bg-[#0a0a0a] p-2 rounded border border-[#141414] leading-relaxed">
                    {digitalTwinImpact.impactReasons.join(' · ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-[#666666]">
                No active network degradation recorded in latest assessment. Corridors nominal.
              </div>
            )}
          </div>

          {/* 6. RESERVE SECTION */}
          <div className="bg-[#060606] border border-[#1a1a1a] rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141414] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="text-xs font-mono font-bold text-[#FFFFFF] tracking-wider uppercase">
                  STRATEGIC RESERVE OPTIMIZATION
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/app/reserves')}
                className="text-[11px] font-mono text-[#f97316] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Reserve Manager</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {latest?.reserve ? (
              <div className="space-y-3 text-xs font-mono">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666] uppercase">Current Reserve</div>
                    <div className="font-bold text-[#EDEDED] mt-0.5 text-sm">
                      {latest.reserve.input?.currentReserve != null
                        ? `${latest.reserve.input.currentReserve.toLocaleString()} tonnes`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666] uppercase">Daily Demand</div>
                    <div className="font-bold text-[#EDEDED] mt-0.5 text-sm">
                      {latest.reserve.input?.demand != null
                        ? `${latest.reserve.input.demand.toLocaleString()} t/d`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666] uppercase">Supply Gap</div>
                    <div className="font-bold text-[#f97316] mt-0.5 text-sm">
                      {latest.reserve.input?.supplyGap != null
                        ? `${latest.reserve.input.supplyGap.toLocaleString()} t/d`
                        : latest.reserve.result?.calculatedSupplyGap != null
                        ? `${latest.reserve.result.calculatedSupplyGap.toLocaleString()} t/d`
                        : latest.reserve.result?.grossSupplyGap != null
                        ? `${latest.reserve.result.grossSupplyGap.toLocaleString()} t/d`
                        : '0 t/d'}
                    </div>
                  </div>

                  <div className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666] uppercase">Min Safety Floor</div>
                    <div className="font-bold text-amber-400 mt-0.5 text-sm">
                      {latest.reserve.input?.minimumReserveThreshold != null
                        ? `${latest.reserve.input.minimumReserveThreshold.toLocaleString()} tonnes`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Drawdown Result Box */}
                <div className="p-3 bg-[#0a0a0a] border border-[#1c1c1c] rounded space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#888888] font-semibold">Recommended Drawdown:</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {(
                        latest.reserve.result?.recommendedReserveDrawdown ??
                        latest.reserve.result?.reserveDrawdownRate ??
                        latest.reserve.result?.drawdownRate ??
                        0
                      ).toLocaleString()}{' '}
                      tonnes/day
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#777777]">
                    <span>Drawdown duration:</span>
                    <span className="text-[#EDEDED]">
                      {latest.reserve.result?.duration ??
                        latest.reserve.input?.disruptionDuration ??
                        'N/A'}{' '}
                      Days
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#777777]">
                    <span>Projected remaining reserve:</span>
                    <span className="text-[#EDEDED]">
                      {latest.reserve.result?.remainingReserve != null
                        ? `${latest.reserve.result.remainingReserve.toLocaleString()} tonnes`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#777777]">
                    <span>Coverage evaluation:</span>
                    <span
                      className={`font-semibold ${
                        latest.reserve.result?.coverageStatus === 'FULLY_COVERED' ||
                        latest.reserve.result?.coverageStatus === 'NO_EFFECTIVE_GAP'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {latest.reserve.result?.coverageStatus ?? 'UNKNOWN'}
                    </span>
                  </div>
                </div>

                {latest.reserve.result?.explanation && (
                  <p className="text-[11px] text-[#888888] leading-relaxed">
                    {latest.reserve.result.explanation}
                  </p>
                )}
              </div>
            ) : overview.reserveState ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#888888]">Current Reserve:</span>
                    <span className="font-bold text-[#EDEDED]">
                      {overview.reserveState.currentReserve != null
                        ? `${overview.reserveState.currentReserve.toLocaleString()} ${overview.reserveState.unit || 'tonnes'}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888888]">Baseline Demand:</span>
                    <span className="text-[#EDEDED]">
                      {overview.reserveState.currentDemand != null
                        ? `${overview.reserveState.currentDemand.toLocaleString()} ${overview.reserveState.unit || 'tonnes'}/day`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888888]">Safety Threshold:</span>
                    <span className="text-amber-400">
                      {overview.reserveState.minimumReserveThreshold != null
                        ? `${overview.reserveState.minimumReserveThreshold.toLocaleString()} ${overview.reserveState.unit || 'tonnes'}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#666666]">
                  Awaiting assessment trigger to calculate disruption-specific drawdown schedules.
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-[#666666]">
                Strategic reserve telemetry not connected.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. RISK / EVENTS SECTION (Real Historical Assessments Table)
         ------------------------------------------------------------- */}
      <section className="bg-[#060606] border border-[#1a1a1a] rounded p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141414] pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#f97316]" />
            <h2 className="text-xs font-mono font-bold text-[#FFFFFF] tracking-wider uppercase">
              ORBIT INTELLIGENCE LEDGER (PERSISTED ASSESSMENTS)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#666666]">
            Showing {overview.recentAssessments.length} persistent evaluations
          </span>
        </div>

        {overview.recentAssessments.length === 0 ? (
          <div className="py-10 text-center text-xs font-mono text-[#666666] space-y-1">
            <p>No recorded assessment events in SQLite database.</p>
            <p className="text-[11px] text-[#444444]">
              Execute an assessment via Geopolitical Risk Agent or POST /api/pipeline/run to view records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-[#666666] text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-2.5">Time (UTC)</th>
                  <th className="py-2 px-2.5">Event / Location</th>
                  <th className="py-2 px-2.5">Risk</th>
                  <th className="py-2 px-2.5">Severity</th>
                  <th className="py-2 px-2.5">Affected Assets</th>
                  <th className="py-2 px-2.5">Coverage</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {overview.recentAssessments.map((a) => {
                  const isSelected = displayedAssessment?.assessmentId === a.assessmentId;
                  const rowNodes =
                    a.geopolitical?.digitalTwinImpact?.affectedNodeNames?.filter(Boolean) ??
                    a.geopolitical?.digitalTwinImpact?.affectedNodeIds ??
                    (a.disruption?.affectedNodeId ? [a.disruption.affectedNodeId] : []);
                  return (
                    <tr
                      key={a.assessmentId}
                      className={`hover:bg-[#0c0c0c] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#121212]' : ''
                      }`}
                      onClick={() => setSelectedAssessmentId(a.assessmentId)}
                    >
                      <td className="py-2 px-2.5 text-[#AAAAAA] whitespace-nowrap">
                        {a.createdAt && !isNaN(new Date(a.createdAt).getTime())
                          ? new Date(a.createdAt).toLocaleString([], {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </td>
                      <td className="py-2 px-2.5 max-w-[260px]">
                        <div className="font-semibold text-[#EDEDED] truncate" title={a.summary}>
                          {a.geopolitical?.event.title || a.article?.title || a.summary}
                        </div>
                        <div className="text-[10px] text-[#666666] truncate">
                          {a.geopolitical?.classification.location ||
                            a.geopolitical?.event.location ||
                            'Global Corridor'}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            a.overallRisk === 'critical' || a.overallRisk === 'high'
                              ? 'text-red-400'
                              : a.overallRisk === 'medium'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {a.overallRisk?.toUpperCase() ?? 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-[#CCCCCC]">
                        {a.disruption?.severity ?? a.geopolitical?.classification.severity ?? 'LOW'}
                      </td>
                      <td className="py-2 px-2.5 max-w-[180px] truncate text-[#888888]">
                        {rowNodes.length > 0 ? rowNodes.join(', ') : 'None reported'}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span
                          className={`text-[11px] ${
                            a.reserve?.result.coverageStatus === 'FULLY_COVERED' ||
                            a.reserve?.result.coverageStatus === 'NO_EFFECTIVE_GAP'
                              ? 'text-emerald-400'
                              : a.reserve?.result.coverageStatus
                              ? 'text-amber-400'
                              : 'text-[#666666]'
                          }`}
                        >
                          {a.reserve?.result.coverageStatus ?? 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <StatusBadge
                          level={
                            a.status === 'COMPLETED'
                              ? 'AVAILABLE'
                              : a.status === 'PARTIAL'
                              ? 'CONSTRAINED'
                              : 'CRITICAL'
                          }
                          label={a.status}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssessmentId(a.assessmentId);
                          }}
                          className={`px-2 py-1 text-[10px] rounded font-mono border transition-colors ${
                            isSelected
                              ? 'bg-[#f97316]/20 border-[#f97316] text-[#f97316]'
                              : 'bg-[#141414] border-[#222222] text-[#888888] hover:text-white'
                          }`}
                        >
                          {isSelected ? 'VIEWING' : 'SELECT'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------
          OPERATIONAL MODULE QUICK ACCESS (Cards)
         ------------------------------------------------------------- */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => onNavigate('/app/network')}
          className="bg-[#060606] border border-[#1a1a1a] hover:border-[#333333] rounded p-3.5 flex flex-col justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-[#10b981]" />
              <span className="font-mono text-xs font-bold text-[#EDEDED]">DIGITAL TWIN NETWORK</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#555555]" />
          </div>
          <p className="text-[11px] font-mono text-[#777777] my-2 leading-relaxed">
            {moduleStatuses.corridor.message}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#555555]">
            <span>Topology & Graph Status</span>
            <span className="text-[#10b981] font-semibold">{moduleStatuses.corridor.status}</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('/app/reserves')}
          className="bg-[#060606] border border-[#1a1a1a] hover:border-[#333333] rounded p-3.5 flex flex-col justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#f59e0b]" />
              <span className="font-mono text-xs font-bold text-[#EDEDED]">STRATEGIC RESERVES</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#555555]" />
          </div>
          <p className="text-[11px] font-mono text-[#777777] my-2 leading-relaxed">
            {moduleStatuses.reserve.message}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#555555]">
            <span>Drawdown Model</span>
            <span className="text-[#f59e0b] font-semibold">{moduleStatuses.reserve.status}</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('/app/assistant')}
          className="bg-[#060606] border border-[#1a1a1a] hover:border-[#333333] rounded p-3.5 flex flex-col justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#f97316]" />
              <span className="font-mono text-xs font-bold text-[#EDEDED]">GEOPOLITICAL AGENT</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#555555]" />
          </div>
          <p className="text-[11px] font-mono text-[#777777] my-2 leading-relaxed">
            {moduleStatuses.assistant.message}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#555555]">
            <span>Inference Engine</span>
            <span className="text-[#f97316] font-semibold">{moduleStatuses.assistant.status}</span>
          </div>
        </div>
      </section>

      {/* Footer System Line */}
      <footer className="text-center py-2 text-[11px] font-mono text-[#444444] border-t border-[#121212]">
        ORBIT Global Energy Supply Chain Intelligence Platform · Real-Time Operations
      </footer>
    </div>
  );
};
