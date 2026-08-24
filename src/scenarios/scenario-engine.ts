import {
  DigitalTwinImpactAnalyzer,
  type DigitalTwinImpactResult,
} from '../digitalTwin/impact';
import { DigitalTwinStateEngine } from '../digitalTwin/state';
import type { DigitalTwinGraph, DigitalTwinNode } from '../digitalTwin/model';
import type {
  ScenarioImpact,
  ScenarioInput,
  ScenarioResult,
  RecoveryPoint,
  ScenarioAlternativeCapacityAssessment,
} from './model';

export const RECOVERY_MODEL_DESCRIPTION =
  'No source-backed recovery rate is available. Recovery is modeled as a deterministic linear return from the disrupted capacity level to 100% over a severity-scaled recovery window.';

export interface ScenarioBaseline {
  dailySupply: number;
  unit: string;
  source: string;
}

export interface ScenarioBaselineContext {
  graph: DigitalTwinGraph;
}

export interface ScenarioAlternativeCapacityContext {
  baseline: ScenarioBaseline | null;
  grossSupplyLoss: ScenarioBaseline | null;
  graph: DigitalTwinGraph;
  affectedNodeIds: string[];
}

export interface ScenarioBaselineProvider {
  getBaseline: (
    input: ScenarioInput,
    context?: ScenarioBaselineContext,
  ) => ScenarioBaseline | null;
  getAlternativeCapacity?: (
    input: ScenarioInput,
    context: ScenarioAlternativeCapacityContext,
  ) => ScenarioAlternativeCapacityAssessment | null;
}

const ALTERNATIVE_CAPACITY_UNAVAILABLE_SOURCE =
  'unavailable: no verified, unit-compatible spare capacity is available in the existing Phase 2/Digital Twin data.';

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const calculateSupplyLoss = (
  baseline: ScenarioBaseline | null,
  durationDays: number,
  capacityReductionPercent: number,
): ScenarioBaseline | null => {
  if (!baseline) return null;

  const reduction = clampPercent(capacityReductionPercent) / 100;

  return {
    dailySupply: baseline.dailySupply * reduction * durationDays,
    unit: `${baseline.unit}-days`,
    source: baseline.source,
  };
};

const RECOVERY_WINDOW_MULTIPLIERS: Record<ScenarioInput['severity'], number> = {
  LOW: 0.5,
  MEDIUM: 0.75,
  HIGH: 1,
  CRITICAL: 1.5,
};

export const calculateRecoveryDays = (
  durationDays: number,
  severity: ScenarioInput['severity'],
): number => {
  // The existing severity multipliers are retained as an explicit mathematical
  // assumption for the recovery-window length. recoveryDays is the full
  // horizon from disruption start through complete recovery.
  const recoveryWindowDays = Math.max(
    1,
    Math.ceil(durationDays * RECOVERY_WINDOW_MULTIPLIERS[severity]),
  );

  return durationDays + recoveryWindowDays;
};

export const buildRecoveryTimeline = (
  durationDays: number,
  recoveryDays: number,
  capacityReductionPercent: number,
): RecoveryPoint[] => {
  const timeline: RecoveryPoint[] = [];
  const disruptedCapacity = 100 - clampPercent(capacityReductionPercent);

  for (let day = 0; day <= recoveryDays; day += 1) {
    if (day <= durationDays) {
      timeline.push({
        day,
        remainingCapacityPercent: disruptedCapacity,
        recoveryPercent: 0,
        status: 'DISRUPTED',
      });

      continue;
    }

    const recoveryElapsed = day - durationDays;
    const recoveryWindow = Math.max(1, recoveryDays - durationDays);

    const recoveryPercent = Math.min(
      100,
      Math.round((recoveryElapsed / recoveryWindow) * 100),
    );

    const remainingCapacityPercent = Math.min(
      100,
      Math.round(
        disruptedCapacity +
          ((100 - disruptedCapacity) * recoveryPercent) / 100,
      ),
    );

    timeline.push({
      day,
      remainingCapacityPercent,
      recoveryPercent,
      status: recoveryPercent >= 100 ? 'RECOVERED' : 'RECOVERING',
    });
  }

  return timeline;
};

const toScenarioImpacts = (
  impactResult: DigitalTwinImpactResult,
): ScenarioImpact[] => {
  const affectedNodeImpacts: ScenarioImpact[] =
    impactResult.affectedNodes.map((node: DigitalTwinNode) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeName: node.name,
      impactType: 'DOWNSTREAM',
      capacityBefore: node.capacity?.value ?? null,
      capacityAfter: node.capacity?.value ?? null,
      capacityLoss: null,
    }));

  return [
    {
      nodeId: impactResult.sourceNode.nodeId,
      nodeType: impactResult.sourceNode.nodeType,
      nodeName: impactResult.sourceNode.name,
      impactType: 'DIRECT',
      capacityBefore: impactResult.sourceNode.capacity?.value ?? null,
      capacityAfter: impactResult.sourceNode.capacity?.value ?? null,
      capacityLoss: null,
    },
    ...affectedNodeImpacts,
  ];
};

