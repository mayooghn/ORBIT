/**
 * ORBIT unified assessment orchestrator (Phase 3).
 *
 * `runOrbitAssessment` is the single reusable orchestration entry point for the
 * locked pipeline: event intake/validation -> geopolitical analysis (existing
 * agent) -> network impact resolution -> scenario simulation (existing engine)
 * -> procurement optimization (existing GLPK flow) -> strategic reserve
 * optimization (existing optimizer) -> unified OrbitAssessment -> persistence.
 *
 * This module CALLS the existing calculation engines and never recreates
 * geopolitical, Digital Twin, scenario, procurement, or reserve mathematics.
 * It contains no HTTP concerns; `server.ts` adapts the outcome to responses.
 */

import { randomUUID } from 'node:crypto';
import type { Phase2Repository } from '../dataLayer/repository';
import type { DigitalTwinRuntime } from '../digitalTwin/runtime';
import {
  analyzeGeopoliticalEventDeterministically,
  type GeopoliticalRiskAgent,
  type GeopoliticalRiskAgentResponse,
} from '../geopoliticalEvents/agent';
import type { GeopoliticalMonitoringService, MonitoringArticle } from '../geopoliticalEvents/monitoring';
import type { ScenarioInput, ScenarioResult } from '../scenarios/model';
import type { ScenarioEngine } from '../scenarios/scenario-engine';
import {
  buildProcurementRequestFromScenario,
  optimizeProcurement,
  type ScenarioProcurementDataProvider,
} from '../procurement';
import type { ProcurementResult } from '../procurement/model';
import {
  optimizeStrategicReserve,
  type RealAlternativeProcurementState,
  type RealAlternativeSupplier,
  type StrategicReserveOptimizationInput,
  type StrategicReserveOptimizationResult,
} from '../reserves';
import type {
  OrbitAssessment,
  OrbitAssessmentDisruptionParameters,
  OrbitAssessmentId,
  OrbitAssessmentProcurementStage,
  OrbitAssessmentReserveStage,
  OrbitAssessmentStageKey,
  OrbitAssessmentStageRecord,
  OrbitAssessmentStatus,
  OrbitAssessmentTrigger,
} from '../types/orbitAssessment';

/** Request shape accepted by the orchestrator (mirrors the `/api/pipeline/run` body). */
export interface OrbitAssessmentInput {
  text?: string;
  request?: string;
  /** Structured event; validated by the deterministic geopolitical ingestion path. */
  event?: unknown;
  monitoredEventId?: string;
  affectedNodeId?: string;
  durationDays?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  capacityReductionPercent?: number;
  alternativeProcurement?: number;
  currentReserve?: number;
  demand?: number;
  replenishmentRate?: number;
  minimumReserveThreshold?: number;
  dataSource?: 'sqlite' | 'demo';
}

/** Injected dependencies — every calculation engine stays owned by its module. */
export interface OrbitAssessmentContext {
  repository: Phase2Repository;
  digitalTwin: DigitalTwinRuntime;
  geopoliticalRiskAgent: GeopoliticalRiskAgent;
  monitoring?: GeopoliticalMonitoringService;
  scenarioEngine: ScenarioEngine;
  procurementDataProvider: ScenarioProcurementDataProvider;
  demoProcurementDataProvider: ScenarioProcurementDataProvider;
}

/** Thrown when the caller supplied neither `text`/`request` nor a structured `event`. */
export class OrbitAssessmentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrbitAssessmentInputError';
  }
}

/** Legacy `/api/pipeline/run` payload shape, preserved for backward compatibility. */
export interface OrbitAssessmentLegacyPipeline {
  pipelineId: string;
  completedAt: string;
  stages: {
    geopoliticalAnalysis: GeopoliticalRiskAgentResponse;
    scenarioSimulation: ScenarioResult;
    procurementAlternatives: {
      resolutionStatus: string;
      source: string;
      commercialCostStatus: string;
      isCommercialCostAvailable: boolean;
      availableAlternativeDailyTonnes: number;
      alternativeSuppliersCount: number;
      topAlternativeSuppliers: RealAlternativeSupplier[];
      procurement: ProcurementResult | null;
    };
    reserveOptimization: {
      optimizationId?: string;
      input: StrategicReserveOptimizationInput;
      result: StrategicReserveOptimizationResult;
    };
  };
}

