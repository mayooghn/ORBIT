export const DIGITAL_TWIN_NODE_TYPES = [
  'supplier',
  'port',
  'refinery',
  'strategic_reserve',
  'shipping_route',
  'chokepoint',
] as const;

export type DigitalTwinNodeType = (typeof DIGITAL_TWIN_NODE_TYPES)[number];

export const OPERATIONAL_STATES = ['operational', 'reduced', 'disrupted', 'blocked'] as const;

export type OperationalState = (typeof OPERATIONAL_STATES)[number];

export type DigitalTwinStateSource = 'BASELINE' | 'OBSERVED' | 'OVERRIDE';

export interface DigitalTwinMeasurement {
  value: number;
  unit: string;
}

export interface DigitalTwinSourceReference {
  table: string;
  id: string;
}

export interface DigitalTwinNodeInput {
  nodeId: string;
  nodeType: DigitalTwinNodeType;
  name: string;
  description?: string;
  sourceUrl?: string;
  sourceOrganization?: string;
  confidence?: number;
  capacity?: DigitalTwinMeasurement;
  currentFlow?: DigitalTwinMeasurement;
  operationalState: OperationalState;
  stateSource: DigitalTwinStateSource;
  sourceReferences: DigitalTwinSourceReference[];
  metadata?: Record<string, unknown>;
}

export interface DigitalTwinNode extends Omit<DigitalTwinNodeInput, 'metadata' | 'sourceReferences'> {
  connectedNodeIds: string[];
  sourceReferences: DigitalTwinSourceReference[];
  metadata: Record<string, unknown>;
}

export type DigitalTwinEdgeType =
  | 'supplier_to_shipping_route'
  | 'shipping_route_to_chokepoint'
  | 'chokepoint_to_shipping_route'
  | 'shipping_route_to_port'
  | 'port_to_refinery'
  | 'port_to_strategic_reserve'
  | 'strategic_reserve_to_refinery';

export interface DigitalTwinEdgeInput {
  edgeId: string;
  edgeType: DigitalTwinEdgeType;
  fromNodeId: string;
  toNodeId: string;
  capacity?: DigitalTwinMeasurement;
  currentFlow?: DigitalTwinMeasurement;
  sourceReferences: DigitalTwinSourceReference[];
  sourceUrl?: string;
  sourceOrganization?: string;
  evidence: string;
  notes: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface DigitalTwinEdge extends Omit<DigitalTwinEdgeInput, 'metadata' | 'sourceReferences'> {
  sourceReferences: DigitalTwinSourceReference[];
  metadata: Record<string, unknown>;
}

export interface DigitalTwinGraph {
  modelVersion: 1;
  nodes: DigitalTwinNode[];
  edges: DigitalTwinEdge[];
}

export class DigitalTwinGraphModel {
  private readonly nodes = new Map<string, DigitalTwinNode>();
  private readonly edges = new Map<string, DigitalTwinEdge>();

  addNode(input: DigitalTwinNodeInput): DigitalTwinNode {
    if (this.nodes.has(input.nodeId)) throw new Error(`Digital Twin node already exists: ${input.nodeId}`);
    if (!input.name.trim()) throw new Error(`Digital Twin node name is required: ${input.nodeId}`);
    const node: DigitalTwinNode = {
      ...input,
      sourceReferences: [...input.sourceReferences],
      metadata: { ...(input.metadata || {}) },
      connectedNodeIds: [],
    };
    this.nodes.set(node.nodeId, node);
    return node;
  }

  addEdge(input: DigitalTwinEdgeInput): DigitalTwinEdge {
    if (this.edges.has(input.edgeId)) throw new Error(`Digital Twin edge already exists: ${input.edgeId}`);
    if (!this.nodes.has(input.fromNodeId) || !this.nodes.has(input.toNodeId)) {
      throw new Error(`Digital Twin edge references an unknown node: ${input.edgeId}`);
    }
    if (!input.evidence.trim() || !input.notes.trim()) {
      throw new Error(`Digital Twin edge evidence and notes are required: ${input.edgeId}`);
    }
    if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
      throw new Error(`Digital Twin edge confidence must be between 0 and 1: ${input.edgeId}`);
    }
    const edge: DigitalTwinEdge = {
      ...input,
      sourceReferences: [...input.sourceReferences],
      metadata: { ...(input.metadata || {}) },
    };
    this.edges.set(edge.edgeId, edge);
    this.connectNodes(edge.fromNodeId, edge.toNodeId);
    return edge;
  }

  updateNodeState(nodeId: string, operationalState: OperationalState, stateSource: DigitalTwinStateSource = 'OVERRIDE'): DigitalTwinNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Digital Twin node not found: ${nodeId}`);
    node.operationalState = operationalState;
    node.stateSource = stateSource;
    return node;
  }

  getNode(nodeId: string): DigitalTwinNode | undefined {
    return this.nodes.get(nodeId);
  }

  getNodes(): DigitalTwinNode[] {
    return [...this.nodes.values()];
  }

  getEdges(): DigitalTwinEdge[] {
    return [...this.edges.values()];
  }

  retainNodes(shouldRetain: (node: DigitalTwinNode) => boolean): void {
    for (const node of this.nodes.values()) {
      if (!shouldRetain(node)) this.nodes.delete(node.nodeId);
    }

    for (const [edgeId, edge] of this.edges) {
      if (!this.nodes.has(edge.fromNodeId) || !this.nodes.has(edge.toNodeId)) {
        this.edges.delete(edgeId);
      }
    }

    for (const node of this.nodes.values()) {
      node.connectedNodeIds = node.connectedNodeIds.filter((nodeId) => this.nodes.has(nodeId));
    }
  }

  snapshot(): DigitalTwinGraph {
    return {
      modelVersion: 1,
      nodes: this.getNodes().map((node) => ({
        ...node,
        connectedNodeIds: [...node.connectedNodeIds],
        sourceReferences: [...node.sourceReferences],
        metadata: { ...node.metadata },
      })),
      edges: this.getEdges().map((edge) => ({
        ...edge,
        sourceReferences: [...edge.sourceReferences],
        metadata: { ...edge.metadata },
      })),
    };
  }

  private connectNodes(fromNodeId: string, toNodeId: string): void {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || !toNode) throw new Error('Cannot connect unknown Digital Twin nodes.');
    if (!fromNode.connectedNodeIds.includes(toNodeId)) fromNode.connectedNodeIds.push(toNodeId);
    if (!toNode.connectedNodeIds.includes(fromNodeId)) toNode.connectedNodeIds.push(fromNodeId);
  }
}
