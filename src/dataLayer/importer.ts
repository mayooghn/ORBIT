import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { defaultPhase2DbPath, openPhase2Database } from './database';
import { PHASE2_DATA_TABLES } from './schema';

export interface Phase2ImportOptions {
  dbPath?: string;
  processedDir?: string;
}

export interface Phase2ImportResult {
  importRunId: string;
  processedDirectory: string;
  counts: Record<string, number>;
}

type CsvRow = Record<string, string>;

const DEFAULT_PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');

const stableId = (prefix: string, identity: string): string => {
  const digest = createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 20);
  return `${prefix}-${digest}`;
};

const value = (row: CsvRow, field: string): string => (row[field] ?? '').trim();

const nullable = (row: CsvRow, field: string): string | null => {
  const text = value(row, field);
  return text === '' ? null : text;
};

const numberValue = (row: CsvRow, field: string): number | null => {
  const text = value(row, field);
  if (text === '') return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value in ${field}: ${text}`);
  return parsed;
};

const requiredNumber = (row: CsvRow, field: string): number => {
  const parsed = numberValue(row, field);
  if (parsed === null) throw new Error(`Missing required numeric value in ${field}`);
  return parsed;
};

const parseCsv = (text: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === '') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).filter((cells) => cells.some((cell) => cell !== '')).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])) as CsvRow,
  );
};

const readCsv = (processedDir: string, fileName: string): CsvRow[] => {
  const filePath = path.join(processedDir, fileName);
  if (!existsSync(filePath)) throw new Error(`Processed dataset not found: ${filePath}`);
  return parseCsv(readFileSync(filePath, 'utf8'));
};

const readJson = (text: string): string => {
  try {
    JSON.parse(text);
    return text;
  } catch {
    return JSON.stringify(text);
  }
};

const runStatement = (database: DatabaseSync, sql: string, parameters: unknown[] = []): void => {
  database.prepare(sql).run(...parameters as never[]);
};

const allRows = (database: DatabaseSync, table: string): CsvRow[] =>
  database.prepare(`SELECT * FROM ${table}`).all() as unknown as CsvRow[];

const clearData = (database: DatabaseSync): void => {
  for (const table of PHASE2_DATA_TABLES) database.exec(`DELETE FROM ${table}`);
};

const insertSourceManifest = (database: DatabaseSync, rows: CsvRow[]): Map<string, string> => {
  const ids = new Map<string, string>();
  const statement = database.prepare(`
    INSERT INTO data_sources (
      data_source_id, source_dataset, source_path, source_format,
      source_row_or_feature_count, coverage_or_snapshot, source_sha256,
      raw_files_modified, processed_outputs
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of rows) {
    const dataset = value(row, 'source_dataset');
    const id = value(row, 'data_source_id') || stableId('source', dataset);
    ids.set(dataset, id);
    statement.run(
      id,
      dataset,
      value(row, 'source_path'),
      value(row, 'source_format'),
      requiredNumber(row, 'source_row_or_feature_count'),
      value(row, 'coverage_or_snapshot'),
      value(row, 'source_sha256'),
      value(row, 'raw_files_modified'),
      value(row, 'processed_outputs'),
    );
  }
  return ids;
};

