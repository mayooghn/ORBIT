import type { DigitalTwinEdge, DigitalTwinGraph, DigitalTwinMeasurement, DigitalTwinNode, DigitalTwinNodeType } from './model';
import { DigitalTwinStateEngine } from './state';

export interface DigitalTwinImpactMeasurementSummary {
  nodeTotals: DigitalTwinMeasurement[];
  edgeTotals: DigitalTwinMeasurement[];
}

export interface DigitalTwinImpactResult {
  sourceNode: DigitalTwinNode;
  affectedNodeIds: string[];
  affectedNodeTypes: DigitalTwinNodeType[];
  affectedEdgeIds: string[];
  affectedNodes: DigitalTwinNode[];
  affectedEdges: DigitalTwinEdge[];
  affectedCapacity: DigitalTwinImpactMeasurementSummary;
  affectedFlow: DigitalTwinImpactMeasurementSummary;
}

const summarize = (measurements: Array<DigitalTwinMeasurement | undefined>): DigitalTwinMeasurement[] => {
  const totals = new Map<string, number>();
  for (const measurement of measurements) {
    if (!measurement || measurement.value === 0) continue;
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

const sortedEdges = (graph: DigitalTwinGraph): DigitalTwinEdge[] => [...graph.edges].sort((left, right) => left.edgeId.localeCompare(right.edgeId));

export class DigitalTwinImpactAnalyzer {
  constructor(private readonly stateEngine: DigitalTwinStateEngine) {}

  analyzeNode(nodeId: string): DigitalTwinImpactResult {
    const graph = this.stateEngine.getCurrentTwin();
    const sourceNode = graph.nodes.find((node) => node.nodeId === nodeId);
    if (!sourceNode) throw new Error(`Digital Twin node not found: ${nodeId}`);
    if (sourceNode.operationalState !== 'disrupted' && sourceNode.operationalState !== 'blocked') {
      throw new Error(`Digital Twin node is not disrupted or blocked: ${nodeId}`);
    }

    const edges = sortedEdges(graph);
    const nodesById = new Map(graph.nodes.map((node) => [node.nodeId, node]));
    const affectedNodeIds = new Set<string>();
    const affectedEdgeIds = new Set<string>();

    // Every incident edge and its neighboring node is immediately affected.
    for (const edge of edges) {
      if (edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId) continue;
      affectedEdgeIds.add(edge.edgeId);
      const neighborId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
      if (neighborId !== nodeId) affectedNodeIds.add(neighborId);
    }

    // Follow only outgoing typed edges for downstream impact. Incoming edges
    // are reported as affected, but are not traversed upstream.
    const visited = new Set<string>([nodeId]);
    const queue = [nodeId];
    while (queue.length > 0) {
      const currentNodeId = queue.shift() as string;
      for (const edge of edges) {
        if (edge.fromNodeId !== currentNodeId) continue;
        affectedEdgeIds.add(edge.edgeId);
        if (edge.toNodeId === nodeId) continue;
        affectedNodeIds.add(edge.toNodeId);
        if (!visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          queue.push(edge.toNodeId);
        }
      }
    }

    const affectedNodes = [...affectedNodeIds]
      .map((affectedId) => nodesById.get(affectedId))
      .filter((node): node is DigitalTwinNode => Boolean(node))
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    const affectedEdges = [...affectedEdgeIds]
      .map((affectedId) => edges.find((edge) => edge.edgeId === affectedId))
      .filter((edge): edge is DigitalTwinEdge => Boolean(edge));

    return {
      sourceNode,
      affectedNodeIds: affectedNodes.map((node) => node.nodeId),
      affectedNodeTypes: [...new Set(affectedNodes.map((node) => node.nodeType))].sort(),
      affectedEdgeIds: affectedEdges.map((edge) => edge.edgeId),
      affectedNodes,
      affectedEdges,
      affectedCapacity: measurementSummary(affectedNodes, affectedEdges, 'capacity'),
      // The disrupted source asset is directly affected too. Include its
      // source-backed flow in the flow summary while leaving affected IDs and
      // downstream relationship traversal unchanged.
      affectedFlow: measurementSummary([sourceNode, ...affectedNodes], affectedEdges, 'currentFlow'),
    };
  }

  analyzeCurrentState(): DigitalTwinImpactResult[] {
    const graph = this.stateEngine.getCurrentTwin();
    return graph.nodes
      .filter((node) => node.operationalState === 'disrupted' || node.operationalState === 'blocked')
      .map((node) => node.nodeId)
      .sort((left, right) => left.localeCompare(right))
      .map((nodeId) => this.analyzeNode(nodeId));
  }
}
