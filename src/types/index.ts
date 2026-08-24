/**
 * ORBIT Platform Type Definitions
 * Phase 1 Foundation
 */

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export type SeverityLevel = 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW' | 'NORMAL';

export type DisruptionType = 
  | 'CHOKEPOINT_BLOCKAGE' 
  | 'INFRASTRUCTURE_OUTAGE' 
  | 'WEATHER_ANOMALY' 
  | 'GEOPOLITICAL_SANCTION' 
  | 'PIPELINE_LEAK' 
  | 'PORT_CONGESTION';

export interface RiskEvent {
  id: string;
  type: DisruptionType;
  title: string;
  location: string;
  region: string;
  severity: SeverityLevel;
  confidence: number; // 0 - 100%
  timestamp: string;
  status: 'ACTIVE_ASSESSMENT' | 'MONITORING' | 'MITIGATING' | 'RESOLVED';
  affectedCommodity: 'CRUDE_OIL' | 'LNG' | 'REFINED_PRODUCTS' | 'NGL';
  estimatedFlowImpact: string;
  description: string;
}

export interface SupplyCorridor {
  id: string;
  name: string;
  origin: string;
  destination: string;
  commodity: string;
  nominalCapacityMbd: number;
  currentFlowMbd: number;
  utilizationPct: number;
  status: 'OPTIMAL' | 'DEGRADED' | 'CONSTRAINED' | 'BLOCKED';
  riskScore: number;
}

export interface DisruptionScenario {
  id: string;
  name: string;
  corridor: string;
  durationDays: number;
  severity: SeverityLevel;
  simulatedLossMbd: number;
  affectedAssets: string[];
  assumptions: string[];
  createdAt: string;
  status: 'DRAFT' | 'SIMULATION_READY' | 'ANALYSIS_COMPLETE';
}

export interface ImpactPrediction {
  id: string;
  scenarioId: string;
  scenarioName: string;
  predictedPriceSurgePct: number;
  deliveryDelayDays: number;
  inventoryDepletionDays: number;
  confidenceScore: number;
  affectedRefineries: number;
  recommendedActionCount: number;
}

export interface ProcurementAction {
  id: string;
  supplier: string;
  sourceRegion: string;
  commodity: string;
  volumeMbd: number;
  estimatedCostPerBbl: number;
  leadTimeDays: number;
  riskMitigationScore: number;
  status: 'IDENTIFIED' | 'UNDER_REVIEW' | 'RECOMMENDED' | 'COMMITTED';
}

export interface StrategicReserve {
  id: string;
  facilityName: string;
  location: string;
  currentStockMb: number;
  maxCapacityMb: number;
  daysOfCover: number;
  drawdownCapacityMbd: number;
  status: 'READY' | 'STANDBY' | 'MAINTENANCE';
}

export interface ActionRecommendation {
  id: string;
  title: string;
  category: 'ROUTE_DIVERSIFICATION' | 'SPOT_PROCUREMENT' | 'STRATEGIC_DRAWDOWN' | 'CONTRACT_SWAP';
  priority: 'P0_IMMEDIATE' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';
  estimatedCostImpactUsd: string;
  leadTimeHours: number;
  confidenceLevel: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_EXECUTION';
  summary: string;
}

export interface SystemHealthStatus {
  status: 'READY' | 'DEGRADED' | 'OFFLINE';
  apiLatencyMs: number;
  lastHeartbeat: string;
  activeNodes: number;
  monitoredCorridors: number;
  serviceVersion: string;
  phase: string;
}

export interface NavigationRoute {
  id: string;
  path: string;
  title: string;
  shortDescription: string;
  iconName: string;
  phaseNumber: number;
  phaseLabel: string;
  badge?: string;
}
