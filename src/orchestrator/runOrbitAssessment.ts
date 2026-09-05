/**
 * ORBIT unified assessment orchestrator.
 *
 * `runOrbitAssessment` is the single reusable orchestration entry point for the
 * architecture: event intake/validation -> existing geopolitical analysis ->
 * existing geopolitical -> Digital Twin integration -> existing Strategic Reserve
 * state retrieval -> existing optimizeStrategicReserve() -> unified OrbitAssessment ->
 * persistence.
 *
 * This module CALLS the existing calculation engines and never recreates
 * geopolitical, Digital Twin, or reserve mathematics.
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
import {
  integrateGeopoliticalRiskWithDigitalTwin,
  type GeopoliticalRiskDigitalTwinIntegration,
} from '../geopoliticalEvents/digitalTwinIntegration';
import type { GeopoliticalMonitoringService, MonitoringArticle } from '../geopoliticalEvents/monitoring';
import {
  optimizeStrategicReserve,
  type StrategicReserveOptimizationInput,
  type StrategicReserveOptimizationResult,
} from '../reserves';
import type {
  OrbitAssessment,
  OrbitAssessmentDisruptionParameters,
  OrbitAssessmentId,
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
  supplyGap?: number;
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
  [key: string]: unknown;
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
    const durText = input.disruption.durationDays > 0 ? ` for ${input.disruption.durationDays} day(s)` : '';
    parts.push(`Modeled as a ${input.disruption.severity} disruption at ${input.disruption.affectedNodeId}${durText} at ${input.disruption.capacityReductionPercent}% capacity reduction.`);
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

/** Rule-based recommendation derived from the existing stage results. */
const buildAssessmentRecommendation = (input: {
  geopolitical?: GeopoliticalRiskAgentResponse;
  reserve?: OrbitAssessmentReserveStage;
}): string | undefined => {
  if (input.reserve) {
    if (input.reserve.result.coverageStatus === 'INFEASIBLE') {
      return 'Reserve coverage is infeasible for this disruption: secure additional external supply before the shortfall window.';
    }
    if (
      input.reserve.result.coverageStatus === 'PARTIALLY_COVERED' ||
      input.reserve.result.coverageStatus === 'RESERVE_BELOW_THRESHOLD'
    ) {
      return 'Reserve coverage is constrained: schedule replenishment and monitor the minimum reserve threshold during the disruption window.';
    }
    if (input.reserve.result.coverageStatus === 'FULLY_COVERED') {
      return 'Reserve coverage is sufficient: execute the recommended reserve drawdown within the safety constraint.';
    }
    if (input.reserve.result.coverageStatus === 'NO_EFFECTIVE_GAP') {
      return 'No effective supply gap detected: strategic reserves remain intact without requiring drawdown.';
    }
  }

  if (input.geopolitical && (input.geopolitical.risk.riskLevel === 'low' || input.geopolitical.risk.riskLevel === 'medium')) {
    return 'No immediate intervention required: continue monitoring for follow-up events.';
  }

  return 'Maintain standard reserve monitoring: review operational posture as conditions develop.';
};

/**
 * Derives a numeric supply gap from Digital Twin affected-flow measurements.
 * Returns a number, NOT the raw affectedFlow object.
 */