export interface OrbitAssessmentOutcome {
  assessment: OrbitAssessment;
  /** Present only when every stage COMPLETED (backward compatibility). */
  legacyPipeline?: OrbitAssessmentLegacyPipeline;
  /** True when the geopolitical stage failed — legacy HTTP 500 contract. */
  startFailed: boolean;
  firstError?: string;
}

interface AssessmentSummaryInputs {
  status: OrbitAssessmentStatus;
  geopolitical?: GeopoliticalRiskAgentResponse;
  disruption?: OrbitAssessmentDisruptionParameters;
  scenario?: ScenarioResult;
  procurement?: OrbitAssessmentProcurementStage;
  reserve?: OrbitAssessmentReserveStage;
}

/** Deterministic cross-stage summary text for the unified assessment. */
const buildAssessmentSummary = (input: AssessmentSummaryInputs): string => {
  const parts: string[] = [];

  if (input.geopolitical) {
    parts.push(`Event "${input.geopolitical.event.title}".`);
    parts.push(`Risk ${input.geopolitical.risk.riskLevel.toUpperCase()} (${input.geopolitical.risk.riskScore}/100).`);
  }
  if (input.disruption) {
    parts.push(`Modeled as a ${input.disruption.severity} disruption at ${input.disruption.affectedNodeId} for ${input.disruption.durationDays} day(s) at ${input.disruption.capacityReductionPercent}% capacity reduction.`);
  }
  if (input.scenario) {
    parts.push(`Modeled supply gap ${input.scenario.shortage.toLocaleString()} ${input.scenario.shortageUnit}.`);
  }
  if (input.procurement) {
    if (input.procurement.resolutionStatus === 'UNAVAILABLE') {
      parts.push('No real procurement alternatives were available for the affected node.');
    } else if (input.procurement.procurement?.status === 'OPTIMAL') {
      parts.push(`Procurement plan covers ${input.procurement.procurement.totalProcured.toLocaleString()} ${input.procurement.procurement.totalProcuredUnit}.`);
    } else if (input.procurement.procurement) {
      parts.push(`Procurement optimization returned ${input.procurement.procurement.status}.`);
    }
  }
  if (input.reserve) {
    parts.push(`Reserve coverage ${input.reserve.result.coverageStatus}; recommended drawdown ${input.reserve.result.recommendedReserveDrawdown.toLocaleString()}.`);
  }

  if (parts.length === 0) {
    return `Assessment could not be completed (${input.status}).`;
  }

  parts.push(`Assessment ${input.status}.`);
  return parts.join(' ');
};

/** Rule-based recommendation (no ML) derived from the existing stage results. */
const buildAssessmentRecommendation = (input: {
  geopolitical?: GeopoliticalRiskAgentResponse;
  procurement?: OrbitAssessmentProcurementStage;
  reserve?: OrbitAssessmentReserveStage;
}): string | undefined => {
  if (input.reserve) {
    if (input.reserve.result.coverageStatus === 'INFEASIBLE') {
      return 'Reserve coverage is infeasible for this disruption: secure additional alternative procurement or external supply before the shortfall window.';
    }
    if (
      input.reserve.result.coverageStatus === 'PARTIALLY_COVERED' ||
      input.reserve.result.coverageStatus === 'RESERVE_BELOW_THRESHOLD'
    ) {
      return 'Reserve coverage is constrained: schedule replenishment and monitor the minimum reserve threshold during the disruption window.';
    }
  }

  if (input.procurement?.resolutionStatus === 'UNAVAILABLE') {
    return 'Procurement data was unavailable for the affected node: validate supplier import coverage before relying on the reserve drawdown plan.';
  }

  if (input.reserve && input.procurement?.procurement?.status === 'OPTIMAL') {
    return 'Execute the optimized procurement plan and track the recovery timeline; the reserve drawdown stays within the safety constraint.';
  }

  if (input.geopolitical && (input.geopolitical.risk.riskLevel === 'low' || input.geopolitical.risk.riskLevel === 'medium')) {
    return 'No immediate intervention required: continue monitoring for follow-up events.';
  }

  return undefined;
};

