import { OPERATIONAL_STATES, type DigitalTwinGraph, type DigitalTwinNode, type DigitalTwinStateSource, type OperationalState } from './model';

export interface DigitalTwinNodeState {
  nodeId: string;
  operationalState: OperationalState;
  stateSource: DigitalTwinStateSource;
}

export const isOperationalState = (value: unknown): value is OperationalState =>
  typeof value === 'string' && (OPERATIONAL_STATES as readonly string[]).includes(value);

const cloneNode = (node: DigitalTwinNode, state: DigitalTwinNodeState): DigitalTwinNode => ({
  ...node,
  operationalState: state.operationalState,
  stateSource: state.stateSource,
  connectedNodeIds: [...node.connectedNodeIds],
  sourceReferences: [...node.sourceReferences],
  metadata: { ...node.metadata },
});

const cloneGraph = (graph: DigitalTwinGraph, states: Map<string, DigitalTwinNodeState>): DigitalTwinGraph => ({
  modelVersion: graph.modelVersion,
  nodes: graph.nodes.map((node) => {
    const state = states.get(node.nodeId);
    if (!state) throw new Error(`Digital Twin state is missing for node: ${node.nodeId}`);
    return cloneNode(node, state);
  }),
  edges: graph.edges.map((edge) => ({
    ...edge,
    sourceReferences: [...edge.sourceReferences],
    metadata: { ...edge.metadata },
  })),
});

export class DigitalTwinStateEngine {
  private readonly baselineGraph: DigitalTwinGraph;
  private readonly baselineStates = new Map<string, DigitalTwinNodeState>();
  private readonly currentStates = new Map<string, DigitalTwinNodeState>();

  constructor(graph: DigitalTwinGraph) {
    this.baselineGraph = cloneGraphWithoutStateMutation(graph);
    for (const node of this.baselineGraph.nodes) {
      if (!isOperationalState(node.operationalState)) throw new Error(`Invalid baseline state for node: ${node.nodeId}`);
      const state: DigitalTwinNodeState = {
        nodeId: node.nodeId,
        operationalState: node.operationalState,
        stateSource: node.stateSource,
      };
      this.baselineStates.set(node.nodeId, state);
      this.currentStates.set(node.nodeId, { ...state });
    }
  }

  getCurrentNodeState(nodeId: string): DigitalTwinNodeState {
    return { ...this.requireState(nodeId) };
  }

  updateNodeState(nodeId: string, operationalState: OperationalState): DigitalTwinNodeState {
    if (!isOperationalState(operationalState)) throw new Error(`Invalid Digital Twin operational state: ${operationalState}`);
    this.requireState(nodeId);
    const nextState: DigitalTwinNodeState = { nodeId, operationalState, stateSource: 'OVERRIDE' };
    this.currentStates.set(nodeId, nextState);
    return { ...nextState };
  }

  getCurrentTwin(): DigitalTwinGraph {
    return cloneGraph(this.baselineGraph, this.currentStates);
  }

  resetToBaseline(): DigitalTwinGraph {
    this.currentStates.clear();
    for (const [nodeId, state] of this.baselineStates) this.currentStates.set(nodeId, { ...state });
    return this.getCurrentTwin();
  }

  private requireState(nodeId: string): DigitalTwinNodeState {
    const state = this.currentStates.get(nodeId);
    if (!state) throw new Error(`Digital Twin node not found: ${nodeId}`);
    return state;
  }
}

const cloneGraphWithoutStateMutation = (graph: DigitalTwinGraph): DigitalTwinGraph => ({
  modelVersion: graph.modelVersion,
  nodes: graph.nodes.map((node) => ({
    ...node,
    connectedNodeIds: [...node.connectedNodeIds],
    sourceReferences: [...node.sourceReferences],
    metadata: { ...node.metadata },
  })),
  edges: graph.edges.map((edge) => ({
    ...edge,
    sourceReferences: [...edge.sourceReferences],
    metadata: { ...edge.metadata },
  })),
});
