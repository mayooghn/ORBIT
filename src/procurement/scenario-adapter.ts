import type { Phase2Repository } from '../dataLayer/repository';
import type { DigitalTwinGraph } from '../digitalTwin/model';
import type { ScenarioResult } from '../scenarios/model';
import type {
  ProcurementLane,
  ProcurementRequest,
  ProcurementRoute,
  ProcurementSupplier,
} from './model';

export interface ScenarioProcurementContext {
  scenario: ScenarioResult;
  graph: DigitalTwinGraph;
}

export interface ScenarioProcurementData {
  suppliers: ProcurementSupplier[];
  routes: ProcurementRoute[];
  lanes: ProcurementLane[];
  source: string;
}

export type ScenarioProcurementDataResolution =
  | {
      status: 'AVAILABLE';
      data: ScenarioProcurementData;
    }
  | {
      status: 'UNAVAILABLE';
      source: string;
      reason: string;
    };

export interface ScenarioProcurementDataProvider {
  resolve(context: ScenarioProcurementContext): ScenarioProcurementDataResolution;
}

export interface ScenarioProcurementRequestResolution {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  request?: ProcurementRequest;
  source: string;
  reason?: string;
}

export const buildProcurementRequestFromScenario = (
  scenario: ScenarioResult,
  graph: DigitalTwinGraph,
  provider: ScenarioProcurementDataProvider,
): ScenarioProcurementRequestResolution => {
  const dataResolution = provider.resolve({ scenario, graph });

  if (dataResolution.status === 'UNAVAILABLE') {
    return dataResolution;
  }

  return {
    status: 'AVAILABLE',
    source: dataResolution.data.source,
    request: {
      supplyGap: {
        quantity: scenario.shortage,
        unit: scenario.shortageUnit,
      },
      suppliers: dataResolution.data.suppliers,
      routes: dataResolution.data.routes,
      lanes: dataResolution.data.lanes,
    },
  };
};

const hasFiniteMeasurement = (
  value: unknown,
  unit: unknown,
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  typeof unit === 'string' &&
  unit.trim().length > 0;

/**
 * The Phase 2 SQLite data is intentionally conservative here. It contains
 * supplier import quantities and shipping-lane geometry, but it does not
 * contain a unit-compatible route capacity plus procurement cost, transit,
 * risk, and reliability for a supplier-route lane. Returning UNAVAILABLE is
 * safer than treating geometry or historical imports as replacement capacity.
 */
export class SqliteScenarioProcurementDataProvider
  implements ScenarioProcurementDataProvider
{
  constructor(private readonly repository: Phase2Repository) {}

  resolve({ scenario, graph }: ScenarioProcurementContext): ScenarioProcurementDataResolution {
    const supplierRows = this.repository.getSuppliers({ page: 1, pageSize: 1 });
    const routeRows = this.repository.getLanes({ page: 1, pageSize: 1 });
    const sourceBackedSupplier = graph.nodes.some(
      (node) =>
        node.nodeType === 'supplier' &&
        hasFiniteMeasurement(node.currentFlow?.value, node.currentFlow?.unit),
    );
    const sourceBackedRoute = graph.nodes.some(
      (node) =>
        node.nodeType === 'shipping_route' &&
        (hasFiniteMeasurement(node.capacity?.value, node.capacity?.unit) ||
          hasFiniteMeasurement(node.currentFlow?.value, node.currentFlow?.unit)),
    );

    const sourceSummary =
      `Phase 2 SQLite has ${supplierRows.pagination.total} supplier import rows and ` +
      `${routeRows.pagination.total} shipping-lane geometry rows for scenario unit ` +
      `'${scenario.shortageUnit}'.`;

    if (!sourceBackedSupplier || !sourceBackedRoute) {
      return {
        status: 'UNAVAILABLE',
        source: 'Phase 2 SQLite / Digital Twin',
        reason:
          `${sourceSummary} It does not verify a unit-compatible supplier capacity, ` +
          'route capacity, and supplier-route procurement attributes (cost, transit time, risk, and reliability).',
      };
    }

    return {
      status: 'UNAVAILABLE',
      source: 'Phase 2 SQLite / Digital Twin',
      reason:
        `${sourceSummary} Source-backed measurements exist, but no verified ` +
        'supplier-route lane can be constructed without incompatible-unit conversion or inferred capacity.',
    };
  }
}
