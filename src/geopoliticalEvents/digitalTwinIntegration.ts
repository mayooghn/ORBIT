import type {
  DigitalTwinEdge,
  DigitalTwinGraph,
  DigitalTwinMeasurement,
  DigitalTwinNode,
  DigitalTwinNodeType,
} from '../digitalTwin/model';
import { DigitalTwinImpactAnalyzer, type DigitalTwinImpactMeasurementSummary } from '../digitalTwin/impact';
import type { DigitalTwinRuntime } from '../digitalTwin/runtime';
import { DigitalTwinStateEngine } from '../digitalTwin/state';
import type { GeopoliticalEventClassification } from './classification';
import type { GeopoliticalSupplyChainRelevance } from './relevance';
import type { GeopoliticalRiskAssessment, GeopoliticalRiskLevel } from './risk';

export interface GeopoliticalRiskDigitalTwinIntegration {
  eventId: string;
  relevant: boolean;
  riskLevel: GeopoliticalRiskLevel;
  riskScore: number;
  matchedNodeIds: string[];
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  affectedNodeTypes: DigitalTwinNodeType[];
  affectedCapacity: DigitalTwinImpactMeasurementSummary;
  affectedFlow: DigitalTwinImpactMeasurementSummary;
  impactReasons: string[];
}

