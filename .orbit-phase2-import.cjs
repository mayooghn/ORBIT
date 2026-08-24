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

// src/dataLayer/importer.ts
var import_node_crypto = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path2 = __toESM(require("node:path"), 1);

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
  const dbPath = options.dbPath || defaultPhase2DbPath();
  (0, import_node_fs.mkdirSync)(import_node_path.default.dirname(dbPath), { recursive: true });
  const database = new import_node_sqlite.DatabaseSync(dbPath, {
    enableForeignKeyConstraints: true,
    timeout: 5e3
  });
  database.exec(PHASE2_SCHEMA_SQL);
  const portColumns = database.prepare("PRAGMA table_info(ports)").all();
  const portColumnNames = new Set(portColumns.map((column) => column.name));
  if (!portColumnNames.has("liquid_bulk_facility")) database.exec("ALTER TABLE ports ADD COLUMN liquid_bulk_facility TEXT");
  if (!portColumnNames.has("oil_terminal_facility")) database.exec("ALTER TABLE ports ADD COLUMN oil_terminal_facility TEXT");
  return database;
};

// src/dataLayer/importer.ts
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
  const text = value(row, field);
  return text === "" ? null : text;
};
var numberValue = (row, field) => {
  const text = value(row, field);
  if (text === "") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value in ${field}: ${text}`);
  return parsed;
};
var requiredNumber = (row, field) => {
  const parsed = numberValue(row, field);
  if (parsed === null) throw new Error(`Missing required numeric value in ${field}`);
  return parsed;
};
var parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
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
var readJson = (text) => {
  try {
    JSON.parse(text);
    return text;
  } catch {
    return JSON.stringify(text);
  }
};
var runStatement = (database, sql, parameters = []) => {
  database.prepare(sql).run(...parameters);
};
var allRows = (database, table) => database.prepare(`SELECT * FROM ${table}`).all();
var clearData = (database) => {
  for (const table of PHASE2_DATA_TABLES) database.exec(`DELETE FROM ${table}`);
};
var insertSourceManifest = (database, rows) => {
  const ids = /* @__PURE__ */ new Map();
  const statement = database.prepare(`
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
var insertUnits = (database) => {
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
  const statement = database.prepare(`INSERT INTO unit_definitions (unit_id, canonical_unit_code, source_unit_text, quantity_kind, unit_status, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const unit of units) statement.run(...unit);
};
var insertFinancialPeriods = (database, rows) => {
  const ids = /* @__PURE__ */ new Map();
  const statement = database.prepare(`INSERT INTO financial_periods (financial_period_id, financial_year, financial_year_start, source_financial_year_labels, source_datasets) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) {
    const financialYear = value(row, "financial_year");
    const id = value(row, "financial_period_id");
    ids.set(financialYear, id);
    statement.run(id, financialYear, requiredNumber(row, "financial_year_start"), value(row, "source_financial_year_labels"), value(row, "source_datasets"));
  }
  return ids;
};
var insertProducts = (database, productRows, aliasRows, sourceIds) => {
  const ids = /* @__PURE__ */ new Map();
  const productStatement = database.prepare(`INSERT INTO products (product_id, canonical_name, product_class, source_name, source_code, source_dataset, mapping_status, mapping_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of productRows) {
    const id = value(row, "product_id");
    ids.set(value(row, "canonical_name"), id);
    productStatement.run(id, value(row, "canonical_name"), value(row, "product_class"), value(row, "source_name"), nullable(row, "source_code"), value(row, "source_dataset"), value(row, "mapping_status"), value(row, "mapping_method"));
  }
  const aliasStatement = database.prepare(`INSERT INTO product_aliases (product_alias_id, data_source_id, product_id, source_name, source_code, mapping_status, mapping_method) VALUES (?, ?, ?, ?, ?, ?, ?)`);
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
var insertCountries = (database, countryRows, aliasRows, sourceIds) => {
  const ids = /* @__PURE__ */ new Map();
  const statement = database.prepare(`INSERT INTO countries (country_id, canonical_name, source_dataset, mapping_status) VALUES (?, ?, ?, ?)`);
  for (const row of countryRows) {
    const id = value(row, "country_id");
    ids.set(value(row, "canonical_name"), id);
    statement.run(id, value(row, "canonical_name"), value(row, "source_dataset"), value(row, "mapping_status"));
  }
  const aliasStatement = database.prepare(`INSERT INTO country_aliases (country_alias_id, data_source_id, country_id, source_name, source_normalized_name, country_code, mapping_status, mapping_method, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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
var insertPorts = (database, portRows, mappingRows, sourceIds, countryIds) => {
  const portIds = /* @__PURE__ */ new Map();
  const portStatement = database.prepare(`INSERT INTO ports (port_id, canonical_port_name, source_port_name, source_name_variants, un_locode, latitude, longitude, country, country_id, source_dataset, mapping_status, mapping_method, source_record_key, world_port_index_number, source_unlocode_status, liquid_bulk_facility, oil_terminal_facility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of portRows) {
    const country = nullable(row, "country");
    const id = value(row, "port_id");
    portIds.set(id, id);
    portStatement.run(id, value(row, "canonical_port_name"), value(row, "source_port_name"), value(row, "source_name_variants"), nullable(row, "un_locode"), numberValue(row, "latitude"), numberValue(row, "longitude"), country, country ? countryIds.get(country) || null : null, value(row, "source_dataset"), value(row, "mapping_status"), value(row, "mapping_method"), value(row, "source_record_key"), nullable(row, "world_port_index_number"), nullable(row, "source_unlocode_status"), nullable(row, "liquid_bulk_facility"), nullable(row, "oil_terminal_facility"));
  }
  const identityStatement = database.prepare(`INSERT INTO port_source_identities (port_source_identity_id, data_source_id, port_id, source_record_key, source_port_name, source_world_port_index_number, source_un_locode, mapping_status, mapping_method, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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
var insertRefineries = (database, rows, sourceIds) => {
  const statement = database.prepare(`INSERT INTO refineries (refinery_id, refinery_name, company, state, capacity, capacity_unit, latitude, longitude, source_company_name, source_refinery_name, source_state_name, data_source_id, source_row_number, state_mapping_status, capacity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of rows) statement.run(value(row, "refinery_id"), value(row, "refinery_name"), value(row, "company"), value(row, "state"), requiredNumber(row, "capacity"), value(row, "capacity_unit"), numberValue(row, "latitude"), numberValue(row, "longitude"), value(row, "source_company_name"), value(row, "source_refinery_name"), value(row, "source_state_name"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "state_mapping_status"), value(row, "capacity_status"));
};
var insertShippingLanes = (database, processedDir, rows, sourceIds) => {
  const statement = database.prepare(`INSERT INTO shipping_lanes (shipping_lane_id, source_feature_id, source_object_id, feature_name, lane_category, geometry_type, line_part_count, coordinate_point_count, geometry_valid, geometry_bounds_lon_lat, source_geometry_crs_status, data_source_id, source_feature_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const geometryStatement = database.prepare(`INSERT INTO shipping_lane_geometries (shipping_lane_geometry_id, shipping_lane_id, geometry_type, geometry_json, source_geometry_crs_status, geometry_status) VALUES (?, ?, ?, ?, ?, ?)`);
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
var insertFacts = (database, processedDir, sourceIds, periodIds, countryIds, productIds) => {
  const counts = {};
  const supplierRows = readCsv(processedDir, "supplier_imports.csv");
  const supplierStatement = database.prepare(`INSERT INTO supplier_imports (supplier_import_id, financial_period_id, country_id, quantity_tonnes, quantity_unit, source_country_name, source_country_normalized_name, country_code, source_product_code, source_product_description, product_id, source_quantity_unit, source_trade_value_source_units, trade_value_unit_status, data_source_id, source_row_number, country_mapping_status, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of supplierRows) {
    const sourceDataset = value(row, "source_dataset");
    supplierStatement.run(stableId("supplier-import", `${sourceDataset}:${value(row, "source_row_number")}`), periodIds.get(value(row, "financial_year")), nullable(row, "country_id"), requiredNumber(row, "quantity_tonnes"), value(row, "quantity_unit"), value(row, "source_country_name"), value(row, "source_country_normalized_name"), value(row, "country_code"), value(row, "source_product_code"), value(row, "source_product_description"), value(row, "product_id"), value(row, "source_quantity_unit"), numberValue(row, "source_trade_value_source_units"), "UNDOCUMENTED", sourceIds.get(sourceDataset), requiredNumber(row, "source_row_number"), value(row, "country_mapping_status"), value(row, "validation_status"));
  }
  counts.supplier_imports = supplierRows.length;
  const crudeRows = readCsv(processedDir, "crude_import_totals.csv");
  const crudeStatement = database.prepare(`INSERT INTO crude_import_totals (crude_import_total_id, financial_period_id, quantity_thousand_metric_tonnes, quantity_unit, source_financial_year, data_source_id, source_row_number, validation_status, time_series_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of crudeRows) crudeStatement.run(stableId("crude-import-total", `${value(row, "source_dataset")}:${value(row, "source_row_number")}`), periodIds.get(value(row, "financial_year")), requiredNumber(row, "quantity_thousand_metric_tonnes"), value(row, "quantity_unit"), value(row, "source_financial_year"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"), value(row, "time_series_scope"));
  counts.crude_import_totals = crudeRows.length;
  const consumptionRows = readCsv(processedDir, "petroleum_consumption.csv");
  const consumptionStatement = database.prepare(`INSERT INTO petroleum_consumption (petroleum_consumption_id, product_id, financial_period_id, source_product_name, calendar_year, month_number, month_name, consumption_metric_tonnes, consumption_unit, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of consumptionRows) consumptionStatement.run(stableId("petroleum-consumption", `${value(row, "source_dataset")}:${value(row, "source_row_number")}`), value(row, "product_id"), periodIds.get(value(row, "financial_year")), value(row, "source_product_name"), requiredNumber(row, "calendar_year"), requiredNumber(row, "month_number"), value(row, "month_name"), requiredNumber(row, "consumption_metric_tonnes"), value(row, "consumption_unit"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"));
  counts.petroleum_consumption = consumptionRows.length;
  const globalRows = readCsv(processedDir, "global_oil_snapshot.csv");
  const globalStatement = database.prepare(`INSERT INTO global_oil_snapshots (global_oil_snapshot_id, country_id, canonical_country_name, source_country_name, source_rank, rank, source_proven_reserves_barrels, proven_reserves_barrels, source_production_barrels_per_day, production_barrels_per_day, source_consumption_barrels_per_day, consumption_barrels_per_day, source_exports_barrels_per_day, exports_barrels_per_day, source_imports_barrels_per_day, imports_barrels_per_day, as_of_date, data_source_id, source_row_number, missing_metric_count, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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
    const activityStatement = database.prepare(`INSERT INTO daily_port_activity (daily_activity_id, port_id, port_source_identity_id, source_port_id, source_port_name, canonical_port_name, port_mapping_status, port_mapping_method, activity_date, source_timestamp, source_year, source_month, source_day, source_country, source_iso3, ${activityFields.join(", ")}, source_object_id, import_export_unit_status, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${activityFields.map(() => "?").join(", ")}, ?, ?, ?, ?, ?)`);
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
var insertQuality = (database, processedDir, sourceIds) => {
  const counts = {};
  const summaryRows = readCsv(processedDir, "data_quality_summary.csv");
  const summaryStatement = database.prepare(`INSERT INTO data_quality_summaries (dataset, processed_file, source_dataset, input_row_count, output_row_count, excluded_row_count, null_count_by_important_field, duplicate_count, invalid_value_count, unresolved_mapping_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of summaryRows) summaryStatement.run(value(row, "dataset"), value(row, "processed_file"), value(row, "source_dataset"), requiredNumber(row, "input_row_count"), requiredNumber(row, "output_row_count"), requiredNumber(row, "excluded_row_count"), readJson(value(row, "null_count_by_important_field")), requiredNumber(row, "duplicate_count"), requiredNumber(row, "invalid_value_count"), requiredNumber(row, "unresolved_mapping_count"), value(row, "notes"));
  counts.data_quality_summaries = summaryRows.length;
  const issueRows = readCsv(processedDir, "data_quality_issues.csv");
  const issueStatement = database.prepare(`INSERT INTO data_quality_issues (data_quality_issue_id, data_source_id, source_dataset, source_row_number, source_record_key, issue_type, field_name, severity, issue_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of issueRows) issueStatement.run(stableId("quality-issue", JSON.stringify(row)), sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), numberValue(row, "source_row_number"), value(row, "source_record_key"), value(row, "issue_type"), value(row, "field_name"), value(row, "severity"), value(row, "issue_status"), value(row, "description"));
  counts.data_quality_issues = issueRows.length;
  return counts;
};
var insertManualReview = (database, processedDir, sourceIds) => {
  const countryRows = readCsv(import_node_path2.default.join(processedDir, "manual_review"), "country_manual_review.csv");
  const portRows = readCsv(import_node_path2.default.join(processedDir, "manual_review"), "port_manual_review.csv");
  const statement = database.prepare(`INSERT INTO manual_review_records (manual_review_id, review_type, data_source_id, source_dataset, source_record_key, source_name, candidate_name, source_identifier, mapping_status, review_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of countryRows) statement.run(stableId("manual-country", JSON.stringify(row)), "COUNTRY", sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), null, value(row, "source_name"), null, nullable(row, "country_code"), "MANUAL_REVIEW", value(row, "review_reason"));
  for (const row of portRows) statement.run(stableId("manual-port", JSON.stringify(row)), "PORT", sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), value(row, "source_record_key"), value(row, "source_port_name"), nullable(row, "candidate_canonical_port_name"), nullable(row, "source_identifier"), "MANUAL_REVIEW", value(row, "reason"));
  return countryRows.length + portRows.length;
};
var insertRelationshipStatuses = (database) => {
  const rows = [
    ["refinery_port", "Refinery to port", "UNRESOLVED", "phase2-data-model.md and phase2-cleaning-report.md", "Source data contains no refinery coordinates, port identifiers, or reviewed refinery-port links."],
    ["port_shipping_lane", "Port to shipping lane", "UNRESOLVED", "phase2-data-model.md and phase2-cleaning-report.md", "Shipping lanes contain geometry categories but no port endpoints or join keys."],
    ["chokepoint_shipping_lane", "Chokepoint to shipping lane", "NOT_CONNECTED", "phase2-data-model.md", "No chokepoint dataset is supplied."],
    ["supplier_import_route", "Supplier import to route", "UNRESOLVED", "phase2-data-model.md and phase2-cleaning-report.md", "Supplier imports have no route, lane, receiving port, or refinery relationship."],
    ["strategic_reserve", "Strategic reserve", "NOT_CONNECTED", "phase2-data-model.md", "No strategic-reserve dataset is supplied."]
  ];
  const statement = database.prepare(`INSERT INTO relationship_statuses (relationship_key, relationship_name, status, source_basis, notes) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) statement.run(...row);
};
var importPhase2Data = (options = {}) => {
  const processedDirectory = options.processedDir || process.env.ORBIT_PROCESSED_DATA_DIR || DEFAULT_PROCESSED_DIR;
  const database = openPhase2Database({ dbPath: options.dbPath || defaultPhase2DbPath() });
  const importRunId = stableId("import-run", `${processedDirectory}|${(/* @__PURE__ */ new Date()).toISOString()}`);
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  let counts = {};
  runStatement(database, `INSERT INTO import_runs (import_run_id, processed_directory, started_at, status) VALUES (?, ?, ?, 'RUNNING')`, [importRunId, processedDirectory, startedAt]);
  try {
    database.exec("BEGIN");
    clearData(database);
    insertUnits(database);
    const sourceIds = insertSourceManifest(database, readCsv(processedDirectory, "data_source.csv"));
    const periodIds = insertFinancialPeriods(database, readCsv(processedDirectory, "financial_period.csv"));
    const productIds = insertProducts(database, readCsv(processedDirectory, "product.csv"), readCsv(processedDirectory, "product_source_mapping.csv"), sourceIds);
    const countryIds = insertCountries(database, readCsv(processedDirectory, "country.csv"), readCsv(processedDirectory, "country_source_mapping.csv"), sourceIds);
    insertPorts(database, readCsv(processedDirectory, "port.csv"), readCsv(processedDirectory, "port_source_mapping.csv"), sourceIds, countryIds);
    insertRefineries(database, readCsv(processedDirectory, "refinery.csv"), sourceIds);
    insertShippingLanes(database, processedDirectory, readCsv(processedDirectory, "shipping_lanes_metadata.csv"), sourceIds);
    counts = insertFacts(database, processedDirectory, sourceIds, periodIds, countryIds, productIds);
    counts.data_sources = allRows(database, "data_sources").length;
    counts.financial_periods = allRows(database, "financial_periods").length;
    counts.products = allRows(database, "products").length;
    counts.countries = allRows(database, "countries").length;
    counts.country_aliases = allRows(database, "country_aliases").length;
    counts.ports = allRows(database, "ports").length;
    counts.port_source_identities = allRows(database, "port_source_identities").length;
    counts.refineries = allRows(database, "refineries").length;
    counts.shipping_lanes = allRows(database, "shipping_lanes").length;
    Object.assign(counts, insertQuality(database, processedDirectory, sourceIds));
    counts.manual_review_records = insertManualReview(database, processedDirectory, sourceIds);
    insertRelationshipStatuses(database);
    counts.relationship_statuses = allRows(database, "relationship_statuses").length;
    database.exec("COMMIT");
    runStatement(database, `UPDATE import_runs SET completed_at = ?, status = 'COMPLETED', row_counts_json = ? WHERE import_run_id = ?`, [(/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(counts), importRunId]);
    database.close();
    return { importRunId, processedDirectory, counts };
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
    }
    runStatement(database, `UPDATE import_runs SET completed_at = ?, status = 'FAILED', error_message = ? WHERE import_run_id = ?`, [(/* @__PURE__ */ new Date()).toISOString(), error instanceof Error ? error.message : String(error), importRunId]);
    database.close();
    throw error;
  }
};

// scripts/phase2_import.ts
try {
  const result = importPhase2Data();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("[ORBIT Phase 2] Import failed:", error);
  process.exitCode = 1;
}