const insertUnits = (database: DatabaseSync): void => {
  const units = [
    ['unit-barrels', 'barrels', null, 'stock_quantity', 'KNOWN', 'Global oil proven reserves.'],
    ['unit-barrels-per-day', 'barrels_per_day', null, 'rate', 'KNOWN', 'Global oil production, consumption, imports, and exports.'],
    ['unit-tonnes', 'tonnes', 'Ton', 'mass', 'SOURCE_DECLARED', 'Supplier crude quantity after source label normalization.'],
    ['unit-thousand-metric-tonnes', 'thousand_metric_tonnes', null, 'mass', 'SOURCE_DECLARED', 'Recent national crude-import totals.'],
    ['unit-metric-tonnes', 'metric_tonnes', null, 'mass', 'SOURCE_DECLARED', 'Petroleum consumption.'],
    ['unit-thousand-metric-tonnes-per-year', 'thousand_metric_tonnes_per_year', null, 'capacity', 'SOURCE_DECLARED', 'Refinery nameplate capacity.'],
    ['unit-counts-per-day', 'counts_per_day', null, 'count', 'KNOWN', 'Daily port-call fields.'],
    ['unit-metres', 'metres', null, 'length', 'KNOWN', 'World Port Index vessel dimensions.'],
    ['unit-source-undocumented', null, null, 'source_measure', 'UNDOCUMENTED', 'Daily port import/export measures and supplier trade values retain source values without conversion.'],
  ];
  const statement = database.prepare(`INSERT INTO unit_definitions (unit_id, canonical_unit_code, source_unit_text, quantity_kind, unit_status, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const unit of units) statement.run(...unit as never[]);
};

const insertFinancialPeriods = (database: DatabaseSync, rows: CsvRow[]): Map<string, string> => {
  const ids = new Map<string, string>();
  const statement = database.prepare(`INSERT INTO financial_periods (financial_period_id, financial_year, financial_year_start, source_financial_year_labels, source_datasets) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) {
    const financialYear = value(row, 'financial_year');
    const id = value(row, 'financial_period_id');
    ids.set(financialYear, id);
    statement.run(id, financialYear, requiredNumber(row, 'financial_year_start'), value(row, 'source_financial_year_labels'), value(row, 'source_datasets'));
  }
  return ids;
};

const insertProducts = (database: DatabaseSync, productRows: CsvRow[], aliasRows: CsvRow[], sourceIds: Map<string, string>): Map<string, string> => {
  const ids = new Map<string, string>();
  const productStatement = database.prepare(`INSERT INTO products (product_id, canonical_name, product_class, source_name, source_code, source_dataset, mapping_status, mapping_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of productRows) {
    const id = value(row, 'product_id');
    ids.set(value(row, 'canonical_name'), id);
    productStatement.run(id, value(row, 'canonical_name'), value(row, 'product_class'), value(row, 'source_name'), nullable(row, 'source_code'), value(row, 'source_dataset'), value(row, 'mapping_status'), value(row, 'mapping_method'));
  }
  const aliasStatement = database.prepare(`INSERT INTO product_aliases (product_alias_id, data_source_id, product_id, source_name, source_code, mapping_status, mapping_method) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const row of aliasRows) {
    const sourceDataset = value(row, 'source_dataset');
    const productId = nullable(row, 'product_id');
    aliasStatement.run(
      stableId('product-alias', `${sourceDataset}|${value(row, 'source_name')}|${value(row, 'source_code')}`),
      sourceIds.get(sourceDataset),
      productId,
      value(row, 'source_name'),
      nullable(row, 'source_code'),
      value(row, 'mapping_status'),
      value(row, 'mapping_method'),
    );
  }
  return ids;
};