const RISK_LEVELS: readonly GeopoliticalRiskLevel[] = ['low', 'medium', 'high', 'critical'];
const NODE_TYPES: readonly DigitalTwinNodeType[] = ['supplier', 'port', 'refinery', 'strategic_reserve', 'shipping_route', 'chokepoint'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const uniqueSorted = (values: readonly string[]): string[] => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const validateClassification = (value: unknown): GeopoliticalEventClassification => {
  if (!isRecord(value) || typeof value.eventId !== 'string' || typeof value.energyRelevant !== 'boolean') {
    throw new Error('A valid classified geopolitical event is required.');
  }
  return value as unknown as GeopoliticalEventClassification;
};

const validateRelevance = (value: unknown): GeopoliticalSupplyChainRelevance => {
  if (!isRecord(value) || typeof value.eventId !== 'string' || typeof value.relevant !== 'boolean') {
    throw new Error('A valid supply-chain relevance result is required.');
  }
  if (!isStringArray(value.matchedNodeIds)) {
    throw new Error('Supply-chain relevance matchedNodeIds must be an array of strings.');
  }
  if (!Array.isArray(value.matchedNodeTypes) || !value.matchedNodeTypes.every((nodeType) => NODE_TYPES.includes(nodeType as DigitalTwinNodeType))) {
    throw new Error('Supply-chain relevance matchedNodeTypes contains an invalid node type.');
  }
  return value as unknown as GeopoliticalSupplyChainRelevance;
};

const validateRisk = (value: unknown): GeopoliticalRiskAssessment => {
  if (
    !isRecord(value) ||
    typeof value.eventId !== 'string' ||
    !RISK_LEVELS.includes(value.riskLevel as GeopoliticalRiskLevel) ||
    typeof value.riskScore !== 'number' ||
    !Number.isFinite(value.riskScore) ||
    value.riskScore < 0 ||
    value.riskScore > 100 ||
    typeof value.energyRelevant !== 'boolean' ||
    !isStringArray(value.matchedNodeIds)
  ) {
    throw new Error('A valid geopolitical risk assessment is required.');
  }
  return value as unknown as GeopoliticalRiskAssessment;
};

const assertMatchingInputs = (
  classification: GeopoliticalEventClassification,
  relevance: GeopoliticalSupplyChainRelevance,
  risk: GeopoliticalRiskAssessment,
): void => {
  if (classification.eventId !== relevance.eventId || classification.eventId !== risk.eventId) {
    throw new Error('Geopolitical integration inputs must reference the same event.');
  }
  if (classification.energyRelevant !== risk.energyRelevant) {
    throw new Error('Geopolitical risk energy relevance does not match the classification.');
  }
  if (uniqueSorted(relevance.matchedNodeIds).join('\u0000') !== uniqueSorted(risk.matchedNodeIds).join('\u0000')) {
    throw new Error('Geopolitical risk matched nodes do not match the relevance result.');
  }
};

const emptyMeasurementSummary = (): DigitalTwinImpactMeasurementSummary => ({ nodeTotals: [], edgeTotals: [] });

const summarize = (measurements: Array<DigitalTwinMeasurement | undefined>): DigitalTwinMeasurement[] => {
  const totals = new Map<string, number>();
  for (const measurement of measurements) {
    if (!measurement) continue;
    totals.set(measurement.unit, (totals.get(measurement.unit) || 0) + measurement.value);
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([unit, value]) => ({ value, unit }));
};

const measurementSummary = (nodes: DigitalTwinNode[], edges: DigitalTwinEdge[], field: 'capacity' | 'currentFlow'): DigitalTwinImpactMeasurementSummary => ({
  nodeTotals: summarize(nodes.map((node) => node[field])),
  edgeTotals: summarize(edges.map((edge) => edge[field])),
});

const assertGraphNodesExist = (graph: DigitalTwinGraph, nodeIds: readonly string[]): void => {
  const graphNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const missingNodeId = nodeIds.find((nodeId) => !graphNodeIds.has(nodeId));
  if (missingNodeId) throw new Error(`Digital Twin node not found: ${missingNodeId}`);
};

const irrelevantResult = (
  classification: GeopoliticalEventClassification,
  relevance: GeopoliticalSupplyChainRelevance,
  risk: GeopoliticalRiskAssessment,
): GeopoliticalRiskDigitalTwinIntegration => {
  const reason = !classification.energyRelevant || !risk.energyRelevant
    ? 'No Digital Twin impact analysis was performed because the event is not energy relevant.'
    : 'No Digital Twin impact analysis was performed because the event has no relevant matched node.';
  return {
    eventId: classification.eventId,
    relevant: false,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    matchedNodeIds: [...risk.matchedNodeIds],
    affectedNodeIds: [],
    affectedEdgeIds: [],
    affectedNodeTypes: [],
    affectedCapacity: emptyMeasurementSummary(),
    affectedFlow: emptyMeasurementSummary(),
    impactReasons: [reason],
  };
};

export const integrateGeopoliticalRiskWithDigitalTwin = (
  classificationValue: unknown,
  relevanceValue: unknown,
  riskValue: unknown,
  runtime: DigitalTwinRuntime,
): GeopoliticalRiskDigitalTwinIntegration => {
  const classification = validateClassification(classificationValue);
  const relevance = validateRelevance(relevanceValue);
  const risk = validateRisk(riskValue);
  assertMatchingInputs(classification, relevance, risk);

  const currentGraph = runtime.stateEngine.getCurrentTwin();
  const matchedNodeIds = [...risk.matchedNodeIds];
  assertGraphNodesExist(currentGraph, matchedNodeIds);

  if (!relevance.relevant || !classification.energyRelevant || !risk.energyRelevant) {
    return irrelevantResult(classification, relevance, risk);
  }

  // Analyze a private state-engine copy. The runtime's persistent state and
  // source-backed graph are never updated by this integration.
  const analysisStateEngine = new DigitalTwinStateEngine(currentGraph);
  const analysisGraph = analysisStateEngine.getCurrentTwin();
  const nodeById = new Map(analysisGraph.nodes.map((node) => [node.nodeId, node]));
  for (const nodeId of uniqueSorted(matchedNodeIds)) {
    const node = nodeById.get(nodeId);
    if (node && node.operationalState !== 'disrupted' && node.operationalState !== 'blocked') {
      analysisStateEngine.updateNodeState(nodeId, 'disrupted');
    }
  }

  const impactAnalyzer = new DigitalTwinImpactAnalyzer(analysisStateEngine);
  const affectedNodeIds = new Set<string>();
  const affectedEdgeIds = new Set<string>();
  const impactReasons: string[] = [
    `match rule: event ${classification.eventId} matched Digital Twin node(s): ${uniqueSorted(matchedNodeIds).join(', ')}.`,
  ];
  const edgeById = new Map(analysisGraph.edges.map((edge) => [edge.edgeId, edge]));

  for (const nodeId of uniqueSorted(matchedNodeIds)) {
    const impact = impactAnalyzer.analyzeNode(nodeId);
    impact.affectedNodeIds.forEach((affectedId) => affectedNodeIds.add(affectedId));
    impact.affectedEdgeIds.forEach((affectedId) => affectedEdgeIds.add(affectedId));

    const edgeDetails = impact.affectedEdgeIds
      .map((edgeId) => {
        const edge = edgeById.get(edgeId);
        return edge ? `${edgeId} (${edge.edgeType})` : edgeId;
      })
      .join(', ');
    if (impact.affectedNodeIds.length === 0 && impact.affectedEdgeIds.length === 0) {
      impactReasons.push(`impact rule: matched node ${nodeId} has no connected affected nodes or edges.`);
    } else {
      impactReasons.push(`impact rule: matched node ${nodeId} affects node(s) ${impact.affectedNodeIds.join(', ') || 'none'} through edge(s) ${edgeDetails || 'none'}.`);
    }
  }

  const finalGraph = analysisStateEngine.getCurrentTwin();
  const finalNodeById = new Map(finalGraph.nodes.map((node) => [node.nodeId, node]));
  const finalEdgeById = new Map(finalGraph.edges.map((edge) => [edge.edgeId, edge]));
  const affectedNodes = uniqueSorted([...affectedNodeIds])
    .map((nodeId) => finalNodeById.get(nodeId))
    .filter((node): node is DigitalTwinNode => Boolean(node));
  const affectedEdges = uniqueSorted([...affectedEdgeIds])
    .map((edgeId) => finalEdgeById.get(edgeId))
    .filter((edge): edge is DigitalTwinEdge => Boolean(edge));
  const finalAffectedNodeIds = affectedNodes.map((node) => node.nodeId);
  const finalAffectedEdgeIds = affectedEdges.map((edge) => edge.edgeId);
  const finalAffectedNodeTypes = [...new Set(affectedNodes.map((node) => node.nodeType))].sort();
  const flowNodesById = new Map(
    [...matchedNodeIds, ...finalAffectedNodeIds]
      .map((nodeId) => finalNodeById.get(nodeId))
      .filter((node): node is DigitalTwinNode => Boolean(node))
      .map((node) => [node.nodeId, node] as const),
  );

  if (matchedNodeIds.length > 1) {
    impactReasons.push(`aggregation rule: combined impact deduplicated ${finalAffectedNodeIds.length} affected node(s) and ${finalAffectedEdgeIds.length} affected edge(s).`);
  }

  return {
    eventId: classification.eventId,
    relevant: true,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    matchedNodeIds,
    affectedNodeIds: finalAffectedNodeIds,
    affectedEdgeIds: finalAffectedEdgeIds,
    affectedNodeTypes: finalAffectedNodeTypes,
    affectedCapacity: measurementSummary(affectedNodes, affectedEdges, 'capacity'),
    affectedFlow: measurementSummary([...flowNodesById.values()], affectedEdges, 'currentFlow'),
    impactReasons,
  };
};

export class GeopoliticalRiskDigitalTwinIntegrator {
  constructor(private readonly runtime: DigitalTwinRuntime) {}

  integrate(
    classification: unknown,
    relevance: unknown,
    risk: unknown,
  ): GeopoliticalRiskDigitalTwinIntegration {
    return integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, this.runtime);
  }
}
