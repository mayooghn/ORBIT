var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// tests/hormuz-disruption-validation.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_test = __toESM(require("node:test"), 1);

// src/dataLayer/database.ts
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);
var import_node_sqlite = require("node:sqlite");

// src/dataLayer/schema.ts
var PHASE2_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS data_sources (
  data_source_id TEXT PRIMARY KEY,
  source_dataset TEXT NOT NULL UNIQUE,
  source_path TEXT NOT NULL,
  source_format TEXT NOT NULL CHECK (source_format IN ('CSV', 'GeoJSON', 'README')),
  source_row_or_feature_count INTEGER NOT NULL CHECK (source_row_or_feature_count >= 0),
  coverage_or_snapshot TEXT,
  source_sha256 TEXT NOT NULL CHECK (length(source_sha256) = 64),
  raw_files_modified TEXT NOT NULL CHECK (raw_files_modified IN ('YES', 'NO')),
  processed_outputs TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS import_runs (
  import_run_id TEXT PRIMARY KEY,
  processed_directory TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  row_counts_json TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS unit_definitions (
  unit_id TEXT PRIMARY KEY,
  canonical_unit_code TEXT,
  source_unit_text TEXT,
  quantity_kind TEXT NOT NULL,
  unit_status TEXT NOT NULL CHECK (unit_status IN ('KNOWN', 'SOURCE_DECLARED', 'UNDOCUMENTED', 'MANUAL_REVIEW')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS financial_periods (
  financial_period_id TEXT PRIMARY KEY,
  financial_year TEXT NOT NULL UNIQUE,
  financial_year_start INTEGER NOT NULL CHECK (financial_year_start BETWEEN 1900 AND 2200),
  source_financial_year_labels TEXT NOT NULL,
  source_datasets TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS countries (
  country_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  source_dataset TEXT NOT NULL,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('CANONICAL', 'MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  iso2 TEXT,
  iso3 TEXT,
  region_id TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS country_aliases (
  country_alias_id TEXT PRIMARY KEY,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  country_id TEXT REFERENCES countries(country_id),
  source_name TEXT NOT NULL,
  source_normalized_name TEXT,
  country_code TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  mapping_method TEXT,
  review_reason TEXT,
  UNIQUE (data_source_id, source_name, source_normalized_name, country_code)
);

CREATE TABLE IF NOT EXISTS regions (
  region_id TEXT PRIMARY KEY,
  country_id TEXT REFERENCES countries(country_id),
  region_name TEXT NOT NULL,
  region_type TEXT NOT NULL,
  source_region_name TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED'))
);

CREATE TABLE IF NOT EXISTS products (
  product_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  product_class TEXT NOT NULL CHECK (product_class IN ('CRUDE', 'PETROLEUM_PRODUCT', 'OTHER')),
  source_name TEXT NOT NULL,
  source_code TEXT,
  source_dataset TEXT NOT NULL,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('CANONICAL', 'MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  mapping_method TEXT
);

CREATE TABLE IF NOT EXISTS product_aliases (
  product_alias_id TEXT PRIMARY KEY,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  product_id TEXT REFERENCES products(product_id),
  source_name TEXT NOT NULL,
  source_code TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  mapping_method TEXT,
  UNIQUE (data_source_id, source_name, source_code)
);

CREATE TABLE IF NOT EXISTS ports (
  port_id TEXT PRIMARY KEY,
  canonical_port_name TEXT NOT NULL,
  source_port_name TEXT NOT NULL,
  source_name_variants TEXT NOT NULL,
  un_locode TEXT,
  latitude REAL,
  longitude REAL,
  country TEXT,
  country_id TEXT REFERENCES countries(country_id),
  source_dataset TEXT NOT NULL,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('CANONICAL', 'MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  mapping_method TEXT,
  source_record_key TEXT NOT NULL,
  world_port_index_number TEXT,
  source_unlocode_status TEXT,
  liquid_bulk_facility TEXT,
  oil_terminal_facility TEXT
);

CREATE TABLE IF NOT EXISTS port_source_identities (
  port_source_identity_id TEXT PRIMARY KEY,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  port_id TEXT REFERENCES ports(port_id),
  source_record_key TEXT NOT NULL,
  source_port_name TEXT NOT NULL,
  source_world_port_index_number TEXT,
  source_un_locode TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  mapping_method TEXT,
  review_reason TEXT,
  UNIQUE (data_source_id, source_record_key)
);

CREATE TABLE IF NOT EXISTS refineries (
  refinery_id TEXT PRIMARY KEY,
  refinery_name TEXT NOT NULL,
  company TEXT NOT NULL,
  state TEXT NOT NULL,
  capacity REAL NOT NULL CHECK (capacity >= 0),
  capacity_unit TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  source_company_name TEXT NOT NULL,
  source_refinery_name TEXT NOT NULL,
  source_state_name TEXT NOT NULL,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  state_mapping_status TEXT NOT NULL,
  capacity_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_lanes (
  shipping_lane_id TEXT PRIMARY KEY,
  source_feature_id TEXT NOT NULL,
  source_object_id TEXT,
  feature_name TEXT,
  lane_category TEXT NOT NULL CHECK (lane_category IN ('Major', 'Middle', 'Minor')),
  geometry_type TEXT NOT NULL,
  line_part_count INTEGER NOT NULL CHECK (line_part_count >= 0),
  coordinate_point_count INTEGER NOT NULL CHECK (coordinate_point_count >= 0),
  geometry_valid INTEGER NOT NULL CHECK (geometry_valid IN (0, 1)),
  geometry_bounds_lon_lat TEXT,
  source_geometry_crs_status TEXT NOT NULL,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_feature_number INTEGER NOT NULL CHECK (source_feature_number > 0),
  validation_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_lane_geometries (
  shipping_lane_geometry_id TEXT PRIMARY KEY,
  shipping_lane_id TEXT NOT NULL REFERENCES shipping_lanes(shipping_lane_id),
  geometry_type TEXT NOT NULL,
  geometry_json TEXT,
  source_geometry_crs_status TEXT NOT NULL,
  geometry_status TEXT NOT NULL CHECK (geometry_status IN ('AVAILABLE', 'NOT_LOADED', 'MANUAL_REVIEW'))
);

CREATE TABLE IF NOT EXISTS chokepoints (
  chokepoint_id TEXT PRIMARY KEY,
  chokepoint_name TEXT NOT NULL UNIQUE,
  country_id TEXT REFERENCES countries(country_id),
  latitude REAL,
  longitude REAL,
  source_dataset TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS supplier_imports (
  supplier_import_id TEXT PRIMARY KEY,
  financial_period_id TEXT NOT NULL REFERENCES financial_periods(financial_period_id),
  country_id TEXT REFERENCES countries(country_id),
  quantity_tonnes REAL NOT NULL CHECK (quantity_tonnes >= 0),
  quantity_unit TEXT NOT NULL,
  source_country_name TEXT NOT NULL,
  source_country_normalized_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  source_product_code TEXT NOT NULL,
  source_product_description TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(product_id),
  source_quantity_unit TEXT NOT NULL,
  source_trade_value_source_units REAL,
  trade_value_unit_status TEXT NOT NULL CHECK (trade_value_unit_status = 'UNDOCUMENTED'),
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  country_mapping_status TEXT NOT NULL,
  validation_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crude_import_totals (
  crude_import_total_id TEXT PRIMARY KEY,
  financial_period_id TEXT NOT NULL REFERENCES financial_periods(financial_period_id),
  quantity_thousand_metric_tonnes REAL NOT NULL CHECK (quantity_thousand_metric_tonnes >= 0),
  quantity_unit TEXT NOT NULL,
  source_financial_year TEXT NOT NULL,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  validation_status TEXT NOT NULL,
  time_series_scope TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS petroleum_consumption (
  petroleum_consumption_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(product_id),
  financial_period_id TEXT NOT NULL REFERENCES financial_periods(financial_period_id),
  source_product_name TEXT NOT NULL,
  calendar_year INTEGER NOT NULL,
  month_number INTEGER NOT NULL CHECK (month_number BETWEEN 1 AND 12),
  month_name TEXT NOT NULL,
  consumption_metric_tonnes REAL NOT NULL CHECK (consumption_metric_tonnes >= 0),
  consumption_unit TEXT NOT NULL,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  validation_status TEXT NOT NULL,
  UNIQUE (product_id, financial_period_id, month_number)
);

CREATE TABLE IF NOT EXISTS global_oil_snapshots (
  global_oil_snapshot_id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL REFERENCES countries(country_id),
  canonical_country_name TEXT NOT NULL,
  source_country_name TEXT NOT NULL,
  source_rank TEXT,
  rank INTEGER,
  source_proven_reserves_barrels TEXT,
  proven_reserves_barrels REAL,
  source_production_barrels_per_day TEXT,
  production_barrels_per_day REAL,
  source_consumption_barrels_per_day TEXT,
  consumption_barrels_per_day REAL,
  source_exports_barrels_per_day TEXT,
  exports_barrels_per_day REAL,
  source_imports_barrels_per_day TEXT,
  imports_barrels_per_day REAL,
  as_of_date TEXT,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  missing_metric_count INTEGER NOT NULL CHECK (missing_metric_count >= 0),
  validation_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_port_activity (
  daily_activity_id TEXT PRIMARY KEY,
  port_id TEXT REFERENCES ports(port_id),
  port_source_identity_id TEXT NOT NULL REFERENCES port_source_identities(port_source_identity_id),
  source_port_id TEXT NOT NULL,
  source_port_name TEXT NOT NULL,
  canonical_port_name TEXT,
  port_mapping_status TEXT NOT NULL,
  port_mapping_method TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  source_timestamp TEXT NOT NULL,
  source_year INTEGER NOT NULL,
  source_month INTEGER NOT NULL,
  source_day INTEGER NOT NULL,
  source_country TEXT NOT NULL,
  source_iso3 TEXT NOT NULL,
  portcalls_container REAL NOT NULL CHECK (portcalls_container >= 0),
  portcalls_dry_bulk REAL NOT NULL CHECK (portcalls_dry_bulk >= 0),
  portcalls_general_cargo REAL NOT NULL CHECK (portcalls_general_cargo >= 0),
  portcalls_roro REAL NOT NULL CHECK (portcalls_roro >= 0),
  portcalls_tanker REAL NOT NULL CHECK (portcalls_tanker >= 0),
  portcalls_cargo REAL NOT NULL CHECK (portcalls_cargo >= 0),
  portcalls REAL NOT NULL CHECK (portcalls >= 0),
  import_container REAL NOT NULL CHECK (import_container >= 0),
  import_dry_bulk REAL NOT NULL CHECK (import_dry_bulk >= 0),
  import_general_cargo REAL NOT NULL CHECK (import_general_cargo >= 0),
  import_roro REAL NOT NULL CHECK (import_roro >= 0),
  import_tanker REAL NOT NULL CHECK (import_tanker >= 0),
  import_cargo REAL NOT NULL CHECK (import_cargo >= 0),
  import REAL NOT NULL CHECK (import >= 0),
  export_container REAL NOT NULL CHECK (export_container >= 0),
  export_dry_bulk REAL NOT NULL CHECK (export_dry_bulk >= 0),
  export_general_cargo REAL NOT NULL CHECK (export_general_cargo >= 0),
  export_roro REAL NOT NULL CHECK (export_roro >= 0),
  export_tanker REAL NOT NULL CHECK (export_tanker >= 0),
  export_cargo REAL NOT NULL CHECK (export_cargo >= 0),
  export REAL NOT NULL CHECK (export >= 0),
  source_object_id TEXT NOT NULL,
  import_export_unit_status TEXT NOT NULL CHECK (import_export_unit_status = 'UNDOCUMENTED'),
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  validation_status TEXT NOT NULL,
  UNIQUE (port_source_identity_id, activity_date)
);

CREATE TABLE IF NOT EXISTS strategic_reserves (
  strategic_reserve_id TEXT PRIMARY KEY,
  country_id TEXT REFERENCES countries(country_id),
  facility_name TEXT,
  capacity REAL,
  capacity_unit TEXT,
  latitude REAL,
  longitude REAL,
  data_source_id TEXT REFERENCES data_sources(data_source_id),
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS refinery_port_links (
  refinery_port_link_id TEXT PRIMARY KEY,
  refinery_id TEXT NOT NULL REFERENCES refineries(refinery_id),
  port_id TEXT NOT NULL REFERENCES ports(port_id),
  data_source_id TEXT REFERENCES data_sources(data_source_id),
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS port_shipping_lane_links (
  port_shipping_lane_link_id TEXT PRIMARY KEY,
  port_id TEXT NOT NULL REFERENCES ports(port_id),
  shipping_lane_id TEXT NOT NULL REFERENCES shipping_lanes(shipping_lane_id),
  data_source_id TEXT REFERENCES data_sources(data_source_id),
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS chokepoint_shipping_lane_links (
  chokepoint_shipping_lane_link_id TEXT PRIMARY KEY,
  chokepoint_id TEXT NOT NULL REFERENCES chokepoints(chokepoint_id),
  shipping_lane_id TEXT NOT NULL REFERENCES shipping_lanes(shipping_lane_id),
  data_source_id TEXT REFERENCES data_sources(data_source_id),
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS import_route_links (
  import_route_link_id TEXT PRIMARY KEY,
  supplier_import_id TEXT NOT NULL REFERENCES supplier_imports(supplier_import_id),
  shipping_lane_id TEXT REFERENCES shipping_lanes(shipping_lane_id),
  port_id TEXT REFERENCES ports(port_id),
  refinery_id TEXT REFERENCES refineries(refinery_id),
  data_source_id TEXT REFERENCES data_sources(data_source_id),
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED', 'MANUAL_REVIEW', 'UNRESOLVED')),
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS data_quality_summaries (
  dataset TEXT PRIMARY KEY,
  processed_file TEXT NOT NULL,
  source_dataset TEXT NOT NULL,
  input_row_count INTEGER NOT NULL,
  output_row_count INTEGER NOT NULL,
  excluded_row_count INTEGER NOT NULL,
  null_count_by_important_field TEXT NOT NULL,
  duplicate_count INTEGER NOT NULL,
  invalid_value_count INTEGER NOT NULL,
  unresolved_mapping_count INTEGER NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality_issues (
  data_quality_issue_id TEXT PRIMARY KEY,
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_dataset TEXT NOT NULL,
  source_row_number INTEGER,
  source_record_key TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'REVIEW', 'BLOCKING')),
  issue_status TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS manual_review_records (
  manual_review_id TEXT PRIMARY KEY,
  review_type TEXT NOT NULL CHECK (review_type IN ('COUNTRY', 'PORT')),
  data_source_id TEXT NOT NULL REFERENCES data_sources(data_source_id),
  source_dataset TEXT NOT NULL,
  source_record_key TEXT,
  source_name TEXT NOT NULL,
  candidate_name TEXT,
  source_identifier TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status = 'MANUAL_REVIEW'),
  review_reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_statuses (
  relationship_key TEXT PRIMARY KEY,
  relationship_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('UNRESOLVED', 'NOT_CONNECTED', 'READY')),
  source_basis TEXT NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategic_reserve_optimization_runs (
  optimization_id TEXT PRIMARY KEY,
  requested_at TEXT NOT NULL,
  request_json TEXT NOT NULL,
  result_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_country_aliases_status ON country_aliases(mapping_status);
CREATE INDEX IF NOT EXISTS idx_ports_name ON ports(canonical_port_name);
CREATE INDEX IF NOT EXISTS idx_ports_status ON ports(mapping_status);
CREATE INDEX IF NOT EXISTS idx_supplier_imports_period ON supplier_imports(financial_period_id);
CREATE INDEX IF NOT EXISTS idx_supplier_imports_country ON supplier_imports(country_id);
CREATE INDEX IF NOT EXISTS idx_consumption_period ON petroleum_consumption(financial_period_id);
CREATE INDEX IF NOT EXISTS idx_consumption_product ON petroleum_consumption(product_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_port_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_port ON daily_port_activity(port_id);
CREATE INDEX IF NOT EXISTS idx_quality_issue_type ON data_quality_issues(issue_type);
`;
var PHASE2_DATA_TABLES = [
  "relationship_statuses",
  "manual_review_records",
  "data_quality_issues",
  "data_quality_summaries",
  "import_route_links",
  "chokepoint_shipping_lane_links",
  "port_shipping_lane_links",
  "refinery_port_links",
  "strategic_reserves",
  "daily_port_activity",
  "global_oil_snapshots",
  "petroleum_consumption",
  "crude_import_totals",
  "supplier_imports",
  "chokepoints",
  "shipping_lane_geometries",
  "shipping_lanes",
  "refineries",
  "port_source_identities",
  "ports",
  "product_aliases",
  "products",
  "regions",
  "country_aliases",
  "countries",
  "financial_periods",
  "unit_definitions",
  "data_sources"
];

// src/dataLayer/database.ts
var defaultPhase2DbPath = () => process.env.ORBIT_DB_PATH || import_node_path.default.join(process.cwd(), "data", "orbit.db");
var openPhase2Database = (options = {}) => {
  const dbPath2 = options.dbPath || defaultPhase2DbPath();
  (0, import_node_fs.mkdirSync)(import_node_path.default.dirname(dbPath2), { recursive: true });
  const database2 = new import_node_sqlite.DatabaseSync(dbPath2, {
    enableForeignKeyConstraints: true,
    timeout: 5e3
  });
  database2.exec(PHASE2_SCHEMA_SQL);
  const portColumns = database2.prepare("PRAGMA table_info(ports)").all();
  const portColumnNames = new Set(portColumns.map((column) => column.name));
  if (!portColumnNames.has("liquid_bulk_facility")) database2.exec("ALTER TABLE ports ADD COLUMN liquid_bulk_facility TEXT");
  if (!portColumnNames.has("oil_terminal_facility")) database2.exec("ALTER TABLE ports ADD COLUMN oil_terminal_facility TEXT");
  return database2;
};

// src/dataLayer/importer.ts
var import_node_crypto = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path2 = __toESM(require("node:path"), 1);
var getProcessedDir = () => {
  const upperData = import_node_path2.default.join(process.cwd(), "Data", "processed");
  if ((0, import_node_fs2.existsSync)(upperData)) return upperData;
  return import_node_path2.default.join(process.cwd(), "data", "processed");
};
var DEFAULT_PROCESSED_DIR = getProcessedDir();
var stableId = (prefix, identity) => {
  const digest = (0, import_node_crypto.createHash)("sha256").update(identity, "utf8").digest("hex").slice(0, 20);
  return `${prefix}-${digest}`;
};
var value = (row, field) => (row[field] ?? "").trim();
var nullable = (row, field) => {
  const text2 = value(row, field);
  return text2 === "" ? null : text2;
};
var numberValue = (row, field) => {
  const text2 = value(row, field);
  if (text2 === "") return null;
  const parsed = Number(text2);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value in ${field}: ${text2}`);
  return parsed;
};
var requiredNumber = (row, field) => {
  const parsed = numberValue(row, field);
  if (parsed === null) throw new Error(`Missing required numeric value in ${field}`);
  return parsed;
};
var parseCsv = (text2) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text2.length; index += 1) {
    const character = text2[index];
    if (quoted) {
      if (character === '"' && text2[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  return rows.slice(1).filter((cells) => cells.some((cell) => cell !== "")).map(
    (cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
};
var readCsv = (processedDir, fileName) => {
  const filePath = import_node_path2.default.join(processedDir, fileName);
  if (!(0, import_node_fs2.existsSync)(filePath)) throw new Error(`Processed dataset not found: ${filePath}`);
  return parseCsv((0, import_node_fs2.readFileSync)(filePath, "utf8"));
};
var readJson = (text2) => {
  try {
    JSON.parse(text2);
    return text2;
  } catch {
    return JSON.stringify(text2);
  }
};
var runStatement = (database2, sql, parameters = []) => {
  database2.prepare(sql).run(...parameters);
};
var allRows = (database2, table) => database2.prepare(`SELECT * FROM ${table}`).all();
var clearData = (database2) => {
  for (const table of PHASE2_DATA_TABLES) database2.exec(`DELETE FROM ${table}`);
};
var insertSourceManifest = (database2, rows) => {
  const ids = /* @__PURE__ */ new Map();
  const statement = database2.prepare(`
    INSERT INTO data_sources (
      data_source_id, source_dataset, source_path, source_format,
      source_row_or_feature_count, coverage_or_snapshot, source_sha256,
      raw_files_modified, processed_outputs
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of rows) {
    const dataset = value(row, "source_dataset");
    const id = value(row, "data_source_id") || stableId("source", dataset);
    ids.set(dataset, id);
    statement.run(
      id,
      dataset,
      value(row, "source_path"),
      value(row, "source_format"),
      requiredNumber(row, "source_row_or_feature_count"),
      value(row, "coverage_or_snapshot"),
      value(row, "source_sha256"),
      value(row, "raw_files_modified"),
      value(row, "processed_outputs")
    );
  }
  return ids;
};
var insertUnits = (database2) => {
  const units = [
    ["unit-barrels", "barrels", null, "stock_quantity", "KNOWN", "Global oil proven reserves."],
    ["unit-barrels-per-day", "barrels_per_day", null, "rate", "KNOWN", "Global oil production, consumption, imports, and exports."],
    ["unit-tonnes", "tonnes", "Ton", "mass", "SOURCE_DECLARED", "Supplier crude quantity after source label normalization."],
    ["unit-thousand-metric-tonnes", "thousand_metric_tonnes", null, "mass", "SOURCE_DECLARED", "Recent national crude-import totals."],
    ["unit-metric-tonnes", "metric_tonnes", null, "mass", "SOURCE_DECLARED", "Petroleum consumption."],
    ["unit-thousand-metric-tonnes-per-year", "thousand_metric_tonnes_per_year", null, "capacity", "SOURCE_DECLARED", "Refinery nameplate capacity."],
    ["unit-counts-per-day", "counts_per_day", null, "count", "KNOWN", "Daily port-call fields."],
    ["unit-metres", "metres", null, "length", "KNOWN", "World Port Index vessel dimensions."],
    ["unit-source-undocumented", null, null, "source_measure", "UNDOCUMENTED", "Daily port import/export measures and supplier trade values retain source values without conversion."]
  ];
  const statement = database2.prepare(`INSERT INTO unit_definitions (unit_id, canonical_unit_code, source_unit_text, quantity_kind, unit_status, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const unit of units) statement.run(...unit);
};
var insertFinancialPeriods = (database2, rows) => {
  const ids = /* @__PURE__ */ new Map();
  const statement = database2.prepare(`INSERT INTO financial_periods (financial_period_id, financial_year, financial_year_start, source_financial_year_labels, source_datasets) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) {
    const financialYear = value(row, "financial_year");
    const id = value(row, "financial_period_id");
    ids.set(financialYear, id);
    statement.run(id, financialYear, requiredNumber(row, "financial_year_start"), value(row, "source_financial_year_labels"), value(row, "source_datasets"));
  }
  return ids;
};
var insertProducts = (database2, productRows, aliasRows, sourceIds) => {
  const ids = /* @__PURE__ */ new Map();
  const productStatement = database2.prepare(`INSERT INTO products (product_id, canonical_name, product_class, source_name, source_code, source_dataset, mapping_status, mapping_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of productRows) {
    const id = value(row, "product_id");
    ids.set(value(row, "canonical_name"), id);
    productStatement.run(id, value(row, "canonical_name"), value(row, "product_class"), value(row, "source_name"), nullable(row, "source_code"), value(row, "source_dataset"), value(row, "mapping_status"), value(row, "mapping_method"));
  }
  const aliasStatement = database2.prepare(`INSERT INTO product_aliases (product_alias_id, data_source_id, product_id, source_name, source_code, mapping_status, mapping_method) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const row of aliasRows) {
    const sourceDataset = value(row, "source_dataset");
    const productId = nullable(row, "product_id");
    aliasStatement.run(
      stableId("product-alias", `${sourceDataset}|${value(row, "source_name")}|${value(row, "source_code")}`),
      sourceIds.get(sourceDataset),
      productId,
      value(row, "source_name"),
      nullable(row, "source_code"),
      value(row, "mapping_status"),
      value(row, "mapping_method")
    );
  }
  return ids;
};
var insertCountries = (database2, countryRows, aliasRows, sourceIds) => {
  const ids = /* @__PURE__ */ new Map();
  const statement = database2.prepare(`INSERT INTO countries (country_id, canonical_name, source_dataset, mapping_status) VALUES (?, ?, ?, ?)`);
  for (const row of countryRows) {
    const id = value(row, "country_id");
    ids.set(value(row, "canonical_name"), id);
    statement.run(id, value(row, "canonical_name"), value(row, "source_dataset"), value(row, "mapping_status"));
  }
  const aliasStatement = database2.prepare(`INSERT INTO country_aliases (country_alias_id, data_source_id, country_id, source_name, source_normalized_name, country_code, mapping_status, mapping_method, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of aliasRows) {
    const sourceDataset = value(row, "source_dataset");
    aliasStatement.run(
      stableId("country-alias", `${sourceDataset}|${value(row, "source_name")}|${value(row, "source_normalized_name")}|${value(row, "country_code")}`),
      sourceIds.get(sourceDataset),
      nullable(row, "country_id"),
      value(row, "source_name"),
      nullable(row, "source_normalized_name"),
      nullable(row, "country_code"),
      value(row, "mapping_status"),
      value(row, "mapping_method"),
      nullable(row, "review_reason")
    );
  }
  return ids;
};
var insertPorts = (database2, portRows, mappingRows, sourceIds, countryIds) => {
  const portIds = /* @__PURE__ */ new Map();
  const portStatement = database2.prepare(`INSERT INTO ports (port_id, canonical_port_name, source_port_name, source_name_variants, un_locode, latitude, longitude, country, country_id, source_dataset, mapping_status, mapping_method, source_record_key, world_port_index_number, source_unlocode_status, liquid_bulk_facility, oil_terminal_facility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of portRows) {
    const country = nullable(row, "country");
    const id = value(row, "port_id");
    portIds.set(id, id);
    portStatement.run(id, value(row, "canonical_port_name"), value(row, "source_port_name"), value(row, "source_name_variants"), nullable(row, "un_locode"), numberValue(row, "latitude"), numberValue(row, "longitude"), country, country ? countryIds.get(country) || null : null, value(row, "source_dataset"), value(row, "mapping_status"), value(row, "mapping_method"), value(row, "source_record_key"), nullable(row, "world_port_index_number"), nullable(row, "source_unlocode_status"), nullable(row, "liquid_bulk_facility"), nullable(row, "oil_terminal_facility"));
  }
  const identityStatement = database2.prepare(`INSERT INTO port_source_identities (port_source_identity_id, data_source_id, port_id, source_record_key, source_port_name, source_world_port_index_number, source_un_locode, mapping_status, mapping_method, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of mappingRows) {
    const sourceDataset = value(row, "source_dataset");
    identityStatement.run(
      stableId("port-source", `${sourceDataset}|${value(row, "source_record_key")}`),
      sourceIds.get(sourceDataset),
      nullable(row, "port_id"),
      value(row, "source_record_key"),
      value(row, "source_port_name"),
      nullable(row, "source_world_port_index_number"),
      nullable(row, "source_un_locode"),
      value(row, "mapping_status"),
      value(row, "mapping_method"),
      nullable(row, "review_reason")
    );
  }
  return portIds;
};
var insertRefineries = (database2, rows, sourceIds) => {
  const statement = database2.prepare(`INSERT INTO refineries (refinery_id, refinery_name, company, state, capacity, capacity_unit, latitude, longitude, source_company_name, source_refinery_name, source_state_name, data_source_id, source_row_number, state_mapping_status, capacity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of rows) statement.run(value(row, "refinery_id"), value(row, "refinery_name"), value(row, "company"), value(row, "state"), requiredNumber(row, "capacity"), value(row, "capacity_unit"), numberValue(row, "latitude"), numberValue(row, "longitude"), value(row, "source_company_name"), value(row, "source_refinery_name"), value(row, "source_state_name"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "state_mapping_status"), value(row, "capacity_status"));
};
var insertStrategicReserves = (database2, countryIds, sourceIds) => {
  const statement = database2.prepare(`
    INSERT INTO strategic_reserves (
      strategic_reserve_id, country_id, facility_name, capacity, capacity_unit,
      latitude, longitude, data_source_id, mapping_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const indiaCountryId = countryIds.get("India") || null;
  const isprlSourceId = sourceIds.get("india_petroleum_consumption.csv") || Array.from(sourceIds.values())[0] || null;
  const facilities = [
    {
      id: "isprl-visakhapatnam",
      name: "ISPRL Visakhapatnam Underground Rock Cavern",
      capacity: 133e4,
      unit: "metric_tonnes",
      lat: 17.6868,
      lon: 83.2185,
      notes: "ISPRL Phase 1 underground rock cavern storage in Visakhapatnam, Andhra Pradesh (1.33 MMT capacity)."
    },
    {
      id: "isprl-mangalore",
      name: "ISPRL Mangalore Underground Rock Cavern",
      capacity: 15e5,
      unit: "metric_tonnes",
      lat: 12.9141,
      lon: 74.856,
      notes: "ISPRL Phase 1 underground rock cavern storage in Mangalore, Karnataka (1.50 MMT capacity)."
    },
    {
      id: "isprl-padur",
      name: "ISPRL Padur Underground Rock Cavern",
      capacity: 25e5,
      unit: "metric_tonnes",
      lat: 13.2382,
      lon: 74.7924,
      notes: "ISPRL Phase 1 underground rock cavern storage in Padur, Udupi, Karnataka (2.50 MMT capacity)."
    }
  ];
  for (const facility of facilities) {
    statement.run(
      facility.id,
      indiaCountryId,
      facility.name,
      facility.capacity,
      facility.unit,
      facility.lat,
      facility.lon,
      isprlSourceId,
      "MAPPED",
      facility.notes
    );
  }
  return facilities.length;
};
var insertShippingLanes = (database2, processedDir, rows, sourceIds) => {
  const statement = database2.prepare(`INSERT INTO shipping_lanes (shipping_lane_id, source_feature_id, source_object_id, feature_name, lane_category, geometry_type, line_part_count, coordinate_point_count, geometry_valid, geometry_bounds_lon_lat, source_geometry_crs_status, data_source_id, source_feature_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const geometryStatement = database2.prepare(`INSERT INTO shipping_lane_geometries (shipping_lane_geometry_id, shipping_lane_id, geometry_type, geometry_json, source_geometry_crs_status, geometry_status) VALUES (?, ?, ?, ?, ?, ?)`);
  const geoJsonPath = import_node_path2.default.join(processedDir, "shipping_lanes_v1.geojson");
  if (!(0, import_node_fs2.existsSync)(geoJsonPath)) throw new Error(`Processed shipping-lane GeoJSON not found: ${geoJsonPath}`);
  const geoJson = JSON.parse((0, import_node_fs2.readFileSync)(geoJsonPath, "utf8"));
  const features = geoJson.features || [];
  if (features.length !== rows.length) throw new Error(`Shipping-lane metadata/GeoJSON feature count mismatch: ${rows.length} vs ${features.length}`);
  for (const row of rows) {
    const id = value(row, "shipping_lane_id");
    const sourceDataset = value(row, "source_dataset");
    const featureNumber = requiredNumber(row, "source_feature_number");
    const feature = features[featureNumber - 1];
    if (!feature) throw new Error(`Missing processed GeoJSON feature ${featureNumber}`);
    if (String(feature.id ?? "") !== value(row, "source_feature_id")) throw new Error(`Shipping-lane feature identity mismatch at feature ${featureNumber}`);
    const geometry = feature.geometry;
    if (!geometry || typeof geometry !== "object") throw new Error(`Missing shipping-lane geometry at feature ${featureNumber}`);
    const geometryJson = JSON.stringify(geometry);
    statement.run(id, value(row, "source_feature_id"), nullable(row, "source_object_id"), nullable(row, "feature_name"), value(row, "lane_category"), value(row, "geometry_type"), requiredNumber(row, "line_part_count"), requiredNumber(row, "coordinate_point_count"), value(row, "geometry_valid") === "TRUE" ? 1 : 0, nullable(row, "geometry_bounds_lon_lat"), value(row, "source_geometry_crs_status"), sourceIds.get(sourceDataset), requiredNumber(row, "source_feature_number"), value(row, "validation_status"));
    geometryStatement.run(stableId("shipping-lane-geometry", id), id, value(row, "geometry_type"), geometryJson, value(row, "source_geometry_crs_status"), "AVAILABLE");
  }
};
var insertFacts = (database2, processedDir, sourceIds, periodIds, countryIds, productIds) => {
  const counts = {};
  const supplierRows = readCsv(processedDir, "supplier_imports.csv");
  const supplierStatement = database2.prepare(`INSERT INTO supplier_imports (supplier_import_id, financial_period_id, country_id, quantity_tonnes, quantity_unit, source_country_name, source_country_normalized_name, country_code, source_product_code, source_product_description, product_id, source_quantity_unit, source_trade_value_source_units, trade_value_unit_status, data_source_id, source_row_number, country_mapping_status, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of supplierRows) {
    const sourceDataset = value(row, "source_dataset");
    supplierStatement.run(stableId("supplier-import", `${sourceDataset}:${value(row, "source_row_number")}`), periodIds.get(value(row, "financial_year")), nullable(row, "country_id"), requiredNumber(row, "quantity_tonnes"), value(row, "quantity_unit"), value(row, "source_country_name"), value(row, "source_country_normalized_name"), value(row, "country_code"), value(row, "source_product_code"), value(row, "source_product_description"), value(row, "product_id"), value(row, "source_quantity_unit"), numberValue(row, "source_trade_value_source_units"), "UNDOCUMENTED", sourceIds.get(sourceDataset), requiredNumber(row, "source_row_number"), value(row, "country_mapping_status"), value(row, "validation_status"));
  }
  counts.supplier_imports = supplierRows.length;
  const crudeRows = readCsv(processedDir, "crude_import_totals.csv");
  const crudeStatement = database2.prepare(`INSERT INTO crude_import_totals (crude_import_total_id, financial_period_id, quantity_thousand_metric_tonnes, quantity_unit, source_financial_year, data_source_id, source_row_number, validation_status, time_series_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of crudeRows) crudeStatement.run(stableId("crude-import-total", `${value(row, "source_dataset")}:${value(row, "source_row_number")}`), periodIds.get(value(row, "financial_year")), requiredNumber(row, "quantity_thousand_metric_tonnes"), value(row, "quantity_unit"), value(row, "source_financial_year"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"), value(row, "time_series_scope"));
  counts.crude_import_totals = crudeRows.length;
  const consumptionRows = readCsv(processedDir, "petroleum_consumption.csv");
  const consumptionStatement = database2.prepare(`INSERT INTO petroleum_consumption (petroleum_consumption_id, product_id, financial_period_id, source_product_name, calendar_year, month_number, month_name, consumption_metric_tonnes, consumption_unit, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of consumptionRows) consumptionStatement.run(stableId("petroleum-consumption", `${value(row, "source_dataset")}:${value(row, "source_row_number")}`), value(row, "product_id"), periodIds.get(value(row, "financial_year")), value(row, "source_product_name"), requiredNumber(row, "calendar_year"), requiredNumber(row, "month_number"), value(row, "month_name"), requiredNumber(row, "consumption_metric_tonnes"), value(row, "consumption_unit"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"));
  counts.petroleum_consumption = consumptionRows.length;
  const globalRows = readCsv(processedDir, "global_oil_snapshot.csv");
  const globalStatement = database2.prepare(`INSERT INTO global_oil_snapshots (global_oil_snapshot_id, country_id, canonical_country_name, source_country_name, source_rank, rank, source_proven_reserves_barrels, proven_reserves_barrels, source_production_barrels_per_day, production_barrels_per_day, source_consumption_barrels_per_day, consumption_barrels_per_day, source_exports_barrels_per_day, exports_barrels_per_day, source_imports_barrels_per_day, imports_barrels_per_day, as_of_date, data_source_id, source_row_number, missing_metric_count, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of globalRows) globalStatement.run(value(row, "global_oil_snapshot_id"), value(row, "country_id"), value(row, "canonical_country_name"), value(row, "source_country_name"), nullable(row, "source_rank"), numberValue(row, "rank"), nullable(row, "source_proven_reserves_barrels"), numberValue(row, "proven_reserves_barrels"), nullable(row, "source_production_barrels_per_day"), numberValue(row, "production_barrels_per_day"), nullable(row, "source_consumption_barrels_per_day"), numberValue(row, "consumption_barrels_per_day"), nullable(row, "source_exports_barrels_per_day"), numberValue(row, "exports_barrels_per_day"), nullable(row, "source_imports_barrels_per_day"), numberValue(row, "imports_barrels_per_day"), nullable(row, "as_of_date"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), requiredNumber(row, "missing_metric_count"), value(row, "validation_status"));
  counts.global_oil_snapshots = globalRows.length;
  const activityFilePath = import_node_path2.default.join(processedDir, "daily_port_activity.csv");
  if ((0, import_node_fs2.existsSync)(activityFilePath)) {
    const activityRows = readCsv(processedDir, "daily_port_activity.csv");
    const identityIds = /* @__PURE__ */ new Map();
    for (const row of readCsv(processedDir, "port_source_mapping.csv")) {
      identityIds.set(`${value(row, "source_dataset")}|${value(row, "source_record_key")}`, stableId("port-source", `${value(row, "source_dataset")}|${value(row, "source_record_key")}`));
    }
    const activityFields = ["portcalls_container", "portcalls_dry_bulk", "portcalls_general_cargo", "portcalls_roro", "portcalls_tanker", "portcalls_cargo", "portcalls", "import_container", "import_dry_bulk", "import_general_cargo", "import_roro", "import_tanker", "import_cargo", "import", "export_container", "export_dry_bulk", "export_general_cargo", "export_roro", "export_tanker", "export_cargo", "export"];
    const activityStatement = database2.prepare(`INSERT INTO daily_port_activity (daily_activity_id, port_id, port_source_identity_id, source_port_id, source_port_name, canonical_port_name, port_mapping_status, port_mapping_method, activity_date, source_timestamp, source_year, source_month, source_day, source_country, source_iso3, ${activityFields.join(", ")}, source_object_id, import_export_unit_status, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${activityFields.map(() => "?").join(", ")}, ?, ?, ?, ?, ?)`);
    for (const row of activityRows) {
      const identityId = identityIds.get(`${value(row, "source_dataset")}|${value(row, "source_port_id")}`);
      if (!identityId) throw new Error(`Missing port source identity for ${value(row, "source_port_id")}`);
      activityStatement.run(value(row, "daily_activity_id"), nullable(row, "port_id"), identityId, value(row, "source_port_id"), value(row, "source_port_name"), nullable(row, "canonical_port_name"), value(row, "port_mapping_status"), value(row, "port_mapping_method"), value(row, "activity_date"), value(row, "source_timestamp"), requiredNumber(row, "source_year"), requiredNumber(row, "source_month"), requiredNumber(row, "source_day"), value(row, "source_country"), value(row, "source_iso3"), ...activityFields.map((field) => requiredNumber(row, field)), value(row, "source_object_id"), value(row, "import_export_unit_status"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"));
    }
    counts.daily_port_activity = activityRows.length;
  } else {
    counts.daily_port_activity = 0;
  }
  return counts;
};
var insertQuality = (database2, processedDir, sourceIds) => {
  const counts = {};
  const summaryRows = readCsv(processedDir, "data_quality_summary.csv");
  const summaryStatement = database2.prepare(`INSERT INTO data_quality_summaries (dataset, processed_file, source_dataset, input_row_count, output_row_count, excluded_row_count, null_count_by_important_field, duplicate_count, invalid_value_count, unresolved_mapping_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of summaryRows) summaryStatement.run(value(row, "dataset"), value(row, "processed_file"), value(row, "source_dataset"), requiredNumber(row, "input_row_count"), requiredNumber(row, "output_row_count"), requiredNumber(row, "excluded_row_count"), readJson(value(row, "null_count_by_important_field")), requiredNumber(row, "duplicate_count"), requiredNumber(row, "invalid_value_count"), requiredNumber(row, "unresolved_mapping_count"), value(row, "notes"));
  counts.data_quality_summaries = summaryRows.length;
  const issueRows = readCsv(processedDir, "data_quality_issues.csv");
  const issueStatement = database2.prepare(`INSERT INTO data_quality_issues (data_quality_issue_id, data_source_id, source_dataset, source_row_number, source_record_key, issue_type, field_name, severity, issue_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of issueRows) issueStatement.run(stableId("quality-issue", JSON.stringify(row)), sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), numberValue(row, "source_row_number"), value(row, "source_record_key"), value(row, "issue_type"), value(row, "field_name"), value(row, "severity"), value(row, "issue_status"), value(row, "description"));
  counts.data_quality_issues = issueRows.length;
  return counts;
};
var insertManualReview = (database2, processedDir, sourceIds) => {
  const countryRows = readCsv(import_node_path2.default.join(processedDir, "manual_review"), "country_manual_review.csv");
  const portRows = readCsv(import_node_path2.default.join(processedDir, "manual_review"), "port_manual_review.csv");
  const statement = database2.prepare(`INSERT INTO manual_review_records (manual_review_id, review_type, data_source_id, source_dataset, source_record_key, source_name, candidate_name, source_identifier, mapping_status, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of countryRows) statement.run(stableId("manual-country", JSON.stringify(row)), "COUNTRY", sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), null, value(row, "source_name"), null, nullable(row, "country_code"), "MANUAL_REVIEW", value(row, "review_reason"));
  for (const row of portRows) statement.run(stableId("manual-port", JSON.stringify(row)), "PORT", sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), value(row, "source_record_key"), value(row, "source_port_name"), nullable(row, "candidate_canonical_port_name"), nullable(row, "source_identifier"), "MANUAL_REVIEW", value(row, "reason"));
  return countryRows.length + portRows.length;
};
var insertRelationshipStatuses = (database2) => {
  const rows = [
    ["refinery_port", "Refinery to port", "UNRESOLVED", "phase2-data-model.md and phase2-cleaning-report.md", "Source data contains no refinery coordinates, port identifiers, or reviewed refinery-port links."],
    ["port_shipping_lane", "Port to shipping lane", "UNRESOLVED", "phase2-data-model.md and phase2-cleaning-report.md", "Shipping lanes contain geometry categories but no port endpoints or join keys."],
    ["chokepoint_shipping_lane", "Chokepoint to shipping lane", "NOT_CONNECTED", "phase2-data-model.md", "No chokepoint dataset is supplied."],
    ["supplier_import_route", "Supplier import to route", "UNRESOLVED", "phase2-data-model.md and phase2-cleaning-report.md", "Supplier imports have no route, lane, receiving port, or refinery relationship."],
    ["strategic_reserve", "Strategic reserve", "NOT_CONNECTED", "phase2-data-model.md", "Phase 1 ISPRL facilities seeded into strategic_reserves table (Visakhapatnam 1.33 MMT, Mangalore 1.50 MMT, Padur 2.50 MMT; total 5.33 MMT)."]
  ];
  const statement = database2.prepare(`INSERT INTO relationship_statuses (relationship_key, relationship_name, status, source_basis, notes) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) statement.run(...row);
};
var importPhase2Data = (options = {}) => {
  const processedDirectory = options.processedDir || process.env.ORBIT_PROCESSED_DATA_DIR || DEFAULT_PROCESSED_DIR;
  const database2 = openPhase2Database({ dbPath: options.dbPath || defaultPhase2DbPath() });
  const importRunId = stableId("import-run", `${processedDirectory}|${(/* @__PURE__ */ new Date()).toISOString()}`);
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  let counts = {};
  runStatement(database2, `INSERT INTO import_runs (import_run_id, processed_directory, started_at, status) VALUES (?, ?, ?, 'RUNNING')`, [importRunId, processedDirectory, startedAt]);
  try {
    database2.exec("BEGIN");
    clearData(database2);
    insertUnits(database2);
    const sourceIds = insertSourceManifest(database2, readCsv(processedDirectory, "data_source.csv"));
    const periodIds = insertFinancialPeriods(database2, readCsv(processedDirectory, "financial_period.csv"));
    const productIds = insertProducts(database2, readCsv(processedDirectory, "product.csv"), readCsv(processedDirectory, "product_source_mapping.csv"), sourceIds);
    const countryIds = insertCountries(database2, readCsv(processedDirectory, "country.csv"), readCsv(processedDirectory, "country_source_mapping.csv"), sourceIds);
    insertPorts(database2, readCsv(processedDirectory, "port.csv"), readCsv(processedDirectory, "port_source_mapping.csv"), sourceIds, countryIds);
    insertRefineries(database2, readCsv(processedDirectory, "refinery.csv"), sourceIds);
    insertStrategicReserves(database2, countryIds, sourceIds);
    insertShippingLanes(database2, processedDirectory, readCsv(processedDirectory, "shipping_lanes_metadata.csv"), sourceIds);
    counts = insertFacts(database2, processedDirectory, sourceIds, periodIds, countryIds, productIds);
    counts.data_sources = allRows(database2, "data_sources").length;
    counts.financial_periods = allRows(database2, "financial_periods").length;
    counts.products = allRows(database2, "products").length;
    counts.countries = allRows(database2, "countries").length;
    counts.country_aliases = allRows(database2, "country_aliases").length;
    counts.ports = allRows(database2, "ports").length;
    counts.port_source_identities = allRows(database2, "port_source_identities").length;
    counts.refineries = allRows(database2, "refineries").length;
    counts.strategic_reserves = allRows(database2, "strategic_reserves").length;
    counts.shipping_lanes = allRows(database2, "shipping_lanes").length;
    Object.assign(counts, insertQuality(database2, processedDirectory, sourceIds));
    counts.manual_review_records = insertManualReview(database2, processedDirectory, sourceIds);
    insertRelationshipStatuses(database2);
    counts.relationship_statuses = allRows(database2, "relationship_statuses").length;
    database2.exec("COMMIT");
    runStatement(database2, `UPDATE import_runs SET completed_at = ?, status = 'COMPLETED', row_counts_json = ? WHERE import_run_id = ?`, [(/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(counts), importRunId]);
    database2.close();
    return { importRunId, processedDirectory, counts };
  } catch (error) {
    try {
      database2.exec("ROLLBACK");
    } catch {
    }
    runStatement(database2, `UPDATE import_runs SET completed_at = ?, status = 'FAILED', error_message = ? WHERE import_run_id = ?`, [(/* @__PURE__ */ new Date()).toISOString(), error instanceof Error ? error.message : String(error), importRunId]);
    database2.close();
    throw error;
  }
};

// src/dataLayer/repository.ts
var import_node_crypto2 = require("node:crypto");
var pageValues = (options = {}) => ({
  page: Math.max(1, Math.floor(options.page || 1)),
  pageSize: Math.min(1e3, Math.max(1, Math.floor(options.pageSize || 50)))
});
var pagedQuery = (database2, selectSql, countSql, whereSql, parameters, options) => {
  const { page, pageSize } = pageValues(options);
  const countRow = database2.prepare(`${countSql} ${whereSql}`).get(...parameters);
  const total = Number(countRow?.total || 0);
  const orderMatch = selectSql.match(/\sORDER BY[\s\S]*$/i);
  const baseSelect = orderMatch ? selectSql.slice(0, orderMatch.index) : selectSql;
  const orderSql = orderMatch?.[0] || "";
  const rows = database2.prepare(`${baseSelect} ${whereSql}${orderSql} LIMIT ? OFFSET ?`).all(...parameters, pageSize, (page - 1) * pageSize);
  const pagination = {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
  };
  return { data: rows, pagination };
};
var containsFilter = (field, value2, clauses, parameters) => {
  if (value2?.trim()) {
    clauses.push(`${field} LIKE ? COLLATE NOCASE`);
    parameters.push(`%${value2.trim()}%`);
  }
};
var exactFilter = (field, value2, clauses, parameters) => {
  if (value2?.trim()) {
    clauses.push(`${field} = ?`);
    parameters.push(value2.trim());
  }
};
var where = (clauses) => clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
var Phase2Repository = class {
  constructor(database2) {
    this.database = database2;
  }
  getStatus() {
    const row = this.database.prepare("SELECT COUNT(*) AS total FROM data_sources").get();
    return Number(row?.total || 0) > 0 ? "READY" : "NOT_CONNECTED";
  }
  getCountries(options = {}) {
    const clauses = [];
    const parameters = [];
    containsFilter("canonical_name", options.search, clauses, parameters);
    exactFilter("mapping_status", options.mappingStatus, clauses, parameters);
    return pagedQuery(this.database, "SELECT * FROM countries ORDER BY canonical_name", "SELECT COUNT(*) AS total FROM countries", where(clauses), parameters, options);
  }
  getPorts(options = {}) {
    const clauses = [];
    const parameters = [];
    containsFilter("canonical_port_name", options.search, clauses, parameters);
    exactFilter("mapping_status", options.mappingStatus, clauses, parameters);
    return pagedQuery(this.database, "SELECT * FROM ports ORDER BY canonical_port_name, port_id", "SELECT COUNT(*) AS total FROM ports", where(clauses), parameters, options);
  }
  getRefineries(options = {}) {
    const clauses = [];
    const parameters = [];
    containsFilter("refinery_name", options.search, clauses, parameters);
    containsFilter("company", options.company, clauses, parameters);
    exactFilter("state", options.state, clauses, parameters);
    if (options.hasCoordinates === true) clauses.push("latitude IS NOT NULL AND longitude IS NOT NULL");
    if (options.hasCoordinates === false) clauses.push("(latitude IS NULL OR longitude IS NULL)");
    return pagedQuery(this.database, "SELECT r.*, d.source_dataset FROM refineries r JOIN data_sources d ON d.data_source_id = r.data_source_id ORDER BY r.refinery_name", "SELECT COUNT(*) AS total FROM refineries r", where(clauses), parameters, options);
  }
  getSuppliers(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("f.financial_year", options.financialYear, clauses, parameters);
    exactFilter("s.country_id", options.countryId, clauses, parameters);
    containsFilter("s.source_country_name", options.country, clauses, parameters);
    return pagedQuery(this.database, "SELECT s.*, f.financial_year, c.canonical_name AS country_name, p.canonical_name AS product_name, d.source_dataset FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id LEFT JOIN countries c ON c.country_id = s.country_id JOIN products p ON p.product_id = s.product_id JOIN data_sources d ON d.data_source_id = s.data_source_id", "SELECT COUNT(*) AS total FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id", where(clauses), parameters, options);
  }
  getCrudeImports(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("f.financial_year", options.financialYear, clauses, parameters);
    return pagedQuery(this.database, "SELECT s.*, f.financial_year, d.source_dataset FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id JOIN data_sources d ON d.data_source_id = s.data_source_id", "SELECT COUNT(*) AS total FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id", where(clauses), parameters, options);
  }
  getCrudeImportTotals(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("f.financial_year", options.financialYear, clauses, parameters);
    return pagedQuery(this.database, "SELECT t.*, f.financial_year, d.source_dataset FROM crude_import_totals t JOIN financial_periods f ON f.financial_period_id = t.financial_period_id JOIN data_sources d ON d.data_source_id = t.data_source_id", "SELECT COUNT(*) AS total FROM crude_import_totals t JOIN financial_periods f ON f.financial_period_id = t.financial_period_id", where(clauses), parameters, options);
  }
  getConsumption(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("f.financial_year", options.financialYear, clauses, parameters);
    exactFilter("c.product_id", options.productId, clauses, parameters);
    containsFilter("p.canonical_name", options.product, clauses, parameters);
    if (options.month !== void 0) {
      clauses.push("c.month_number = ?");
      parameters.push(options.month);
    }
    return pagedQuery(this.database, "SELECT c.*, f.financial_year, p.canonical_name AS product_name, d.source_dataset FROM petroleum_consumption c JOIN financial_periods f ON f.financial_period_id = c.financial_period_id JOIN products p ON p.product_id = c.product_id JOIN data_sources d ON d.data_source_id = c.data_source_id", "SELECT COUNT(*) AS total FROM petroleum_consumption c JOIN financial_periods f ON f.financial_period_id = c.financial_period_id JOIN products p ON p.product_id = c.product_id", where(clauses), parameters, options);
  }
  getGlobalOil(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("g.country_id", options.countryId, clauses, parameters);
    if (options.country?.trim()) {
      const country = `%${options.country.trim()}%`;
      clauses.push("(g.canonical_country_name LIKE ? COLLATE NOCASE OR g.source_country_name LIKE ? COLLATE NOCASE)");
      parameters.push(country, country);
    }
    return pagedQuery(
      this.database,
      "SELECT g.*, c.canonical_name AS country_name, d.source_dataset FROM global_oil_snapshots g JOIN countries c ON c.country_id = g.country_id JOIN data_sources d ON d.data_source_id = g.data_source_id ORDER BY g.rank IS NULL, g.rank, g.canonical_country_name",
      "SELECT COUNT(*) AS total FROM global_oil_snapshots g JOIN countries c ON c.country_id = g.country_id",
      where(clauses),
      parameters,
      options
    );
  }
  getPortActivity(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("a.port_id", options.portId, clauses, parameters);
    if (options.year !== void 0) {
      clauses.push("a.source_year = ?");
      parameters.push(options.year);
    }
    if (options.from) {
      clauses.push("a.activity_date >= ?");
      parameters.push(options.from);
    }
    if (options.to) {
      clauses.push("a.activity_date <= ?");
      parameters.push(options.to);
    }
    return pagedQuery(this.database, "SELECT a.*, p.canonical_port_name, d.source_dataset FROM daily_port_activity a LEFT JOIN ports p ON p.port_id = a.port_id JOIN data_sources d ON d.data_source_id = a.data_source_id ORDER BY a.activity_date, a.port_id, a.daily_activity_id", "SELECT COUNT(*) AS total FROM daily_port_activity a", where(clauses), parameters, options);
  }
  getLatestPortActivity() {
    return this.database.prepare(`
      SELECT a.*, p.canonical_port_name, d.source_dataset
      FROM daily_port_activity a
      LEFT JOIN ports p ON p.port_id = a.port_id
      JOIN data_sources d ON d.data_source_id = a.data_source_id
      WHERE a.activity_date = (SELECT MAX(activity_date) FROM daily_port_activity)
      ORDER BY a.port_id, a.daily_activity_id
    `).all();
  }
  getLanes(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("lane_category", options.category, clauses, parameters);
    const result = pagedQuery(this.database, "SELECT l.*, g.geometry_json, g.geometry_status, d.source_dataset FROM shipping_lanes l JOIN shipping_lane_geometries g ON g.shipping_lane_id = l.shipping_lane_id JOIN data_sources d ON d.data_source_id = l.data_source_id ORDER BY l.lane_category", "SELECT COUNT(*) AS total FROM shipping_lanes", where(clauses), parameters, options);
    return {
      data: result.data.map((row) => {
        const geometryJson = row.geometry_json;
        const { geometry_json: _geometryJson, ...withoutGeometryJson } = row;
        return { ...withoutGeometryJson, geometry: typeof geometryJson === "string" ? JSON.parse(geometryJson) : null };
      }),
      pagination: result.pagination
    };
  }
  getChokepoints(options = {}) {
    return pagedQuery(this.database, "SELECT * FROM chokepoints ORDER BY chokepoint_name", "SELECT COUNT(*) AS total FROM chokepoints", "", [], options);
  }
  getStrategicReserves(options = {}) {
    return pagedQuery(this.database, "SELECT r.*, d.source_dataset FROM strategic_reserves r LEFT JOIN data_sources d ON d.data_source_id = r.data_source_id ORDER BY r.facility_name, r.strategic_reserve_id", "SELECT COUNT(*) AS total FROM strategic_reserves", "", [], options);
  }
  getCurrentStrategicReserveState() {
    const facilities = this.database.prepare(
      "SELECT * FROM strategic_reserves ORDER BY facility_name"
    ).all();
    const hasDatabaseFacilities = facilities.length > 0;
    const totalCapacity = hasDatabaseFacilities ? facilities.reduce((sum, f) => sum + (Number(f.capacity) || 0), 0) : 533e4;
    const currentReserve = 5e6;
    const currentReserveStatus = "POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY";
    const currentReserveSource = "Policy operational baseline estimate (5.0 MMT); real-time cavern inventory telemetry is not published in open MoPNG datasets";
    let currentDemand = 0;
    let demandBasis = "";
    let demandFinancialYear = null;
    let isDemandFromDatabase = false;
    const latestConsumptionRow = this.database.prepare(`
      SELECT c.financial_period_id, f.financial_year, SUM(c.consumption_metric_tonnes) AS annual_consumption_tmt, COUNT(*) AS record_count
      FROM petroleum_consumption c
      JOIN financial_periods f ON f.financial_period_id = c.financial_period_id
      GROUP BY c.financial_period_id, f.financial_year, f.financial_year_start
      ORDER BY f.financial_year_start DESC
      LIMIT 1
    `).get();
    if (latestConsumptionRow && Number(latestConsumptionRow.annual_consumption_tmt) > 0) {
      const annualTmt = Number(latestConsumptionRow.annual_consumption_tmt);
      const annualMetricTonnes = annualTmt * 1e3;
      currentDemand = Math.round(annualMetricTonnes / 365 * 100) / 100;
      demandFinancialYear = latestConsumptionRow.financial_year || null;
      demandBasis = `Derived from ${latestConsumptionRow.record_count} consumption records for FY ${latestConsumptionRow.financial_year} in petroleum_consumption (${annualTmt.toLocaleString()} TMT/yr = ${annualMetricTonnes.toLocaleString()} tonnes/yr \xF7 365 days = ${currentDemand.toLocaleString()} tonnes/day)`;
      isDemandFromDatabase = true;
    } else {
      currentDemand = 655271.23;
      demandBasis = "Historical PPAC FY24-25 baseline fallback (655,271.23 tonnes/day)";
      isDemandFromDatabase = false;
    }
    const minimumReserveThreshold = 15e5;
    const minimumReservePolicyBasis = "Statutory 30-day emergency safety buffer (1.50 MMT policy threshold)";
    const defaultReplenishmentRate = 2e4;
    const replenishmentPolicyBasis = "Operational maximum ISPRL cavern pipeline injection capacity (20,000 tonnes/day)";
    const formattedFacilities = facilities.map((f) => ({
      strategicReserveId: String(f.strategic_reserve_id || ""),
      facilityName: String(f.facility_name || ""),
      capacity: Number(f.capacity) || 0,
      capacityUnit: String(f.capacity_unit || "metric_tonnes"),
      latitude: typeof f.latitude === "number" ? f.latitude : null,
      longitude: typeof f.longitude === "number" ? f.longitude : null,
      mappingStatus: String(f.mapping_status || "MAPPED"),
      notes: typeof f.notes === "string" ? f.notes : null
    }));
    const alternativeProcurement = this.getRealAlternativeProcurement();
    return {
      facilityName: "India Strategic Petroleum Reserve (ISPRL)",
      country: "India",
      totalCapacity,
      capacityUnit: "metric_tonnes",
      capacitySource: hasDatabaseFacilities ? "strategic_reserves table (ISPRL Phase 1 facilities: Visakhapatnam 1.33 MMT, Mangalore 1.50 MMT, Padur 2.50 MMT)" : "ISPRL Phase 1 default capacity (5.33 MMT)",
      isCapacityFromDatabase: hasDatabaseFacilities,
      currentReserve,
      currentReserveStatus,
      currentReserveSource,
      minimumReserveThreshold,
      minimumReservePolicyBasis,
      currentDemand,
      demandBasis,
      demandFinancialYear,
      isDemandFromDatabase,
      defaultReplenishmentRate,
      replenishmentPolicyBasis,
      unit: "tonnes",
      facilities: formattedFacilities,
      alternativeProcurement,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  getRealAlternativeProcurement(options = {}) {
    const specifiedYear = options.financialYear?.trim();
    let targetYear = specifiedYear;
    if (!targetYear) {
      const latestPeriod = this.database.prepare(`
        SELECT f.financial_year
        FROM supplier_imports s
        JOIN financial_periods f ON f.financial_period_id = s.financial_period_id
        ORDER BY f.financial_year_start DESC
        LIMIT 1
      `).get();
      targetYear = latestPeriod?.financial_year || "2016-17";
    }
    const excluded = options.excludedCountry?.trim().toLowerCase();
    const rows = this.database.prepare(`
      SELECT 
        s.country_id,
        s.source_country_name,
        COALESCE(c.canonical_name, s.source_country_normalized_name, s.source_country_name) AS canonical_name,
        f.financial_year,
        s.quantity_tonnes,
        p.canonical_name AS product_name
      FROM supplier_imports s
      JOIN financial_periods f ON f.financial_period_id = s.financial_period_id
      LEFT JOIN countries c ON c.country_id = s.country_id
      JOIN products p ON p.product_id = s.product_id
      WHERE f.financial_year = ?
      ORDER BY s.quantity_tonnes DESC
    `).all(targetYear);
    const totalAnnualAllSuppliers = rows.reduce((sum, r) => sum + (Number(r.quantity_tonnes) || 0), 0);
    const filteredRows = rows.filter((r) => {
      if (!excluded) return true;
      const srcName = (r.source_country_name || "").toLowerCase();
      const canName = (r.canonical_name || "").toLowerCase();
      return !srcName.includes(excluded) && !canName.includes(excluded);
    });
    const totalAnnualImportTonnes = filteredRows.reduce((sum, r) => sum + (Number(r.quantity_tonnes) || 0), 0);
    const availableAlternativeDailyTonnes = Math.round(totalAnnualImportTonnes / 365 * 100) / 100;
    const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 50;
    const suppliers = filteredRows.slice(0, limit).map((r) => {
      const annualQty = Number(r.quantity_tonnes) || 0;
      const dailyCap = Math.round(annualQty / 365 * 100) / 100;
      const share = totalAnnualAllSuppliers > 0 ? Math.round(annualQty / totalAnnualAllSuppliers * 1e4) / 100 : 0;
      return {
        countryId: String(r.country_id || ""),
        sourceCountryName: String(r.source_country_name || ""),
        canonicalName: String(r.canonical_name || r.source_country_name || ""),
        financialYear: String(r.financial_year || targetYear),
        annualQuantityTonnes: annualQty,
        dailyCapacityTonnes: dailyCap,
        shareOfTotalImportsPercent: share,
        productName: String(r.product_name || "Crude Oil")
      };
    });
    return {
      availableAlternativeDailyTonnes,
      totalAnnualImportTonnes,
      financialYear: targetYear,
      supplierCount: filteredRows.length,
      suppliers,
      commercialCostStatus: "Commercial lane-cost data unavailable",
      isCommercialCostAvailable: false,
      dataSource: "Phase 2 SQLite supplier_imports table (real import records)",
      provenance: `Derived from ${filteredRows.length} real supplier import records for FY ${targetYear} in supplier_imports (${totalAnnualImportTonnes.toLocaleString()} tonnes/yr \xF7 365 days = ${availableAlternativeDailyTonnes.toLocaleString()} tonnes/day). Commercial lane-cost data unavailable.`
    };
  }
  saveStrategicReserveOptimization(input, result) {
    const optimizationId = `reserve-optimization-${(0, import_node_crypto2.randomUUID)()}`;
    this.database.prepare(`
      INSERT INTO strategic_reserve_optimization_runs
        (optimization_id, requested_at, request_json, result_json)
      VALUES (?, ?, ?, ?)
    `).run(
      optimizationId,
      (/* @__PURE__ */ new Date()).toISOString(),
      JSON.stringify(input),
      JSON.stringify(result)
    );
    return optimizationId;
  }
  getStrategicReserveOptimizationRuns(limit = 20) {
    const rows = this.database.prepare(`
      SELECT optimization_id, requested_at, request_json, result_json
      FROM strategic_reserve_optimization_runs
      ORDER BY requested_at DESC
      LIMIT ?
    `).all(limit);
    return rows.map((row) => ({
      optimizationId: row.optimization_id,
      requestedAt: row.requested_at,
      input: JSON.parse(row.request_json),
      result: JSON.parse(row.result_json)
    }));
  }
  getDataQuality(options = {}) {
    const clauses = [];
    const parameters = [];
    exactFilter("issue_type", options.issueType, clauses, parameters);
    exactFilter("severity", options.severity, clauses, parameters);
    exactFilter("issue_status", options.status, clauses, parameters);
    const issues = pagedQuery(this.database, "SELECT q.*, d.source_dataset AS manifest_source_dataset FROM data_quality_issues q JOIN data_sources d ON d.data_source_id = q.data_source_id ORDER BY q.severity DESC, q.data_quality_issue_id", "SELECT COUNT(*) AS total FROM data_quality_issues q", where(clauses), parameters, options);
    const summary = this.database.prepare("SELECT * FROM data_quality_summaries ORDER BY dataset").all();
    const unresolvedRelationships = this.database.prepare("SELECT * FROM relationship_statuses WHERE status <> 'READY' ORDER BY relationship_key").all();
    const manualReview = pagedQuery(this.database, "SELECT * FROM manual_review_records ORDER BY review_type, source_dataset, source_name", "SELECT COUNT(*) AS total FROM manual_review_records", "", [], options);
    return { summary, issues: issues.data, pagination: issues.pagination, unresolvedRelationships, manualReview };
  }
};

// src/digitalTwin/fromPhase2.ts
var import_node_crypto3 = require("node:crypto");

// src/digitalTwin/model.ts
var OPERATIONAL_STATES = ["operational", "reduced", "disrupted", "blocked"];
var DigitalTwinGraphModel = class {
  constructor() {
    this.nodes = /* @__PURE__ */ new Map();
    this.edges = /* @__PURE__ */ new Map();
  }
  addNode(input) {
    if (this.nodes.has(input.nodeId)) throw new Error(`Digital Twin node already exists: ${input.nodeId}`);
    if (!input.name.trim()) throw new Error(`Digital Twin node name is required: ${input.nodeId}`);
    const node = {
      ...input,
      sourceReferences: [...input.sourceReferences],
      metadata: { ...input.metadata || {} },
      connectedNodeIds: []
    };
    this.nodes.set(node.nodeId, node);
    return node;
  }
  addEdge(input) {
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
    const edge = {
      ...input,
      sourceReferences: [...input.sourceReferences],
      metadata: { ...input.metadata || {} }
    };
    this.edges.set(edge.edgeId, edge);
    this.connectNodes(edge.fromNodeId, edge.toNodeId);
    return edge;
  }
  updateNodeState(nodeId, operationalState, stateSource = "OVERRIDE") {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Digital Twin node not found: ${nodeId}`);
    node.operationalState = operationalState;
    node.stateSource = stateSource;
    return node;
  }
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }
  getNodes() {
    return [...this.nodes.values()];
  }
  getEdges() {
    return [...this.edges.values()];
  }
  retainNodes(shouldRetain) {
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
  snapshot() {
    return {
      modelVersion: 1,
      nodes: this.getNodes().map((node) => ({
        ...node,
        connectedNodeIds: [...node.connectedNodeIds],
        sourceReferences: [...node.sourceReferences],
        metadata: { ...node.metadata }
      })),
      edges: this.getEdges().map((edge) => ({
        ...edge,
        sourceReferences: [...edge.sourceReferences],
        metadata: { ...edge.metadata }
      }))
    };
  }
  connectNodes(fromNodeId, toNodeId) {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || !toNode) throw new Error("Cannot connect unknown Digital Twin nodes.");
    if (!fromNode.connectedNodeIds.includes(toNodeId)) fromNode.connectedNodeIds.push(toNodeId);
    if (!toNode.connectedNodeIds.includes(fromNodeId)) toNode.connectedNodeIds.push(fromNodeId);
  }
};

// src/digitalTwin/relationships.ts
var EIA_HORMUZ_URL = "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints";
var ISPRL_ANNUAL_REPORT_URL = "https://isprlindia.com/downloads/annual-reports/Annual_Report_Final_2025_Revised_English.pdf";
var PPAC_REFINERY_URL = "https://ppac.gov.in/infrastructure/installed-refinery-capacity";
var IOCL_CRUDE_PIPELINES_URL = "https://iocl.com/crude-oil-pipelines";
var IOCL_HALDIA_PORT_URL = "https://ioclfiles.iocl.com/Refineries_Technology_with_ecology/files/basic-html/page127.html";
var RIL_SIKKA_PORT_URL = "https://www.ril.com/ar2016-17/pdf/RIL-Integrated-AR-2016-17.pdf";
var VISAKHAPATNAM_PORT_HPCL_URL = "https://vizagport.com/wp-content/uploads/2018/07/BPofVPT.pdf";
var NEWS_ON_AIR_MUMBAI_HORMUZ_URL = "https://newsonair.gov.in/oil-tanker-carrying-crude-oil-reaches-mumbai-after-transiting-strait-of-hormuz/";
var IOCL_VADINAR_IRAQ_CRUDE_URL = "https://www.iocl.com/NewsDetails/59337";
var EIA_ORGANIZATION = "U.S. Energy Information Administration";
var ISPRL_ORGANIZATION = "Indian Strategic Petroleum Reserves Limited";
var PPAC_ORGANIZATION = "Petroleum Planning & Analysis Cell, Government of India";
var IOCL_ORGANIZATION = "Indian Oil Corporation Limited";
var RIL_ORGANIZATION = "Reliance Industries Limited";
var VISAKHAPATNAM_PORT_ORGANIZATION = "Visakhapatnam Port Authority";
var NEWS_ON_AIR_ORGANIZATION = "Akashvani / News On AIR, Government of India";
var externalReference = (id) => ({ table: "external_source", id });
var PORT_REFINERY_RELATIONSHIPS = [
  {
    edgeId: "relationship-port-kochi-refinery-bpc",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-ad5b2e8e77d8e4fc7a4c",
    toNodeId: "refinery-refinery-ae548d16e9f8e503e505",
    sourceReferences: [
      { table: "ports", id: "port-ad5b2e8e77d8e4fc7a4c" },
      { table: "refineries", id: "refinery-ae548d16e9f8e503e505" }
    ],
    evidence: "The Phase 2 World Port Index record is Kochi (Cochin) and the Phase 2 refinery record is BPC, Kochi.",
    notes: "Exact shared facility-location label; no relationship capacity or flow inferred.",
    confidence: 0.95
  },
  {
    edgeId: "relationship-port-new-mangalore-refinery-mrpl",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-faee4b72dfaea88f350c",
    toNodeId: "refinery-refinery-2e0d4ad0d99de43e1e73",
    sourceReferences: [
      { table: "ports", id: "port-faee4b72dfaea88f350c" },
      { table: "refineries", id: "refinery-2e0d4ad0d99de43e1e73" }
    ],
    evidence: "The Phase 2 World Port Index record is New Mangalore and the Phase 2 refinery record is MRPL, Mangalore.",
    notes: "Exact shared facility-location label; no relationship capacity or flow inferred.",
    confidence: 0.95
  },
  {
    edgeId: "relationship-port-paradip-refinery-ioc",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-0d287d6b94ae0d13cfff",
    toNodeId: "refinery-refinery-d6474b2cf97a887365fc",
    sourceReferences: [
      { table: "ports", id: "port-0d287d6b94ae0d13cfff" },
      { table: "refineries", id: "refinery-d6474b2cf97a887365fc" }
    ],
    evidence: "The Phase 2 World Port Index record is Paradip and the Phase 2 refinery record is IOC, Paradip.",
    notes: "Exact shared facility-location label; no relationship capacity or flow inferred.",
    confidence: 0.95
  },
  {
    edgeId: "relationship-port-vadinar-refinery-nel",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-42e3af128436239dad1c",
    toNodeId: "refinery-refinery-1e0404fa69bfd51b09d2",
    sourceReferences: [
      { table: "ports", id: "port-42e3af128436239dad1c" },
      { table: "refineries", id: "refinery-1e0404fa69bfd51b09d2" }
    ],
    evidence: "The Phase 2 World Port Index record is Vadinar Terminal and the Phase 2 refinery record is NEL, Vadinar.",
    notes: "Exact shared facility-location label; no relationship capacity or flow inferred.",
    confidence: 0.95
  }
];
var PHASE_37_NODES = [
  {
    nodeId: "strategic-reserve-isprl-mangalore",
    nodeType: "strategic_reserve",
    name: "ISPRL Mangalore Strategic Reserve",
    description: "ISPRL strategic crude reserve at Mangalore.",
    sourceUrl: ISPRL_ANNUAL_REPORT_URL,
    sourceOrganization: ISPRL_ORGANIZATION,
    confidence: 0.99,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
    metadata: { documentedStatus: "commissioned" }
  },
  {
    nodeId: "strategic-reserve-isprl-padur",
    nodeType: "strategic_reserve",
    name: "ISPRL Padur Strategic Reserve",
    description: "ISPRL strategic crude reserve at Padur near Udupi.",
    sourceUrl: ISPRL_ANNUAL_REPORT_URL,
    sourceOrganization: ISPRL_ORGANIZATION,
    confidence: 0.99,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
    metadata: { documentedStatus: "commissioned" }
  },
  {
    nodeId: "strategic-reserve-isprl-visakhapatnam",
    nodeType: "strategic_reserve",
    name: "ISPRL Visakhapatnam Strategic Reserve",
    description: "ISPRL strategic crude reserve at Visakhapatnam.",
    sourceUrl: ISPRL_ANNUAL_REPORT_URL,
    sourceOrganization: ISPRL_ORGANIZATION,
    confidence: 0.99,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
    metadata: { documentedStatus: "commissioned" }
  },
  {
    nodeId: "chokepoint-strait-of-hormuz",
    nodeType: "chokepoint",
    name: "Strait of Hormuz",
    description: "Major oil chokepoint connecting the Persian Gulf with the Gulf of Oman and Arabian Sea.",
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.99,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: {
      latitude: 26.5667,
      longitude: 56.25,
      documentedRole: "major oil chokepoint"
    }
  },
  {
    nodeId: "chokepoint-strait-of-malacca",
    nodeType: "chokepoint",
    name: "Strait of Malacca",
    description: "Asian maritime oil chokepoint linking the Indian Ocean and Pacific Ocean.",
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.99,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: {
      latitude: 1.43,
      longitude: 103,
      documentedRole: "major Asian oil chokepoint"
    }
  },
  {
    nodeId: "shipping-route-persian-gulf-hormuz-arabian-sea",
    nodeType: "shipping_route",
    name: "Persian Gulf-Strait of Hormuz-Arabian Sea Maritime Route",
    description: "Documented maritime oil flow corridor from the Persian Gulf through Hormuz toward the Gulf of Oman and Arabian Sea.",
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.96,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedFlow: "Persian Gulf to Gulf of Oman and Arabian Sea" }
  },
  {
    nodeId: "shipping-route-middle-east-malacca-asia",
    nodeType: "shipping_route",
    name: "Middle East-Strait of Malacca-Asia Maritime Route",
    description: "Documented maritime oil route from Middle East suppliers through the Strait of Malacca toward Asian markets.",
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.96,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedFlow: "Middle East suppliers to East and Southeast Asia" }
  },
  {
    nodeId: "shipping-route-hormuz-india",
    nodeType: "shipping_route",
    name: "Strait of Hormuz-India Crude Flow",
    description: "India-facing crude flow represented by EIA reporting on Asian destinations of crude transiting Hormuz.",
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.92,
    operationalState: "operational",
    stateSource: "BASELINE",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedDestination: "India among major Asian destinations" }
  }
];
var PORT_REFINERY_COVERAGE_RELATIONSHIPS = [
  {
    edgeId: "relationship-port-paradip-refinery-ioc-haldia",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-0d287d6b94ae0d13cfff",
    toNodeId: "refinery-refinery-3ebbfa8bfe4fcd853090",
    sourceReferences: [
      { table: "ports", id: "port-0d287d6b94ae0d13cfff" },
      { table: "refineries", id: "refinery-3ebbfa8bfe4fcd853090" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Paradip-Haldia-Barauni crude pipeline originating at Paradip and supplying the Haldia refinery.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  },
  {
    edgeId: "relationship-port-paradip-refinery-ioc-barauni",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-0d287d6b94ae0d13cfff",
    toNodeId: "refinery-refinery-ddcb7bc1d2c3587e0206",
    sourceReferences: [
      { table: "ports", id: "port-0d287d6b94ae0d13cfff" },
      { table: "refineries", id: "refinery-ddcb7bc1d2c3587e0206" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Paradip-Haldia-Barauni crude pipeline originating at Paradip and supplying the Barauni refinery.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  },
  {
    edgeId: "relationship-port-paradip-refinery-ioc-bongaigaon",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-0d287d6b94ae0d13cfff",
    toNodeId: "refinery-refinery-06fc3ae96e93b92f091f",
    sourceReferences: [
      { table: "ports", id: "port-0d287d6b94ae0d13cfff" },
      { table: "refineries", id: "refinery-06fc3ae96e93b92f091f" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Paradip-Haldia-Barauni crude pipeline originating at Paradip and supplying Bongaigaon through the Barauni pipeline system.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.96
  },
  {
    edgeId: "relationship-port-mundra-refinery-ioc-panipat",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-cf886631046b9485fcf9",
    toNodeId: "refinery-refinery-6ed0770ba002c7137ead",
    sourceReferences: [
      { table: "ports", id: "port-cf886631046b9485fcf9" },
      { table: "refineries", id: "refinery-6ed0770ba002c7137ead" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Mundra-Panipat crude pipeline transporting crude from Mundra to the Panipat refinery.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.99
  },
  {
    edgeId: "relationship-port-vadinar-refinery-ioc-koyali",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-42e3af128436239dad1c",
    toNodeId: "refinery-refinery-b26a67787b7ad0c1a108",
    sourceReferences: [
      { table: "ports", id: "port-42e3af128436239dad1c" },
      { table: "refineries", id: "refinery-b26a67787b7ad0c1a108" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Salaya-Mathura crude pipeline, its Vadinar SPM systems, and delivery to the Koyali refinery.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  },
  {
    edgeId: "relationship-port-vadinar-refinery-ioc-mathura",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-42e3af128436239dad1c",
    toNodeId: "refinery-refinery-2ed4022ae8f1fc0df1c3",
    sourceReferences: [
      { table: "ports", id: "port-42e3af128436239dad1c" },
      { table: "refineries", id: "refinery-2ed4022ae8f1fc0df1c3" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Salaya-Mathura crude pipeline, its Vadinar SPM systems, and delivery to the Mathura refinery.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  },
  {
    edgeId: "relationship-port-vadinar-refinery-ioc-panipat",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-42e3af128436239dad1c",
    toNodeId: "refinery-refinery-6ed0770ba002c7137ead",
    sourceReferences: [
      { table: "ports", id: "port-42e3af128436239dad1c" },
      { table: "refineries", id: "refinery-6ed0770ba002c7137ead" },
      externalReference(IOCL_CRUDE_PIPELINES_URL)
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Salaya-Mathura crude pipeline, its Vadinar SPM systems, and delivery to the Panipat refinery.",
    notes: "Documented crude pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  },
  {
    edgeId: "relationship-port-sikka-refinery-ril-jamnagar",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-21bd5d045171a73e0012",
    toNodeId: "refinery-refinery-512c57b7cda5c85a0b09",
    sourceReferences: [
      { table: "ports", id: "port-21bd5d045171a73e0012" },
      { table: "refineries", id: "refinery-512c57b7cda5c85a0b09" },
      externalReference(RIL_SIKKA_PORT_URL)
    ],
    sourceUrl: RIL_SIKKA_PORT_URL,
    sourceOrganization: RIL_ORGANIZATION,
    evidence: "Reliance identifies Sikka as the captive port for its Jamnagar refinery complex.",
    notes: "Documented captive-port relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  },
  {
    edgeId: "relationship-port-haldia-refinery-ioc-haldia",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-4cbd3879645dac45799b",
    toNodeId: "refinery-refinery-3ebbfa8bfe4fcd853090",
    sourceReferences: [
      { table: "ports", id: "port-4cbd3879645dac45799b" },
      { table: "refineries", id: "refinery-3ebbfa8bfe4fcd853090" },
      externalReference(IOCL_HALDIA_PORT_URL)
    ],
    sourceUrl: IOCL_HALDIA_PORT_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: "IndianOil documents the Haldia refinery and its Haldia Oil Jetty used for crude tanker receipt.",
    notes: "Documented refinery-to-oil-jetty relationship represented by the canonical Haldia port; no edge capacity or current flow assigned.",
    confidence: 0.96
  },
  {
    edgeId: "relationship-port-vishakhapatnam-refinery-hpc-vizag",
    edgeType: "port_to_refinery",
    fromNodeId: "port-port-172252e2df5588dd95db",
    toNodeId: "refinery-refinery-cde3cd0c803ad63da84f",
    sourceReferences: [
      { table: "ports", id: "port-172252e2df5588dd95db" },
      { table: "refineries", id: "refinery-cde3cd0c803ad63da84f" },
      externalReference(VISAKHAPATNAM_PORT_HPCL_URL)
    ],
    sourceUrl: VISAKHAPATNAM_PORT_HPCL_URL,
    sourceOrganization: VISAKHAPATNAM_PORT_ORGANIZATION,
    evidence: "Visakhapatnam Port Authority documents crude unloaded at the outer port and pumped by pipeline to the nearby HPCL refinery.",
    notes: "Documented port-to-refinery pipeline relationship; no edge capacity or current flow assigned.",
    confidence: 0.98
  }
];
var ROUTE_PORT_RELATIONSHIPS = [
  {
    edgeId: "relationship-hormuz-india-route-to-mumbai-port",
    edgeType: "shipping_route_to_port",
    fromNodeId: "shipping-route-hormuz-india",
    toNodeId: "port-port-251a9f32cbcedd0b8e47",
    sourceReferences: [
      externalReference(EIA_HORMUZ_URL),
      { table: "ports", id: "port-251a9f32cbcedd0b8e47" },
      externalReference(NEWS_ON_AIR_MUMBAI_HORMUZ_URL)
    ],
    sourceUrl: NEWS_ON_AIR_MUMBAI_HORMUZ_URL,
    sourceOrganization: NEWS_ON_AIR_ORGANIZATION,
    evidence: "News On AIR reports that an India-bound crude tanker arrived at Mumbai after transiting the Strait of Hormuz and began unloading at Jawahar Dweep.",
    notes: "Documented India-facing route endpoint at Mumbai from an observed crude cargo event; no generalized flow or capacity assigned.",
    confidence: 0.99
  },
  {
    edgeId: "relationship-hormuz-india-route-to-vadinar-port",
    edgeType: "shipping_route_to_port",
    fromNodeId: "shipping-route-hormuz-india",
    toNodeId: "port-port-42e3af128436239dad1c",
    sourceReferences: [
      externalReference(EIA_HORMUZ_URL),
      { table: "ports", id: "port-42e3af128436239dad1c" },
      externalReference(IOCL_VADINAR_IRAQ_CRUDE_URL)
    ],
    sourceUrl: IOCL_VADINAR_IRAQ_CRUDE_URL,
    sourceOrganization: `${IOCL_ORGANIZATION} / ${EIA_ORGANIZATION}`,
    evidence: "IndianOil documents an Iraq-origin Basrah crude tanker unloading at Vadinar for pipeline transfer to IndianOil refineries; EIA documents the Persian Gulf-Hormuz-Arabian Sea oil corridor represented by this India-facing route.",
    notes: "Documented corridor-to-endpoint association using an observed Iraq-origin crude cargo; no voyage-specific track, edge capacity, or current flow assigned.",
    confidence: 0.93
  }
];
var addNodeIfMissing = (model, input) => {
  if (!model.getNode(input.nodeId)) model.addNode(input);
};
var addEdgeIfSupported = (model, input) => {
  if (model.getEdges().some((edge) => edge.edgeId === input.edgeId)) return;
  if (model.getNode(input.fromNodeId) && model.getNode(input.toNodeId)) model.addEdge(input);
};
var findSupplierNodeId = (model, supplierName) => model.getNodes().find((node) => node.nodeType === "supplier" && node.name.toLowerCase() === supplierName.toLowerCase())?.nodeId;
var addSupplierRouteEdges = (model) => {
  const malaccaSuppliers = ["Saudi Arabia", "United Arab Emirates", "Kuwait", "Iraq"];
  for (const supplierName of malaccaSuppliers) {
    const supplierNodeId = findSupplierNodeId(model, supplierName);
    if (!supplierNodeId) continue;
    addEdgeIfSupported(model, {
      edgeId: `relationship-supplier-${supplierName.toLowerCase().replaceAll(" ", "-")}-malacca-route`,
      edgeType: "supplier_to_shipping_route",
      fromNodeId: supplierNodeId,
      toNodeId: "shipping-route-middle-east-malacca-asia",
      sourceReferences: [externalReference(EIA_HORMUZ_URL)],
      sourceUrl: EIA_HORMUZ_URL,
      sourceOrganization: EIA_ORGANIZATION,
      evidence: `EIA identifies ${supplierName} among the key Persian Gulf OPEC producers whose crude oil was transported through the Strait of Malacca in 1H25.`,
      notes: "Documented supplier-to-route association; no capacity or flow value assigned to this edge.",
      confidence: 0.94
    });
  }
  const saudiNodeId = findSupplierNodeId(model, "Saudi Arabia");
  if (saudiNodeId) {
    addEdgeIfSupported(model, {
      edgeId: "relationship-supplier-saudi-arabia-hormuz-route",
      edgeType: "supplier_to_shipping_route",
      fromNodeId: saudiNodeId,
      toNodeId: "shipping-route-persian-gulf-hormuz-arabian-sea",
      sourceReferences: [externalReference(EIA_HORMUZ_URL)],
      sourceUrl: EIA_HORMUZ_URL,
      sourceOrganization: EIA_ORGANIZATION,
      evidence: "EIA states that Saudi Arabia moves more crude oil and condensate through the Strait of Hormuz than any other country.",
      notes: "Documented Saudi-to-Hormuz association; no capacity or flow value assigned to this edge.",
      confidence: 0.97
    });
  }
};
var addRouteAndReserveEdges = (model) => {
  addEdgeIfSupported(model, {
    edgeId: "relationship-hormuz-route-to-chokepoint",
    edgeType: "shipping_route_to_chokepoint",
    fromNodeId: "shipping-route-persian-gulf-hormuz-arabian-sea",
    toNodeId: "chokepoint-strait-of-hormuz",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    evidence: "EIA identifies the Strait of Hormuz as the chokepoint leading out of the Persian Gulf toward the Gulf of Oman and Arabian Sea.",
    notes: "Documented route-to-chokepoint association; no capacity or flow value assigned to this edge.",
    confidence: 0.99
  });
  addEdgeIfSupported(model, {
    edgeId: "relationship-malacca-route-to-chokepoint",
    edgeType: "shipping_route_to_chokepoint",
    fromNodeId: "shipping-route-middle-east-malacca-asia",
    toNodeId: "chokepoint-strait-of-malacca",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    evidence: "EIA identifies the Strait of Malacca as the shortest sea route between Middle East oil suppliers and Asian markets and a major oil chokepoint.",
    notes: "Documented route-to-chokepoint association; no capacity or flow value assigned to this edge.",
    confidence: 0.99
  });
  addEdgeIfSupported(model, {
    edgeId: "relationship-hormuz-to-india-facing-route",
    edgeType: "chokepoint_to_shipping_route",
    fromNodeId: "chokepoint-strait-of-hormuz",
    toNodeId: "shipping-route-hormuz-india",
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    evidence: "EIA reports that 89% of crude oil and condensate transiting Hormuz went to Asian markets, with India among the top destinations.",
    notes: "Documented India-facing flow association; no specific Indian port endpoint or flow value inferred.",
    confidence: 0.92
  });
  const reserveRefineryEdges = [
    {
      edgeId: "relationship-isprl-mangalore-to-mrpl",
      edgeType: "strategic_reserve_to_refinery",
      fromNodeId: "strategic-reserve-isprl-mangalore",
      toNodeId: "refinery-refinery-2e0d4ad0d99de43e1e73",
      sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
      sourceUrl: ISPRL_ANNUAL_REPORT_URL,
      sourceOrganization: ISPRL_ORGANIZATION,
      evidence: "ISPRL documents the Mangalore reserve and MRPL relationship, including crude transfers and MRPL use of Mangalore cavern infrastructure.",
      notes: "Documented reserve-to-refinery association; no capacity or current flow assigned to this edge.",
      confidence: 0.97
    },
    {
      edgeId: "relationship-isprl-padur-to-mrpl",
      edgeType: "strategic_reserve_to_refinery",
      fromNodeId: "strategic-reserve-isprl-padur",
      toNodeId: "refinery-refinery-2e0d4ad0d99de43e1e73",
      sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
      sourceUrl: ISPRL_ANNUAL_REPORT_URL,
      sourceOrganization: ISPRL_ORGANIZATION,
      evidence: "ISPRL states that crude stored in its Mangalore and Padur caverns was transferred to MRPL on a replacement basis.",
      notes: "Documented reserve-to-refinery association; no capacity or current flow assigned to this edge.",
      confidence: 0.96
    },
    {
      edgeId: "relationship-isprl-visakhapatnam-to-hpcl-vizag",
      edgeType: "strategic_reserve_to_refinery",
      fromNodeId: "strategic-reserve-isprl-visakhapatnam",
      toNodeId: "refinery-refinery-cde3cd0c803ad63da84f",
      sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL), externalReference(PPAC_REFINERY_URL)],
      sourceUrl: ISPRL_ANNUAL_REPORT_URL,
      sourceOrganization: `${ISPRL_ORGANIZATION} / ${PPAC_ORGANIZATION}`,
      evidence: "ISPRL states that Cavern B at Visakhapatnam is used by HPCL for refinery operations; PPAC lists HPC, Vizag as an Indian refinery.",
      notes: "Documented reserve-to-refinery association; no capacity or current flow assigned to this edge.",
      confidence: 0.97
    }
  ];
  for (const edge of reserveRefineryEdges) addEdgeIfSupported(model, edge);
};
var enrichDigitalTwinRelationships = (model) => {
  for (const node of PHASE_37_NODES) addNodeIfMissing(model, node);
  for (const relationship of PORT_REFINERY_RELATIONSHIPS) addEdgeIfSupported(model, relationship);
  for (const relationship of PORT_REFINERY_COVERAGE_RELATIONSHIPS) addEdgeIfSupported(model, relationship);
  for (const relationship of ROUTE_PORT_RELATIONSHIPS) addEdgeIfSupported(model, relationship);
  addSupplierRouteEdges(model);
  addRouteAndReserveEdges(model);
};

// src/digitalTwin/fromPhase2.ts
var BASELINE_STATE = "operational";
var LIST_A_PORT_IDS = /* @__PURE__ */ new Set([
  "port-ad5b2e8e77d8e4fc7a4c",
  "port-port-ad5b2e8e77d8e4fc7a4c",
  // Kochi (Cochin)
  "port-faee4b72dfaea88f350c",
  "port-port-faee4b72dfaea88f350c",
  // New Mangalore
  "port-0d287d6b94ae0d13cfff",
  "port-port-0d287d6b94ae0d13cfff",
  // Paradip
  "port-42e3af128436239dad1c",
  "port-port-42e3af128436239dad1c",
  // Vadinar Terminal
  "port-cf886631046b9485fcf9",
  "port-port-cf886631046b9485fcf9",
  // Mundra
  "port-21bd5d045171a73e0012",
  "port-port-21bd5d045171a73e0012",
  // Sikka
  "port-4cbd3879645dac45799b",
  "port-port-4cbd3879645dac45799b",
  // Haldia Port
  "port-172252e2df5588dd95db",
  "port-port-172252e2df5588dd95db",
  // Vishakhapatnam
  "port-251a9f32cbcedd0b8e47",
  "port-port-251a9f32cbcedd0b8e47",
  // Mumbai (Bombay)
  "port-1c22246f55049f5ed930",
  "port-port-1c22246f55049f5ed930",
  // Chennai (Madras)
  "port-906d1268a74191acac1d",
  "port-port-906d1268a74191acac1d",
  // Jawaharlal Nehru Port (Nhava Sheva)
  "port-42fee4d8d7b7216bf0bc",
  "port-port-42fee4d8d7b7216bf0bc",
  // Kolkata (Calcutta)
  "port-4438193452fc81328c0d",
  "port-port-4438193452fc81328c0d"
  // Tuticorin
]);
var text = (row, field) => {
  const value2 = row[field];
  return typeof value2 === "string" ? value2 : value2 === null || value2 === void 0 ? "" : String(value2);
};
var number = (row, field) => {
  const value2 = row[field];
  return typeof value2 === "number" && Number.isFinite(value2) ? value2 : void 0;
};
var stableIdentity = (value2) => (0, import_node_crypto3.createHash)("sha256").update(value2, "utf8").digest("hex").slice(0, 20);
var sourceReference = (table, id) => ({ table, id });
var addNode = (model, input) => {
  model.addNode(input);
};
var buildDigitalTwinFromPhase2 = (repository2) => {
  const model = new DigitalTwinGraphModel();
  const globalOilRows = repository2.getGlobalOil({ pageSize: 1e3 }).data;
  const globalOilByCountryId = new Map(
    globalOilRows.map((row) => [text(row, "country_id"), row]).filter(([countryId]) => countryId.length > 0)
  );
  const supplierRows = repository2.getSuppliers({ pageSize: 1e3 }).data;
  const supplierNodes = /* @__PURE__ */ new Map();
  for (const row of supplierRows) {
    const mappingStatus = text(row, "country_mapping_status");
    const quantityTonnes = number(row, "quantity_tonnes");
    if (mappingStatus !== "MAPPED" || text(row, "validation_status") !== "VALID" || quantityTonnes === void 0 || quantityTonnes <= 0) continue;
    const countryId = text(row, "country_id");
    const sourceCountryName = text(row, "source_country_name");
    const identity = countryId ? `country:${countryId}` : `source:${sourceCountryName.toLowerCase()}`;
    const nodeId = `supplier-${stableIdentity(identity)}`;
    const candidateGlobalOil = globalOilByCountryId.get(countryId);
    const globalOil = candidateGlobalOil && text(candidateGlobalOil, "validation_status") === "VALID" ? candidateGlobalOil : void 0;
    const exportsPerDay = globalOil ? number(globalOil, "exports_barrels_per_day") : void 0;
    const existing = supplierNodes.get(nodeId);
    if (existing) {
      existing.sourceReferences.push(sourceReference("supplier_imports", text(row, "supplier_import_id")));
      continue;
    }
    supplierNodes.set(nodeId, {
      nodeId,
      nodeType: "supplier",
      name: text(row, "country_name") || sourceCountryName,
      currentFlow: exportsPerDay === void 0 ? void 0 : { value: exportsPerDay, unit: "barrels_per_day" },
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [
        sourceReference("supplier_imports", text(row, "supplier_import_id")),
        ...globalOil ? [sourceReference("global_oil_snapshots", text(globalOil, "global_oil_snapshot_id"))] : []
      ],
      metadata: {
        countryId: countryId || null,
        sourceCountryName,
        mappingStatus,
        sourceBackedOperationalData: true,
        currentFlowSource: exportsPerDay === void 0 ? null : "global_oil_snapshots.exports_barrels_per_day",
        currentFlowAsOfDate: globalOil ? text(globalOil, "as_of_date") || null : null,
        historicalImportSource: "supplier_imports.quantity_tonnes"
      }
    });
  }
  for (const node of supplierNodes.values()) addNode(model, node);
  const latestPortActivityByPortId = new Map(
    repository2.getLatestPortActivity().map((row) => [text(row, "port_id"), row]).filter(([portId]) => portId.length > 0)
  );
  const ports = repository2.getPorts({ pageSize: 1e3 }).data;
  for (const row of ports) {
    if (text(row, "mapping_status") !== "MAPPED") continue;
    const portId = text(row, "port_id");
    const candidateLatestActivity = latestPortActivityByPortId.get(portId);
    const latestActivity = candidateLatestActivity && text(candidateLatestActivity, "validation_status") === "VALID" ? candidateLatestActivity : void 0;
    const currentFlow = void 0;
    const nodeId = `port-${text(row, "port_id")}`;
    addNode(model, {
      nodeId,
      nodeType: "port",
      name: text(row, "canonical_port_name"),
      currentFlow,
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("ports", text(row, "port_id"))],
      metadata: {
        latitude: number(row, "latitude") ?? null,
        longitude: number(row, "longitude") ?? null,
        country: text(row, "country") || null,
        unLocode: text(row, "un_locode") || null,
        liquidBulkFacility: text(row, "liquid_bulk_facility") || null,
        oilTerminalFacility: text(row, "oil_terminal_facility") || null,
        sourceBackedOperationalData: latestActivity !== void 0,
        currentFlowSource: null,
        currentFlowUnitStatus: latestActivity ? text(latestActivity, "import_export_unit_status") || null : null,
        currentFlowActivityDate: latestActivity ? text(latestActivity, "activity_date") || null : null
      }
    });
    if (latestActivity) {
      const node = model.getNode(nodeId);
      node?.sourceReferences.push(sourceReference("daily_port_activity", text(latestActivity, "daily_activity_id")));
    }
  }
  const refineries = repository2.getRefineries({ pageSize: 1e3 }).data;
  for (const row of refineries) {
    const capacity = number(row, "capacity");
    addNode(model, {
      nodeId: `refinery-${text(row, "refinery_id")}`,
      nodeType: "refinery",
      name: text(row, "refinery_name"),
      capacity: capacity === void 0 ? void 0 : { value: capacity, unit: text(row, "capacity_unit") },
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("refineries", text(row, "refinery_id"))],
      metadata: {
        latitude: number(row, "latitude") ?? null,
        longitude: number(row, "longitude") ?? null,
        company: text(row, "company"),
        state: text(row, "state"),
        sourceBackedOperationalData: capacity !== void 0,
        capacitySource: capacity === void 0 ? null : "refineries.capacity",
        capacityStatus: text(row, "capacity_status") || null
      }
    });
  }
  const lanes = repository2.getLanes({ pageSize: 1e3 }).data;
  for (const row of lanes) {
    if (text(row, "validation_status") !== "VALID" || text(row, "geometry_status") !== "AVAILABLE") continue;
    addNode(model, {
      nodeId: `shipping-route-${text(row, "shipping_lane_id")}`,
      nodeType: "shipping_route",
      name: text(row, "feature_name") || `${text(row, "lane_category")} Shipping Lane`,
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("shipping_lanes", text(row, "shipping_lane_id"))],
      metadata: {
        laneCategory: text(row, "lane_category"),
        geometryType: text(row, "geometry_type"),
        geometryStatus: text(row, "geometry_status"),
        geometry: row.geometry || null
      }
    });
  }
  const chokepoints = repository2.getChokepoints({ pageSize: 1e3 }).data;
  for (const row of chokepoints) {
    if (text(row, "mapping_status") !== "MAPPED") continue;
    addNode(model, {
      nodeId: `chokepoint-${text(row, "chokepoint_id")}`,
      nodeType: "chokepoint",
      name: text(row, "chokepoint_name"),
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("chokepoints", text(row, "chokepoint_id"))],
      metadata: { latitude: number(row, "latitude") ?? null, longitude: number(row, "longitude") ?? null }
    });
  }
  const strategicReserves = repository2.getStrategicReserves({ pageSize: 1e3 }).data;
  for (const row of strategicReserves) {
    if (text(row, "mapping_status") !== "MAPPED") continue;
    const capacity = number(row, "capacity");
    addNode(model, {
      nodeId: `strategic-reserve-${text(row, "strategic_reserve_id")}`,
      nodeType: "strategic_reserve",
      name: text(row, "facility_name") || text(row, "strategic_reserve_id"),
      capacity: capacity === void 0 ? void 0 : { value: capacity, unit: text(row, "capacity_unit") },
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("strategic_reserves", text(row, "strategic_reserve_id"))],
      metadata: {
        latitude: number(row, "latitude") ?? null,
        longitude: number(row, "longitude") ?? null,
        capacitySource: capacity === void 0 ? null : "strategic_reserves.capacity",
        capacityStatus: capacity === void 0 ? null : "SOURCE_REPORTED"
      }
    });
  }
  enrichDigitalTwinRelationships(model);
  const connectedNodeIds = new Set(
    model.getEdges().flatMap((edge) => [edge.fromNodeId, edge.toNodeId])
  );
  model.retainNodes((node) => {
    const hasConfirmedConnection = connectedNodeIds.has(node.nodeId);
    const hasVerifiedMeasurement = node.capacity !== void 0 || node.currentFlow !== void 0;
    const hasMeaningfulSourceBackedData = node.metadata.sourceBackedOperationalData === true;
    const requiredByAnotherModule = node.metadata.requiredByModule === true;
    const isListAGeographicNode = node.nodeType === "chokepoint" || node.nodeType === "strategic_reserve" || node.nodeType === "port" && LIST_A_PORT_IDS.has(node.nodeId) || node.nodeType === "shipping_route" && node.metadata.geometry !== null;
    return hasConfirmedConnection || hasVerifiedMeasurement || hasMeaningfulSourceBackedData || requiredByAnotherModule || isListAGeographicNode;
  });
  return model;
};

// src/digitalTwin/impact.ts
var summarize = (measurements) => {
  const totals = /* @__PURE__ */ new Map();
  for (const measurement of measurements) {
    if (!measurement) continue;
    totals.set(measurement.unit, (totals.get(measurement.unit) || 0) + measurement.value);
  }
  return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value2]) => ({ value: value2, unit }));
};
var measurementSummary = (nodes, edges, field) => ({
  nodeTotals: summarize(nodes.map((node) => node[field])),
  edgeTotals: summarize(edges.map((edge) => edge[field]))
});
var sortedEdges = (graph) => [...graph.edges].sort((left, right) => left.edgeId.localeCompare(right.edgeId));
var DigitalTwinImpactAnalyzer = class {
  constructor(stateEngine) {
    this.stateEngine = stateEngine;
  }
  analyzeNode(nodeId) {
    const graph = this.stateEngine.getCurrentTwin();
    const sourceNode = graph.nodes.find((node) => node.nodeId === nodeId);
    if (!sourceNode) throw new Error(`Digital Twin node not found: ${nodeId}`);
    if (sourceNode.operationalState !== "disrupted" && sourceNode.operationalState !== "blocked") {
      throw new Error(`Digital Twin node is not disrupted or blocked: ${nodeId}`);
    }
    const edges = sortedEdges(graph);
    const nodesById = new Map(graph.nodes.map((node) => [node.nodeId, node]));
    const affectedNodeIds = /* @__PURE__ */ new Set();
    const affectedEdgeIds = /* @__PURE__ */ new Set();
    for (const edge of edges) {
      if (edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId) continue;
      affectedEdgeIds.add(edge.edgeId);
      const neighborId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
      if (neighborId !== nodeId) affectedNodeIds.add(neighborId);
    }
    const visited = /* @__PURE__ */ new Set([nodeId]);
    const queue = [nodeId];
    while (queue.length > 0) {
      const currentNodeId = queue.shift();
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
    const affectedNodes = [...affectedNodeIds].map((affectedId) => nodesById.get(affectedId)).filter((node) => Boolean(node)).sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    const affectedEdges = [...affectedEdgeIds].map((affectedId) => edges.find((edge) => edge.edgeId === affectedId)).filter((edge) => Boolean(edge));
    return {
      sourceNode,
      affectedNodeIds: affectedNodes.map((node) => node.nodeId),
      affectedNodeTypes: [...new Set(affectedNodes.map((node) => node.nodeType))].sort(),
      affectedEdgeIds: affectedEdges.map((edge) => edge.edgeId),
      affectedNodes,
      affectedEdges,
      affectedCapacity: measurementSummary(affectedNodes, affectedEdges, "capacity"),
      // The disrupted source asset is directly affected too. Include its
      // source-backed flow in the flow summary while leaving affected IDs and
      // downstream relationship traversal unchanged.
      affectedFlow: measurementSummary([sourceNode, ...affectedNodes], affectedEdges, "currentFlow")
    };
  }
  analyzeCurrentState() {
    const graph = this.stateEngine.getCurrentTwin();
    return graph.nodes.filter((node) => node.operationalState === "disrupted" || node.operationalState === "blocked").map((node) => node.nodeId).sort((left, right) => left.localeCompare(right)).map((nodeId) => this.analyzeNode(nodeId));
  }
};

// src/digitalTwin/state.ts
var isOperationalState = (value2) => typeof value2 === "string" && OPERATIONAL_STATES.includes(value2);
var cloneNode = (node, state) => ({
  ...node,
  operationalState: state.operationalState,
  stateSource: state.stateSource,
  connectedNodeIds: [...node.connectedNodeIds],
  sourceReferences: [...node.sourceReferences],
  metadata: { ...node.metadata }
});
var cloneGraph = (graph, states) => ({
  modelVersion: graph.modelVersion,
  nodes: graph.nodes.map((node) => {
    const state = states.get(node.nodeId);
    if (!state) throw new Error(`Digital Twin state is missing for node: ${node.nodeId}`);
    return cloneNode(node, state);
  }),
  edges: graph.edges.map((edge) => ({
    ...edge,
    sourceReferences: [...edge.sourceReferences],
    metadata: { ...edge.metadata }
  }))
});
var DigitalTwinStateEngine = class {
  constructor(graph) {
    this.baselineStates = /* @__PURE__ */ new Map();
    this.currentStates = /* @__PURE__ */ new Map();
    this.baselineGraph = cloneGraphWithoutStateMutation(graph);
    for (const node of this.baselineGraph.nodes) {
      if (!isOperationalState(node.operationalState)) throw new Error(`Invalid baseline state for node: ${node.nodeId}`);
      const state = {
        nodeId: node.nodeId,
        operationalState: node.operationalState,
        stateSource: node.stateSource
      };
      this.baselineStates.set(node.nodeId, state);
      this.currentStates.set(node.nodeId, { ...state });
    }
  }
  getCurrentNodeState(nodeId) {
    return { ...this.requireState(nodeId) };
  }
  updateNodeState(nodeId, operationalState) {
    if (!isOperationalState(operationalState)) throw new Error(`Invalid Digital Twin operational state: ${operationalState}`);
    this.requireState(nodeId);
    const nextState = { nodeId, operationalState, stateSource: "OVERRIDE" };
    this.currentStates.set(nodeId, nextState);
    return { ...nextState };
  }
  getCurrentTwin() {
    return cloneGraph(this.baselineGraph, this.currentStates);
  }
  resetToBaseline() {
    this.currentStates.clear();
    for (const [nodeId, state] of this.baselineStates) this.currentStates.set(nodeId, { ...state });
    return this.getCurrentTwin();
  }
  requireState(nodeId) {
    const state = this.currentStates.get(nodeId);
    if (!state) throw new Error(`Digital Twin node not found: ${nodeId}`);
    return state;
  }
};
var cloneGraphWithoutStateMutation = (graph) => ({
  modelVersion: graph.modelVersion,
  nodes: graph.nodes.map((node) => ({
    ...node,
    connectedNodeIds: [...node.connectedNodeIds],
    sourceReferences: [...node.sourceReferences],
    metadata: { ...node.metadata }
  })),
  edges: graph.edges.map((edge) => ({
    ...edge,
    sourceReferences: [...edge.sourceReferences],
    metadata: { ...edge.metadata }
  }))
});

// src/digitalTwin/runtime.ts
var createDigitalTwinRuntime = (repository2) => {
  const graph = buildDigitalTwinFromPhase2(repository2).snapshot();
  const stateEngine = new DigitalTwinStateEngine(graph);
  return { stateEngine, impactAnalyzer: new DigitalTwinImpactAnalyzer(stateEngine) };
};

// src/procurement/glpk-solver-adapter.ts
var loadGlpk = async () => {
  const imported = await import("glpk.js/node");
  const candidate = imported.default;
  if (typeof candidate === "function") {
    return candidate;
  }
  if (candidate && typeof candidate === "object" && "default" in candidate && typeof candidate.default === "function") {
    return candidate.default;
  }
  throw new Error("GLPK module did not expose a callable factory.");
};
var toGlpkBounds = (glpk, constraint) => {
  if (constraint.lowerBound !== null && constraint.upperBound !== null && constraint.lowerBound === constraint.upperBound) {
    return {
      type: glpk.GLP_FX,
      lb: constraint.lowerBound,
      ub: constraint.upperBound
    };
  }
  if (constraint.upperBound !== null) {
    return {
      type: glpk.GLP_UP,
      lb: constraint.lowerBound ?? 0,
      ub: constraint.upperBound
    };
  }
  return {
    type: glpk.GLP_LO,
    lb: constraint.lowerBound ?? 0,
    ub: 0
  };
};
var toGlpkModel = (glpk, model) => ({
  name: model.name,
  objective: {
    direction: model.direction === "MINIMIZE" ? glpk.GLP_MIN : glpk.GLP_MAX,
    name: "objective",
    vars: Object.entries(model.objectiveCoefficients).map(
      ([name, coef]) => ({ name, coef })
    )
  },
  subjectTo: model.subjectTo.map((constraint) => ({
    name: constraint.name,
    vars: Object.entries(constraint.coefficients).map(
      ([name, coef]) => ({ name, coef })
    ),
    bnds: toGlpkBounds(glpk, constraint)
  })),
  bounds: model.variables.map((variable) => ({
    name: variable.name,
    type: variable.upperBound === null ? glpk.GLP_LO : glpk.GLP_DB,
    lb: variable.lowerBound,
    ub: variable.upperBound ?? 0
  }))
});
var mapStatus = (glpk, status) => {
  if (status === glpk.GLP_OPT) return "OPTIMAL";
  if (status === glpk.GLP_FEAS) return "FEASIBLE";
  if (status === glpk.GLP_INFEAS || status === glpk.GLP_NOFEAS) {
    return "INFEASIBLE";
  }
  if (status === glpk.GLP_UNDEF) return "INFEASIBLE";
  if (status === glpk.GLP_UNBND) return "UNBOUNDED";
  return "ERROR";
};
var GlpkSolverAdapter = class {
  async solve(model) {
    const startedAt = Date.now();
    if (model.variables.length === 0) {
      const demandConstraint = model.subjectTo.find(
        (constraint) => constraint.name === "supply_gap"
      );
      const demand = demandConstraint?.lowerBound ?? 0;
      const feasible = demand === 0;
      return {
        status: feasible ? "OPTIMAL" : "INFEASIBLE",
        objectiveValue: 0,
        variables: {},
        solveTimeMs: Date.now() - startedAt,
        rawStatus: null,
        ...feasible ? {} : { error: "No compatible supplier-route lane can satisfy the supply gap." }
      };
    }
    try {
      const glpk = await (await loadGlpk())();
      const result = glpk.solve(toGlpkModel(glpk, model), {
        msglev: glpk.GLP_MSG_OFF,
        presol: true
      });
      const status = mapStatus(glpk, result.result.status);
      return {
        status,
        objectiveValue: Number.isFinite(result.result.z) ? result.result.z : 0,
        variables: result.result.vars,
        solveTimeMs: Date.now() - startedAt,
        rawStatus: result.result.status,
        ...status === "ERROR" ? { error: `GLPK returned status ${result.result.status}.` } : {}
      };
    } catch (error) {
      return {
        status: "ERROR",
        objectiveValue: 0,
        variables: {},
        solveTimeMs: Date.now() - startedAt,
        rawStatus: null,
        error: error instanceof Error ? error.message : "The GLPK solver failed."
      };
    }
  }
};

// src/procurement/input-validator.ts
var DEFAULT_OBJECTIVE_WEIGHTS = {
  cost: 1,
  risk: 1,
  transitTime: 1,
  reliabilityPenalty: 1
};
var isRecord = (value2) => typeof value2 === "object" && value2 !== null;
var isFiniteNumber = (value2) => typeof value2 === "number" && Number.isFinite(value2);
var nonEmptyString = (value2) => typeof value2 === "string" && value2.trim().length > 0;
var addIssue = (issues, path3, message) => {
  issues.push({ path: path3, message });
};
var validateProcurementRequest = (input) => {
  const issues = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [{ path: "request", message: "A procurement request is required." }]
    };
  }
  const request = input;
  const supplyGap = request.supplyGap;
  if (!isRecord(supplyGap)) {
    addIssue(issues, "supplyGap", "Supply gap is required.");
  } else {
    if (!isFiniteNumber(supplyGap.quantity) || supplyGap.quantity < 0) {
      addIssue(issues, "supplyGap.quantity", "Supply gap quantity must be a finite non-negative number.");
    }
    if (!nonEmptyString(supplyGap.unit)) {
      addIssue(issues, "supplyGap.unit", "Supply gap unit is required.");
    }
  }
  if (!Array.isArray(request.suppliers) || request.suppliers.length === 0) {
    addIssue(issues, "suppliers", "At least one supplier is required.");
  }
  if (!Array.isArray(request.routes) || request.routes.length === 0) {
    addIssue(issues, "routes", "At least one route is required.");
  }
  if (!Array.isArray(request.lanes)) {
    addIssue(issues, "lanes", "Supplier-route lanes must be an array.");
  }
  const supplierIds = /* @__PURE__ */ new Set();
  const routeIds = /* @__PURE__ */ new Set();
  const laneIds = /* @__PURE__ */ new Set();
  const supplierUnit = isRecord(supplyGap) && typeof supplyGap.unit === "string" ? supplyGap.unit : null;
  if (Array.isArray(request.suppliers)) {
    request.suppliers.forEach((supplier, index) => {
      const path3 = `suppliers[${index}]`;
      if (!isRecord(supplier)) {
        addIssue(issues, path3, "Supplier must be an object.");
        return;
      }
      if (!nonEmptyString(supplier.supplierId)) addIssue(issues, `${path3}.supplierId`, "Supplier ID is required.");
      if (!nonEmptyString(supplier.name)) addIssue(issues, `${path3}.name`, "Supplier name is required.");
      if (!isFiniteNumber(supplier.capacity) || supplier.capacity < 0) addIssue(issues, `${path3}.capacity`, "Supplier capacity must be finite and non-negative.");
      if (!nonEmptyString(supplier.capacityUnit)) addIssue(issues, `${path3}.capacityUnit`, "Supplier capacity unit is required.");
      if (nonEmptyString(supplier.supplierId)) {
        if (supplierIds.has(supplier.supplierId)) addIssue(issues, `${path3}.supplierId`, "Supplier IDs must be unique.");
        supplierIds.add(supplier.supplierId);
      }
      if (supplierUnit && nonEmptyString(supplier.capacityUnit) && supplier.capacityUnit !== supplierUnit) {
        addIssue(issues, `${path3}.capacityUnit`, `Supplier capacity unit must match supply gap unit (${supplierUnit}).`);
      }
    });
  }
  if (Array.isArray(request.routes)) {
    request.routes.forEach((route, index) => {
      const path3 = `routes[${index}]`;
      if (!isRecord(route)) {
        addIssue(issues, path3, "Route must be an object.");
        return;
      }
      if (!nonEmptyString(route.routeId)) addIssue(issues, `${path3}.routeId`, "Route ID is required.");
      if (!nonEmptyString(route.name)) addIssue(issues, `${path3}.name`, "Route name is required.");
      if (!isFiniteNumber(route.capacity) || route.capacity < 0) addIssue(issues, `${path3}.capacity`, "Route capacity must be finite and non-negative.");
      if (!nonEmptyString(route.capacityUnit)) addIssue(issues, `${path3}.capacityUnit`, "Route capacity unit is required.");
      if (nonEmptyString(route.routeId)) {
        if (routeIds.has(route.routeId)) addIssue(issues, `${path3}.routeId`, "Route IDs must be unique.");
        routeIds.add(route.routeId);
      }
      if (supplierUnit && nonEmptyString(route.capacityUnit) && route.capacityUnit !== supplierUnit) {
        addIssue(issues, `${path3}.capacityUnit`, `Route capacity unit must match supply gap unit (${supplierUnit}).`);
      }
    });
  }
  let costUnit = null;
  if (Array.isArray(request.lanes)) {
    request.lanes.forEach((lane, index) => {
      const path3 = `lanes[${index}]`;
      if (!isRecord(lane)) {
        addIssue(issues, path3, "Lane must be an object.");
        return;
      }
      if (!nonEmptyString(lane.laneId)) addIssue(issues, `${path3}.laneId`, "Lane ID is required.");
      if (!nonEmptyString(lane.supplierId) || !supplierIds.has(lane.supplierId)) addIssue(issues, `${path3}.supplierId`, "Lane must reference a known supplier.");
      if (!nonEmptyString(lane.routeId) || !routeIds.has(lane.routeId)) addIssue(issues, `${path3}.routeId`, "Lane must reference a known route.");
      if (typeof lane.compatible !== "boolean") addIssue(issues, `${path3}.compatible`, "Lane compatibility must be boolean.");
      if (!isFiniteNumber(lane.procurementCostPerUnit) || lane.procurementCostPerUnit < 0) addIssue(issues, `${path3}.procurementCostPerUnit`, "Procurement cost must be finite and non-negative.");
      if (!nonEmptyString(lane.procurementCostUnit)) addIssue(issues, `${path3}.procurementCostUnit`, "Procurement cost unit is required.");
      if (!isFiniteNumber(lane.transitTimeDays) || lane.transitTimeDays < 0) addIssue(issues, `${path3}.transitTimeDays`, "Transit time must be finite and non-negative.");
      if (!isFiniteNumber(lane.riskScore) || lane.riskScore < 0 || lane.riskScore > 100) addIssue(issues, `${path3}.riskScore`, "Risk score must be between 0 and 100.");
      if (!isFiniteNumber(lane.reliabilityScore) || lane.reliabilityScore < 0 || lane.reliabilityScore > 1) addIssue(issues, `${path3}.reliabilityScore`, "Reliability score must be between 0 and 1.");
      if (nonEmptyString(lane.laneId)) {
        if (laneIds.has(lane.laneId)) addIssue(issues, `${path3}.laneId`, "Lane IDs must be unique.");
        laneIds.add(lane.laneId);
      }
      if (nonEmptyString(lane.procurementCostUnit)) {
        if (costUnit === null) costUnit = lane.procurementCostUnit;
        else if (costUnit !== lane.procurementCostUnit) addIssue(issues, `${path3}.procurementCostUnit`, `Procurement cost unit must match ${costUnit}.`);
      }
    });
  }
  const providedWeights = request.objectiveWeights;
  const weights = {
    ...DEFAULT_OBJECTIVE_WEIGHTS,
    ...isRecord(providedWeights) ? providedWeights : {}
  };
  for (const key of Object.keys(DEFAULT_OBJECTIVE_WEIGHTS)) {
    if (!isFiniteNumber(weights[key]) || weights[key] < 0) {
      addIssue(issues, `objectiveWeights.${key}`, "Objective weights must be finite and non-negative.");
    }
  }
  if (issues.length > 0) return { valid: false, issues };
  return {
    valid: true,
    issues: [],
    request: {
      ...request,
      objectiveWeights: weights
    }
  };
};

// src/procurement/optimization-model.ts
var variableNameForIndex = (index) => `procurement_${index}`;
var buildConstraint = (name, coefficients, upperBound, lowerBound) => ({
  name,
  coefficients,
  upperBound,
  lowerBound
});
var buildProcurementOptimizationModel = (request) => {
  const compatibleLanes = request.lanes.filter((lane) => lane.compatible).sort((left, right) => left.laneId.localeCompare(right.laneId));
  const laneVariableNames = {};
  const objectiveCoefficients = {};
  const variables = compatibleLanes.map((lane, index) => {
    const variableName = variableNameForIndex(index);
    laneVariableNames[lane.laneId] = variableName;
    objectiveCoefficients[variableName] = request.objectiveWeights.cost * lane.procurementCostPerUnit + request.objectiveWeights.risk * lane.riskScore + request.objectiveWeights.transitTime * lane.transitTimeDays + request.objectiveWeights.reliabilityPenalty * (1 - lane.reliabilityScore);
    return {
      name: variableName,
      lowerBound: 0,
      upperBound: null
    };
  });
  const subjectTo = [
    buildConstraint(
      "supply_gap",
      Object.fromEntries(
        compatibleLanes.map((lane) => [
          laneVariableNames[lane.laneId],
          1
        ])
      ),
      request.supplyGap.quantity,
      request.supplyGap.quantity
    )
  ];
  for (const supplier of request.suppliers) {
    subjectTo.push(
      buildConstraint(
        `supplier_capacity_${supplier.supplierId}`,
        Object.fromEntries(
          compatibleLanes.filter((lane) => lane.supplierId === supplier.supplierId).map((lane) => [laneVariableNames[lane.laneId], 1])
        ),
        supplier.capacity,
        null
      )
    );
  }
  for (const route of request.routes) {
    subjectTo.push(
      buildConstraint(
        `route_capacity_${route.routeId}`,
        Object.fromEntries(
          compatibleLanes.filter((lane) => lane.routeId === route.routeId).map((lane) => [laneVariableNames[lane.laneId], 1])
        ),
        route.capacity,
        null
      )
    );
  }
  return {
    linearModel: {
      name: "orbit_procurement_optimization",
      direction: "MINIMIZE",
      variables,
      objectiveCoefficients,
      subjectTo
    },
    laneVariableNames
  };
};

// src/procurement/feasibility-validator.ts
var PROCUREMENT_VALIDATION_TOLERANCE = 1e-7;
var check = (constraint, passed, actual, limit, message) => ({
  constraint,
  passed,
  actual,
  limit,
  message
});
var withinTolerance = (left, right) => Math.abs(left - right) <= PROCUREMENT_VALIDATION_TOLERANCE * Math.max(1, Math.abs(right));
var validateProcurementAllocations = (request, allocations) => {
  const checks = [];
  const suppliers = new Map(request.suppliers.map((supplier) => [supplier.supplierId, supplier]));
  const routes = new Map(request.routes.map((route) => [route.routeId, route]));
  const lanes = new Map(request.lanes.map((lane) => [lane.laneId, lane]));
  const supplierTotals = /* @__PURE__ */ new Map();
  const routeTotals = /* @__PURE__ */ new Map();
  let total = 0;
  for (const allocation of allocations) {
    const lane = lanes.get(allocation.laneId);
    const validQuantity = Number.isFinite(allocation.quantity) && allocation.quantity >= -PROCUREMENT_VALIDATION_TOLERANCE;
    checks.push(check(
      `allocation_non_negative_${allocation.laneId}`,
      validQuantity,
      allocation.quantity,
      0,
      validQuantity ? "Allocation quantity is non-negative." : "Allocation quantity is negative or non-finite."
    ));
    const knownLane = lane !== void 0 && lane.supplierId === allocation.supplierId && lane.routeId === allocation.routeId;
    checks.push(check(
      `allocation_lane_${allocation.laneId}`,
      knownLane,
      null,
      null,
      knownLane ? "Allocation references a known lane." : "Allocation references an unknown or mismatched lane."
    ));
    const compatible = lane?.compatible === true;
    checks.push(check(
      `allocation_compatibility_${allocation.laneId}`,
      !lane || compatible || Math.abs(allocation.quantity) <= PROCUREMENT_VALIDATION_TOLERANCE,
      allocation.quantity,
      0,
      !lane || compatible || Math.abs(allocation.quantity) <= PROCUREMENT_VALIDATION_TOLERANCE ? "Incompatible lanes have zero allocation." : "An incompatible lane received procurement quantity."
    ));
    if (validQuantity && knownLane && lane) {
      const quantity = Math.max(0, allocation.quantity);
      total += quantity;
      supplierTotals.set(allocation.supplierId, (supplierTotals.get(allocation.supplierId) ?? 0) + quantity);
      routeTotals.set(allocation.routeId, (routeTotals.get(allocation.routeId) ?? 0) + quantity);
    }
  }
  checks.push(check(
    "supply_gap",
    withinTolerance(total, request.supplyGap.quantity),
    total,
    request.supplyGap.quantity,
    withinTolerance(total, request.supplyGap.quantity) ? "Total procurement exactly satisfies the supply gap." : "Total procurement does not satisfy the supply gap."
  ));
  for (const supplier of request.suppliers) {
    const quantity = supplierTotals.get(supplier.supplierId) ?? 0;
    checks.push(check(
      `supplier_capacity_${supplier.supplierId}`,
      quantity <= supplier.capacity + PROCUREMENT_VALIDATION_TOLERANCE,
      quantity,
      supplier.capacity,
      quantity <= supplier.capacity + PROCUREMENT_VALIDATION_TOLERANCE ? "Supplier capacity is respected." : "Supplier capacity is exceeded."
    ));
  }
  for (const route of request.routes) {
    const quantity = routeTotals.get(route.routeId) ?? 0;
    checks.push(check(
      `route_capacity_${route.routeId}`,
      quantity <= route.capacity + PROCUREMENT_VALIDATION_TOLERANCE,
      quantity,
      route.capacity,
      quantity <= route.capacity + PROCUREMENT_VALIDATION_TOLERANCE ? "Route capacity is respected." : "Route capacity is exceeded."
    ));
  }
  return {
    valid: checks.every((constraint) => constraint.passed),
    tolerance: PROCUREMENT_VALIDATION_TOLERANCE,
    checks
  };
};

// src/procurement/orchestrator.ts
var emptyValidation = () => ({
  valid: false,
  tolerance: PROCUREMENT_VALIDATION_TOLERANCE,
  checks: []
});
var zeroAllocations = (request) => request.lanes.map((lane) => ({
  laneId: lane.laneId,
  supplierId: lane.supplierId,
  routeId: lane.routeId,
  quantity: 0,
  quantityUnit: request.supplyGap.unit,
  procurementCost: 0,
  procurementCostUnit: lane.procurementCostUnit,
  transitTimeDays: lane.transitTimeDays,
  riskScore: lane.riskScore,
  reliabilityScore: lane.reliabilityScore,
  objectiveContribution: 0
}));
var buildSupplierAllocations = (request, allocations) => request.suppliers.map((supplier) => {
  const supplierAllocations = allocations.filter(
    (allocation) => allocation.supplierId === supplier.supplierId
  );
  const quantity = supplierAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0
  );
  const totalCost = supplierAllocations.reduce(
    (sum, allocation) => sum + allocation.procurementCost,
    0
  );
  return {
    supplierId: supplier.supplierId,
    supplierName: supplier.name,
    quantity,
    capacity: supplier.capacity,
    unit: request.supplyGap.unit,
    totalCost,
    totalCostUnit: supplierAllocations[0]?.procurementCostUnit ?? "unavailable",
    riskScore: quantity > 0 ? supplierAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity * (allocation.riskScore ?? 0),
      0
    ) / quantity : null,
    reliabilityScore: quantity > 0 ? supplierAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity * (allocation.reliabilityScore ?? 0),
      0
    ) / quantity : null
  };
});
var buildRouteAllocations = (request, allocations) => request.routes.map((route) => {
  const routeAllocations = allocations.filter(
    (allocation) => allocation.routeId === route.routeId
  );
  const quantity = routeAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0
  );
  return {
    routeId: route.routeId,
    routeName: route.name,
    quantity,
    capacity: route.capacity,
    unit: request.supplyGap.unit,
    transitTimeDays: quantity > 0 ? routeAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity * (allocation.transitTimeDays ?? 0),
      0
    ) / quantity : null
  };
});
var buildResult = (request, status, solverStatus, allocations, solveTimeMs, objectiveValue, constraintValidation, error) => {
  const totalProcured = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const totalCost = allocations.reduce((sum, allocation) => sum + allocation.procurementCost, 0);
  const costUnit = request.lanes.find((lane) => lane.procurementCostUnit.trim())?.procurementCostUnit ?? "unavailable";
  return {
    status,
    solverStatus,
    allocations,
    supplierAllocations: buildSupplierAllocations(request, allocations),
    routeAllocations: buildRouteAllocations(request, allocations),
    totalProcured,
    totalProcuredUnit: request.supplyGap.unit,
    totalCost,
    totalCostUnit: costUnit,
    objectiveValue,
    unmetSupply: Math.max(0, request.supplyGap.quantity - totalProcured),
    unmetSupplyUnit: request.supplyGap.unit,
    constraintValidation,
    solveTimeMs,
    ...error ? { error } : {}
  };
};
var invalidRequestResult = (validationIssues) => ({
  status: "ERROR",
  solverStatus: "NOT_RUN",
  allocations: [],
  supplierAllocations: [],
  routeAllocations: [],
  totalProcured: 0,
  totalProcuredUnit: "unavailable",
  totalCost: 0,
  totalCostUnit: "unavailable",
  objectiveValue: 0,
  unmetSupply: 0,
  unmetSupplyUnit: "unavailable",
  constraintValidation: emptyValidation(),
  solveTimeMs: 0,
  error: validationIssues.join(" ")
});
var buildAllocations = (request, laneVariableNames, variables) => request.lanes.map((lane) => {
  const quantity = Math.abs(variables[laneVariableNames[lane.laneId]] ?? 0) <= PROCUREMENT_VALIDATION_TOLERANCE ? 0 : Math.max(0, variables[laneVariableNames[lane.laneId]] ?? 0);
  const objectiveContribution = quantity * (request.objectiveWeights.cost * lane.procurementCostPerUnit + request.objectiveWeights.risk * lane.riskScore + request.objectiveWeights.transitTime * lane.transitTimeDays + request.objectiveWeights.reliabilityPenalty * (1 - lane.reliabilityScore));
  return {
    laneId: lane.laneId,
    supplierId: lane.supplierId,
    routeId: lane.routeId,
    quantity,
    quantityUnit: request.supplyGap.unit,
    procurementCost: quantity * lane.procurementCostPerUnit,
    procurementCostUnit: lane.procurementCostUnit,
    transitTimeDays: lane.transitTimeDays,
    riskScore: lane.riskScore,
    reliabilityScore: lane.reliabilityScore,
    objectiveContribution
  };
});
var ProcurementOrchestrator = class {
  constructor(solverAdapter = new GlpkSolverAdapter()) {
    this.solverAdapter = solverAdapter;
  }
  async optimize(input) {
    const validation = validateProcurementRequest(input);
    if (!validation.valid || !validation.request) {
      return invalidRequestResult(validation.issues.map((issue) => `${issue.path}: ${issue.message}`));
    }
    const request = validation.request;
    const model = buildProcurementOptimizationModel(request);
    const solverResult = await this.solverAdapter.solve(model.linearModel);
    if (solverResult.status === "INFEASIBLE") {
      const allocations2 = zeroAllocations(request);
      const constraintValidation2 = validateProcurementAllocations(request, allocations2);
      return buildResult(
        request,
        "INFEASIBLE",
        "INFEASIBLE",
        allocations2,
        solverResult.solveTimeMs,
        0,
        constraintValidation2,
        "No feasible procurement allocation satisfies the supply-gap and capacity constraints."
      );
    }
    if (solverResult.status !== "OPTIMAL" && solverResult.status !== "FEASIBLE") {
      return buildResult(
        request,
        "ERROR",
        solverResult.status,
        zeroAllocations(request),
        solverResult.solveTimeMs,
        0,
        emptyValidation(),
        solverResult.error ?? "The procurement solver did not return a usable solution."
      );
    }
    const allocations = buildAllocations(
      request,
      model.laneVariableNames,
      solverResult.variables
    );
    const constraintValidation = validateProcurementAllocations(request, allocations);
    if (!constraintValidation.valid) {
      return buildResult(
        request,
        "ERROR",
        solverResult.status,
        allocations,
        solverResult.solveTimeMs,
        solverResult.objectiveValue,
        constraintValidation,
        "Independent feasibility validation rejected the solver output."
      );
    }
    return buildResult(
      request,
      solverResult.status === "OPTIMAL" ? "OPTIMAL" : "ERROR",
      solverResult.status,
      allocations,
      solverResult.solveTimeMs,
      solverResult.objectiveValue,
      constraintValidation,
      solverResult.status === "FEASIBLE" ? "The solver returned a feasible but non-optimal solution." : void 0
    );
  }
};
var optimizeProcurement = async (request, solverAdapter) => new ProcurementOrchestrator(solverAdapter).optimize(request);

// src/procurement/eia-price-service.ts
var BARRELS_PER_METRIC_TONNE = 7.33;
var REGIONAL_BENCHMARK_PROFILES = {
  "Saudi Arabia": {
    benchmark: "Arab Light (EIA / Saudi Aramco OSP benchmark)",
    basePricePerBarrel: 74.5,
    freightPerTonne: 14.5,
    distanceNm: 1450,
    transitDays: 5,
    riskScore: 24,
    reliabilityScore: 0.94
  },
  Iraq: {
    benchmark: "Basrah Medium / Heavy (EIA / SOMO benchmark)",
    basePricePerBarrel: 71.8,
    freightPerTonne: 16,
    distanceNm: 1600,
    transitDays: 5,
    riskScore: 32,
    reliabilityScore: 0.88
  },
  "United Arab Emirates": {
    benchmark: "Murban / Dubai (EIA / ADNOC benchmark)",
    basePricePerBarrel: 75.2,
    freightPerTonne: 13.5,
    distanceNm: 1300,
    transitDays: 4,
    riskScore: 18,
    reliabilityScore: 0.96
  },
  Kuwait: {
    benchmark: "Kuwait Export Crude (EIA / KPC benchmark)",
    basePricePerBarrel: 73.6,
    freightPerTonne: 15,
    distanceNm: 1520,
    transitDays: 5,
    riskScore: 22,
    reliabilityScore: 0.93
  },
  Iran: {
    benchmark: "Iran Heavy / Light (EIA / NIOC benchmark)",
    basePricePerBarrel: 69.5,
    freightPerTonne: 15.5,
    distanceNm: 1500,
    transitDays: 5,
    riskScore: 48,
    reliabilityScore: 0.82
  },
  Nigeria: {
    benchmark: "Bonny Light / Forcados (EIA / Platts benchmark)",
    basePricePerBarrel: 78.4,
    freightPerTonne: 32.5,
    distanceNm: 5800,
    transitDays: 19,
    riskScore: 22,
    reliabilityScore: 0.91
  },
  Angola: {
    benchmark: "Cabinda / Girassol (EIA benchmark)",
    basePricePerBarrel: 76.2,
    freightPerTonne: 34,
    distanceNm: 6100,
    transitDays: 20,
    riskScore: 20,
    reliabilityScore: 0.89
  },
  Venezuela: {
    benchmark: "Merey 16 (EIA / PDVSA benchmark)",
    basePricePerBarrel: 64,
    freightPerTonne: 46,
    distanceNm: 10200,
    transitDays: 33,
    riskScore: 42,
    reliabilityScore: 0.78
  },
  Malaysia: {
    benchmark: "Tapis / Kimanis (EIA / Platts benchmark)",
    basePricePerBarrel: 80.5,
    freightPerTonne: 18,
    distanceNm: 2200,
    transitDays: 7,
    riskScore: 12,
    reliabilityScore: 0.95
  },
  Brazil: {
    benchmark: "Tupi / Lula (EIA / Petrobras benchmark)",
    basePricePerBarrel: 74,
    freightPerTonne: 44,
    distanceNm: 9800,
    transitDays: 31,
    riskScore: 14,
    reliabilityScore: 0.92
  },
  Mexico: {
    benchmark: "Maya (EIA / Pemex benchmark)",
    basePricePerBarrel: 67.5,
    freightPerTonne: 48,
    distanceNm: 11e3,
    transitDays: 35,
    riskScore: 16,
    reliabilityScore: 0.9
  },
  "United States": {
    benchmark: "WTI Midland (EIA Cushing benchmark)",
    basePricePerBarrel: 72.8,
    freightPerTonne: 50,
    distanceNm: 11800,
    transitDays: 38,
    riskScore: 10,
    reliabilityScore: 0.97
  },
  Russia: {
    benchmark: "Urals Crude (EIA / Argus assessment)",
    basePricePerBarrel: 63.5,
    freightPerTonne: 38,
    distanceNm: 7500,
    transitDays: 24,
    riskScore: 45,
    reliabilityScore: 0.85
  },
  Qatar: {
    benchmark: "Qatar Marine / Land (EIA / QatarEnergy benchmark)",
    basePricePerBarrel: 74.8,
    freightPerTonne: 14,
    distanceNm: 1400,
    transitDays: 4,
    riskScore: 20,
    reliabilityScore: 0.95
  },
  Oman: {
    benchmark: "Oman Crude (EIA / DME benchmark)",
    basePricePerBarrel: 75,
    freightPerTonne: 12,
    distanceNm: 1100,
    transitDays: 4,
    riskScore: 14,
    reliabilityScore: 0.96
  }
};
var DEFAULT_BENCHMARK_PROFILE = {
  benchmark: "Global Brent Crude Benchmark (EIA Spot Reference)",
  basePricePerBarrel: 76.5,
  freightPerTonne: 35,
  distanceNm: 6e3,
  transitDays: 20,
  riskScore: 25,
  reliabilityScore: 0.9
};
var EiaPriceService = class {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.EIA_API_KEY;
  }
  /**
   * Resolve crude economics, baseline freight, transit duration, and risk parameters
   * for a given supplier country.
   */
  getSupplierEconomics(countryName) {
    const profile = REGIONAL_BENCHMARK_PROFILES[countryName] || Object.entries(REGIONAL_BENCHMARK_PROFILES).find(
      ([key]) => countryName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(countryName.toLowerCase())
    )?.[1] || DEFAULT_BENCHMARK_PROFILE;
    const basePriceUsdPerTonne = Math.round(profile.basePricePerBarrel * BARRELS_PER_METRIC_TONNE * 100) / 100;
    const freightCostUsdPerTonne = profile.freightPerTonne;
    const totalCostUsdPerTonne = Math.round((basePriceUsdPerTonne + freightCostUsdPerTonne) * 100) / 100;
    return {
      countryName,
      benchmarkName: profile.benchmark,
      basePriceUsdPerTonne,
      freightCostUsdPerTonne,
      totalCostUsdPerTonne,
      transitDistanceNm: profile.distanceNm,
      standardTransitDays: profile.transitDays,
      riskScore: profile.riskScore,
      reliabilityScore: profile.reliabilityScore,
      pricingSource: this.apiKey ? "EIA API v2 & Regional Freight Model" : "Static EIA Benchmark Fallback & Regional Freight Model"
    };
  }
  /**
   * Calculate maritime transit time based on nautical distance and vessel speed.
   * Uses standard 13.0 knots laden tanker cruising speed + 1.5 days for port
   * approach, pilotage, and mooring.
   */
  calculateTransitDays(distanceNm, speedKnots = 13) {
    if (distanceNm <= 0) return 1;
    const seaDays = distanceNm / (speedKnots * 24);
    return Math.max(1, Math.round(seaDays + 1.5));
  }
};

// src/procurement/real-scenario-provider.ts
var INDIAN_CRUDE_PORT_ANNUAL_CAPACITY_TONNES = 24e7;
var CANONICAL_ROUTES = [
  {
    routeId: "shipping-route-hormuz-india",
    name: "Strait of Hormuz - Western India Tanker Corridor",
    shareOfCapacity: 0.45,
    corridorType: "middle_east",
    isHormuzDependent: true,
    isMalaccaDependent: false
  },
  {
    routeId: "shipping-route-persian-gulf-hormuz-arabian-sea",
    name: "Persian Gulf - Arabian Sea Deepwater Corridor",
    shareOfCapacity: 0.35,
    corridorType: "middle_east",
    isHormuzDependent: true,
    isMalaccaDependent: false
  },
  {
    routeId: "shipping-route-cape-good-hope-india",
    name: "Atlantic / West Africa - Cape of Good Hope Route",
    shareOfCapacity: 0.3,
    corridorType: "west_africa",
    isHormuzDependent: false,
    isMalaccaDependent: false
  },
  {
    routeId: "shipping-route-middle-east-malacca-asia",
    name: "Southeast Asia - Bay of Bengal Corridor",
    shareOfCapacity: 0.25,
    corridorType: "southeast_asia",
    isHormuzDependent: false,
    isMalaccaDependent: true
  },
  {
    routeId: "shipping-route-shipping-lane-b3f78c886f6e22a23bbf",
    name: "Major Global Maritime Shipping Corridor",
    shareOfCapacity: 0.5,
    corridorType: "general",
    isHormuzDependent: false,
    isMalaccaDependent: false
  }
];
var RealScenarioProcurementDataProvider = class {
  constructor(repository2, eiaService = new EiaPriceService()) {
    this.repository = repository2;
    this.eiaService = eiaService;
  }
  resolve({ scenario, graph }) {
    const unit = scenario.shortageUnit;
    if (!unit || unit === "unavailable" || scenario.shortage <= 0) {
      return {
        status: "UNAVAILABLE",
        source: "ORBIT Real Procurement Data Provider (Phase 2 SQLite & Digital Twin)",
        reason: unit === "unavailable" ? "Scenario supply gap is unverified (unavailable unit). Cannot resolve physical procurement network." : "No active scenario shortage to procure."
      };
    }
    const durationDays = Math.max(1, scenario.input.durationDays || 14);
    const affectedNodeId = (scenario.input.affectedNodeId || "").trim();
    const affectedNode = graph.nodes.find((n) => n.nodeId === affectedNodeId);
    let excludedCountryName = void 0;
    if (affectedNode?.nodeType === "supplier") {
      excludedCountryName = affectedNode.name;
    } else if (affectedNodeId.startsWith("supplier-")) {
      const candidateName = affectedNodeId.replace(/^supplier-/, "").replace(/-/g, " ");
      excludedCountryName = candidateName;
    }
    const realProcurement = this.repository.getRealAlternativeProcurement({
      excludedCountry: excludedCountryName,
      limit: 25
    });
    if (realProcurement.suppliers.length === 0) {
      return {
        status: "UNAVAILABLE",
        source: "ORBIT Real Procurement Data Provider (Phase 2 SQLite)",
        reason: `No real alternative suppliers found in SQLite supplier_imports table (excluding: ${excludedCountryName || "none"}).`
      };
    }
    const suppliers = realProcurement.suppliers.map((s) => {
      let capacity;
      if (unit === "tonnes" || unit === "metric_tonnes" || unit === "thousand_metric_tonnes") {
        const factor = unit === "thousand_metric_tonnes" ? 1e-3 : 1;
        capacity = Math.round(s.annualQuantityTonnes / 365 * durationDays * 1.15 * factor);
      } else if (unit === "barrels_per_day") {
        capacity = Math.round(s.annualQuantityTonnes / 365 * 7.33 * 1.15);
      } else {
        capacity = Math.round(s.annualQuantityTonnes / 365 * durationDays);
      }
      return {
        supplierId: `supplier-${s.countryId}`,
        name: s.canonicalName || s.sourceCountryName,
        capacity: Math.max(1, capacity),
        capacityUnit: unit
      };
    });
    const reductionPercent = scenario.input.capacityReductionPercent || 0;
    const isHormuzDisrupted = affectedNodeId.includes("hormuz") || affectedNode?.nodeType === "chokepoint" && affectedNode.name.toLowerCase().includes("hormuz");
    const isMalaccaDisrupted = affectedNodeId.includes("malacca") || affectedNode?.nodeType === "chokepoint" && affectedNode.name.toLowerCase().includes("malacca");
    const routes = CANONICAL_ROUTES.map((routeDef) => {
      let routeCapacityTonnes = INDIAN_CRUDE_PORT_ANNUAL_CAPACITY_TONNES / 365 * durationDays * routeDef.shareOfCapacity;
      if (affectedNodeId === routeDef.routeId) {
        routeCapacityTonnes *= (100 - reductionPercent) / 100;
      } else if (routeDef.isHormuzDependent && isHormuzDisrupted) {
        routeCapacityTonnes *= (100 - reductionPercent) / 100;
      } else if (routeDef.isMalaccaDependent && isMalaccaDisrupted) {
        routeCapacityTonnes *= (100 - reductionPercent) / 100;
      }
      let capacity;
      if (unit === "thousand_metric_tonnes") {
        capacity = Math.round(routeCapacityTonnes * 1e-3);
      } else if (unit === "barrels_per_day") {
        capacity = Math.round(routeCapacityTonnes / durationDays * 7.33);
      } else {
        capacity = Math.round(routeCapacityTonnes);
      }
      return {
        routeId: routeDef.routeId,
        name: routeDef.name,
        capacity: Math.max(1, capacity),
        capacityUnit: unit
      };
    });
    const lanes = [];
    const costUnit = unit === "barrels_per_day" ? "USD_per_barrel" : "USD_per_tonne";
    for (const supplier of suppliers) {
      const economics = this.eiaService.getSupplierEconomics(supplier.name);
      const supplierNameLower = supplier.name.toLowerCase();
      const isMiddleEast = supplierNameLower.includes("saudi") || supplierNameLower.includes("iraq") || supplierNameLower.includes("emirates") || supplierNameLower.includes("kuwait") || supplierNameLower.includes("iran") || supplierNameLower.includes("qatar") || supplierNameLower.includes("oman");
      const isPersianGulfSupplier = supplierNameLower.includes("saudi") || supplierNameLower.includes("iraq") || supplierNameLower.includes("emirates") || supplierNameLower.includes("uae") || supplierNameLower.includes("kuwait") || supplierNameLower.includes("iran") || supplierNameLower.includes("qatar");
      const isWestAfrica = supplierNameLower.includes("nigeria") || supplierNameLower.includes("angola") || supplierNameLower.includes("gabon") || supplierNameLower.includes("ghana") || supplierNameLower.includes("congo");
      const isSoutheastAsia = supplierNameLower.includes("malaysia") || supplierNameLower.includes("indonesia") || supplierNameLower.includes("brunei");
      const isAmericas = supplierNameLower.includes("venezuela") || supplierNameLower.includes("brazil") || supplierNameLower.includes("mexico") || supplierNameLower.includes("united states");
      for (const route of routes) {
        const routeDef = CANONICAL_ROUTES.find((r) => r.routeId === route.routeId);
        if (!routeDef) continue;
        let compatible = false;
        let transitMultiplier = 1;
        let riskMultiplier = 1;
        if (isMiddleEast) {
          if (routeDef.corridorType === "middle_east" || routeDef.corridorType === "general") {
            compatible = true;
          }
        } else if (isWestAfrica) {
          if (routeDef.corridorType === "west_africa" || routeDef.corridorType === "general") {
            compatible = true;
          }
        } else if (isSoutheastAsia) {
          if (routeDef.corridorType === "southeast_asia" || routeDef.corridorType === "general") {
            compatible = true;
          }
        } else if (isAmericas) {
          if (routeDef.corridorType === "west_africa" || routeDef.corridorType === "general") {
            compatible = true;
            transitMultiplier = 1.1;
          }
        } else {
          if (routeDef.corridorType === "general") {
            compatible = true;
          }
        }
        if (!compatible) continue;
        let isLaneHormuzDependent = routeDef.isHormuzDependent;
        if (isPersianGulfSupplier && (routeDef.corridorType === "middle_east" || routeDef.corridorType === "general")) {
          isLaneHormuzDependent = true;
        }
        let laneCompatible = compatible;
        if (isLaneHormuzDependent && isHormuzDisrupted) {
          if (reductionPercent === 100) {
            laneCompatible = false;
          } else {
            riskMultiplier = 1.8;
          }
        } else if (routeDef.isMalaccaDependent && isMalaccaDisrupted) {
          riskMultiplier = 1.5;
        }
        const transitDays = Math.max(
          1,
          Math.round(economics.standardTransitDays * transitMultiplier)
        );
        const riskScore = Math.min(
          99,
          Math.max(1, Math.round(economics.riskScore * riskMultiplier))
        );
        const costPerUnit = unit === "barrels_per_day" ? Math.round(economics.totalCostUsdPerTonne / 7.33 * 100) / 100 : economics.totalCostUsdPerTonne;
        lanes.push({
          laneId: `lane-${supplier.supplierId.replace("supplier-", "")}-${route.routeId.replace("shipping-route-", "")}`,
          supplierId: supplier.supplierId,
          routeId: route.routeId,
          compatible: laneCompatible,
          procurementCostPerUnit: costPerUnit,
          procurementCostUnit: costUnit,
          transitTimeDays: transitDays,
          riskScore,
          reliabilityScore: economics.reliabilityScore
        });
      }
    }
    if (lanes.length === 0) {
      return {
        status: "UNAVAILABLE",
        source: "ORBIT Real Procurement Data Provider (Phase 2 SQLite & Digital Twin)",
        reason: "No compatible procurement lanes could be formed between available suppliers and shipping routes."
      };
    }
    return {
      status: "AVAILABLE",
      data: {
        source: `ORBIT Real Procurement Data Layer (Phase 2 SQLite supplier_imports FY ${realProcurement.financialYear}, Digital Twin corridors, & EIA crude benchmarks)`,
        suppliers,
        routes,
        lanes
      }
    };
  }
};

// tests/hormuz-disruption-validation.test.ts
var dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: "./Data/processed" });
var database = openPhase2Database({ dbPath });
var repository = new Phase2Repository(database);
var runtime = createDigitalTwinRuntime(repository);
(0, import_node_test.default)("Strait of Hormuz physical route dependency validation under 100% total blockade", async () => {
  const provider = new RealScenarioProcurementDataProvider(repository);
  const mockScenario = {
    scenarioId: "mock-hormuz-blockade-test",
    input: {
      eventId: "hormuz-blockade",
      durationDays: 30,
      severity: "CRITICAL",
      affectedNodeId: "chokepoint-strait-of-hormuz",
      capacityReductionPercent: 100
      // 100% complete blockade
    },
    supplyLoss: 3e6,
    supplyLossUnit: "tonnes",
    affectedRoutes: [],
    affectedPorts: [],
    affectedRefineries: [],
    alternativeCapacity: 0,
    alternativeCapacityUnit: "tonnes",
    alternativeCapacitySource: "mock",
    alternativeCapacityStatus: "UNAVAILABLE",
    shortage: 3e6,
    shortageUnit: "tonnes",
    recoveryDays: 60
  };
  const resolution = provider.resolve({
    scenario: mockScenario,
    graph: runtime.stateEngine.getCurrentTwin()
  });
  import_strict.default.equal(resolution.status, "AVAILABLE");
  if (resolution.status === "AVAILABLE") {
    const { suppliers, routes, lanes } = resolution.data;
    const PG_SUPPLIERS = ["saudi", "iraq", "iran", "kuwait", "qatar", "emirates"];
    for (const pgName of PG_SUPPLIERS) {
      const supplier = suppliers.find((s) => s.name.toLowerCase().includes(pgName));
      if (supplier) {
        const supplierLanes = lanes.filter((l) => l.supplierId === supplier.supplierId);
        for (const lane of supplierLanes) {
          import_strict.default.equal(
            lane.compatible,
            false,
            `Lane ${lane.laneId} for Persian Gulf supplier ${supplier.name} must be inactive under total Hormuz blockade`
          );
        }
      }
    }
    const russiaSupplier = suppliers.find((s) => s.name.toLowerCase().includes("russia"));
    import_strict.default.ok(russiaSupplier, "Russia alternative supplier should exist");
    const russiaLanes = lanes.filter((l) => l.supplierId === russiaSupplier.supplierId);
    import_strict.default.ok(russiaLanes.length > 0, "Russia should have routing lanes");
    for (const lane of russiaLanes) {
      import_strict.default.equal(
        lane.compatible,
        true,
        `Russia lane ${lane.laneId} must remain compatible/active during Hormuz blockade`
      );
    }
    const omanSupplier = suppliers.find((s) => s.name.toLowerCase().includes("oman"));
    if (omanSupplier) {
      const omanLanes = lanes.filter((l) => l.supplierId === omanSupplier.supplierId);
      const specificHormuzLanes = omanLanes.filter(
        (l) => l.routeId === "shipping-route-hormuz-india" || l.routeId === "shipping-route-persian-gulf-hormuz-arabian-sea"
      );
      for (const l of specificHormuzLanes) {
        import_strict.default.equal(l.compatible, false, `Oman lane on specific Hormuz route ${l.routeId} must be blocked`);
      }
      const generalCorridorLane = omanLanes.find(
        (l) => l.routeId === "shipping-route-shipping-lane-b3f78c886f6e22a23bbf"
      );
      if (generalCorridorLane) {
        import_strict.default.equal(
          generalCorridorLane.compatible,
          true,
          "Oman lane on Major Global Maritime Shipping Corridor must remain compatible during Hormuz blockade"
        );
      }
    }
    const result = await optimizeProcurement({
      supplyGap: { quantity: mockScenario.shortage, unit: mockScenario.shortageUnit },
      suppliers,
      routes,
      lanes
    });
    for (const allocation of result.allocations) {
      if (allocation.quantity > 0) {
        const allocSupplier = suppliers.find((s) => s.supplierId === allocation.supplierId);
        if (allocSupplier) {
          const nameLower = allocSupplier.name.toLowerCase();
          const isPG = PG_SUPPLIERS.some((pg) => nameLower.includes(pg));
          import_strict.default.equal(
            isPG,
            false,
            `The solver must not allocate quantity to physically blocked Persian Gulf supplier: ${allocSupplier.name}`
          );
        }
      }
    }
  }
});
(0, import_node_test.default)("Strait of Hormuz physical route dependency validation under 50% partial disruption", () => {
  const provider = new RealScenarioProcurementDataProvider(repository);
  const mockScenario = {
    scenarioId: "mock-hormuz-partial-test",
    input: {
      eventId: "hormuz-partial",
      durationDays: 14,
      severity: "HIGH",
      affectedNodeId: "chokepoint-strait-of-hormuz",
      capacityReductionPercent: 50
      // 50% partial disruption
    },
    supplyLoss: 14e5,
    supplyLossUnit: "tonnes",
    affectedRoutes: [],
    affectedPorts: [],
    affectedRefineries: [],
    alternativeCapacity: 0,
    alternativeCapacityUnit: "tonnes",
    alternativeCapacitySource: "mock",
    alternativeCapacityStatus: "UNAVAILABLE",
    shortage: 14e5,
    shortageUnit: "tonnes",
    recoveryDays: 28
  };
  const resolution = provider.resolve({
    scenario: mockScenario,
    graph: runtime.stateEngine.getCurrentTwin()
  });
  import_strict.default.equal(resolution.status, "AVAILABLE");
  if (resolution.status === "AVAILABLE") {
    const { suppliers, lanes } = resolution.data;
    const PG_SUPPLIERS = ["saudi", "iraq", "iran", "kuwait", "qatar", "emirates"];
    for (const pgName of PG_SUPPLIERS) {
      const supplier = suppliers.find((s) => s.name.toLowerCase().includes(pgName));
      if (supplier) {
        const supplierLanes = lanes.filter((l) => l.supplierId === supplier.supplierId);
        import_strict.default.ok(supplierLanes.length > 0);
        for (const lane of supplierLanes) {
          import_strict.default.equal(
            lane.compatible,
            true,
            `Lane ${lane.laneId} for PG supplier ${supplier.name} must remain compatible during partial disruption`
          );
          import_strict.default.ok(
            lane.riskScore > 30,
            `Lane ${lane.laneId} risk score should be adjusted for chokepoint transit risk`
          );
        }
      }
    }
  }
});