const insertCountries = (database: DatabaseSync, countryRows: CsvRow[], aliasRows: CsvRow[], sourceIds: Map<string, string>): Map<string, string> => {
  const ids = new Map<string, string>();
  const statement = database.prepare(`INSERT INTO countries (country_id, canonical_name, source_dataset, mapping_status) VALUES (?, ?, ?, ?)`);
  for (const row of countryRows) {
    const id = value(row, 'country_id');
    ids.set(value(row, 'canonical_name'), id);
    statement.run(id, value(row, 'canonical_name'), value(row, 'source_dataset'), value(row, 'mapping_status'));
  }
  const aliasStatement = database.prepare(`INSERT INTO country_aliases (country_alias_id, data_source_id, country_id, source_name, source_normalized_name, country_code, mapping_status, mapping_method, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of aliasRows) {
    const sourceDataset = value(row, 'source_dataset');
    aliasStatement.run(
      stableId('country-alias', `${sourceDataset}|${value(row, 'source_name')}|${value(row, 'source_normalized_name')}|${value(row, 'country_code')}`),
      sourceIds.get(sourceDataset),
      nullable(row, 'country_id'),
      value(row, 'source_name'),
      nullable(row, 'source_normalized_name'),
      nullable(row, 'country_code'),
      value(row, 'mapping_status'),
      value(row, 'mapping_method'),
      nullable(row, 'review_reason'),
    );
  }
  return ids;
};

const insertPorts = (database: DatabaseSync, portRows: CsvRow[], mappingRows: CsvRow[], sourceIds: Map<string, string>, countryIds: Map<string, string>): Map<string, string> => {
  const portIds = new Map<string, string>();
  const portStatement = database.prepare(`INSERT INTO ports (port_id, canonical_port_name, source_port_name, source_name_variants, un_locode, latitude, longitude, country, country_id, source_dataset, mapping_status, mapping_method, source_record_key, world_port_index_number, source_unlocode_status, liquid_bulk_facility, oil_terminal_facility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of portRows) {
    const country = nullable(row, 'country');
    const id = value(row, 'port_id');
    portIds.set(id, id);
    portStatement.run(id, value(row, 'canonical_port_name'), value(row, 'source_port_name'), value(row, 'source_name_variants'), nullable(row, 'un_locode'), numberValue(row, 'latitude'), numberValue(row, 'longitude'), country, country ? countryIds.get(country) || null : null, value(row, 'source_dataset'), value(row, 'mapping_status'), value(row, 'mapping_method'), value(row, 'source_record_key'), nullable(row, 'world_port_index_number'), nullable(row, 'source_unlocode_status'), nullable(row, 'liquid_bulk_facility'), nullable(row, 'oil_terminal_facility'));
  }
  const identityStatement = database.prepare(`INSERT INTO port_source_identities (port_source_identity_id, data_source_id, port_id, source_record_key, source_port_name, source_world_port_index_number, source_un_locode, mapping_status, mapping_method, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of mappingRows) {
    const sourceDataset = value(row, 'source_dataset');
    identityStatement.run(
      stableId('port-source', `${sourceDataset}|${value(row, 'source_record_key')}`),
      sourceIds.get(sourceDataset),
      nullable(row, 'port_id'),
      value(row, 'source_record_key'),
      value(row, 'source_port_name'),
      nullable(row, 'source_world_port_index_number'),
      nullable(row, 'source_un_locode'),
      value(row, 'mapping_status'),
      value(row, 'mapping_method'),
      nullable(row, 'review_reason'),
    );
  }
  return portIds;
};

const insertRefineries = (database: DatabaseSync, rows: CsvRow[], sourceIds: Map<string, string>): void => {
  const statement = database.prepare(`INSERT INTO refineries (refinery_id, refinery_name, company, state, capacity, capacity_unit, latitude, longitude, source_company_name, source_refinery_name, source_state_name, data_source_id, source_row_number, state_mapping_status, capacity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of rows) statement.run(value(row, 'refinery_id'), value(row, 'refinery_name'), value(row, 'company'), value(row, 'state'), requiredNumber(row, 'capacity'), value(row, 'capacity_unit'), numberValue(row, 'latitude'), numberValue(row, 'longitude'), value(row, 'source_company_name'), value(row, 'source_refinery_name'), value(row, 'source_state_name'), sourceIds.get(value(row, 'source_dataset')), requiredNumber(row, 'source_row_number'), value(row, 'state_mapping_status'), value(row, 'capacity_status'));
};

const insertShippingLanes = (database: DatabaseSync, processedDir: string, rows: CsvRow[], sourceIds: Map<string, string>): void => {
  const statement = database.prepare(`INSERT INTO shipping_lanes (shipping_lane_id, source_feature_id, source_object_id, feature_name, lane_category, geometry_type, line_part_count, coordinate_point_count, geometry_valid, geometry_bounds_lon_lat, source_geometry_crs_status, data_source_id, source_feature_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const geometryStatement = database.prepare(`INSERT INTO shipping_lane_geometries (shipping_lane_geometry_id, shipping_lane_id, geometry_type, geometry_json, source_geometry_crs_status, geometry_status) VALUES (?, ?, ?, ?, ?, ?)`);
  const geoJsonPath = path.join(processedDir, 'shipping_lanes_v1.geojson');
  if (!existsSync(geoJsonPath)) throw new Error(`Processed shipping-lane GeoJSON not found: ${geoJsonPath}`);
  const geoJson = JSON.parse(readFileSync(geoJsonPath, 'utf8')) as { features?: Array<{ id?: string | number; geometry?: unknown }> };
  const features = geoJson.features || [];
  if (features.length !== rows.length) throw new Error(`Shipping-lane metadata/GeoJSON feature count mismatch: ${rows.length} vs ${features.length}`);
  for (const row of rows) {
    const id = value(row, 'shipping_lane_id');
    const sourceDataset = value(row, 'source_dataset');
    const featureNumber = requiredNumber(row, 'source_feature_number');
    const feature = features[featureNumber - 1];
    if (!feature) throw new Error(`Missing processed GeoJSON feature ${featureNumber}`);
    if (String(feature.id ?? '') !== value(row, 'source_feature_id')) throw new Error(`Shipping-lane feature identity mismatch at feature ${featureNumber}`);
    const geometry = feature.geometry;
    if (!geometry || typeof geometry !== 'object') throw new Error(`Missing shipping-lane geometry at feature ${featureNumber}`);
    const geometryJson = JSON.stringify(geometry);
    statement.run(id, value(row, 'source_feature_id'), nullable(row, 'source_object_id'), nullable(row, 'feature_name'), value(row, 'lane_category'), value(row, 'geometry_type'), requiredNumber(row, 'line_part_count'), requiredNumber(row, 'coordinate_point_count'), value(row, 'geometry_valid') === 'TRUE' ? 1 : 0, nullable(row, 'geometry_bounds_lon_lat'), value(row, 'source_geometry_crs_status'), sourceIds.get(sourceDataset), requiredNumber(row, 'source_feature_number'), value(row, 'validation_status'));
    geometryStatement.run(stableId('shipping-lane-geometry', id), id, value(row, 'geometry_type'), geometryJson, value(row, 'source_geometry_crs_status'), 'AVAILABLE');
  }
};

const insertFacts = (database: DatabaseSync, processedDir: string, sourceIds: Map<string, string>, periodIds: Map<string, string>, countryIds: Map<string, string>, productIds: Map<string, string>): Record<string, number> => {
  const counts: Record<string, number> = {};
  const supplierRows = readCsv(processedDir, 'supplier_imports.csv');
  const supplierStatement = database.prepare(`INSERT INTO supplier_imports (supplier_import_id, financial_period_id, country_id, quantity_tonnes, quantity_unit, source_country_name, source_country_normalized_name, country_code, source_product_code, source_product_description, product_id, source_quantity_unit, source_trade_value_source_units, trade_value_unit_status, data_source_id, source_row_number, country_mapping_status, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of supplierRows) {
    const sourceDataset = value(row, 'source_dataset');
    supplierStatement.run(stableId('supplier-import', `${sourceDataset}:${value(row, 'source_row_number')}`), periodIds.get(value(row, 'financial_year')), nullable(row, 'country_id'), requiredNumber(row, 'quantity_tonnes'), value(row, 'quantity_unit'), value(row, 'source_country_name'), value(row, 'source_country_normalized_name'), value(row, 'country_code'), value(row, 'source_product_code'), value(row, 'source_product_description'), value(row, 'product_id'), value(row, 'source_quantity_unit'), numberValue(row, 'source_trade_value_source_units'), 'UNDOCUMENTED', sourceIds.get(sourceDataset), requiredNumber(row, 'source_row_number'), value(row, 'country_mapping_status'), value(row, 'validation_status'));
  }
  counts.supplier_imports = supplierRows.length;

  const crudeRows = readCsv(processedDir, 'crude_import_totals.csv');
  const crudeStatement = database.prepare(`INSERT INTO crude_import_totals (crude_import_total_id, financial_period_id, quantity_thousand_metric_tonnes, quantity_unit, source_financial_year, data_source_id, source_row_number, validation_status, time_series_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of crudeRows) crudeStatement.run(stableId('crude-import-total', `${value(row, 'source_dataset')}:${value(row, 'source_row_number')}`), periodIds.get(value(row, 'financial_year')), requiredNumber(row, 'quantity_thousand_metric_tonnes'), value(row, 'quantity_unit'), value(row, 'source_financial_year'), sourceIds.get(value(row, 'source_dataset')), requiredNumber(row, 'source_row_number'), value(row, 'validation_status'), value(row, 'time_series_scope'));
  counts.crude_import_totals = crudeRows.length;

  const consumptionRows = readCsv(processedDir, 'petroleum_consumption.csv');
  const consumptionStatement = database.prepare(`INSERT INTO petroleum_consumption (petroleum_consumption_id, product_id, financial_period_id, source_product_name, calendar_year, month_number, month_name, consumption_metric_tonnes, consumption_unit, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of consumptionRows) consumptionStatement.run(stableId('petroleum-consumption', `${value(row, 'source_dataset')}:${value(row, 'source_row_number')}`), value(row, 'product_id'), periodIds.get(value(row, 'financial_year')), value(row, 'source_product_name'), requiredNumber(row, 'calendar_year'), requiredNumber(row, 'month_number'), value(row, 'month_name'), requiredNumber(row, 'consumption_metric_tonnes'), value(row, 'consumption_unit'), sourceIds.get(value(row, 'source_dataset')), requiredNumber(row, 'source_row_number'), value(row, 'validation_status'));
  counts.petroleum_consumption = consumptionRows.length;

  const globalRows = readCsv(processedDir, 'global_oil_snapshot.csv');
  const globalStatement = database.prepare(`INSERT INTO global_oil_snapshots (global_oil_snapshot_id, country_id, canonical_country_name, source_country_name, source_rank, rank, source_proven_reserves_barrels, proven_reserves_barrels, source_production_barrels_per_day, production_barrels_per_day, source_consumption_barrels_per_day, consumption_barrels_per_day, source_exports_barrels_per_day, exports_barrels_per_day, source_imports_barrels_per_day, imports_barrels_per_day, as_of_date, data_source_id, source_row_number, missing_metric_count, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of globalRows) globalStatement.run(value(row, 'global_oil_snapshot_id'), value(row, 'country_id'), value(row, 'canonical_country_name'), value(row, 'source_country_name'), nullable(row, 'source_rank'), numberValue(row, 'rank'), nullable(row, 'source_proven_reserves_barrels'), numberValue(row, 'proven_reserves_barrels'), nullable(row, 'source_production_barrels_per_day'), numberValue(row, 'production_barrels_per_day'), nullable(row, 'source_consumption_barrels_per_day'), numberValue(row, 'consumption_barrels_per_day'), nullable(row, 'source_exports_barrels_per_day'), numberValue(row, 'exports_barrels_per_day'), nullable(row, 'source_imports_barrels_per_day'), numberValue(row, 'imports_barrels_per_day'), nullable(row, 'as_of_date'), sourceIds.get(value(row, 'source_dataset')), requiredNumber(row, 'source_row_number'), requiredNumber(row, 'missing_metric_count'), value(row, 'validation_status'));
  counts.global_oil_snapshots = globalRows.length;

  const activityRows = readCsv(processedDir, 'daily_port_activity.csv');
  const identityIds = new Map<string, string>();
  for (const row of readCsv(processedDir, 'port_source_mapping.csv')) identityIds.set(`${value(row, 'source_dataset')}|${value(row, 'source_record_key')}`, stableId('port-source', `${value(row, 'source_dataset')}|${value(row, 'source_record_key')}`));
  const activityFields = ['portcalls_container', 'portcalls_dry_bulk', 'portcalls_general_cargo', 'portcalls_roro', 'portcalls_tanker', 'portcalls_cargo', 'portcalls', 'import_container', 'import_dry_bulk', 'import_general_cargo', 'import_roro', 'import_tanker', 'import_cargo', 'import', 'export_container', 'export_dry_bulk', 'export_general_cargo', 'export_roro', 'export_tanker', 'export_cargo', 'export'];
  const activityStatement = database.prepare(`INSERT INTO daily_port_activity (daily_activity_id, port_id, port_source_identity_id, source_port_id, source_port_name, canonical_port_name, port_mapping_status, port_mapping_method, activity_date, source_timestamp, source_year, source_month, source_day, source_country, source_iso3, ${activityFields.join(', ')}, source_object_id, import_export_unit_status, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${activityFields.map(() => '?').join(', ')}, ?, ?, ?, ?, ?)`);
  for (const row of activityRows) {
    const identityId = identityIds.get(`${value(row, 'source_dataset')}|${value(row, 'source_port_id')}`);
    if (!identityId) throw new Error(`Missing port source identity for ${value(row, 'source_port_id')}`);
    activityStatement.run(value(row, 'daily_activity_id'), nullable(row, 'port_id'), identityId, value(row, 'source_port_id'), value(row, 'source_port_name'), nullable(row, 'canonical_port_name'), value(row, 'port_mapping_status'), value(row, 'port_mapping_method'), value(row, 'activity_date'), value(row, 'source_timestamp'), requiredNumber(row, 'source_year'), requiredNumber(row, 'source_month'), requiredNumber(row, 'source_day'), value(row, 'source_country'), value(row, 'source_iso3'), ...activityFields.map((field) => requiredNumber(row, field)), value(row, 'source_object_id'), value(row, 'import_export_unit_status'), sourceIds.get(value(row, 'source_dataset')), requiredNumber(row, 'source_row_number'), value(row, 'validation_status'));
  }
  counts.daily_port_activity = activityRows.length;
  return counts;
};

const insertQuality = (database: DatabaseSync, processedDir: string, sourceIds: Map<string, string>): Record<string, number> => {
  const counts: Record<string, number> = {};
  const summaryRows = readCsv(processedDir, 'data_quality_summary.csv');
  const summaryStatement = database.prepare(`INSERT INTO data_quality_summaries (dataset, processed_file, source_dataset, input_row_count, output_row_count, excluded_row_count, null_count_by_important_field, duplicate_count, invalid_value_count, unresolved_mapping_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of summaryRows) summaryStatement.run(value(row, 'dataset'), value(row, 'processed_file'), value(row, 'source_dataset'), requiredNumber(row, 'input_row_count'), requiredNumber(row, 'output_row_count'), requiredNumber(row, 'excluded_row_count'), readJson(value(row, 'null_count_by_important_field')), requiredNumber(row, 'duplicate_count'), requiredNumber(row, 'invalid_value_count'), requiredNumber(row, 'unresolved_mapping_count'), value(row, 'notes'));
  counts.data_quality_summaries = summaryRows.length;

  const issueRows = readCsv(processedDir, 'data_quality_issues.csv');
  const issueStatement = database.prepare(`INSERT INTO data_quality_issues (data_quality_issue_id, data_source_id, source_dataset, source_row_number, source_record_key, issue_type, field_name, severity, issue_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of issueRows) issueStatement.run(stableId('quality-issue', JSON.stringify(row)), sourceIds.get(value(row, 'source_dataset')), value(row, 'source_dataset'), numberValue(row, 'source_row_number'), value(row, 'source_record_key'), value(row, 'issue_type'), value(row, 'field_name'), value(row, 'severity'), value(row, 'issue_status'), value(row, 'description'));
  counts.data_quality_issues = issueRows.length;
  return counts;
};

const insertManualReview = (database: DatabaseSync, processedDir: string, sourceIds: Map<string, string>): number => {
  const countryRows = readCsv(path.join(processedDir, 'manual_review'), 'country_manual_review.csv');
  const portRows = readCsv(path.join(processedDir, 'manual_review'), 'port_manual_review.csv');
  const statement = database.prepare(`INSERT INTO manual_review_records (manual_review_id, review_type, data_source_id, source_dataset, source_record_key, source_name, candidate_name, source_identifier, mapping_status, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of countryRows) statement.run(stableId('manual-country', JSON.stringify(row)), 'COUNTRY', sourceIds.get(value(row, 'source_dataset')), value(row, 'source_dataset'), null, value(row, 'source_name'), null, nullable(row, 'country_code'), 'MANUAL_REVIEW', value(row, 'review_reason'));
  for (const row of portRows) statement.run(stableId('manual-port', JSON.stringify(row)), 'PORT', sourceIds.get(value(row, 'source_dataset')), value(row, 'source_dataset'), value(row, 'source_record_key'), value(row, 'source_port_name'), nullable(row, 'candidate_canonical_port_name'), nullable(row, 'source_identifier'), 'MANUAL_REVIEW', value(row, 'reason'));
  return countryRows.length + portRows.length;
};

const insertRelationshipStatuses = (database: DatabaseSync): void => {
  const rows = [
    ['refinery_port', 'Refinery to port', 'UNRESOLVED', 'phase2-data-model.md and phase2-cleaning-report.md', 'Source data contains no refinery coordinates, port identifiers, or reviewed refinery-port links.'],
    ['port_shipping_lane', 'Port to shipping lane', 'UNRESOLVED', 'phase2-data-model.md and phase2-cleaning-report.md', 'Shipping lanes contain geometry categories but no port endpoints or join keys.'],
    ['chokepoint_shipping_lane', 'Chokepoint to shipping lane', 'NOT_CONNECTED', 'phase2-data-model.md', 'No chokepoint dataset is supplied.'],
    ['supplier_import_route', 'Supplier import to route', 'UNRESOLVED', 'phase2-data-model.md and phase2-cleaning-report.md', 'Supplier imports have no route, lane, receiving port, or refinery relationship.'],
    ['strategic_reserve', 'Strategic reserve', 'NOT_CONNECTED', 'phase2-data-model.md', 'No strategic-reserve dataset is supplied.'],
  ];
  const statement = database.prepare(`INSERT INTO relationship_statuses (relationship_key, relationship_name, status, source_basis, notes) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) statement.run(...row as never[]);
};

export const importPhase2Data = (options: Phase2ImportOptions = {}): Phase2ImportResult => {
  const processedDirectory = options.processedDir || process.env.ORBIT_PROCESSED_DATA_DIR || DEFAULT_PROCESSED_DIR;
  const database = openPhase2Database({ dbPath: options.dbPath || defaultPhase2DbPath() });
  const importRunId = stableId('import-run', `${processedDirectory}|${new Date().toISOString()}`);
  const startedAt = new Date().toISOString();
  let counts: Record<string, number> = {};
  runStatement(database, `INSERT INTO import_runs (import_run_id, processed_directory, started_at, status) VALUES (?, ?, ?, 'RUNNING')`, [importRunId, processedDirectory, startedAt]);
  try {
    database.exec('BEGIN');
    clearData(database);
    insertUnits(database);
    const sourceIds = insertSourceManifest(database, readCsv(processedDirectory, 'data_source.csv'));
    const periodIds = insertFinancialPeriods(database, readCsv(processedDirectory, 'financial_period.csv'));
    const productIds = insertProducts(database, readCsv(processedDirectory, 'product.csv'), readCsv(processedDirectory, 'product_source_mapping.csv'), sourceIds);
    const countryIds = insertCountries(database, readCsv(processedDirectory, 'country.csv'), readCsv(processedDirectory, 'country_source_mapping.csv'), sourceIds);
    insertPorts(database, readCsv(processedDirectory, 'port.csv'), readCsv(processedDirectory, 'port_source_mapping.csv'), sourceIds, countryIds);
    insertRefineries(database, readCsv(processedDirectory, 'refinery.csv'), sourceIds);
    insertShippingLanes(database, processedDirectory, readCsv(processedDirectory, 'shipping_lanes_metadata.csv'), sourceIds);
    counts = insertFacts(database, processedDirectory, sourceIds, periodIds, countryIds, productIds);
    counts.data_sources = allRows(database, 'data_sources').length;
    counts.financial_periods = allRows(database, 'financial_periods').length;
    counts.products = allRows(database, 'products').length;
    counts.countries = allRows(database, 'countries').length;
    counts.country_aliases = allRows(database, 'country_aliases').length;
    counts.ports = allRows(database, 'ports').length;
    counts.port_source_identities = allRows(database, 'port_source_identities').length;
    counts.refineries = allRows(database, 'refineries').length;
    counts.shipping_lanes = allRows(database, 'shipping_lanes').length;
    Object.assign(counts, insertQuality(database, processedDirectory, sourceIds));
    counts.manual_review_records = insertManualReview(database, processedDirectory, sourceIds);
    insertRelationshipStatuses(database);
    counts.relationship_statuses = allRows(database, 'relationship_statuses').length;
    database.exec('COMMIT');
    runStatement(database, `UPDATE import_runs SET completed_at = ?, status = 'COMPLETED', row_counts_json = ? WHERE import_run_id = ?`, [new Date().toISOString(), JSON.stringify(counts), importRunId]);
    database.close();
    return { importRunId, processedDirectory, counts };
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch { /* Preserve original import error. */ }
    runStatement(database, `UPDATE import_runs SET completed_at = ?, status = 'FAILED', error_message = ? WHERE import_run_id = ?`, [new Date().toISOString(), error instanceof Error ? error.message : String(error), importRunId]);
    database.close();
    throw error;
  }
};
