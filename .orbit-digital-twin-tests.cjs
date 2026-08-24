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

// tests/digital-twin-model.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_fs3 = require("node:fs");
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_os = require("node:os");
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
var import_node_crypto = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path2 = __toESM(require("node:path"), 1);
var DEFAULT_PROCESSED_DIR = import_node_path2.default.join(process.cwd(), "data", "processed");
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
  const activityRows = readCsv(processedDir, "daily_port_activity.csv");
  const identityIds = /* @__PURE__ */ new Map();
  for (const row of readCsv(processedDir, "port_source_mapping.csv")) identityIds.set(`${value(row, "source_dataset")}|${value(row, "source_record_key")}`, stableId("port-source", `${value(row, "source_dataset")}|${value(row, "source_record_key")}`));
  const activityFields = ["portcalls_container", "portcalls_dry_bulk", "portcalls_general_cargo", "portcalls_roro", "portcalls_tanker", "portcalls_cargo", "portcalls", "import_container", "import_dry_bulk", "import_general_cargo", "import_roro", "import_tanker", "import_cargo", "import", "export_container", "export_dry_bulk", "export_general_cargo", "export_roro", "export_tanker", "export_cargo", "export"];
  const activityStatement = database.prepare(`INSERT INTO daily_port_activity (daily_activity_id, port_id, port_source_identity_id, source_port_id, source_port_name, canonical_port_name, port_mapping_status, port_mapping_method, activity_date, source_timestamp, source_year, source_month, source_day, source_country, source_iso3, ${activityFields.join(", ")}, source_object_id, import_export_unit_status, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${activityFields.map(() => "?").join(", ")}, ?, ?, ?, ?, ?)`);
  for (const row of activityRows) {
    const identityId = identityIds.get(`${value(row, "source_dataset")}|${value(row, "source_port_id")}`);
    if (!identityId) throw new Error(`Missing port source identity for ${value(row, "source_port_id")}`);
    activityStatement.run(value(row, "daily_activity_id"), nullable(row, "port_id"), identityId, value(row, "source_port_id"), value(row, "source_port_name"), nullable(row, "canonical_port_name"), value(row, "port_mapping_status"), value(row, "port_mapping_method"), value(row, "activity_date"), value(row, "source_timestamp"), requiredNumber(row, "source_year"), requiredNumber(row, "source_month"), requiredNumber(row, "source_day"), value(row, "source_country"), value(row, "source_iso3"), ...activityFields.map((field) => requiredNumber(row, field)), value(row, "source_object_id"), value(row, "import_export_unit_status"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"));
  }
  counts.daily_port_activity = activityRows.length;
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

// src/dataLayer/repository.ts
var pageValues = (options = {}) => ({
  page: Math.max(1, Math.floor(options.page || 1)),
  pageSize: Math.min(1e3, Math.max(1, Math.floor(options.pageSize || 50)))
});
var pagedQuery = (database, selectSql, countSql, whereSql, parameters, options) => {
  const { page, pageSize } = pageValues(options);
  const countRow = database.prepare(`${countSql} ${whereSql}`).get(...parameters);
  const total = Number(countRow?.total || 0);
  const orderMatch = selectSql.match(/\sORDER BY[\s\S]*$/i);
  const baseSelect = orderMatch ? selectSql.slice(0, orderMatch.index) : selectSql;
  const orderSql = orderMatch?.[0] || "";
  const rows = database.prepare(`${baseSelect} ${whereSql}${orderSql} LIMIT ? OFFSET ?`).all(...parameters, pageSize, (page - 1) * pageSize);
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
  constructor(database) {
    this.database = database;
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
var import_node_crypto2 = require("node:crypto");

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
    metadata: { documentedRole: "major oil chokepoint" }
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
    metadata: { documentedRole: "major Asian oil chokepoint" }
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
var text = (row, field) => {
  const value2 = row[field];
  return typeof value2 === "string" ? value2 : value2 === null || value2 === void 0 ? "" : String(value2);
};
var number = (row, field) => {
  const value2 = row[field];
  return typeof value2 === "number" && Number.isFinite(value2) ? value2 : void 0;
};
var stableIdentity = (value2) => (0, import_node_crypto2.createHash)("sha256").update(value2, "utf8").digest("hex").slice(0, 20);
var sourceReference = (table, id) => ({ table, id });
var addNode = (model, input) => {
  model.addNode(input);
};
var buildDigitalTwinFromPhase2 = (repository) => {
  const model = new DigitalTwinGraphModel();
  const supplierRows = repository.getSuppliers({ pageSize: 1e3 }).data;
  const supplierNodes = /* @__PURE__ */ new Map();
  for (const row of supplierRows) {
    const countryId = text(row, "country_id");
    const sourceCountryName = text(row, "source_country_name");
    const identity = countryId ? `country:${countryId}` : `source:${sourceCountryName.toLowerCase()}`;
    const nodeId = `supplier-${stableIdentity(identity)}`;
    const existing = supplierNodes.get(nodeId);
    if (existing) {
      existing.sourceReferences.push(sourceReference("supplier_imports", text(row, "supplier_import_id")));
      continue;
    }
    supplierNodes.set(nodeId, {
      nodeId,
      nodeType: "supplier",
      name: text(row, "country_name") || sourceCountryName,
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("supplier_imports", text(row, "supplier_import_id"))],
      metadata: {
        countryId: countryId || null,
        sourceCountryName,
        mappingStatus: text(row, "country_mapping_status")
      }
    });
  }
  for (const node of supplierNodes.values()) addNode(model, node);
  const ports = repository.getPorts({ pageSize: 1e3 }).data;
  for (const row of ports) {
    const nodeId = `port-${text(row, "port_id")}`;
    addNode(model, {
      nodeId,
      nodeType: "port",
      name: text(row, "canonical_port_name"),
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("ports", text(row, "port_id"))],
      metadata: {
        latitude: number(row, "latitude") ?? null,
        longitude: number(row, "longitude") ?? null,
        country: text(row, "country") || null,
        unLocode: text(row, "un_locode") || null,
        liquidBulkFacility: text(row, "liquid_bulk_facility") || null,
        oilTerminalFacility: text(row, "oil_terminal_facility") || null
      }
    });
  }
  const refineries = repository.getRefineries({ pageSize: 1e3 }).data;
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
      metadata: { company: text(row, "company"), state: text(row, "state") }
    });
  }
  const lanes = repository.getLanes({ pageSize: 1e3 }).data;
  for (const row of lanes) {
    addNode(model, {
      nodeId: `shipping-route-${text(row, "shipping_lane_id")}`,
      nodeType: "shipping_route",
      name: text(row, "feature_name") || `${text(row, "lane_category")} shipping route`,
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("shipping_lanes", text(row, "shipping_lane_id"))],
      metadata: {
        laneCategory: text(row, "lane_category"),
        geometryType: text(row, "geometry_type"),
        geometryStatus: text(row, "geometry_status")
      }
    });
  }
  const chokepoints = repository.getChokepoints({ pageSize: 1e3 }).data;
  for (const row of chokepoints) {
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
  const strategicReserves = repository.getStrategicReserves({ pageSize: 1e3 }).data;
  for (const row of strategicReserves) {
    const capacity = number(row, "capacity");
    addNode(model, {
      nodeId: `strategic-reserve-${text(row, "strategic_reserve_id")}`,
      nodeType: "strategic_reserve",
      name: text(row, "facility_name") || text(row, "strategic_reserve_id"),
      capacity: capacity === void 0 ? void 0 : { value: capacity, unit: text(row, "capacity_unit") },
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences: [sourceReference("strategic_reserves", text(row, "strategic_reserve_id"))],
      metadata: { latitude: number(row, "latitude") ?? null, longitude: number(row, "longitude") ?? null }
    });
  }
  enrichDigitalTwinRelationships(model);
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
      affectedFlow: measurementSummary(affectedNodes, affectedEdges, "currentFlow")
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

// tests/digital-twin-model.test.ts
(0, import_node_test.default)("Digital Twin graph stores node states, edges, and connected nodes", () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: "supplier-1", nodeType: "supplier", name: "Supplier", operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addNode({ nodeId: "route-1", nodeType: "shipping_route", name: "Route", operationalState: "reduced", stateSource: "OBSERVED", sourceReferences: [] });
  model.addEdge({ edgeId: "edge-1", edgeType: "supplier_to_shipping_route", fromNodeId: "supplier-1", toNodeId: "route-1", sourceReferences: [], evidence: "Test edge evidence", notes: "Test edge notes", confidence: 1 });
  import_strict.default.equal(model.getNode("route-1")?.operationalState, "reduced");
  import_strict.default.deepEqual(model.getNode("supplier-1")?.connectedNodeIds, ["route-1"]);
  import_strict.default.deepEqual(model.getNode("route-1")?.connectedNodeIds, ["supplier-1"]);
  import_strict.default.equal(model.snapshot().edges.length, 1);
  model.updateNodeState("route-1", "blocked");
  import_strict.default.equal(model.getNode("route-1")?.operationalState, "blocked");
});
(0, import_node_test.default)("Digital Twin adapter loads real Phase 2 nodes without inventing relationships", () => {
  const temporaryDirectory = (0, import_node_fs3.mkdtempSync)(import_node_path3.default.join((0, import_node_os.tmpdir)(), "orbit-digital-twin-"));
  const databasePath = import_node_path3.default.join(temporaryDirectory, "phase2.sqlite");
  const processedDir = import_node_path3.default.join(process.cwd(), "data", "processed");
  let database = openPhase2Database({ dbPath: databasePath });
  try {
    importPhase2Data({ dbPath: databasePath, processedDir });
    database.close();
    database = openPhase2Database({ dbPath: databasePath });
    const repository = new Phase2Repository(database);
    const phase2Before = {
      ports: JSON.stringify(repository.getPorts({ pageSize: 1e3 }).data),
      refineries: JSON.stringify(repository.getRefineries({ pageSize: 1e3 }).data)
    };
    const graph = buildDigitalTwinFromPhase2(repository).snapshot();
    import_strict.default.equal(graph.nodes.filter((node) => node.nodeType === "port").length, 59);
    import_strict.default.equal(graph.nodes.filter((node) => node.nodeType === "refinery").length, 24);
    import_strict.default.equal(graph.nodes.filter((node) => node.nodeType === "refinery" && node.nodeId === "refinery-refinery-cde3cd0c803ad63da84f").length, 1);
    import_strict.default.equal(graph.nodes.some((node) => node.nodeId === "refinery-hpcl-vizag"), false);
    import_strict.default.equal(graph.nodes.filter((node) => node.nodeType === "shipping_route").length, 6);
    import_strict.default.equal(graph.nodes.filter((node) => node.nodeType === "chokepoint").length, 2);
    import_strict.default.equal(graph.nodes.filter((node) => node.nodeType === "strategic_reserve").length, 3);
    import_strict.default.ok(graph.nodes.every((node) => node.operationalState === "operational"));
    import_strict.default.ok(graph.nodes.some((node) => node.nodeType === "refinery" && node.capacity?.value === 650));
    import_strict.default.equal(graph.edges.length, 27);
    import_strict.default.ok(graph.edges.every((edge) => graph.nodes.some((node) => node.nodeId === edge.fromNodeId) && graph.nodes.some((node) => node.nodeId === edge.toNodeId)));
    import_strict.default.equal(new Set(graph.edges.map((edge) => edge.edgeId)).size, graph.edges.length);
    import_strict.default.ok(graph.edges.every((edge) => edge.sourceReferences.length >= 1 && edge.evidence && edge.notes && edge.confidence > 0));
    const enrichedEdges = graph.edges.filter((edge) => edge.sourceUrl);
    import_strict.default.equal(enrichedEdges.length, 23);
    import_strict.default.ok(enrichedEdges.every((edge) => edge.sourceUrl && edge.sourceOrganization));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-kochi-refinery-bpc"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-new-mangalore-refinery-mrpl"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-paradip-refinery-ioc"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-vadinar-refinery-nel"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-paradip-refinery-ioc-haldia"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-mundra-refinery-ioc-panipat"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-vadinar-refinery-ioc-koyali"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-sikka-refinery-ril-jamnagar"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-haldia-refinery-ioc-haldia"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-port-vishakhapatnam-refinery-hpc-vizag"));
    import_strict.default.equal(graph.edges.filter((edge) => edge.edgeType === "shipping_route_to_port").length, 2);
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-hormuz-india-route-to-mumbai-port"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-hormuz-india-route-to-vadinar-port"));
    const saudiNode = graph.nodes.find((node) => node.nodeType === "supplier" && node.name === "Saudi Arabia");
    import_strict.default.ok(saudiNode);
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-supplier-saudi-arabia-hormuz-route"));
    import_strict.default.ok(graph.edges.some((edge) => edge.edgeId === "relationship-hormuz-route-to-chokepoint"));
    const connectedPath = [
      saudiNode.nodeId,
      "shipping-route-persian-gulf-hormuz-arabian-sea",
      "chokepoint-strait-of-hormuz",
      "shipping-route-hormuz-india",
      "port-port-42e3af128436239dad1c",
      "refinery-refinery-b26a67787b7ad0c1a108"
    ];
    for (let index = 0; index < connectedPath.length - 1; index += 1) {
      import_strict.default.ok(graph.edges.some(
        (edge) => edge.fromNodeId === connectedPath[index] && edge.toNodeId === connectedPath[index + 1] || edge.fromNodeId === connectedPath[index + 1] && edge.toNodeId === connectedPath[index]
      ));
    }
    const realStateEngine = new DigitalTwinStateEngine(graph);
    realStateEngine.updateNodeState(saudiNode.nodeId, "disrupted");
    const realImpact = new DigitalTwinImpactAnalyzer(realStateEngine).analyzeNode(saudiNode.nodeId);
    import_strict.default.ok(realImpact.affectedNodeIds.includes("chokepoint-strait-of-hormuz"));
    import_strict.default.ok(realImpact.affectedNodeIds.includes("shipping-route-hormuz-india"));
    import_strict.default.ok(realImpact.affectedNodeIds.includes("port-port-42e3af128436239dad1c"));
    import_strict.default.ok(realImpact.affectedNodeIds.includes("refinery-refinery-b26a67787b7ad0c1a108"));
    import_strict.default.ok(realImpact.affectedEdgeIds.includes("relationship-hormuz-to-india-facing-route"));
    const reserveEngine = new DigitalTwinStateEngine(graph);
    reserveEngine.updateNodeState("strategic-reserve-isprl-mangalore", "disrupted");
    const reserveImpact = new DigitalTwinImpactAnalyzer(reserveEngine).analyzeNode("strategic-reserve-isprl-mangalore");
    import_strict.default.ok(reserveImpact.affectedNodeIds.includes("refinery-refinery-2e0d4ad0d99de43e1e73"));
    import_strict.default.deepEqual(graph, buildDigitalTwinFromPhase2(repository).snapshot());
    import_strict.default.equal(JSON.stringify(repository.getPorts({ pageSize: 1e3 }).data), phase2Before.ports);
    import_strict.default.equal(JSON.stringify(repository.getRefineries({ pageSize: 1e3 }).data), phase2Before.refineries);
  } finally {
    database.close();
    (0, import_node_fs3.rmSync)(temporaryDirectory, { recursive: true, force: true });
  }
});
var createStateTestGraph = () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: "supplier-1", nodeType: "supplier", name: "Supplier", operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addNode({ nodeId: "route-1", nodeType: "shipping_route", name: "Route", operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addEdge({ edgeId: "edge-1", edgeType: "supplier_to_shipping_route", fromNodeId: "supplier-1", toNodeId: "route-1", sourceReferences: [], evidence: "Test edge evidence", notes: "Test edge notes", confidence: 1 });
  return model.snapshot();
};
(0, import_node_test.default)("Digital Twin state engine starts from the baseline state", () => {
  const engine = new DigitalTwinStateEngine(createStateTestGraph());
  import_strict.default.deepEqual(engine.getCurrentNodeState("supplier-1"), { nodeId: "supplier-1", operationalState: "operational", stateSource: "BASELINE" });
  import_strict.default.equal(engine.getCurrentTwin().edges.length, 1);
});
(0, import_node_test.default)("Digital Twin state engine accepts valid state updates", () => {
  const engine = new DigitalTwinStateEngine(createStateTestGraph());
  import_strict.default.deepEqual(engine.updateNodeState("supplier-1", "disrupted"), { nodeId: "supplier-1", operationalState: "disrupted", stateSource: "OVERRIDE" });
  import_strict.default.equal(engine.getCurrentNodeState("supplier-1").operationalState, "disrupted");
});
(0, import_node_test.default)("Digital Twin state engine rejects invalid node IDs and states", () => {
  const engine = new DigitalTwinStateEngine(createStateTestGraph());
  import_strict.default.throws(() => engine.getCurrentNodeState("missing-node"), /node not found/);
  import_strict.default.throws(() => engine.updateNodeState("missing-node", "blocked"), /node not found/);
  import_strict.default.throws(() => engine.updateNodeState("supplier-1", "invalid"), /Invalid Digital Twin operational state/);
});
(0, import_node_test.default)("Digital Twin state reset restores baseline without mutating the source graph", () => {
  const sourceGraph = createStateTestGraph();
  const sourceBeforeUpdate = JSON.stringify(sourceGraph);
  const engine = new DigitalTwinStateEngine(sourceGraph);
  engine.updateNodeState("route-1", "blocked");
  import_strict.default.equal(engine.getCurrentNodeState("route-1").operationalState, "blocked");
  const resetGraph = engine.resetToBaseline();
  import_strict.default.equal(resetGraph.nodes.find((node) => node.nodeId === "route-1")?.operationalState, "operational");
  import_strict.default.equal(resetGraph.nodes.find((node) => node.nodeId === "route-1")?.stateSource, "BASELINE");
  import_strict.default.equal(JSON.stringify(sourceGraph), sourceBeforeUpdate);
  import_strict.default.deepEqual(resetGraph.edges, sourceGraph.edges);
});
var createImpactTestGraph = () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: "supplier-1", nodeType: "supplier", name: "Supplier", capacity: { value: 100, unit: "tonnes_per_year" }, currentFlow: { value: 60, unit: "tonnes_per_day" }, operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addNode({ nodeId: "route-1", nodeType: "shipping_route", name: "Route", capacity: { value: 80, unit: "tonnes_per_day" }, currentFlow: { value: 40, unit: "tonnes_per_day" }, operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addNode({ nodeId: "port-1", nodeType: "port", name: "Port", capacity: { value: 50, unit: "tonnes_per_day" }, currentFlow: { value: 30, unit: "tonnes_per_day" }, operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addNode({ nodeId: "refinery-1", nodeType: "refinery", name: "Refinery", capacity: { value: 25, unit: "tonnes_per_day" }, currentFlow: { value: 20, unit: "tonnes_per_day" }, operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  model.addEdge({ edgeId: "edge-1", edgeType: "supplier_to_shipping_route", fromNodeId: "supplier-1", toNodeId: "route-1", capacity: { value: 80, unit: "tonnes_per_day" }, currentFlow: { value: 40, unit: "tonnes_per_day" }, sourceReferences: [], evidence: "Test edge evidence", notes: "Test edge notes", confidence: 1 });
  model.addEdge({ edgeId: "edge-2", edgeType: "shipping_route_to_port", fromNodeId: "route-1", toNodeId: "port-1", capacity: { value: 70, unit: "tonnes_per_day" }, currentFlow: { value: 35, unit: "tonnes_per_day" }, sourceReferences: [], evidence: "Test edge evidence", notes: "Test edge notes", confidence: 1 });
  model.addEdge({ edgeId: "edge-3", edgeType: "port_to_refinery", fromNodeId: "port-1", toNodeId: "refinery-1", capacity: { value: 50, unit: "tonnes_per_day" }, currentFlow: { value: 20, unit: "tonnes_per_day" }, sourceReferences: [], evidence: "Test edge evidence", notes: "Test edge notes", confidence: 1 });
  model.addNode({ nodeId: "isolated-1", nodeType: "chokepoint", name: "Isolated", operationalState: "operational", stateSource: "BASELINE", sourceReferences: [] });
  return model.snapshot();
};
(0, import_node_test.default)("Digital Twin disruption analysis reports connected and downstream impact", () => {
  const sourceGraph = createImpactTestGraph();
  const stateEngine = new DigitalTwinStateEngine(sourceGraph);
  stateEngine.updateNodeState("route-1", "disrupted");
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode("route-1");
  import_strict.default.equal(result.sourceNode.operationalState, "disrupted");
  import_strict.default.deepEqual(result.affectedNodeIds, ["port-1", "refinery-1", "supplier-1"]);
  import_strict.default.deepEqual(result.affectedEdgeIds, ["edge-1", "edge-2", "edge-3"]);
  import_strict.default.deepEqual(result.affectedNodeTypes, ["port", "refinery", "supplier"]);
  import_strict.default.deepEqual(result.affectedCapacity.nodeTotals, [{ value: 75, unit: "tonnes_per_day" }, { value: 100, unit: "tonnes_per_year" }]);
  import_strict.default.deepEqual(result.affectedFlow.nodeTotals, [{ value: 110, unit: "tonnes_per_day" }]);
  import_strict.default.deepEqual(result.affectedFlow.edgeTotals, [{ value: 95, unit: "tonnes_per_day" }]);
});
(0, import_node_test.default)("Digital Twin blocked-node analysis includes affected incident edges", () => {
  const stateEngine = new DigitalTwinStateEngine(createImpactTestGraph());
  stateEngine.updateNodeState("port-1", "blocked");
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode("port-1");
  import_strict.default.deepEqual(result.affectedNodeIds, ["refinery-1", "route-1"]);
  import_strict.default.deepEqual(result.affectedEdgeIds, ["edge-2", "edge-3"]);
});
(0, import_node_test.default)("Digital Twin impact analysis returns no impact for an isolated disrupted node", () => {
  const stateEngine = new DigitalTwinStateEngine(createImpactTestGraph());
  stateEngine.updateNodeState("isolated-1", "disrupted");
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode("isolated-1");
  import_strict.default.deepEqual(result.affectedNodeIds, []);
  import_strict.default.deepEqual(result.affectedEdgeIds, []);
  import_strict.default.deepEqual(result.affectedCapacity, { nodeTotals: [], edgeTotals: [] });
  import_strict.default.deepEqual(result.affectedFlow, { nodeTotals: [], edgeTotals: [] });
});
(0, import_node_test.default)("Digital Twin impact analysis rejects nonexistent nodes and analyzes current state deterministically", () => {
  const sourceGraph = createImpactTestGraph();
  const stateEngine = new DigitalTwinStateEngine(sourceGraph);
  const analyzer = new DigitalTwinImpactAnalyzer(stateEngine);
  import_strict.default.throws(() => analyzer.analyzeNode("missing-node"), /node not found/);
  stateEngine.updateNodeState("route-1", "blocked");
  stateEngine.updateNodeState("isolated-1", "disrupted");
  const first = analyzer.analyzeCurrentState();
  const second = analyzer.analyzeCurrentState();
  import_strict.default.deepEqual(second, first);
  import_strict.default.equal(JSON.stringify(sourceGraph), JSON.stringify(createImpactTestGraph()));
});