const getIdsByType = (
  graph: DigitalTwinGraph,
  nodeIds: string[],
  type: DigitalTwinNode['nodeType'],
): string[] =>
  graph.nodes
    .filter(
      (node) => node.nodeType === type && nodeIds.includes(node.nodeId),
    )
    .map((node) => node.nodeId)
    .sort();

const resolveAlternativeCapacity = (
  assessment: ScenarioAlternativeCapacityAssessment | null,
  grossSupplyLossUnit: string,
): ScenarioAlternativeCapacityAssessment => {
  if (!assessment || assessment.status !== 'VERIFIED') {
    return {
      value: 0,
      unit: 'unavailable',
      source: assessment?.source || ALTERNATIVE_CAPACITY_UNAVAILABLE_SOURCE,
      status: 'UNAVAILABLE',
    };
  }

  if (
    !Number.isFinite(assessment.value) ||
    assessment.value < 0 ||
    !assessment.unit.trim() ||
    assessment.unit !== grossSupplyLossUnit
  ) {
    return {
      value: 0,
      unit: 'unavailable',
      source:
        'unavailable: verified alternative capacity was not unit-compatible with the gross supply loss.',
      status: 'UNAVAILABLE',
    };
  }

  return assessment;
};

export class ScenarioEngine {
  constructor(
    private readonly baselineProvider: ScenarioBaselineProvider,
  ) {}

  run(
    stateEngine: DigitalTwinStateEngine,
    input: ScenarioInput,
  ): ScenarioResult {
    this.validateInput(input);

    const analyzer = new DigitalTwinImpactAnalyzer(stateEngine);

    try {
      stateEngine.updateNodeState(input.affectedNodeId, 'disrupted');

      const impactResult = analyzer.analyzeNode(input.affectedNodeId);
      const simulatedGraph = stateEngine.getCurrentTwin();

      const affectedNodeIds = [
        input.affectedNodeId,
        ...impactResult.affectedNodeIds,
      ];

      const baseline = this.baselineProvider.getBaseline(input, {
        graph: simulatedGraph,
      });

      const supplyLoss = calculateSupplyLoss(
        baseline,
        input.durationDays,
        input.capacityReductionPercent,
      );

      const affectedRoutes = getIdsByType(
        simulatedGraph,
        affectedNodeIds,
        'shipping_route',
      );

      const affectedPorts = getIdsByType(
        simulatedGraph,
        affectedNodeIds,
        'port',
      );

      const affectedRefineries = getIdsByType(
        simulatedGraph,
        affectedNodeIds,
        'refinery',
      );

      const grossSupplyLoss = supplyLoss?.dailySupply ?? 0;
      const grossSupplyLossUnit = supplyLoss?.unit ?? 'unavailable';
      const alternativeCapacity = resolveAlternativeCapacity(
        this.baselineProvider.getAlternativeCapacity?.(input, {
          baseline,
          grossSupplyLoss: supplyLoss,
          graph: simulatedGraph,
          affectedNodeIds,
        }) ?? null,
        grossSupplyLossUnit,
      );

      const recoveryDays = calculateRecoveryDays(
        input.durationDays,
        input.severity,
      );

      const recoveryTimeline = buildRecoveryTimeline(
        input.durationDays,
    recoveryDays,
        input.capacityReductionPercent,
      );

      return {
        scenarioId: `${input.affectedNodeId}-${input.durationDays}d-${Date.now()}`,
        input,

        supplyLoss: grossSupplyLoss,
        supplyLossUnit: grossSupplyLossUnit,

        affectedRoutes,
        affectedPorts,
        affectedRefineries,

        alternativeCapacity: alternativeCapacity.value,
        alternativeCapacityUnit: alternativeCapacity.unit,
        alternativeCapacitySource: alternativeCapacity.source,
        alternativeCapacityStatus: alternativeCapacity.status,

        shortage: Math.max(
          0,
          grossSupplyLoss - alternativeCapacity.value,
        ),
        shortageUnit: grossSupplyLossUnit,

        recoveryDays,
        recoveryTimeline,
        recoveryAssumption: RECOVERY_MODEL_DESCRIPTION,

        impacts: toScenarioImpacts(impactResult),

        calculatedAt: new Date().toISOString(),
      };
    } finally {
      stateEngine.resetToBaseline();
    }
  }

  private validateInput(input: ScenarioInput): void {
    if (!input.eventId.trim()) {
      throw new Error('Scenario eventId is required.');
    }

    if (!input.affectedNodeId.trim()) {
      throw new Error('Scenario affectedNodeId is required.');
    }

    if (!Number.isFinite(input.durationDays) || input.durationDays <= 0) {
      throw new Error('Scenario durationDays must be greater than zero.');
    }

    if (
      !Number.isFinite(input.capacityReductionPercent) ||
      input.capacityReductionPercent < 0 ||
      input.capacityReductionPercent > 100
    ) {
      throw new Error(
        'Scenario capacityReductionPercent must be between 0 and 100.',
      );
    }
  }
}
