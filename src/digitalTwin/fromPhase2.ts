import { createHash } from 'node:crypto';
import type { Phase2Repository } from '../dataLayer/repository';
import { DigitalTwinGraphModel, type DigitalTwinNodeInput, type DigitalTwinSourceReference } from './model';
import { enrichDigitalTwinRelationships } from './relationships';

type Phase2Row = Record<string, unknown>;

const BASELINE_STATE = 'operational' as const;

const text = (row: Phase2Row, field: string): string => {
  const value = row[field];
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
};

const number = (row: Phase2Row, field: string): number | undefined => {
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const stableIdentity = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 20);

const sourceReference = (table: string, id: string): DigitalTwinSourceReference => ({ table, id });

const addNode = (model: DigitalTwinGraphModel, input: DigitalTwinNodeInput): void => {
  model.addNode(input);
};

export const buildDigitalTwinFromPhase2 = (repository: Phase2Repository): DigitalTwinGraphModel => {
  const model = new DigitalTwinGraphModel();

  const globalOilRows = repository.getGlobalOil({ pageSize: 1000 }).data as Phase2Row[];
  const globalOilByCountryId = new Map(
    globalOilRows
      .map((row) => [text(row, 'country_id'), row] as const)
      .filter(([countryId]) => countryId.length > 0),
  );

  const supplierRows = repository.getSuppliers({ pageSize: 1000 }).data as Phase2Row[];
  const supplierNodes = new Map<string, DigitalTwinNodeInput>();
  for (const row of supplierRows) {
    const mappingStatus = text(row, 'country_mapping_status');
    const quantityTonnes = number(row, 'quantity_tonnes');
    if (
      mappingStatus !== 'MAPPED' ||
      text(row, 'validation_status') !== 'VALID' ||
      quantityTonnes === undefined ||
      quantityTonnes <= 0
    ) continue;

    const countryId = text(row, 'country_id');
    const sourceCountryName = text(row, 'source_country_name');
    const identity = countryId ? `country:${countryId}` : `source:${sourceCountryName.toLowerCase()}`;
    const nodeId = `supplier-${stableIdentity(identity)}`;
    const candidateGlobalOil = globalOilByCountryId.get(countryId);
    const globalOil = candidateGlobalOil && text(candidateGlobalOil, 'validation_status') === 'VALID'
      ? candidateGlobalOil
      : undefined;
    const exportsPerDay = globalOil ? number(globalOil, 'exports_barrels_per_day') : undefined;
    const existing = supplierNodes.get(nodeId);
    if (existing) {
      existing.sourceReferences.push(sourceReference('supplier_imports', text(row, 'supplier_import_id')));
      continue;
    }
    supplierNodes.set(nodeId, {
      nodeId,
      nodeType: 'supplier',
      name: text(row, 'country_name') || sourceCountryName,
      currentFlow: exportsPerDay === undefined ? undefined : { value: exportsPerDay, unit: 'barrels_per_day' },
      operationalState: BASELINE_STATE,
      stateSource: 'BASELINE',
      sourceReferences: [
        sourceReference('supplier_imports', text(row, 'supplier_import_id')),
        ...(globalOil ? [sourceReference('global_oil_snapshots', text(globalOil, 'global_oil_snapshot_id'))] : []),
      ],
      metadata: {
        countryId: countryId || null,
        sourceCountryName,
        mappingStatus,
        sourceBackedOperationalData: true,
        currentFlowSource: exportsPerDay === undefined ? null : 'global_oil_snapshots.exports_barrels_per_day',
        currentFlowAsOfDate: globalOil ? text(globalOil, 'as_of_date') || null : null,
        historicalImportSource: 'supplier_imports.quantity_tonnes',
      },
    });
  }
  for (const node of supplierNodes.values()) addNode(model, node);

  const latestPortActivityByPortId = new Map(
    repository.getLatestPortActivity()
      .map((row) => [text(row, 'port_id'), row] as const)
      .filter(([portId]) => portId.length > 0),
  );
  const ports = repository.getPorts({ pageSize: 1000 }).data as Phase2Row[];
  for (const row of ports) {
    if (text(row, 'mapping_status') !== 'MAPPED') continue;

    const portId = text(row, 'port_id');
    const candidateLatestActivity = latestPortActivityByPortId.get(portId);
    const latestActivity = candidateLatestActivity && text(candidateLatestActivity, 'validation_status') === 'VALID'
      ? candidateLatestActivity
      : undefined;
    const importTanker = latestActivity ? number(latestActivity, 'import_tanker') : undefined;
    const exportTanker = latestActivity ? number(latestActivity, 'export_tanker') : undefined;
    const currentFlow =
      importTanker === undefined || exportTanker === undefined
        ? undefined
        : {
            value: importTanker + exportTanker,
            unit: 'source_tanker_units_per_activity_day',
          };

    const nodeId = `port-${text(row, 'port_id')}`;
    addNode(model, {
      nodeId,
      nodeType: 'port',
      name: text(row, 'canonical_port_name'),
      currentFlow,
      operationalState: BASELINE_STATE,
      stateSource: 'BASELINE',
      sourceReferences: [sourceReference('ports', text(row, 'port_id'))],
      metadata: {
        latitude: number(row, 'latitude') ?? null,
        longitude: number(row, 'longitude') ?? null,
        country: text(row, 'country') || null,
        unLocode: text(row, 'un_locode') || null,
        liquidBulkFacility: text(row, 'liquid_bulk_facility') || null,
        oilTerminalFacility: text(row, 'oil_terminal_facility') || null,
        sourceBackedOperationalData: latestActivity !== undefined,
        currentFlowSource: currentFlow ? 'daily_port_activity.import_tanker + export_tanker' : null,
        currentFlowUnitStatus: latestActivity ? text(latestActivity, 'import_export_unit_status') || null : null,
        currentFlowActivityDate: latestActivity ? text(latestActivity, 'activity_date') || null : null,
      },
    });

    if (latestActivity && currentFlow) {
      const node = model.getNode(nodeId);
      node?.sourceReferences.push(sourceReference('daily_port_activity', text(latestActivity, 'daily_activity_id')));
    }
  }

  const refineries = repository.getRefineries({ pageSize: 1000 }).data as Phase2Row[];
  for (const row of refineries) {
    const capacity = number(row, 'capacity');
    addNode(model, {
      nodeId: `refinery-${text(row, 'refinery_id')}`,
      nodeType: 'refinery',
      name: text(row, 'refinery_name'),
      capacity: capacity === undefined ? undefined : { value: capacity, unit: text(row, 'capacity_unit') },
      operationalState: BASELINE_STATE,
      stateSource: 'BASELINE',
      sourceReferences: [sourceReference('refineries', text(row, 'refinery_id'))],
      metadata: {
        company: text(row, 'company'),
        state: text(row, 'state'),
        sourceBackedOperationalData: capacity !== undefined,
        capacitySource: capacity === undefined ? null : 'refineries.capacity',
        capacityStatus: text(row, 'capacity_status') || null,
      },
    });
  }

  const lanes = repository.getLanes({ pageSize: 1000 }).data as Phase2Row[];
  for (const row of lanes) {
    if (
      text(row, 'validation_status') !== 'VALID' ||
      text(row, 'geometry_status') !== 'AVAILABLE'
    ) continue;

    addNode(model, {
      nodeId: `shipping-route-${text(row, 'shipping_lane_id')}`,
      nodeType: 'shipping_route',
      name: text(row, 'feature_name') || `${text(row, 'lane_category')} shipping route`,
      operationalState: BASELINE_STATE,
      stateSource: 'BASELINE',
      sourceReferences: [sourceReference('shipping_lanes', text(row, 'shipping_lane_id'))],
      metadata: {
        laneCategory: text(row, 'lane_category'),
        geometryType: text(row, 'geometry_type'),
        geometryStatus: text(row, 'geometry_status'),
      },
    });
  }

  const chokepoints = repository.getChokepoints({ pageSize: 1000 }).data as Phase2Row[];
  for (const row of chokepoints) {
    if (text(row, 'mapping_status') !== 'MAPPED') continue;

    addNode(model, {
      nodeId: `chokepoint-${text(row, 'chokepoint_id')}`,
      nodeType: 'chokepoint',
      name: text(row, 'chokepoint_name'),
      operationalState: BASELINE_STATE,
      stateSource: 'BASELINE',
      sourceReferences: [sourceReference('chokepoints', text(row, 'chokepoint_id'))],
      metadata: { latitude: number(row, 'latitude') ?? null, longitude: number(row, 'longitude') ?? null },
    });
  }

  const strategicReserves = repository.getStrategicReserves({ pageSize: 1000 }).data as Phase2Row[];
  for (const row of strategicReserves) {
    if (text(row, 'mapping_status') !== 'MAPPED') continue;

    const capacity = number(row, 'capacity');
    addNode(model, {
      nodeId: `strategic-reserve-${text(row, 'strategic_reserve_id')}`,
      nodeType: 'strategic_reserve',
      name: text(row, 'facility_name') || text(row, 'strategic_reserve_id'),
      capacity: capacity === undefined ? undefined : { value: capacity, unit: text(row, 'capacity_unit') },
      operationalState: BASELINE_STATE,
      stateSource: 'BASELINE',
      sourceReferences: [sourceReference('strategic_reserves', text(row, 'strategic_reserve_id'))],
      metadata: {
        latitude: number(row, 'latitude') ?? null,
        longitude: number(row, 'longitude') ?? null,
        capacitySource: capacity === undefined ? null : 'strategic_reserves.capacity',
        capacityStatus: capacity === undefined ? null : 'SOURCE_REPORTED',
      },
    });
  }

  // Phase 2 deliberately leaves relationship-link tables empty/unresolved.
  // Add only the reviewed, source-backed relationships with stable Phase 2 IDs.
  enrichDigitalTwinRelationships(model);

  const connectedNodeIds = new Set(
    model.getEdges().flatMap((edge) => [edge.fromNodeId, edge.toNodeId]),
  );
  model.retainNodes((node) => {
    const hasConfirmedConnection = connectedNodeIds.has(node.nodeId);
    const hasVerifiedMeasurement = node.capacity !== undefined || node.currentFlow !== undefined;
    const hasMeaningfulSourceBackedData = node.metadata.sourceBackedOperationalData === true;
    const requiredByAnotherModule = node.metadata.requiredByModule === true;

    // Keep only confirmed relationships, verified measurements, meaningful
    // source-backed operational data, or explicitly required assets. This
    // removes isolated placeholders and geometry-only records without using
    // missing capacity or flow alone as a deletion rule.
    return hasConfirmedConnection || hasVerifiedMeasurement || hasMeaningfulSourceBackedData || requiredByAnotherModule;
  });

  return model;
};
