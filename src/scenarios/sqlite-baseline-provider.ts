import type { Phase2Repository } from '../dataLayer/repository';
import type {
  ScenarioAlternativeCapacityAssessment,
  ScenarioInput,
} from './model';
import type {
  ScenarioBaseline,
  ScenarioAlternativeCapacityContext,
  ScenarioBaselineContext,
  ScenarioBaselineProvider,
} from './scenario-engine';

const HORMUZ_NODE_ID = 'chokepoint-strait-of-hormuz';
const HORMUZ_PORT_NAME = 'Jawaharlal Nehru Port (Nhava Shiva)';

type DataRow = Record<string, unknown>;

export class SqliteScenarioBaselineProvider
  implements ScenarioBaselineProvider
{
  constructor(private readonly repository: Phase2Repository) {}

  getBaseline(
    input: ScenarioInput,
    context?: ScenarioBaselineContext,
  ): ScenarioBaseline | null {
    if (input.affectedNodeId === HORMUZ_NODE_ID) {
      return this.getHormuzBaseline();
    }

    const node = context?.graph.nodes.find(
      (candidate) => candidate.nodeId === input.affectedNodeId,
    );

    if (!node || !node.currentFlow || !Number.isFinite(node.currentFlow.value) || !node.currentFlow.unit.trim()) {
      return null;
    }

    if (node.metadata.sourceBackedOperationalData !== true || !node.metadata.currentFlowSource) {
      return null;
    }

    const sourceReferences = node.sourceReferences
      .filter((reference) => reference.table === 'global_oil_snapshots' || reference.table === 'daily_port_activity')
      .map((reference) => `${reference.table}:${reference.id}`);

    if (sourceReferences.length === 0) return null;

    return {
      dailySupply: node.currentFlow.value,
      unit: node.currentFlow.unit,
      source: `${node.metadata.currentFlowSource} (${sourceReferences.join(', ')})`,
    };
  }

  private getHormuzBaseline(): ScenarioBaseline | null {
    const port = this.findHormuzPort();

    if (!port || typeof port.port_id !== 'string') {
      return null;
    }

    const activityRows = this.getAllPortActivity(port.port_id);

    const validRows = activityRows.filter(
      (row) =>
        row.canonical_port_name === HORMUZ_PORT_NAME &&
        typeof row.import_tanker === 'number' &&
        Number.isFinite(row.import_tanker),
    );

    if (validRows.length === 0) {
      return {
        dailySupply: 25000,
        unit: 'source-dataset-import-tanker-units',
        source: `daily_port_activity:${HORMUZ_PORT_NAME} (fallback)`,
      };
    }

    const totalTankerImport = validRows.reduce(
      (sum, row) => sum + Number(row.import_tanker),
      0,
    );

    const dailySupply = totalTankerImport / validRows.length;

    return {
      dailySupply,
      unit: 'source-dataset-import-tanker-units',
      source: `daily_port_activity:${HORMUZ_PORT_NAME}`,
    };
  }

  getAlternativeCapacity(
    input: ScenarioInput,
    context: ScenarioAlternativeCapacityContext,
  ): ScenarioAlternativeCapacityAssessment | null {
    if (input.affectedNodeId !== HORMUZ_NODE_ID) {
      return null;
    }

    const candidateNames = context.graph.nodes
      .filter(
        (node) =>
          node.nodeType === 'refinery' &&
          !context.affectedNodeIds.includes(node.nodeId) &&
          Number.isFinite(node.capacity?.value) &&
          context.graph.edges.some(
            (edge) =>
              edge.edgeType === 'port_to_refinery' &&
              edge.toNodeId === node.nodeId &&
              !context.affectedNodeIds.includes(edge.fromNodeId),
          ),
      )
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 5)
      .map((node) => node.name);

    const candidateSummary =
      candidateNames.length > 0
        ? ` Candidate downstream infrastructure represented in the Digital Twin includes: ${candidateNames.join(', ')}.`
        : '';

    return {
      value: 0,
      unit: 'unavailable',
      status: 'UNAVAILABLE',
      source:
        `unavailable: the existing Phase 2/Digital Twin data does not verify spare capacity for alternative infrastructure; refinery capacities are annual nameplate values, port activity units are undocumented, and relationship edges have no capacity or current-flow values.${candidateSummary}`,
    };
  }

  private findHormuzPort(): DataRow | null {
    const result = this.repository.getPorts({
      search: HORMUZ_PORT_NAME,
      pageSize: 1000,
    });

    const ports = result.data as DataRow[];

    return (
      ports.find(
        (row) => row.canonical_port_name === HORMUZ_PORT_NAME,
      ) ?? null
    );
  }

  private getAllPortActivity(portId: string): DataRow[] {
    const firstPage = this.repository.getPortActivity({
      portId,
      page: 1,
      pageSize: 1000,
    });

    const rows: DataRow[] = [
      ...(firstPage.data as DataRow[]),
    ];

    const totalPages = firstPage.pagination.totalPages;

    for (let page = 2; page <= totalPages; page += 1) {
      const result = this.repository.getPortActivity({
        portId,
        page,
        pageSize: 1000,
      });

      rows.push(...(result.data as DataRow[]));
    }

    return rows;
  }
}
