import type { DigitalTwinGraph, DigitalTwinNodeType } from '../digitalTwin/model';
import type {
  ScenarioInput,
  ScenarioNodeListResponse,
  ScenarioSelectableNode,
} from './model';
import type { ScenarioBaselineProvider } from './scenario-engine';

export const SCENARIO_SELECTABLE_NODE_TYPES: readonly DigitalTwinNodeType[] = [
  'chokepoint',
  'port',
  'refinery',
  'shipping_route',
  'strategic_reserve',
  'supplier',
];

const nodeTypeOrder = new Map(
  SCENARIO_SELECTABLE_NODE_TYPES.map((nodeType, index) => [
    nodeType,
    index,
  ]),
);

const emptyTypeCounts = (): Record<DigitalTwinNodeType, number> =>
  Object.fromEntries(
    SCENARIO_SELECTABLE_NODE_TYPES.map((nodeType) => [nodeType, 0]),
  ) as Record<DigitalTwinNodeType, number>;

export const buildScenarioNodeList = (
  graph: DigitalTwinGraph,
  baselineProvider: ScenarioBaselineProvider,
): ScenarioNodeListResponse => {
  const eligibleTypes = new Set(SCENARIO_SELECTABLE_NODE_TYPES);

  const nodes: ScenarioSelectableNode[] = graph.nodes
    .filter(
      (node) =>
        eligibleTypes.has(node.nodeType) &&
        node.nodeId.trim().length > 0 &&
        node.name.trim().length > 0,
    )
    .filter((node) =>
      baselineProvider.getBaseline(
        {
          eventId: `scenario-node-catalog:${node.nodeId}`,
          durationDays: 1,
          severity: 'LOW',
          affectedNodeId: node.nodeId,
          capacityReductionPercent: 100,
        } satisfies ScenarioInput,
        { graph },
      ) !== null,
    )
    .sort((left, right) => {
      const typeDifference =
        (nodeTypeOrder.get(left.nodeType) ?? Number.MAX_SAFE_INTEGER) -
        (nodeTypeOrder.get(right.nodeType) ?? Number.MAX_SAFE_INTEGER);

      if (typeDifference !== 0) return typeDifference;

      const nameDifference = left.name.localeCompare(right.name);
      return nameDifference !== 0
        ? nameDifference
        : left.nodeId.localeCompare(right.nodeId);
    })
    .map((node) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      name: node.name,
      operationalState: node.operationalState,
      capacity: node.capacity ? { ...node.capacity } : null,
      metadata: { ...node.metadata },
    }));

  const byType = emptyTypeCounts();
  for (const node of nodes) byType[node.nodeType] += 1;

  return {
    status: 'AVAILABLE',
    nodes,
    totals: {
      total: nodes.length,
      nodeCount: nodes.length,
    },
    typeCounts: byType,
  };
};
