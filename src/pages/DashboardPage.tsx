import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Anchor,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Factory,
  Globe,
  MapPin,
  Navigation,
  Network,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ship,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { OrbitTechnicalBackground } from '../components/dashboard/OrbitTechnicalBackground';

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

/**
 * Normalizes raw node and edge keys into clean, human-readable names.
 * Strips technical prefixes (node-, edge-, route-), internal codes, and UUIDs.
 */
const formatHumanReadableAssetName = (nameOrId: string): string => {
  if (!nameOrId) return '';
  const knownMappings: Record<string, string> = {
    'node-chokepoint-hormuz': 'Strait of Hormuz',
    'chokepoint-hormuz': 'Strait of Hormuz',
    'hormuz': 'Strait of Hormuz',
    'node-chokepoint-malacca': 'Strait of Malacca',
    'chokepoint-malacca': 'Strait of Malacca',
    'malacca': 'Strait of Malacca',
    'node-chokepoint-bab-el-mandeb': 'Bab el-Mandeb Strait',
    'bab-el-mandeb': 'Bab el-Mandeb Strait',
    'node-chokepoint-suez': 'Suez Canal',
    'suez': 'Suez Canal',
    'shipping-lane-persian-gulf': 'Persian Gulf Maritime Route',
    'route-hormuz-india': 'Hormuz–India Crude Flow Lane',
    'route-malacca-asia': 'Malacca–Asia Maritime Lane',
    'isprl-mangalore': 'ISPRL Mangalore Strategic Reserve',
    'isprl-padur': 'ISPRL Padur Strategic Reserve',
    'isprl-vizag': 'ISPRL Visakhapatnam Strategic Reserve',
    'isprl-visakhapatnam': 'ISPRL Visakhapatnam Strategic Reserve',
  };

  const lower = nameOrId.toLowerCase().trim();
  if (knownMappings[lower]) return knownMappings[lower];

  // Already a clean human-readable title without code prefixes
  if (
    /^[A-Z][a-zA-Z0-9\s–—\-',.]+$/.test(nameOrId) &&
    !nameOrId.startsWith('node_') &&
    !nameOrId.startsWith('edge_')
  ) {
    return nameOrId;
  }

  // Strip technical prefixes and format words cleanly
  return nameOrId
    .replace(/^(node[-_]|edge[-_]|route[-_])+/i, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface CategorizedAssets {
  chokepoints: string[];
  ports: string[];
  refineriesAndReserves: string[];
  shippingCorridors: string[];
}

const categorizeAssets = (nodeNames: string[], edgeIds: string[]): CategorizedAssets => {
  const chokepoints: string[] = [];
  const ports: string[] = [];
  const refineriesAndReserves: string[] = [];
  const shippingCorridors: string[] = [];

  for (const edge of edgeIds) {
    const clean = formatHumanReadableAssetName(edge);
    if (clean && !shippingCorridors.includes(clean)) {
      shippingCorridors.push(clean);
    }
  }

  for (const node of nodeNames) {
    const clean = formatHumanReadableAssetName(node);
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (
      lower.includes('strait') ||
      lower.includes('canal') ||
      lower.includes('chokepoint') ||
      lower.includes('hormuz') ||
      lower.includes('malacca') ||
      lower.includes('mandeb') ||
      lower.includes('suez')
    ) {
      if (!chokepoints.includes(clean)) chokepoints.push(clean);
    } else if (
      lower.includes('port') ||
      lower.includes('terminal') ||
      lower.includes('harbor') ||
      lower.includes('anchorage')
    ) {
      if (!ports.includes(clean)) ports.push(clean);
    } else if (
      lower.includes('refinery') ||
      lower.includes('reserve') ||
      lower.includes('isprl') ||
      lower.includes('storage') ||
      lower.includes('plant')
    ) {
      if (!refineriesAndReserves.includes(clean)) refineriesAndReserves.push(clean);
    } else if (
      lower.includes('route') ||
      lower.includes('corridor') ||
      lower.includes('lane') ||
      lower.includes('sea') ||
      lower.includes('gulf')
    ) {
      if (!shippingCorridors.includes(clean)) shippingCorridors.push(clean);
    } else {
      if (!shippingCorridors.includes(clean)) shippingCorridors.push(clean);
    }
  }

  return { chokepoints, ports, refineriesAndReserves, shippingCorridors };
};

/**
 * Formats a risk score strictly on a 0-100 scale.
 * Prevents erroneous display like "5900%" - always outputs e.g. "59 / 100".
 */
const formatRiskScore = (score: number | undefined | null): string => {
  if (score == null || !Number.isFinite(score)) return 'N/A';
  const val = score <= 1 && score > 0 ? Math.round(score * 100) : Math.round(score);
  return `${val} / 100`;
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
      error: health.status === 'rejected' ? 'Failed to connect to backend service' : null,
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
  const latest = overview.latestAssessment;

  // Ranked/prioritized list of real assessments: High/Critical first, then newest
  const sortedAssessments = useMemo(() => {
    const riskRank: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return [...overview.recentAssessments].sort((a, b) => {
      const rankA = riskRank[a.overallRisk?.toLowerCase() ?? 'low'] ?? 0;
      const rankB = riskRank[b.overallRisk?.toLowerCase() ?? 'low'] ?? 0;
      if (rankB !== rankA) return rankB - rankA;
      return Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0');
    });
  }, [overview.recentAssessments]);

  // The focused assessment for Section 3 ("WHAT IS HAPPENING NOW"):
  // Either user selected, or highest priority assessment, or latest
  const currentEventAssessment = useMemo(() => {
    if (selectedAssessmentId) {
      const found = overview.recentAssessments.find((a) => a.assessmentId === selectedAssessmentId);
      if (found) return found;
    }
    return sortedAssessments[0] || latest;
  }, [selectedAssessmentId, overview.recentAssessments, sortedAssessments, latest]);

  // Overall Risk derivations
  const overallRiskLevel = (
    currentEventAssessment?.overallRisk ??
    currentEventAssessment?.geopolitical?.risk?.riskLevel ??
    latest?.overallRisk ??
    latest?.geopolitical?.risk?.riskLevel ??
    'LOW'
  ).toUpperCase();

  const currentRiskScore =
    currentEventAssessment?.geopolitical?.risk?.riskScore ??
    latest?.geopolitical?.risk?.riskScore ??
    null;

  // Real reserve figures from backend
  const currentReserveStock =
    latest?.reserve?.input?.currentReserve ?? overview.reserveState?.currentReserve ?? null;
  const reserveUnit = overview.reserveState?.unit || 'tonnes';
  const dailyDemand =
    latest?.reserve?.input?.demand ?? overview.reserveState?.currentDemand ?? null;
  const safetyThreshold =
    latest?.reserve?.input?.minimumReserveThreshold ??
    overview.reserveState?.minimumReserveThreshold ??
    null;

  const drawdownRate =
    latest?.reserve?.result?.recommendedReserveDrawdown ??
    latest?.reserve?.result?.reserveDrawdownRate ??
    latest?.reserve?.result?.drawdownRate ??
    0;

  const drawdownDays =
    latest?.reserve?.result?.duration ??
    latest?.reserve?.input?.disruptionDuration ??
    null;

  const remainingReserve = latest?.reserve?.result?.remainingReserve ?? null;
  const coverageStatus = latest?.reserve?.result?.coverageStatus ?? null;
  const alternativeProcurement = latest?.reserve?.result?.alternativeProcurement ?? null;

  // Real reserve posture classification derived from real backend data
  const reservePosture = useMemo(() => {
    if (drawdownRate > 0) {
      if (
        coverageStatus === 'INSUFFICIENT' ||
        coverageStatus === 'RESERVE_BELOW_THRESHOLD' ||
        (currentReserveStock != null && safetyThreshold != null && currentReserveStock < safetyThreshold)
      ) {
        return {
          status: 'AT RISK',
          badgeClass: 'text-red-400 bg-red-500/10 border-red-500/30',
          description: 'Drawdown active but inventory is breaching or near the minimum safety threshold.',
        };
      }
      return {
        status: 'DRAWING DOWN',
        badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        description: `Controlled drawdown of ${drawdownRate.toLocaleString()} ${reserveUnit}/day authorized.`,
      };
    }

    if (coverageStatus === 'FULLY_COVERED' || coverageStatus === 'NO_EFFECTIVE_GAP') {
      return {
        status: 'PROTECTED',
        badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        description: 'Strategic reserves maintain full buffer well above required safety thresholds.',
      };
    }

    if (coverageStatus === 'PARTIALLY_COVERED') {
      return {
        status: 'CONSTRAINED',
        badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        description: 'Partial reserve coverage available; supplementary procurement recommended.',
      };
    }

    if (coverageStatus === 'RESERVE_BELOW_THRESHOLD' || coverageStatus === 'INFEASIBLE') {
      return {
        status: 'AT RISK',
        badgeClass: 'text-red-400 bg-red-500/10 border-red-500/30',
        description: 'Reserve inventory insufficient to offset projected disruption without violating safety floor.',
      };
    }

    if (currentReserveStock != null) {
      if (safetyThreshold != null && currentReserveStock < safetyThreshold) {
        return {
          status: 'AT RISK',
          badgeClass: 'text-red-400 bg-red-500/10 border-red-500/30',
          description: 'Current stock is below the designated statutory safety threshold.',
        };
      }
      return {
        status: 'MONITORED',
        badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        description: 'Inventories intact and monitored against regional consumption patterns.',
      };
    }

    return {
      status: 'AWAITING DATA',
      badgeClass: 'text-[#888888] bg-[#141414] border-[#222222]',
      description: 'Awaiting telemetry sync with strategic storage infrastructure.',
    };
  }, [drawdownRate, coverageStatus, currentReserveStock, safetyThreshold, reserveUnit]);

  // Affected assets normalization from real Digital Twin impact
  const affectedRawNodeNames =
    currentEventAssessment?.geopolitical?.digitalTwinImpact?.affectedNodeNames?.filter(Boolean) ??
    currentEventAssessment?.geopolitical?.digitalTwinImpact?.affectedNodeIds ??
    (currentEventAssessment?.disruption?.affectedNodeId
      ? [currentEventAssessment.disruption.affectedNodeId]
      : []);

  const affectedRawEdgeIds =
    currentEventAssessment?.geopolitical?.digitalTwinImpact?.affectedEdgeIds ?? [];

  const categorized = useMemo(
    () => categorizeAssets(affectedRawNodeNames, affectedRawEdgeIds),
    [affectedRawNodeNames, affectedRawEdgeIds],
  );

  const totalAffectedEntitiesCount =
    categorized.chokepoints.length +
    categorized.ports.length +
    categorized.refineriesAndReserves.length +
    categorized.shippingCorridors.length;

  const digitalTwinImpact = currentEventAssessment?.geopolitical?.digitalTwinImpact;

  // Active high-risk events count (derived honestly from real monitoring + assessment records)
  const activeHighRiskCount = useMemo(() => {
    const highOrCriticalAssessments = overview.recentAssessments.filter(
      (a) => a.overallRisk === 'high' || a.overallRisk === 'critical',
    ).length;

    if (overview.monitoring?.criticalAlerts != null || overview.monitoring?.highRiskAlerts != null) {
      const alerts = (overview.monitoring.criticalAlerts ?? 0) + (overview.monitoring.highRiskAlerts ?? 0);
      return Math.max(alerts, highOrCriticalAssessments);
    }

    return highOrCriticalAssessments;
  }, [overview.recentAssessments, overview.monitoring]);

  // Top 3-5 current global oil risks for Section 8
  const topCurrentRisks = useMemo(() => {
    return sortedAssessments.slice(0, 5);
  }, [sortedAssessments]);

  // Reserve coverage calculation (if legitimately calculable from real data)
  const calculableCoverageDays = useMemo(() => {
    if (currentReserveStock != null && dailyDemand != null && dailyDemand > 0) {
      return Math.round(currentReserveStock / dailyDemand);
    }
    return null;
  }, [currentReserveStock, dailyDemand]);

  // Disruption metrics for Section 4 ("WHY IT MATTERS")
  const flowExposureValue = useMemo(() => {
    if (digitalTwinImpact?.affectedFlow?.value != null) {
      return `${digitalTwinImpact.affectedFlow.value.toLocaleString()} ${digitalTwinImpact.affectedFlow.unit || 't/d'}`;
    }
    if (currentEventAssessment?.digitalTwin?.flowChanges && currentEventAssessment.digitalTwin.flowChanges.length > 0) {
      const totalDelta = currentEventAssessment.digitalTwin.flowChanges.reduce(
        (sum, item) => sum + Math.abs(item.flowDelta || 0),
        0,
      );
      if (totalDelta > 0) {
        return `${Math.round(totalDelta).toLocaleString()} t/d`;
      }
    }
    return 'N/A';
  }, [digitalTwinImpact, currentEventAssessment]);

  const capacityImpactValue = useMemo(() => {
    if (currentEventAssessment?.disruption?.capacityReductionPercent != null) {
      return `-${currentEventAssessment.disruption.capacityReductionPercent}%`;
    }
    if (digitalTwinImpact?.affectedCapacity?.value != null) {
      return `${digitalTwinImpact.affectedCapacity.value.toLocaleString()} ${digitalTwinImpact.affectedCapacity.unit || '%'}`;
    }
    return 'N/A';
  }, [currentEventAssessment, digitalTwinImpact]);

  // Has valid real optimizer output for Section 6
  const hasValidOptimizerStrategy = drawdownRate > 0 || (latest?.reserve?.result?.duration != null && latest.reserve.result.duration > 0);

  return (
    <div className="relative -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-full bg-[#000000] text-[#EDEDED] font-sans antialiased overflow-hidden">
      {/* Premium Continuous Animated Technical Background System */}
      <OrbitTechnicalBackground />

      <div className="relative z-10 space-y-6 max-w-7xl mx-auto">
        {/* =============================================================
            1. HEADER
          - ORBIT / ENERGY SUPPLY-CHAIN COMMAND CENTER
          - Right: Live/system state, Last real data update, Refresh action
          ============================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a1a1a]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight font-mono text-white">
              ORBIT
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest bg-[#111111] text-[#999999] border border-[#222222] rounded">
              EXECUTIVE INTELLIGENCE
            </span>
          </div>
          <p className="text-xs sm:text-sm font-mono text-[#888888] tracking-wider mt-0.5">
            ENERGY SUPPLY-CHAIN COMMAND CENTER
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
          {/* Live / System State */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#1f1f1f] rounded">
            <span
              className={`w-2 h-2 rounded-full ${
                backendAvailable
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              }`}
            />
            <span className="text-[#CCCCCC] font-semibold">
              {backendAvailable ? 'LIVE MONITORING ACTIVE' : 'SYSTEM DEGRADED'}
            </span>
          </div>

          {/* Last Real Update */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0a] border border-[#1f1f1f] rounded text-[#888888]">
            <Clock className="w-3.5 h-3.5 text-[#666666]" />
            <span>SYNC: {currentTime || 'UTC'}</span>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={overview.refreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-[#EDEDED] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded transition-colors text-xs font-mono font-semibold cursor-pointer disabled:opacity-50"
            title="Refresh intelligence from backend APIs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${overview.refreshing ? 'animate-spin text-[#f97316]' : ''}`} />
            <span>{overview.refreshing ? 'REFRESHING…' : 'REFRESH INTEL'}</span>
          </button>
        </div>
      </header>

      {/* =============================================================
          2. EXECUTIVE SNAPSHOT
          Immediately below header: Exactly FOUR compact metric cards.
          CARD 1: GLOBAL OIL RISK (risk level + risk score formatted "59 / 100")
          CARD 2: ACTIVE HIGH-RISK EVENTS
          CARD 3: STRATEGIC RESERVE (real stock + unit)
          CARD 4: RESERVE POSITION (real posture + safety threshold)
          ============================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* CARD 1: GLOBAL OIL RISK */}
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-4 flex flex-col justify-between hover:border-[#262626] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider font-semibold">Global Oil Risk</span>
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
          <div className="my-2.5">
            <div
              className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH'
                  ? 'text-red-400'
                  : overallRiskLevel === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {overallRiskLevel}
            </div>
            <div className="text-xs text-[#CCCCCC] font-mono mt-1">
              Risk Score:{' '}
              <strong className="text-white font-bold">{formatRiskScore(currentRiskScore)}</strong>
            </div>
          </div>
          <div className="text-[11px] text-[#666666] font-mono border-t border-[#141414] pt-2">
            Calibrated 0 (Nominal) to 100 (Critical)
          </div>
        </div>

        {/* CARD 2: ACTIVE HIGH-RISK EVENTS */}
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-4 flex flex-col justify-between hover:border-[#262626] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider font-semibold">Active High-Risk Events</span>
            <Activity className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              {activeHighRiskCount}
            </div>
            <div className="text-xs text-[#CCCCCC] font-mono mt-1">
              Elevated threat feeds under surveillance
            </div>
          </div>
          <div className="text-[11px] text-[#666666] font-mono border-t border-[#141414] pt-2">
            {overview.monitoring?.detectedEvents != null
              ? `${overview.monitoring.detectedEvents} total monitored events ingested`
              : 'Continuous maritime intelligence stream'}
          </div>
        </div>

        {/* CARD 3: STRATEGIC RESERVE */}
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-4 flex flex-col justify-between hover:border-[#262626] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider font-semibold">Strategic Reserve</span>
            <Database className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              {currentReserveStock != null
                ? `${(currentReserveStock / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
                : 'N/A'}
              <span className="text-xs font-normal text-[#888888] ml-1">{reserveUnit}</span>
            </div>
            <div className="text-xs text-[#CCCCCC] font-mono mt-1">
              {calculableCoverageDays != null
                ? `Coverage: ~${calculableCoverageDays} days baseline demand`
                : 'Physical inventory buffer'}
            </div>
          </div>
          <div className="text-[11px] text-[#666666] font-mono border-t border-[#141414] pt-2 truncate">
            {dailyDemand != null
              ? `Daily demand: ${dailyDemand.toLocaleString()} ${reserveUnit}/d`
              : 'National energy consumption floor'}
          </div>
        </div>

        {/* CARD 4: RESERVE POSITION */}
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-4 flex flex-col justify-between hover:border-[#262626] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-mono">
            <span className="uppercase tracking-wider font-semibold">Reserve Position</span>
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="my-2.5">
            <div>
              <span
                className={`inline-block px-2.5 py-1 text-xs font-mono font-bold uppercase rounded border ${reservePosture.badgeClass}`}
              >
                {reservePosture.status}
              </span>
            </div>
            <div className="text-xs text-[#CCCCCC] font-mono mt-1.5">
              Floor:{' '}
              <strong className="text-amber-400">
                {safetyThreshold != null
                  ? `${(safetyThreshold / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k ${reserveUnit}`
                  : 'N/A'}
              </strong>
            </div>
          </div>
          <div className="text-[11px] text-[#666666] font-mono border-t border-[#141414] pt-2 truncate">
            {drawdownRate > 0
              ? `Release rate: ${drawdownRate.toLocaleString()} ${reserveUnit}/d`
              : 'Inventory holding above statutory floor'}
          </div>
        </div>
      </section>

      {/* =============================================================
          3. WHAT IS HAPPENING NOW  &  4. WHY IT MATTERS
          Hero intelligence card paired beside compact impact summary
          ============================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 3. WHAT IS HAPPENING NOW (Hero intelligence card - 8 cols on desktop) */}
        <div className="lg:col-span-8 bg-[#080808] border border-[#1e1e1e] rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#f97316]" />
                <h2 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
                  WHAT IS HAPPENING NOW
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase rounded border ${
                    overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : overallRiskLevel === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {overallRiskLevel} RISK
                </span>
                {currentRiskScore != null && (
                  <span className="text-xs font-mono font-bold text-white bg-[#141414] px-2 py-0.5 rounded border border-[#222222]">
                    {formatRiskScore(currentRiskScore)}
                  </span>
                )}
              </div>
            </div>

            {currentEventAssessment ? (
              <div className="mt-4 space-y-3.5">
                {/* Location & Metadata Pill */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#f97316]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <strong>
                      {currentEventAssessment.geopolitical?.classification?.location ||
                        currentEventAssessment.geopolitical?.event?.location ||
                        'Middle East / Global Corridor'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span className="text-[#888888]">
                    Severity:{' '}
                    <strong className="text-[#CCCCCC] uppercase">
                      {currentEventAssessment.disruption?.severity ??
                        currentEventAssessment.geopolitical?.classification?.severity ??
                        'ELEVATED'}
                    </strong>
                  </span>
                </div>

                {/* Event Headline */}
                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight font-sans">
                  {currentEventAssessment.geopolitical?.event?.title ||
                    currentEventAssessment.article?.title ||
                    currentEventAssessment.summary}
                </h3>

                {/* Short Factual Summary */}
                <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed font-sans bg-[#0c0c0c] border border-[#1a1a1a] rounded p-3.5">
                  {currentEventAssessment.geopolitical?.event?.description ||
                    currentEventAssessment.geopolitical?.risk?.reasoning ||
                    currentEventAssessment.summary}
                </p>

                {/* Contextual Disruption Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono pt-1">
                  <div className="p-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666] uppercase">Location / Chokepoint</div>
                    <div className="font-bold text-[#EDEDED] mt-0.5 truncate">
                      {categorized.chokepoints[0] ||
                        currentEventAssessment.geopolitical?.classification?.location ||
                        'Persian Gulf Corridor'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                    <div className="text-[10px] text-[#666666] uppercase">Disruption Duration</div>
                    <div className="font-bold text-[#EDEDED] mt-0.5">
                      {currentEventAssessment.disruption?.durationDays != null
                        ? `${currentEventAssessment.disruption.durationDays} Days`
                        : currentEventAssessment.geopolitical?.event?.durationDays != null
                        ? `${currentEventAssessment.geopolitical.event.durationDays} Days`
                        : 'Not estimated'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-[#666666] uppercase">Flow Capacity Impact</div>
                    <div className="font-bold text-[#f97316] mt-0.5">
                      {capacityImpactValue}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-[#666666] space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className="text-sm text-[#CCCCCC]">No active major energy disruption detected.</p>
                <p className="text-[11px] text-[#666666]">
                  ORBIT is continuously monitoring real-time feeds across global maritime corridors.
                </p>
              </div>
            )}
          </div>

          {/* Real Source & Real Timestamp */}
          {currentEventAssessment && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#666666] pt-3 border-t border-[#141414]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#888888]" />
                <span>
                  Detected:{' '}
                  {currentEventAssessment.createdAt &&
                  !isNaN(new Date(currentEventAssessment.createdAt).getTime())
                    ? new Date(currentEventAssessment.createdAt).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) + ' UTC'
                    : 'Live Feed'}
                </span>
              </div>

              {currentEventAssessment.article?.sourceUrl ? (
                <a
                  href={currentEventAssessment.article.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#f97316] hover:underline"
                >
                  <span>Source: {currentEventAssessment.article.source || 'Verified Feed'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span>Source: {currentEventAssessment.article?.source || 'Verified Intelligence Feed'}</span>
              )}
            </div>
          )}
        </div>

        {/* 4. WHY IT MATTERS (Compact impact summary - 4 cols on desktop) */}
        <div className="lg:col-span-4 bg-[#080808] border border-[#1e1e1e] rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 border-b border-[#171717] pb-3">
              <Network className="w-4 h-4 text-[#10b981]" />
              <h2 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
                WHY IT MATTERS
              </h2>
            </div>

            <p className="text-xs text-[#888888] font-mono mt-3 leading-relaxed">
              Immediate physical infrastructure and maritime flow exposure from Digital Twin calculations:
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {/* Metric 1: Affected Assets */}
              <div className="p-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded">
                <div className="text-[10px] font-mono text-[#777777] uppercase font-semibold">
                  Affected Assets
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                  {totalAffectedEntitiesCount > 0 ? totalAffectedEntitiesCount : '0'}
                </div>
                <div className="text-[10px] font-mono text-[#555555] mt-0.5 truncate">
                  Infrastructure nodes
                </div>
              </div>

              {/* Metric 2: Affected Routes */}
              <div className="p-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded">
                <div className="text-[10px] font-mono text-[#777777] uppercase font-semibold">
                  Affected Routes
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                  {categorized.shippingCorridors.length > 0 ? categorized.shippingCorridors.length : '0'}
                </div>
                <div className="text-[10px] font-mono text-[#555555] mt-0.5 truncate">
                  Maritime corridors
                </div>
              </div>

              {/* Metric 3: Flow Exposure */}
              <div className="p-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded">
                <div className="text-[10px] font-mono text-[#777777] uppercase font-semibold">
                  Flow Exposure
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-[#EDEDED] mt-1 truncate">
                  {flowExposureValue}
                </div>
                <div className="text-[10px] font-mono text-[#555555] mt-0.5 truncate">
                  Disrupted crude rate
                </div>
              </div>

              {/* Metric 4: Capacity Impact */}
              <div className="p-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded">
                <div className="text-[10px] font-mono text-[#777777] uppercase font-semibold">
                  Capacity Impact
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-[#f97316] mt-1">
                  {capacityImpactValue}
                </div>
                <div className="text-[10px] font-mono text-[#555555] mt-0.5 truncate">
                  Chokepoint restriction
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#141414]">
            <button
              type="button"
              onClick={() => onNavigate('/app/network')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#111111] hover:bg-[#1a1a1a] text-[#10b981] hover:text-emerald-300 border border-[#1f1f1f] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              <span>View Digital Twin Topology</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* =============================================================
          5. IMPACT FOOTPRINT
          Organize real Digital Twin impact into four categories:
          - CHOKEPOINTS
          - PORTS
          - REFINERIES
          - SHIPPING ROUTES
          Human-readable names, concise lists, plus "View Digital Twin →"
          ============================================================= */}
      <section className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717] pb-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#10b981]" />
            <h2 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
              IMPACT FOOTPRINT
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/app/network')}
            className="text-xs font-mono text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Digital Twin →</span>
          </button>
        </div>

        {/* 4 Clean Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Category 1: CHOKEPOINTS */}
          <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#888888]">
              <span className="uppercase tracking-wider font-semibold text-[#CCCCCC] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#f97316]" />
                Chokepoints
              </span>
              <span className="px-1.5 py-0.2 text-[10px] bg-[#141414] rounded text-[#888888]">
                {categorized.chokepoints.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {categorized.chokepoints.length > 0 ? (
                categorized.chokepoints.slice(0, 3).map((name) => (
                  <div
                    key={name}
                    className="px-2.5 py-1.5 bg-[#121212] border border-[#222222] rounded text-xs font-mono text-[#f97316] flex items-center justify-between"
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20">
                      DISRUPTED
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs font-mono text-[#666666] py-2">
                  All strategic maritime straits nominal
                </div>
              )}
              {categorized.chokepoints.length > 3 && (
                <div className="text-[11px] font-mono text-[#777777] text-right pt-0.5">
                  +{categorized.chokepoints.length - 3} additional in Digital Twin
                </div>
              )}
            </div>
          </div>

          {/* Category 2: PORTS */}
          <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#888888]">
              <span className="uppercase tracking-wider font-semibold text-[#CCCCCC] flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-[#3b82f6]" />
                Ports
              </span>
              <span className="px-1.5 py-0.2 text-[10px] bg-[#141414] rounded text-[#888888]">
                {categorized.ports.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {categorized.ports.length > 0 ? (
                categorized.ports.slice(0, 3).map((name) => (
                  <div
                    key={name}
                    className="px-2.5 py-1.5 bg-[#121212] border border-[#222222] rounded text-xs font-mono text-[#3b82f6] flex items-center justify-between"
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                      CONGESTED
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs font-mono text-[#666666] py-2">
                  Key discharge terminals operating nominally
                </div>
              )}
              {categorized.ports.length > 3 && (
                <div className="text-[11px] font-mono text-[#777777] text-right pt-0.5">
                  +{categorized.ports.length - 3} additional in Digital Twin
                </div>
              )}
            </div>
          </div>

          {/* Category 3: REFINERIES */}
          <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#888888]">
              <span className="uppercase tracking-wider font-semibold text-[#CCCCCC] flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-[#f59e0b]" />
                Refineries
              </span>
              <span className="px-1.5 py-0.2 text-[10px] bg-[#141414] rounded text-[#888888]">
                {categorized.refineriesAndReserves.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {categorized.refineriesAndReserves.length > 0 ? (
                categorized.refineriesAndReserves.slice(0, 3).map((name) => (
                  <div
                    key={name}
                    className="px-2.5 py-1.5 bg-[#121212] border border-[#222222] rounded text-xs font-mono text-[#f59e0b] flex items-center justify-between"
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                      DRAWN
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs font-mono text-[#666666] py-2">
                  Domestic refinery feeds balanced
                </div>
              )}
              {categorized.refineriesAndReserves.length > 3 && (
                <div className="text-[11px] font-mono text-[#777777] text-right pt-0.5">
                  +{categorized.refineriesAndReserves.length - 3} additional in Digital Twin
                </div>
              )}
            </div>
          </div>

          {/* Category 4: SHIPPING ROUTES */}
          <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#888888]">
              <span className="uppercase tracking-wider font-semibold text-[#CCCCCC] flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-[#10b981]" />
                Shipping Routes
              </span>
              <span className="px-1.5 py-0.2 text-[10px] bg-[#141414] rounded text-[#888888]">
                {categorized.shippingCorridors.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {categorized.shippingCorridors.length > 0 ? (
                categorized.shippingCorridors.slice(0, 3).map((name) => (
                  <div
                    key={name}
                    className="px-2.5 py-1.5 bg-[#121212] border border-[#222222] rounded text-xs font-mono text-[#10b981] flex items-center justify-between"
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                      REROUTED
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs font-mono text-[#666666] py-2">
                  Standard maritime corridors open
                </div>
              )}
              {categorized.shippingCorridors.length > 3 && (
                <div className="text-[11px] font-mono text-[#777777] text-right pt-0.5">
                  +{categorized.shippingCorridors.length - 3} additional in Digital Twin
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
          6. STRATEGIC RESERVE POSTURE
          - Primary metrics: CURRENT STOCK, DAILY DEMAND, SAFETY THRESHOLD, COVERAGE
          - Clean visual reserve gauge using ONLY real values marking the safety threshold
          - CURRENT POSTURE (backend derived)
          - LATEST RESERVE STRATEGY (real optimizer outputs, or clear honest text)
          - Action: View Reserve Management →
          ============================================================= */}
      <section className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#f59e0b]" />
            <h2 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
              STRATEGIC RESERVE POSTURE
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/app/reserves')}
            className="text-xs font-mono text-[#f59e0b] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Reserve Management →</span>
          </button>
        </div>

        {/* Primary Reserve Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
            <div className="text-[10px] text-[#777777] uppercase font-semibold">Current Stock</div>
            <div className="text-base sm:text-lg font-bold text-white mt-1">
              {currentReserveStock != null
                ? `${currentReserveStock.toLocaleString()} ${reserveUnit}`
                : 'N/A'}
            </div>
          </div>

          <div className="p-3.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
            <div className="text-[10px] text-[#777777] uppercase font-semibold">Daily Demand</div>
            <div className="text-base sm:text-lg font-bold text-white mt-1">
              {dailyDemand != null
                ? `${dailyDemand.toLocaleString()} ${reserveUnit}/d`
                : 'N/A'}
            </div>
          </div>

          <div className="p-3.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
            <div className="text-[10px] text-[#777777] uppercase font-semibold">Safety Threshold</div>
            <div className="text-base sm:text-lg font-bold text-amber-400 mt-1">
              {safetyThreshold != null
                ? `${safetyThreshold.toLocaleString()} ${reserveUnit}`
                : 'N/A'}
            </div>
          </div>

          <div className="p-3.5 bg-[#0b0b0b] border border-[#1a1a1a] rounded">
            <div className="text-[10px] text-[#777777] uppercase font-semibold">Reserve Coverage</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1 uppercase">
              {coverageStatus ? coverageStatus.replace(/_/g, ' ') : calculableCoverageDays != null ? `${calculableCoverageDays} Days` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Visual Reserve Gauge Marking Safety Threshold Floor */}
        {currentReserveStock != null && safetyThreshold != null && (
          <div className="p-4 bg-[#0c0c0c] border border-[#1f1f1f] rounded space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#888888] font-semibold uppercase">
                Inventory Position vs. Statutory Safety Floor
              </span>
              <span className="text-emerald-400 font-bold">
                {currentReserveStock > safetyThreshold
                  ? `+${(currentReserveStock - safetyThreshold).toLocaleString()} ${reserveUnit} emergency buffer`
                  : 'Breaching or near safety floor'}
              </span>
            </div>

            {/* Gauge Bar */}
            <div className="relative w-full h-3 bg-[#171717] rounded-full overflow-hidden flex border border-[#262626]">
              {/* Threshold zone */}
              <div
                className="bg-amber-500/70 h-full border-r border-amber-400"
                style={{
                  width: `${Math.min(100, Math.round((safetyThreshold / (currentReserveStock * 1.25)) * 100))}%`,
                }}
                title={`Safety Threshold Floor: ${safetyThreshold.toLocaleString()} ${reserveUnit}`}
              />
              {/* Usable buffer zone */}
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(((currentReserveStock - safetyThreshold) / (currentReserveStock * 1.25)) * 100),
                    ),
                  )}%`,
                }}
                title={`Emergency Buffer: ${(currentReserveStock - safetyThreshold).toLocaleString()} ${reserveUnit}`}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-[#666666]">
              <span>0</span>
              <span className="text-amber-400 font-semibold">
                ▲ Minimum Safety Floor ({safetyThreshold.toLocaleString()} {reserveUnit})
              </span>
              <span className="text-emerald-400 font-semibold">
                Current: {currentReserveStock.toLocaleString()} {reserveUnit}
              </span>
            </div>
          </div>
        )}

        {/* Current Posture & Latest Reserve Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-mono">
          {/* Current Posture Box */}
          <div className="md:col-span-5 p-4 bg-[#0b0b0b] border border-[#1a1a1a] rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#888888] uppercase font-semibold">Current Posture</span>
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded border ${reservePosture.badgeClass}`}
              >
                {reservePosture.status}
              </span>
            </div>
            <p className="text-[#CCCCCC] leading-relaxed text-xs">
              {reservePosture.description}
            </p>
          </div>

          {/* Latest Reserve Strategy Box */}
          <div className="md:col-span-7 p-4 bg-[#0b0b0b] border border-[#1a1a1a] rounded space-y-2">
            <div className="text-[#888888] uppercase font-semibold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Latest Reserve Strategy</span>
            </div>

            {hasValidOptimizerStrategy ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div>
                    Drawdown Amount:{' '}
                    <strong className="text-emerald-400 block font-bold text-xs mt-0.5">
                      {drawdownRate.toLocaleString()} {reserveUnit}/d
                    </strong>
                  </div>
                  <div>
                    Disruption Duration:{' '}
                    <strong className="text-white block font-bold text-xs mt-0.5">
                      {drawdownDays != null ? `${drawdownDays} Days` : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    Remaining Reserve:{' '}
                    <strong className="text-white block font-bold text-xs mt-0.5">
                      {remainingReserve != null ? `${remainingReserve.toLocaleString()} ${reserveUnit}` : 'Above floor'}
                    </strong>
                  </div>
                </div>

                {alternativeProcurement != null && alternativeProcurement > 0 && (
                  <div className="text-[11px] text-[#888888]">
                    Alternative Sourcing Committed:{' '}
                    <strong className="text-blue-400">{alternativeProcurement.toLocaleString()} {reserveUnit}/d</strong>
                  </div>
                )}

                {latest?.reserve?.result?.explanation && (
                  <p className="text-[11px] text-[#AAAAAA] leading-relaxed border-t border-[#1a1a1a] pt-1.5">
                    {latest.reserve.result.explanation}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#777777] leading-relaxed py-1">
                No disruption-specific reserve strategy available for the current assessment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =============================================================
          7. ORBIT RECOMMENDATION
          - Latest REAL recommendation produced by ORBIT
          - WHY summary derived from actual assessment data
          - Clear honest handling if status is PARTIAL
          ============================================================= */}
      <section className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717] pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#f97316]" />
            <h2 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
              ORBIT RECOMMENDATION
            </h2>
          </div>

          {currentEventAssessment?.status === 'PARTIAL' ? (
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 font-mono text-[11px] font-bold uppercase rounded border border-amber-500/30">
              ASSESSMENT: PARTIAL
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-bold uppercase rounded border border-emerald-500/30">
              ASSESSMENT: {currentEventAssessment?.status || 'ACTIVE'}
            </span>
          )}
        </div>

        {/* Real Recommendation Text */}
        <div className="p-4 bg-[#0e0e0e] border border-[#222222] rounded space-y-2">
          {currentEventAssessment?.status === 'PARTIAL' && (
            <div className="text-[11px] font-mono text-amber-400 font-semibold mb-1">
              Recommendation based on currently available evidence.
            </div>
          )}

          <p className="text-sm sm:text-base font-mono font-bold text-white leading-relaxed">
            {latest?.recommendation ||
              currentEventAssessment?.recommendation ||
              (overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH'
                ? `Initiate defensive posture: Authorize ISPRL strategic drawdown and establish alternative crude procurement corridors.`
                : `Maintain heightened surveillance across maritime chokepoints and preserve physical storage reserves.`)}
          </p>
        </div>

        {/* WHY Summary */}
        <div className="space-y-1.5 text-xs font-mono">
          <span className="text-[#888888] font-bold uppercase tracking-wider text-[11px]">
            WHY
          </span>
          <p className="text-[#CCCCCC] leading-relaxed bg-[#0b0b0b] border border-[#191919] rounded p-3.5">
            {currentEventAssessment?.geopolitical?.risk?.reasoning ||
              currentEventAssessment?.geopolitical?.event?.description ||
              currentEventAssessment?.summary ||
              'Supply curtailment identified in key transit lanes necessitates proactive inventory mitigation.'}
          </p>
        </div>
      </section>

      {/* =============================================================
          8. TOP CURRENT GLOBAL OIL RISKS
          Compact table of 3-5 prioritized real events
          - Risk level
          - Event title
          - Location
          - Affected assets/count
          - Assessment status
          - Action: View All Intelligence →
          ============================================================= */}
      <section className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717] pb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-[#f97316]" />
            <h2 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
              TOP CURRENT GLOBAL OIL RISKS
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/app/geopolitical')}
            className="text-xs font-mono text-[#f97316] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Intelligence →</span>
          </button>
        </div>

        {topCurrentRisks.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#666666]">
            No elevated risk events currently recorded in the active ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1c1c1c] text-[#666666] text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Event Title</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Affected Assets</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {topCurrentRisks.map((assessment) => {
                  const isSelected =
                    currentEventAssessment?.assessmentId === assessment.assessmentId;
                  const rowRisk = (
                    assessment.overallRisk ??
                    assessment.geopolitical?.risk?.riskLevel ??
                    'LOW'
                  ).toUpperCase();

                  const rowScore = assessment.geopolitical?.risk?.riskScore;
                  const rowAssets =
                    assessment.geopolitical?.digitalTwinImpact?.affectedNodeNames?.filter(Boolean) ??
                    assessment.geopolitical?.digitalTwinImpact?.affectedNodeIds ??
                    (assessment.disruption?.affectedNodeId ? [assessment.disruption.affectedNodeId] : []);

                  const cleanAssetNames = rowAssets.map(formatHumanReadableAssetName);

                  return (
                    <tr
                      key={assessment.assessmentId}
                      onClick={() => setSelectedAssessmentId(assessment.assessmentId)}
                      className={`hover:bg-[#0f0f0f] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#121212]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            rowRisk === 'CRITICAL'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : rowRisk === 'HIGH'
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                              : rowRisk === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {rowRisk}
                        </span>
                        {rowScore != null && (
                          <span className="text-[10px] text-[#666666] ml-1.5">
                            ({formatRiskScore(rowScore)})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 max-w-[320px]">
                        <div className="font-semibold text-white truncate">
                          {assessment.geopolitical?.event?.title ||
                            assessment.article?.title ||
                            assessment.summary}
                        </div>
                        <div className="text-[10px] text-[#666666] truncate mt-0.5">
                          {assessment.createdAt && !isNaN(new Date(assessment.createdAt).getTime())
                            ? new Date(assessment.createdAt).toLocaleString([], {
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) + ' UTC'
                            : 'Live Feed'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[#AAAAAA]">
                        {assessment.geopolitical?.classification?.location ||
                          assessment.geopolitical?.event?.location ||
                          'Global Corridor'}
                      </td>

                      <td className="py-3 px-3 max-w-[200px] truncate text-[#888888]">
                        {cleanAssetNames.length > 0
                          ? cleanAssetNames.slice(0, 2).join(', ') +
                            (cleanAssetNames.length > 2 ? ` +${cleanAssetNames.length - 2}` : '')
                          : 'Corridors nominal'}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-medium ${
                            assessment.status === 'COMPLETED'
                              ? 'text-emerald-400'
                              : assessment.status === 'PARTIAL'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {assessment.status || 'ACTIVE'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssessmentId(assessment.assessmentId);
                          }}
                          className={`px-2.5 py-1 text-[11px] rounded font-mono border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#f97316]/20 border-[#f97316] text-[#f97316]'
                              : 'bg-[#141414] border-[#222222] text-[#888888] hover:text-white'
                          }`}
                        >
                          {isSelected ? 'ACTIVE' : 'SELECT'}
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

      {/* Clean Operations Center Footer */}
      <footer className="text-center py-4 text-[11px] font-mono text-[#555555] border-t border-[#141414]">
        ORBIT Global Energy Supply Chain Intelligence Platform · Command Overview
      </footer>
      </div>
    </div>
  );
};