const deriveNumericSupplyGap = (impact?: GeopoliticalRiskDigitalTwinIntegration): number => {
  if (!impact?.affectedFlow) return 0;
  const nodeTotal = (impact.affectedFlow.nodeTotals || []).reduce(
    (acc, m) => acc + (typeof m?.value === 'number' && Number.isFinite(m.value) ? m.value : 0),
    0,
  );
  if (nodeTotal > 0) return nodeTotal;

  const edgeTotal = (impact.affectedFlow.edgeTotals || []).reduce(
    (acc, m) => acc + (typeof m?.value === 'number' && Number.isFinite(m.value) ? m.value : 0),
    0,
  );
  if (edgeTotal > 0) return edgeTotal;

  return 0;
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
  let digitalTwinImpact: GeopoliticalRiskDigitalTwinIntegration | undefined;
  let disruption: OrbitAssessmentDisruptionParameters | undefined;
  let reserveStage: OrbitAssessmentReserveStage | undefined;

  // Disruption duration: comes strictly from event.durationDays (or input durationDays)
  const rawDuration =
    (input?.event as { durationDays?: unknown })?.durationDays ??
    input?.durationDays ??
    (geopolitical?.event as { durationDays?: unknown })?.durationDays;

  const durationDays =
    typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0
      ? Math.floor(rawDuration)
      : undefined;

  // Step 1: Geopolitical Event & Risk Analysis (Existing GeopoliticalRiskAgent analysis)
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

  // Step 2: Geopolitical -> Digital Twin Integration (Existing digital twin integration)
  if (geopolitical) {
    const step2StartedAt = new Date().toISOString();
    try {
      digitalTwinImpact = geopolitical.digitalTwinImpact ?? integrateGeopoliticalRiskWithDigitalTwin(
        geopolitical.classification,
        geopolitical.relevance,
        geopolitical.risk,
        context.digitalTwin,
      );

      const graph = context.digitalTwin.stateEngine.getCurrentTwin();
      const affectedNodeId =
        typeof input?.affectedNodeId === 'string' && input.affectedNodeId.trim()
          ? input.affectedNodeId.trim()
          : digitalTwinImpact.affectedNodeIds[0] ||
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

      const defaultReduction = severity === 'CRITICAL' ? 80 : severity === 'HIGH' ? 50 : severity === 'MEDIUM' ? 30 : 15;
      const capacityReductionPercent = typeof input?.capacityReductionPercent === 'number'
        ? Math.min(100, Math.max(0, input.capacityReductionPercent))
        : defaultReduction;

      disruption = {
        affectedNodeId,
        severity,
        durationDays: durationDays ?? 0,
        capacityReductionPercent,
      };

      markStage('networkImpactResolution', step2StartedAt);
    } catch (error) {
      markStage('networkImpactResolution', step2StartedAt, error);
    }
  } else {
    skipStage('networkImpactResolution', 'Skipped because geopolitical analysis failed.');
  }

  // Step 3: Strategic Reserve Optimization
  if (geopolitical && disruption) {
    const step3StartedAt = new Date().toISOString();
    try {
      // 4. Existing Strategic Reserve state retrieval
      const reserveState = context.repository.getCurrentStrategicReserveState();

      // Check duration: NEVER invent duration defaults such as 30 or 60 days.
      // If durationDays is missing/invalid, preserve honest partial-failure behavior.
      if (durationDays === undefined) {
        throw new Error(
          'Disruption duration (event.durationDays) is missing or invalid; reserve optimization cannot be performed without an explicit duration.',
        );
      }

      // supplyGap = NUMERIC value derived from Digital Twin affected-flow measurements, NOT raw object
      const derivedGap = deriveNumericSupplyGap(digitalTwinImpact);
      const supplyGap = derivedGap > 0
        ? derivedGap
        : (typeof input?.supplyGap === 'number' && Number.isFinite(input.supplyGap) && input.supplyGap >= 0
          ? input.supplyGap
          : 0);

      // Reserve inputs MUST be:
      // currentReserve = StrategicReserveState.currentReserve
      // demand = StrategicReserveState.currentDemand
      // replenishmentRate = StrategicReserveState.defaultReplenishmentRate
      // minimumReserveThreshold = StrategicReserveState.minimumReserveThreshold
      // disruptionDuration = event.durationDays ONLY
      // alternativeProcurement = 0
      // supplyGap = NUMERIC value derived from Digital Twin affected-flow measurements
      const reserveInput: StrategicReserveOptimizationInput = {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap,
        availableSupply: Math.max(0, reserveState.currentDemand - supplyGap),
        disruptionDuration: durationDays,
        alternativeProcurement: 0,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      };

      // 5. Existing optimizeStrategicReserve()
      const reserveOptimization = optimizeStrategicReserve(reserveInput);
      const optimizationId = context.repository.saveStrategicReserveOptimization(
        reserveInput,
        reserveOptimization,
      );

      reserveStage = { input: reserveInput, result: reserveOptimization, optimizationId };
      markStage('reserveOptimization', step3StartedAt);
    } catch (error) {
      markStage('reserveOptimization', step3StartedAt, error);
    }
  } else {
    skipStage('reserveOptimization', 'Skipped because upstream analysis was unavailable.');
  }

  // Step 6: Unified OrbitAssessment creation
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
    ...(reserveStage ? { reserve: reserveStage } : {}),
    stages,
    status,
    ...(geopolitical ? { overallRisk: geopolitical.risk.riskLevel } : {}),
    summary: buildAssessmentSummary({
      status,
      geopolitical,
      disruption,
      reserve: reserveStage,
    }),
    recommendation: buildAssessmentRecommendation({
      geopolitical,
      reserve: reserveStage,
    }),
    errors,
  };

  // Step 7: Assessment persistence
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
    ...(status === 'COMPLETED' && reserveStage
      ? {
          legacyPipeline: {
            pipelineId: `pipeline-${randomUUID()}`,
            completedAt: new Date().toISOString(),
            stages: {
              geopoliticalAnalysis: geopolitical,
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
