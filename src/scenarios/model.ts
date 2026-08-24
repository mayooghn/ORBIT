import type {
  DigitalTwinMeasurement,
  DigitalTwinNodeType,
  OperationalState,
} from '../digitalTwin/model';

export type ScenarioSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScenarioInput {
  eventId: string;
  durationDays: number;
  severity: ScenarioSeverity;
  affectedNodeId: string;
  capacityReductionPercent: number;
}

export interface ScenarioImpact {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  impactType: 'DIRECT' | 'DOWNSTREAM';
  capacityBefore: number | null;
  capacityAfter: number | null;
  capacityLoss: number | null;
}

export interface RecoveryPoint {
  day: number;
  remainingCapacityPercent: number;
  recoveryPercent: number;
  status: 'DISRUPTED' | 'RECOVERING' | 'RECOVERED';
}

export type ScenarioAlternativeCapacityStatus =
  | 'VERIFIED'
  | 'UNAVAILABLE';

export interface ScenarioAlternativeCapacityAssessment {
  value: number;
  unit: string;
  source: string;
  status: ScenarioAlternativeCapacityStatus;
}

export interface ScenarioResult {
  scenarioId: string;
  input: ScenarioInput;

  supplyLoss: number;
  supplyLossUnit: string;

  affectedRoutes: string[];
  affectedPorts: string[];
  affectedRefineries: string[];

  alternativeCapacity: number;
  alternativeCapacityUnit: string;
  alternativeCapacitySource: string;
  alternativeCapacityStatus: ScenarioAlternativeCapacityStatus;

  shortage: number;
  shortageUnit: string;

  recoveryDays: number;
  recoveryTimeline: RecoveryPoint[];
  recoveryAssumption: string;

  impacts: ScenarioImpact[];

  calculatedAt: string;
}

export interface ScenarioComparisonSummary {
  highestSupplyLoss: number;
  highestShortage: number;
  longestRecovery: number;
  scenarioWithHighestSupplyLoss: ScenarioInput;
  scenarioWithHighestShortage: ScenarioInput;
  scenarioWithLongestRecovery: ScenarioInput;
}

export interface ScenarioComparison {
  comparisonId: string;
  scenarios: ScenarioResult[];
  summary: ScenarioComparisonSummary;
  calculatedAt: string;
}

export interface ScenarioSelectableNode {
  nodeId: string;
  nodeType: DigitalTwinNodeType;
  name: string;
  operationalState: OperationalState;
  capacity: DigitalTwinMeasurement | null;
  metadata: Record<string, unknown>;
}

export interface ScenarioNodeListResponse {
  status: 'AVAILABLE';
  nodes: ScenarioSelectableNode[];
  totals: {
    total: number;
    nodeCount: number;
  };
  typeCounts: Record<DigitalTwinNodeType, number>;
}
