/**
 * ORBIT Unified Assessment Contract (Phase 2 — Intelligence Contract)
 *
 * Composes the EXISTING stage result types (geopolitical agent response,
 * scenario simulation, procurement optimization, strategic reserve
 * optimization) into a single, storable, Command Overview-ready envelope.
 *
 * Composition-only contract: no stage recomputation, no ML, no new data
 * sources. Every result type below is reused from its producing module.
 */

import type { GeopoliticalRiskAgentResponse } from '../geopoliticalEvents/agent';
import type { MonitoringArticle } from '../geopoliticalEvents/monitoring';
import type { GeopoliticalRiskLevel } from '../geopoliticalEvents/risk';
import type { ScenarioResult, ScenarioSeverity } from '../scenarios/model';
import type { ProcurementResult } from '../procurement/model';
import type {
  ProcurementProvenance,
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
} from '../reserves/model';

/** Stable assessment identifier. Follows the `pipeline-<uuid>` / `reserve-optimization-<uuid>` ID conventions. */
export type OrbitAssessmentId = `assessment-${string}`;

export type OrbitAssessmentTrigger = 'monitored_event' | 'manual_request';

/** One ledger entry per executed pipeline stage (`/api/pipeline/run`). */
export type OrbitAssessmentStageKey =
  | 'geopoliticalAnalysis'
  | 'networkImpactResolution'
  | 'scenarioSimulation'
  | 'procurementOptimization'
  | 'reserveOptimization';

export type OrbitAssessmentStageStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type OrbitAssessmentStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface OrbitAssessmentStageRecord {
  stage: OrbitAssessmentStageKey;
  status: OrbitAssessmentStageStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/**
 * Stage-2 output: the Digital Twin impact resolution applied to scenario
 * parameters. `affectedNodeId` is always resolvable — the resolution chain
 * (override -> twin impact -> relevance match -> first supplier/route node ->
 * 'supplier-default') guarantees a node id.
 */
export interface OrbitAssessmentDisruptionParameters {
  affectedNodeId: string;
  severity: ScenarioSeverity;
  durationDays: number;
  capacityReductionPercent: number;
}

export interface OrbitAssessmentProcurementStage {
  resolutionStatus: 'AVAILABLE' | 'UNAVAILABLE';
  source: string;
  reason?: string;
  procurement: ProcurementResult | null;
  /** Cumulative procurement converted to tonnes/day (existing pipeline conversion). */
  alternativeProcuredPerDay?: number;
}

export interface OrbitAssessmentReserveStage {
  input: StrategicReserveOptimizationInput;
  result: StrategicReserveOptimizationResult;
  /** Correlates with `strategic_reserve_optimization_runs.optimization_id`. */
  optimizationId?: string;
  procurementProvenance?: ProcurementProvenance;
}

export interface OrbitAssessment {
  assessmentId: OrbitAssessmentId;
  createdAt: string;
  completedAt?: string;
  trigger: OrbitAssessmentTrigger;
  /** Correlates with the monitored event (`MonitoringArticle.id`). */
  monitoredEventId?: string;
  /** Raw n8n/RSS article provenance when triggered by the monitoring pipeline. */
  article?: MonitoringArticle;
  /** Geopolitical stage result; includes `.event` and `.digitalTwinImpact`. */
  geopolitical?: GeopoliticalRiskAgentResponse;
  disruption?: OrbitAssessmentDisruptionParameters;
  scenario?: ScenarioResult;
  procurement?: OrbitAssessmentProcurementStage;
  reserve?: OrbitAssessmentReserveStage;
  stages: OrbitAssessmentStageRecord[];
  /** Derived from the stage ledger — never a fake success. */
  status: OrbitAssessmentStatus;
  /** Denormalized at write time from `geopolitical.risk.riskLevel`. */
  overallRisk?: GeopoliticalRiskLevel;
  summary: string;
  recommendation?: string;
  errors: string[];
}

export interface OrbitAssessmentResponse {
  status: 'AVAILABLE' | 'ERROR';
  assessment?: OrbitAssessment;
  error?: string;
}