/**
 * Runs the full ORBIT assessment pipeline for one event and returns the unified,
 * persisted assessment. Deterministic per-stage ledger: a failed stage marks all
 * downstream stages SKIPPED and the assessment status PARTIAL/FAILED — never a
 * fake success.
 */
export const runOrbitAssessment = async (
  input: OrbitAssessmentInput,
  context: OrbitAssessmentContext,
): Promise<OrbitAssessmentOutcome> => {
  const eventText = typeof input?.text === 'string' && input.text.trim()
    ? input.text.trim()
    : typeof input?.request === 'string' && input.request.trim()
      ? input.request.trim()
      : null;

  if (!eventText && !input?.event) {
    throw new OrbitAssessmentInputError('Either "text" or "event" is required to execute the pipeline.');
  }

  // ------------------------------------------------------------
  // OrbitAssessment scaffolding: per-stage ledger + provenance
  // ------------------------------------------------------------
  const assessmentId: OrbitAssessmentId = `assessment-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const stages: OrbitAssessmentStageRecord[] = [];
  const errors: string[] = [];

  const monitoredEventId =
    typeof input?.monitoredEventId === 'string' && input.monitoredEventId.trim()
      ? input.monitoredEventId.trim()
      : undefined;
  let trigger: OrbitAssessmentTrigger = 'manual_request';
  let monitoredArticle: MonitoringArticle | undefined;

  if (monitoredEventId) {
    trigger = 'monitored_event';
    if (context.monitoring) {
      try {
        const candidate = context.monitoring
          .getEvents(200)
          .find((event) => event.article.id === monitoredEventId);
        if (candidate) {
          monitoredArticle = candidate.article;
        } else {
          errors.push(`provenance: monitoredEventId "${monitoredEventId}" was not found in the monitoring store; trigger set to monitored_event (best-effort).`);
        }
      } catch {
        errors.push('provenance: monitored-event lookup failed; trigger set to monitored_event (best-effort).');
      }
    }
  }

  const markStage = (stage: OrbitAssessmentStageKey, startedAt: string, error?: unknown): void => {
    if (error !== undefined) {
      const message = error instanceof Error ? error.message : String(error);
      stages.push({ stage, status: 'FAILED', startedAt, completedAt: new Date().toISOString(), error: message });
      errors.push(`${stage}: ${message}`);
      return;
    }
    stages.push({ stage, status: 'COMPLETED', startedAt, completedAt: new Date().toISOString() });
  };

  const skipStage = (stage: OrbitAssessmentStageKey, reason: string): void => {
    stages.push({ stage, status: 'SKIPPED', error: reason });
    errors.push(`${stage}: ${reason}`);
  };

  let geopolitical: GeopoliticalRiskAgentResponse | undefined;
  let disruption: OrbitAssessmentDisruptionParameters | undefined;
  let scenario: ScenarioResult | undefined;
  let procurementStage: OrbitAssessmentProcurementStage | undefined;
  let reserveStage: OrbitAssessmentReserveStage | undefined;
  let realProcurementState: RealAlternativeProcurementState | undefined;

  // Step 1: Geopolitical Event & Risk Analysis
  const step1StartedAt = new Date().toISOString();
  try {
    geopolitical = eventText
      ? await context.geopoliticalRiskAgent.analyze(eventText)
      : analyzeGeopoliticalEventDeterministically(
          (input?.event as { title?: string })?.title || 'Pipeline Event',
          input?.event,
          context.digitalTwin,
        );
    markStage('geopoliticalAnalysis', step1StartedAt);
  } catch (error) {
    markStage('geopoliticalAnalysis', step1StartedAt, error);
  }

  // Step 2: Supply-Chain Impact Identification
  if (geopolitical) {
    const step2StartedAt = new Date().toISOString();
    try {
      const graph = context.digitalTwin.stateEngine.getCurrentTwin();
      const affectedNodeId =
        typeof input?.affectedNodeId === 'string' && input.affectedNodeId.trim()
          ? input.affectedNodeId.trim()
          : geopolitical.digitalTwinImpact.affectedNodeIds[0] ||
            geopolitical.relevance.matchedNodeIds[0] ||
            graph.nodes.find((n) => n.nodeType === 'supplier' || n.nodeType === 'shipping_route')?.nodeId ||
            'supplier-default';

      const severity = (
        input?.severity === 'LOW' || input?.severity === 'MEDIUM' || input?.severity === 'HIGH' || input?.severity === 'CRITICAL'
          ? input.severity
          : geopolitical.risk.riskLevel === 'critical'
            ? 'CRITICAL'
            : geopolitical.risk.riskLevel === 'high'
              ? 'HIGH'
              : geopolitical.risk.riskLevel === 'medium'
                ? 'MEDIUM'
                : 'LOW'
      ) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

      const durationDays = typeof input?.durationDays === 'number' && input.durationDays > 0
        ? input.durationDays
        : severity === 'CRITICAL' ? 60 : severity === 'HIGH' ? 30 : severity === 'MEDIUM' ? 14 : 7;

      const defaultReduction = severity === 'CRITICAL' ? 80 : severity === 'HIGH' ? 50 : severity === 'MEDIUM' ? 30 : 15;
      const capacityReductionPercent = typeof input?.capacityReductionPercent === 'number'
        ? Math.min(100, Math.max(0, input.capacityReductionPercent))
        : defaultReduction;

      disruption = { affectedNodeId, severity, durationDays, capacityReductionPercent };
      markStage('networkImpactResolution', step2StartedAt);
    } catch (error) {
      markStage('networkImpactResolution', step2StartedAt, error);
    }
  } else {
    skipStage('networkImpactResolution', 'Skipped because geopolitical analysis failed.');
  }

  // Step 3: Scenario Simulation (Supply Gap)
  if (geopolitical && disruption) {
    const step3StartedAt = new Date().toISOString();
    try {
      const scenarioInput: ScenarioInput = {
        eventId: geopolitical.event.id || 'pipeline-event-1',
        durationDays: disruption.durationDays,
        severity: disruption.severity,
        affectedNodeId: disruption.affectedNodeId,
        capacityReductionPercent: disruption.capacityReductionPercent,
      };

      scenario = context.scenarioEngine.run(context.digitalTwin.stateEngine, scenarioInput);
      markStage('scenarioSimulation', step3StartedAt);
    } catch (error) {
      markStage('scenarioSimulation', step3StartedAt, error);
    }
  } else {
    skipStage('scenarioSimulation', 'Skipped because the disruption parameters were unavailable.');
  }

  // Step 4: Real Procurement Alternatives from SQLite Data Layer
  if (scenario && disruption) {
    const step4StartedAt = new Date().toISOString();
    try {
      realProcurementState = context.repository.getRealAlternativeProcurement({
        excludedCountry: disruption.affectedNodeId,
      });

      const resolution = buildProcurementRequestFromScenario(
        scenario,
        context.digitalTwin.stateEngine.getCurrentTwin(),
        input?.dataSource === 'demo' ? context.demoProcurementDataProvider : context.procurementDataProvider,
      );

      let procurementResult: ProcurementResult | null = null;
      let alternativeProcured = 0;

      if (typeof input?.alternativeProcurement === 'number') {
        // Preserve manually supplied alternativeProcurement overrides exactly as they are
        alternativeProcured = Math.max(0, input.alternativeProcurement);
        if (resolution.status === 'AVAILABLE' && resolution.request) {
          procurementResult = await optimizeProcurement(resolution.request);
        }
      } else if (resolution.status === 'AVAILABLE' && resolution.request) {
        procurementResult = await optimizeProcurement(resolution.request);
        if (procurementResult.status === 'OPTIMAL') {
          // Convert procurementResult.totalProcured from cumulative tonnes to tonnes/day
          // Only perform this conversion for the automatically generated procurement result
          alternativeProcured = disruption.durationDays > 0
            ? procurementResult.totalProcured / disruption.durationDays
            : procurementResult.totalProcured;
        }
      } else {
        alternativeProcured = 0;
      }

      procurementStage = {
        resolutionStatus: resolution.status,
        source: resolution.source,
        ...(resolution.reason ? { reason: resolution.reason } : {}),
        procurement: procurementResult,
        alternativeProcuredPerDay: alternativeProcured,
      };
      markStage('procurementOptimization', step4StartedAt);
    } catch (error) {
      markStage('procurementOptimization', step4StartedAt, error);
    }
  } else {
    skipStage('procurementOptimization', 'Skipped because the scenario simulation result was unavailable.');
  }

  // Step 5: Strategic Reserve Optimization
  if (scenario && disruption) {
    const step5StartedAt = new Date().toISOString();
    try {
      const reserveState = context.repository.getCurrentStrategicReserveState();
      const reserveInput: StrategicReserveOptimizationInput = {
        currentReserve: typeof input?.currentReserve === 'number' ? input.currentReserve : reserveState.currentReserve,
        demand: typeof input?.demand === 'number' ? input.demand : reserveState.currentDemand,
        supplyGap: scenario.shortage,
        disruptionDuration: disruption.durationDays,
        alternativeProcurement: procurementStage?.alternativeProcuredPerDay ?? 0,
        replenishmentRate: typeof input?.replenishmentRate === 'number' ? input.replenishmentRate : reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: typeof input?.minimumReserveThreshold === 'number' ? input.minimumReserveThreshold : reserveState.minimumReserveThreshold,
      };

      const reserveOptimization = optimizeStrategicReserve(reserveInput);
      const optimizationId = context.repository.saveStrategicReserveOptimization(
        reserveInput,
        reserveOptimization,
      );

      reserveStage = { input: reserveInput, result: reserveOptimization, optimizationId };
      markStage('reserveOptimization', step5StartedAt);
    } catch (error) {
      markStage('reserveOptimization', step5StartedAt, error);
    }
  } else {
    skipStage('reserveOptimization', 'Skipped because the disruption parameters or scenario result were unavailable.');
  }

  // Aggregate: derive the unified status from the stage ledger (never a fake success).
  const completedCount = stages.filter((stage) => stage.status === 'COMPLETED').length;
  const status: OrbitAssessmentStatus =
    completedCount === stages.length ? 'COMPLETED' : completedCount === 0 ? 'FAILED' : 'PARTIAL';

  const assessment: OrbitAssessment = {
    assessmentId,
    createdAt,
    completedAt: new Date().toISOString(),
    trigger,
    ...(monitoredEventId ? { monitoredEventId } : {}),
    ...(monitoredArticle ? { article: monitoredArticle } : {}),
    ...(geopolitical ? { geopolitical } : {}),
    ...(disruption ? { disruption } : {}),
    ...(scenario ? { scenario } : {}),
    ...(procurementStage ? { procurement: procurementStage } : {}),
    ...(reserveStage ? { reserve: reserveStage } : {}),
    stages,
    status,
    ...(geopolitical ? { overallRisk: geopolitical.risk.riskLevel } : {}),
    summary: buildAssessmentSummary({
      status,
      geopolitical,
      disruption,
      scenario,
      procurement: procurementStage,
      reserve: reserveStage,
    }),
    recommendation: buildAssessmentRecommendation({
      geopolitical,
      procurement: procurementStage,
      reserve: reserveStage,
    }),
    errors,
  };

  // Persist/publish: storage is best-effort — a failure must not invalidate a valid assessment.
  try {
    context.repository.saveOrbitAssessment(assessment);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`persistence: ${message}`);
    assessment.errors = errors;
  }

  if (!geopolitical) {
    return { assessment, startFailed: true, firstError: errors[0] || 'Pipeline execution failed.' };
  }

  return {
    assessment,
    startFailed: false,
    ...(status === 'COMPLETED' && procurementStage && reserveStage && realProcurementState
      ? {
          legacyPipeline: {
            pipelineId: `pipeline-${randomUUID()}`,
            completedAt: new Date().toISOString(),
            stages: {
              geopoliticalAnalysis: geopolitical,
              scenarioSimulation: scenario,
              procurementAlternatives: {
                resolutionStatus: procurementStage.resolutionStatus,
                source: 'Phase 2 SQLite (supplier_imports table)',
                commercialCostStatus: 'Commercial lane-cost data unavailable',
                isCommercialCostAvailable: false,
                availableAlternativeDailyTonnes: realProcurementState.availableAlternativeDailyTonnes,
                alternativeSuppliersCount: realProcurementState.supplierCount,
                topAlternativeSuppliers: realProcurementState.suppliers.slice(0, 5),
                procurement: procurementStage.procurement,
              },
              reserveOptimization: {
                optimizationId: reserveStage.optimizationId,
                input: reserveStage.input,
                result: reserveStage.result,
              },
            },
          },
        }
      : {}),
  };
};