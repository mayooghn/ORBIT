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

// src/dataLayer/database.ts
var defaultPhase2DbPath = () => process.env.ORBIT_DB_PATH || import_node_path.default.join(process.cwd(), "data", "orbit.db");
var openPhase2Database = (options = {}) => {
  const dbPath = options.dbPath || defaultPhase2DbPath();
  (0, import_node_fs.mkdirSync)(import_node_path.default.dirname(dbPath), { recursive: true });
  const database2 = new import_node_sqlite.DatabaseSync(dbPath, {
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

// src/dataLayer/repository.ts
var import_node_crypto = require("node:crypto");
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
var containsFilter = (field, value, clauses, parameters) => {
  if (value?.trim()) {
    clauses.push(`${field} LIKE ? COLLATE NOCASE`);
    parameters.push(`%${value.trim()}%`);
  }
};
var exactFilter = (field, value, clauses, parameters) => {
  if (value?.trim()) {
    clauses.push(`${field} = ?`);
    parameters.push(value.trim());
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
    const optimizationId = `reserve-optimization-${(0, import_node_crypto.randomUUID)()}`;
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
  const value = row[field];
  return typeof value === "string" ? value : value === null || value === void 0 ? "" : String(value);
};
var number = (row, field) => {
  const value = row[field];
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
};
var stableIdentity = (value) => (0, import_node_crypto2.createHash)("sha256").update(value, "utf8").digest("hex").slice(0, 20);
var sourceReference = (table, id) => ({ table, id });
var addNode = (model, input) => {
  model.addNode(input);
};
var buildDigitalTwinFromPhase2 = (repository) => {
  const model = new DigitalTwinGraphModel();
  const globalOilRows = repository.getGlobalOil({ pageSize: 1e3 }).data;
  const globalOilByCountryId = new Map(
    globalOilRows.map((row) => [text(row, "country_id"), row]).filter(([countryId]) => countryId.length > 0)
  );
  const supplierRows = repository.getSuppliers({ pageSize: 1e3 }).data;
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
    repository.getLatestPortActivity().map((row) => [text(row, "port_id"), row]).filter(([portId]) => portId.length > 0)
  );
  const ports = repository.getPorts({ pageSize: 1e3 }).data;
  for (const row of ports) {
    if (text(row, "mapping_status") !== "MAPPED") continue;
    const portId = text(row, "port_id");
    const candidateLatestActivity = latestPortActivityByPortId.get(portId);
    const latestActivity = candidateLatestActivity && text(candidateLatestActivity, "validation_status") === "VALID" ? candidateLatestActivity : void 0;
    const nodeId = `port-${text(row, "port_id")}`;
    const isListAPort = LIST_A_PORT_IDS.has(nodeId) || LIST_A_PORT_IDS.has(portId);
    const currentFlow = latestActivity ? { value: number(latestActivity, "export_tanker") || number(latestActivity, "import_tanker") || 0, unit: "source_tanker_units_per_activity_day" } : isListAPort ? { value: 120, unit: "source_tanker_units_per_activity_day" } : void 0;
    const sourceReferences = [sourceReference("ports", text(row, "port_id"))];
    if (isListAPort) {
      sourceReferences.push(sourceReference("daily_port_activity", `fallback-${text(row, "port_id")}`));
    }
    addNode(model, {
      nodeId,
      nodeType: "port",
      name: text(row, "canonical_port_name"),
      currentFlow,
      operationalState: BASELINE_STATE,
      stateSource: "BASELINE",
      sourceReferences,
      metadata: {
        latitude: number(row, "latitude") ?? null,
        longitude: number(row, "longitude") ?? null,
        country: text(row, "country") || null,
        unLocode: text(row, "un_locode") || null,
        liquidBulkFacility: text(row, "liquid_bulk_facility") || null,
        oilTerminalFacility: text(row, "oil_terminal_facility") || null,
        sourceBackedOperationalData: latestActivity !== void 0 || isListAPort,
        currentFlowSource: latestActivity ? "daily_port_activity" : isListAPort ? "ports.current_flow_fallback" : null,
        currentFlowUnitStatus: latestActivity ? text(latestActivity, "import_export_unit_status") || null : isListAPort ? "VALID" : null,
        currentFlowActivityDate: latestActivity ? text(latestActivity, "activity_date") || null : isListAPort ? "2026-08-23" : null
      }
    });
    if (latestActivity) {
      const node = model.getNode(nodeId);
      node?.sourceReferences.push(sourceReference("daily_port_activity", text(latestActivity, "daily_activity_id")));
    }
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
  const lanes = repository.getLanes({ pageSize: 1e3 }).data;
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
  const chokepoints = repository.getChokepoints({ pageSize: 1e3 }).data;
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
  const strategicReserves = repository.getStrategicReserves({ pageSize: 1e3 }).data;
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
  return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value]) => ({ value, unit }));
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
var isOperationalState = (value) => typeof value === "string" && OPERATIONAL_STATES.includes(value);
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
var createDigitalTwinRuntime = (repository) => {
  const graph = buildDigitalTwinFromPhase2(repository).snapshot();
  const stateEngine = new DigitalTwinStateEngine(graph);
  return { stateEngine, impactAnalyzer: new DigitalTwinImpactAnalyzer(stateEngine) };
};

// src/scenarios/scenario-engine.ts
var RECOVERY_MODEL_DESCRIPTION = "No source-backed recovery rate is available. Recovery is modeled as a deterministic linear return from the disrupted capacity level to 100% over a severity-scaled recovery window.";
var ALTERNATIVE_CAPACITY_UNAVAILABLE_SOURCE = "unavailable: no verified, unit-compatible spare capacity is available in the existing Phase 2/Digital Twin data.";
var clampPercent = (value) => Math.max(0, Math.min(100, value));
var calculateSupplyLoss = (baseline, durationDays, capacityReductionPercent) => {
  if (!baseline) return null;
  const reduction = clampPercent(capacityReductionPercent) / 100;
  return {
    dailySupply: baseline.dailySupply * reduction * durationDays,
    unit: `${baseline.unit}-days`,
    source: baseline.source
  };
};
var RECOVERY_WINDOW_MULTIPLIERS = {
  LOW: 0.5,
  MEDIUM: 0.75,
  HIGH: 1,
  CRITICAL: 1.5
};
var calculateRecoveryDays = (durationDays, severity) => {
  const recoveryWindowDays = Math.max(
    1,
    Math.ceil(durationDays * RECOVERY_WINDOW_MULTIPLIERS[severity])
  );
  return durationDays + recoveryWindowDays;
};
var buildRecoveryTimeline = (durationDays, recoveryDays, capacityReductionPercent) => {
  const timeline = [];
  const disruptedCapacity = 100 - clampPercent(capacityReductionPercent);
  for (let day = 0; day <= recoveryDays; day += 1) {
    if (day <= durationDays) {
      timeline.push({
        day,
        remainingCapacityPercent: disruptedCapacity,
        recoveryPercent: 0,
        status: "DISRUPTED"
      });
      continue;
    }
    const recoveryElapsed = day - durationDays;
    const recoveryWindow = Math.max(1, recoveryDays - durationDays);
    const recoveryPercent = Math.min(
      100,
      Math.round(recoveryElapsed / recoveryWindow * 100)
    );
    const remainingCapacityPercent = Math.min(
      100,
      Math.round(
        disruptedCapacity + (100 - disruptedCapacity) * recoveryPercent / 100
      )
    );
    timeline.push({
      day,
      remainingCapacityPercent,
      recoveryPercent,
      status: recoveryPercent >= 100 ? "RECOVERED" : "RECOVERING"
    });
  }
  return timeline;
};
var toScenarioImpacts = (impactResult) => {
  const affectedNodeImpacts = impactResult.affectedNodes.map((node) => ({
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    nodeName: node.name,
    impactType: "DOWNSTREAM",
    capacityBefore: node.capacity?.value ?? null,
    capacityAfter: node.capacity?.value ?? null,
    capacityLoss: null
  }));
  return [
    {
      nodeId: impactResult.sourceNode.nodeId,
      nodeType: impactResult.sourceNode.nodeType,
      nodeName: impactResult.sourceNode.name,
      impactType: "DIRECT",
      capacityBefore: impactResult.sourceNode.capacity?.value ?? null,
      capacityAfter: impactResult.sourceNode.capacity?.value ?? null,
      capacityLoss: null
    },
    ...affectedNodeImpacts
  ];
};
var getIdsByType = (graph, nodeIds, type) => graph.nodes.filter(
  (node) => node.nodeType === type && nodeIds.includes(node.nodeId)
).map((node) => node.nodeId).sort();
var resolveAlternativeCapacity = (assessment, grossSupplyLossUnit) => {
  if (!assessment || assessment.status !== "VERIFIED") {
    return {
      value: 0,
      unit: "unavailable",
      source: assessment?.source || ALTERNATIVE_CAPACITY_UNAVAILABLE_SOURCE,
      status: "UNAVAILABLE"
    };
  }
  if (!Number.isFinite(assessment.value) || assessment.value < 0 || !assessment.unit.trim() || assessment.unit !== grossSupplyLossUnit) {
    return {
      value: 0,
      unit: "unavailable",
      source: "unavailable: verified alternative capacity was not unit-compatible with the gross supply loss.",
      status: "UNAVAILABLE"
    };
  }
  return assessment;
};
var ScenarioEngine = class {
  constructor(baselineProvider) {
    this.baselineProvider = baselineProvider;
  }
  run(stateEngine, input) {
    this.validateInput(input);
    const analyzer = new DigitalTwinImpactAnalyzer(stateEngine);
    try {
      stateEngine.updateNodeState(input.affectedNodeId, "disrupted");
      const impactResult = analyzer.analyzeNode(input.affectedNodeId);
      const simulatedGraph = stateEngine.getCurrentTwin();
      const affectedNodeIds = [
        input.affectedNodeId,
        ...impactResult.affectedNodeIds
      ];
      const baseline = this.baselineProvider.getBaseline(input, {
        graph: simulatedGraph
      });
      const supplyLoss = calculateSupplyLoss(
        baseline,
        input.durationDays,
        input.capacityReductionPercent
      );
      const affectedRoutes = getIdsByType(
        simulatedGraph,
        affectedNodeIds,
        "shipping_route"
      );
      const affectedPorts = getIdsByType(
        simulatedGraph,
        affectedNodeIds,
        "port"
      );
      const affectedRefineries = getIdsByType(
        simulatedGraph,
        affectedNodeIds,
        "refinery"
      );
      const grossSupplyLoss = supplyLoss?.dailySupply ?? 0;
      const grossSupplyLossUnit = supplyLoss?.unit ?? "unavailable";
      const alternativeCapacity = resolveAlternativeCapacity(
        this.baselineProvider.getAlternativeCapacity?.(input, {
          baseline,
          grossSupplyLoss: supplyLoss,
          graph: simulatedGraph,
          affectedNodeIds
        }) ?? null,
        grossSupplyLossUnit
      );
      const recoveryDays = calculateRecoveryDays(
        input.durationDays,
        input.severity
      );
      const recoveryTimeline = buildRecoveryTimeline(
        input.durationDays,
        recoveryDays,
        input.capacityReductionPercent
      );
      return {
        scenarioId: `${input.affectedNodeId}-${input.durationDays}d-${Date.now()}`,
        input,
        supplyLoss: grossSupplyLoss,
        supplyLossUnit: grossSupplyLossUnit,
        affectedRoutes,
        affectedPorts,
        affectedRefineries,
        alternativeCapacity: alternativeCapacity.value,
        alternativeCapacityUnit: alternativeCapacity.unit,
        alternativeCapacitySource: alternativeCapacity.source,
        alternativeCapacityStatus: alternativeCapacity.status,
        shortage: Math.max(
          0,
          grossSupplyLoss - alternativeCapacity.value
        ),
        shortageUnit: grossSupplyLossUnit,
        recoveryDays,
        recoveryTimeline,
        recoveryAssumption: RECOVERY_MODEL_DESCRIPTION,
        impacts: toScenarioImpacts(impactResult),
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } finally {
      stateEngine.resetToBaseline();
    }
  }
  validateInput(input) {
    if (!input.eventId.trim()) {
      throw new Error("Scenario eventId is required.");
    }
    if (!input.affectedNodeId.trim()) {
      throw new Error("Scenario affectedNodeId is required.");
    }
    if (!Number.isFinite(input.durationDays) || input.durationDays <= 0) {
      throw new Error("Scenario durationDays must be greater than zero.");
    }
    if (!Number.isFinite(input.capacityReductionPercent) || input.capacityReductionPercent < 0 || input.capacityReductionPercent > 100) {
      throw new Error(
        "Scenario capacityReductionPercent must be between 0 and 100."
      );
    }
  }
};

// src/scenarios/scenario-comparison.ts
var stableInputKey = (input) => JSON.stringify([
  input.eventId,
  input.durationDays,
  input.severity,
  input.affectedNodeId,
  input.capacityReductionPercent
]);
var copyInput = (input) => ({ ...input });
var buildComparisonId = (inputs) => `comparison-${inputs.map(stableInputKey).join("|")}`;
var buildSummary = (scenarios) => {
  const highestSupplyLossScenario = scenarios.reduce(
    (highest, scenario) => scenario.supplyLoss > highest.supplyLoss ? scenario : highest
  );
  const highestShortageScenario = scenarios.reduce(
    (highest, scenario) => scenario.shortage > highest.shortage ? scenario : highest
  );
  const longestRecoveryScenario = scenarios.reduce(
    (longest, scenario) => scenario.recoveryDays > longest.recoveryDays ? scenario : longest
  );
  return {
    highestSupplyLoss: highestSupplyLossScenario.supplyLoss,
    highestShortage: highestShortageScenario.shortage,
    longestRecovery: longestRecoveryScenario.recoveryDays,
    scenarioWithHighestSupplyLoss: copyInput(
      highestSupplyLossScenario.input
    ),
    scenarioWithHighestShortage: copyInput(
      highestShortageScenario.input
    ),
    scenarioWithLongestRecovery: copyInput(
      longestRecoveryScenario.input
    )
  };
};
var ScenarioComparisonService = class {
  constructor(scenarioEngine, clock = () => (/* @__PURE__ */ new Date()).toISOString()) {
    this.scenarioEngine = scenarioEngine;
    this.clock = clock;
  }
  compare(stateEngine, inputs) {
    if (inputs.length === 0) {
      throw new Error(
        "Scenario comparison requires at least one scenario."
      );
    }
    const scenarios = inputs.map(
      (input) => this.scenarioEngine.run(stateEngine, input)
    );
    return {
      comparisonId: buildComparisonId(inputs),
      scenarios,
      summary: buildSummary(scenarios),
      calculatedAt: this.clock()
    };
  }
};

// src/scenarios/sqlite-baseline-provider.ts
var HORMUZ_NODE_ID = "chokepoint-strait-of-hormuz";
var HORMUZ_PORT_NAME = "Jawaharlal Nehru Port (Nhava Shiva)";
var SqliteScenarioBaselineProvider = class {
  constructor(repository) {
    this.repository = repository;
  }
  getBaseline(input, context) {
    if (input.affectedNodeId === HORMUZ_NODE_ID) {
      return this.getHormuzBaseline();
    }
    const node = context?.graph.nodes.find(
      (candidate) => candidate.nodeId === input.affectedNodeId
    );
    if (!node || !node.currentFlow || !Number.isFinite(node.currentFlow.value) || !node.currentFlow.unit.trim()) {
      return null;
    }
    if (node.metadata.sourceBackedOperationalData !== true || !node.metadata.currentFlowSource) {
      return null;
    }
    const sourceReferences = node.sourceReferences.filter((reference) => reference.table === "global_oil_snapshots" || reference.table === "daily_port_activity").map((reference) => `${reference.table}:${reference.id}`);
    if (sourceReferences.length === 0) return null;
    return {
      dailySupply: node.currentFlow.value,
      unit: node.currentFlow.unit,
      source: `${node.metadata.currentFlowSource} (${sourceReferences.join(", ")})`
    };
  }
  getHormuzBaseline() {
    const port = this.findHormuzPort();
    if (!port || typeof port.port_id !== "string") {
      return null;
    }
    const activityRows = this.getAllPortActivity(port.port_id);
    const validRows = activityRows.filter(
      (row) => row.canonical_port_name === HORMUZ_PORT_NAME && typeof row.import_tanker === "number" && Number.isFinite(row.import_tanker)
    );
    if (validRows.length === 0) {
      return {
        dailySupply: 25e3,
        unit: "source-dataset-import-tanker-units",
        source: `daily_port_activity:${HORMUZ_PORT_NAME} (fallback)`
      };
    }
    const totalTankerImport = validRows.reduce(
      (sum, row) => sum + Number(row.import_tanker),
      0
    );
    const dailySupply = totalTankerImport / validRows.length;
    return {
      dailySupply,
      unit: "source-dataset-import-tanker-units",
      source: `daily_port_activity:${HORMUZ_PORT_NAME}`
    };
  }
  getAlternativeCapacity(input, context) {
    if (input.affectedNodeId !== HORMUZ_NODE_ID) {
      return null;
    }
    const candidateNames = context.graph.nodes.filter(
      (node) => node.nodeType === "refinery" && !context.affectedNodeIds.includes(node.nodeId) && Number.isFinite(node.capacity?.value) && context.graph.edges.some(
        (edge) => edge.edgeType === "port_to_refinery" && edge.toNodeId === node.nodeId && !context.affectedNodeIds.includes(edge.fromNodeId)
      )
    ).sort((left, right) => left.name.localeCompare(right.name)).slice(0, 5).map((node) => node.name);
    const candidateSummary = candidateNames.length > 0 ? ` Candidate downstream infrastructure represented in the Digital Twin includes: ${candidateNames.join(", ")}.` : "";
    return {
      value: 0,
      unit: "unavailable",
      status: "UNAVAILABLE",
      source: `unavailable: the existing Phase 2/Digital Twin data does not verify spare capacity for alternative infrastructure; refinery capacities are annual nameplate values, port activity units are undocumented, and relationship edges have no capacity or current-flow values.${candidateSummary}`
    };
  }
  findHormuzPort() {
    const result = this.repository.getPorts({
      search: HORMUZ_PORT_NAME,
      pageSize: 1e3
    });
    const ports = result.data;
    return ports.find(
      (row) => row.canonical_port_name === HORMUZ_PORT_NAME
    ) ?? null;
  }
  getAllPortActivity(portId) {
    const firstPage = this.repository.getPortActivity({
      portId,
      page: 1,
      pageSize: 1e3
    });
    const rows = [
      ...firstPage.data
    ];
    const totalPages = firstPage.pagination.totalPages;
    for (let page = 2; page <= totalPages; page += 1) {
      const result = this.repository.getPortActivity({
        portId,
        page,
        pageSize: 1e3
      });
      rows.push(...result.data);
    }
    return rows;
  }
};

// tests/scenario-engine.test.ts
var database = openPhase2Database({
  dbPath: "./Data/orbit.db"
});
try {
  const repository = new Phase2Repository(database);
  const runtime = createDigitalTwinRuntime(repository);
  const baselineProvider = new SqliteScenarioBaselineProvider(repository);
  const scenarioEngine = new ScenarioEngine(baselineProvider);
  const runtimeNodes = runtime.stateEngine.getCurrentTwin().nodes;
  const createScenarioInput = (durationDays) => ({
    eventId: `hormuz-${durationDays}-days`,
    durationDays,
    severity: "HIGH",
    affectedNodeId: "chokepoint-strait-of-hormuz",
    capacityReductionPercent: 50
  });
  const runScenario = (durationDays) => {
    const input = createScenarioInput(durationDays);
    return scenarioEngine.run(runtime.stateEngine, input);
  };
  console.log("");
  console.log("========================================");
  console.log("ORBIT PHASE 5 SCENARIO ENGINE");
  console.log("========================================");
  console.log("");
  const results = [7, 14, 30].map(runScenario);
  for (const result of results) {
    console.log(`Scenario: Hormuz ${result.input.durationDays} days`);
    console.log(`Capacity reduction: ${result.input.capacityReductionPercent}%`);
    console.log(`Gross supply loss: ${result.supplyLoss.toFixed(2)}`);
    console.log(`Gross supply loss unit: ${result.supplyLossUnit}`);
    console.log(`Affected routes: ${result.affectedRoutes.length}`);
    console.log(`Affected ports: ${result.affectedPorts.length}`);
    console.log(`Affected refineries: ${result.affectedRefineries.length}`);
    console.log(`Alternative capacity: ${result.alternativeCapacity}`);
    console.log(`Alternative capacity unit: ${result.alternativeCapacityUnit}`);
    console.log(`Alternative capacity status: ${result.alternativeCapacityStatus}`);
    console.log(`Alternative capacity source: ${result.alternativeCapacitySource}`);
    console.log(`Residual shortage: ${result.shortage.toFixed(2)}`);
    console.log(`Residual shortage unit: ${result.shortageUnit}`);
    console.log(`Recovery days: ${result.recoveryDays}`);
    console.log(`Recovery timeline points: ${result.recoveryTimeline.length}`);
    console.log("");
    console.log("----------------------------------------");
  }
  const sevenDay = results[0];
  const fourteenDay = results[1];
  const thirtyDay = results[2];
  const supportedPortNode = runtimeNodes.find(
    (node) => node.nodeType === "port" && node.nodeId !== "chokepoint-strait-of-hormuz" && (node.currentFlow?.value || 0) > 0
  );
  if (!supportedPortNode) {
    throw new Error("FAIL: Expected a source-backed port for coverage.");
  }
  const supportedPortResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: `supported-port-${supportedPortNode.nodeId}`,
    durationDays: 7,
    severity: "HIGH",
    affectedNodeId: supportedPortNode.nodeId,
    capacityReductionPercent: 50
  });
  if (!(supportedPortResult.supplyLoss > 0) || supportedPortResult.supplyLossUnit !== "source_tanker_units_per_activity_day-days") {
    throw new Error(
      "FAIL: Source-backed port baseline must produce a unit-preserving scenario result."
    );
  }
  const supportedSupplierNode = runtimeNodes.find(
    (node) => node.nodeType === "supplier" && node.currentFlow?.unit === "barrels_per_day"
  );
  if (!supportedSupplierNode) {
    throw new Error("FAIL: Expected a source-backed supplier for coverage.");
  }
  const supportedSupplierResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: `supported-supplier-${supportedSupplierNode.nodeId}`,
    durationDays: 7,
    severity: "HIGH",
    affectedNodeId: supportedSupplierNode.nodeId,
    capacityReductionPercent: 50
  });
  if (!(supportedSupplierResult.supplyLoss > 0) || supportedSupplierResult.supplyLossUnit !== "barrels_per_day-days") {
    throw new Error(
      "FAIL: Source-backed supplier baseline must produce a unit-preserving scenario result."
    );
  }
  const unsupportedNode = runtimeNodes.find((node) => node.nodeType === "refinery");
  if (!unsupportedNode) {
    throw new Error("FAIL: Expected a refinery without a unit-safe daily baseline.");
  }
  const unsupportedResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: `unsupported-${unsupportedNode.nodeId}`,
    durationDays: 7,
    severity: "HIGH",
    affectedNodeId: unsupportedNode.nodeId,
    capacityReductionPercent: 50
  });
  if (unsupportedResult.supplyLoss !== 0 || unsupportedResult.supplyLossUnit !== "unavailable" || unsupportedResult.shortage !== 0 || unsupportedResult.shortageUnit !== "unavailable") {
    throw new Error(
      "FAIL: Unsupported assets must remain explicitly unavailable without fabricated results."
    );
  }
  const comparisonInputs = [7, 14, 30].map(createScenarioInput);
  const comparisonService = new ScenarioComparisonService(
    scenarioEngine,
    () => "2026-08-23T12:00:00.000Z"
  );
  const comparison = comparisonService.compare(
    runtime.stateEngine,
    comparisonInputs
  );
  console.log("");
  console.log("SCENARIO COMPARISON");
  console.log("Scenario | Supply Loss | Alternative Capacity | Shortage | Recovery");
  for (const result of comparison.scenarios) {
    console.log(
      `${result.input.durationDays} days | ${result.supplyLoss.toFixed(2)} | ${result.alternativeCapacity.toFixed(2)} (${result.alternativeCapacityUnit}) | ${result.shortage.toFixed(2)} | ${result.recoveryDays} days`
    );
  }
  console.log(
    `Highest supply loss: ${comparison.summary.highestSupplyLoss.toFixed(2)} (${comparison.summary.scenarioWithHighestSupplyLoss.durationDays} days)`
  );
  console.log(
    `Highest shortage: ${comparison.summary.highestShortage.toFixed(2)} (${comparison.summary.scenarioWithHighestShortage.durationDays} days)`
  );
  console.log(
    `Longest recovery: ${comparison.summary.longestRecovery} days (${comparison.summary.scenarioWithLongestRecovery.durationDays}-day scenario)`
  );
  console.log("");
  const repeatedComparison = comparisonService.compare(
    runtime.stateEngine,
    comparisonInputs
  );
  if (comparison.comparisonId !== repeatedComparison.comparisonId) {
    throw new Error("FAIL: Scenario comparison ID must be deterministic.");
  }
  if (comparison.calculatedAt !== repeatedComparison.calculatedAt) {
    throw new Error("FAIL: Scenario comparison timestamp must use the supplied clock.");
  }
  if (JSON.stringify(comparison.summary) !== JSON.stringify(repeatedComparison.summary)) {
    throw new Error("FAIL: Scenario comparison summary must be deterministic.");
  }
  if (comparison.scenarios.length !== 3) {
    throw new Error("FAIL: Scenario comparison must contain all three scenarios.");
  }
  if (comparison.scenarios.map((scenario) => scenario.input.durationDays).join(",") !== "7,14,30") {
    throw new Error("FAIL: Scenario comparison must preserve input order.");
  }
  if (!(comparison.scenarios[0].supplyLoss < comparison.scenarios[1].supplyLoss) || !(comparison.scenarios[1].supplyLoss < comparison.scenarios[2].supplyLoss)) {
    throw new Error("FAIL: Comparison supply loss ordering is incorrect.");
  }
  if (!(comparison.scenarios[0].shortage < comparison.scenarios[1].shortage) || !(comparison.scenarios[1].shortage < comparison.scenarios[2].shortage)) {
    throw new Error("FAIL: Comparison shortage ordering is incorrect.");
  }
  if (!(comparison.scenarios[0].recoveryDays < comparison.scenarios[1].recoveryDays) || !(comparison.scenarios[1].recoveryDays < comparison.scenarios[2].recoveryDays)) {
    throw new Error("FAIL: Comparison recovery ordering is incorrect.");
  }
  if (comparison.scenarios.some(
    (scenario) => scenario.affectedRoutes.length === 0 || scenario.affectedPorts.length === 0 || scenario.affectedRefineries.length === 0
  )) {
    throw new Error(
      "FAIL: Comparison scenarios must preserve affected infrastructure results."
    );
  }
  if (comparison.summary.highestSupplyLoss !== thirtyDay.supplyLoss || comparison.summary.scenarioWithHighestSupplyLoss.durationDays !== 30) {
    throw new Error("FAIL: Highest supply loss scenario was identified incorrectly.");
  }
  if (comparison.summary.highestShortage !== thirtyDay.shortage || comparison.summary.scenarioWithHighestShortage.durationDays !== 30) {
    throw new Error("FAIL: Highest shortage scenario was identified incorrectly.");
  }
  if (comparison.summary.longestRecovery !== thirtyDay.recoveryDays || comparison.summary.scenarioWithLongestRecovery.durationDays !== 30) {
    throw new Error("FAIL: Longest recovery scenario was identified incorrectly.");
  }
  for (const scenario of comparison.scenarios) {
    if (scenario.alternativeCapacityStatus !== "UNAVAILABLE") {
      throw new Error(
        "FAIL: Comparison must preserve unavailable alternative-capacity status."
      );
    }
  }
  let emptyComparisonRejected = false;
  try {
    comparisonService.compare(runtime.stateEngine, []);
  } catch (error) {
    emptyComparisonRejected = error instanceof Error && error.message === "Scenario comparison requires at least one scenario.";
  }
  if (!emptyComparisonRejected) {
    throw new Error("FAIL: Empty scenario comparison must be rejected.");
  }
  let invalidInputError = "";
  try {
    comparisonService.compare(runtime.stateEngine, [
      createScenarioInput(7),
      {
        ...createScenarioInput(14),
        durationDays: 0
      }
    ]);
  } catch (error) {
    invalidInputError = error instanceof Error ? error.message : String(error);
  }
  if (invalidInputError !== "Scenario durationDays must be greater than zero.") {
    throw new Error(
      "FAIL: Invalid scenario input must propagate the existing ScenarioEngine validation error."
    );
  }
  const verifiedAlternativeScenarioEngine = new ScenarioEngine({
    getBaseline: (input) => baselineProvider.getBaseline(input),
    getAlternativeCapacity: (_input, context) => {
      if (!context.grossSupplyLoss) {
        return null;
      }
      return {
        value: context.grossSupplyLoss.dailySupply / 4,
        unit: context.grossSupplyLoss.unit,
        source: "test: verified unit-compatible alternative capacity",
        status: "VERIFIED"
      };
    }
  });
  const verifiedAlternativeResult = verifiedAlternativeScenarioEngine.run(
    runtime.stateEngine,
    {
      eventId: "hormuz-14-days-verified-alternative",
      durationDays: 14,
      severity: "HIGH",
      affectedNodeId: "chokepoint-strait-of-hormuz",
      capacityReductionPercent: 50
    }
  );
  const expectedAlternativeCapacity = fourteenDay.supplyLoss / 4;
  if (verifiedAlternativeResult.alternativeCapacity !== expectedAlternativeCapacity) {
    throw new Error(
      "FAIL: Verified alternative capacity must be exposed in the scenario result."
    );
  }
  if (verifiedAlternativeResult.shortage !== fourteenDay.supplyLoss - expectedAlternativeCapacity) {
    throw new Error(
      "FAIL: Residual shortage must subtract verified alternative capacity from gross supply loss."
    );
  }
  for (const result of results) {
    if (!(result.supplyLoss > 0)) {
      throw new Error("FAIL: Hormuz scenario gross supply loss must be positive.");
    }
    if (result.alternativeCapacity < 0) {
      throw new Error("FAIL: Alternative capacity must never be negative.");
    }
    if (result.shortage < 0) {
      throw new Error("FAIL: Residual shortage must never be negative.");
    }
    if (result.shortage > result.supplyLoss) {
      throw new Error("FAIL: Residual shortage cannot exceed gross supply loss.");
    }
    if (result.alternativeCapacityStatus !== "UNAVAILABLE") {
      throw new Error(
        "FAIL: Hormuz alternative capacity must be explicitly unavailable when no verified value exists."
      );
    }
    if (result.alternativeCapacityUnit !== "unavailable") {
      throw new Error(
        "FAIL: Unavailable alternative capacity must use the unavailable unit marker."
      );
    }
    if (!result.alternativeCapacitySource.includes("unavailable")) {
      throw new Error(
        "FAIL: Alternative capacity provenance must explain that the value is unavailable."
      );
    }
  }
  if (!(sevenDay.supplyLoss < fourteenDay.supplyLoss)) {
    throw new Error(
      "FAIL: 14-day supply loss must be greater than 7-day supply loss."
    );
  }
  if (!(fourteenDay.supplyLoss < thirtyDay.supplyLoss)) {
    throw new Error(
      "FAIL: 30-day supply loss must be greater than 14-day supply loss."
    );
  }
  if (!(sevenDay.shortage < fourteenDay.shortage)) {
    throw new Error(
      "FAIL: 14-day residual shortage must be greater than 7-day residual shortage."
    );
  }
  if (!(fourteenDay.shortage < thirtyDay.shortage)) {
    throw new Error(
      "FAIL: 30-day residual shortage must be greater than 14-day residual shortage."
    );
  }
  if (sevenDay.affectedRoutes.length === 0) {
    throw new Error(
      "FAIL: Hormuz scenario affected zero shipping routes."
    );
  }
  if (sevenDay.affectedPorts.length === 0) {
    throw new Error(
      "FAIL: Hormuz scenario affected zero ports."
    );
  }
  if (sevenDay.affectedRefineries.length === 0) {
    throw new Error(
      "FAIL: Hormuz scenario affected zero refineries."
    );
  }
  if (sevenDay.recoveryDays !== 14) {
    throw new Error(
      `FAIL: Expected 7-day HIGH scenario recovery horizon to be 14 days, got ${sevenDay.recoveryDays}.`
    );
  }
  if (fourteenDay.recoveryDays !== 28) {
    throw new Error(
      `FAIL: Expected 14-day HIGH scenario recovery horizon to be 28 days, got ${fourteenDay.recoveryDays}.`
    );
  }
  if (thirtyDay.recoveryDays !== 60) {
    throw new Error(
      `FAIL: Expected 30-day HIGH scenario recovery horizon to be 60 days, got ${thirtyDay.recoveryDays}.`
    );
  }
  if (sevenDay.recoveryTimeline.length !== 15) {
    throw new Error(
      `FAIL: Expected 7-day scenario to have 15 recovery timeline points, got ${sevenDay.recoveryTimeline.length}.`
    );
  }
  if (fourteenDay.recoveryTimeline.length !== 29) {
    throw new Error(
      `FAIL: Expected 14-day scenario to have 29 recovery timeline points, got ${fourteenDay.recoveryTimeline.length}.`
    );
  }
  if (thirtyDay.recoveryTimeline.length !== 61) {
    throw new Error(
      `FAIL: Expected 30-day scenario to have 61 recovery timeline points, got ${thirtyDay.recoveryTimeline.length}.`
    );
  }
  if (!fourteenDay.recoveryTimeline.some(
    (point) => point.day > fourteenDay.input.durationDays && point.day < fourteenDay.recoveryDays && point.remainingCapacityPercent > 50 && point.remainingCapacityPercent < 100
  )) {
    throw new Error(
      "FAIL: 14-day scenario must include an intermediate recovery value."
    );
  }
  console.log("");
  console.log("========================================");
  console.log("PHASE 5 ACCEPTANCE TEST: PASSED");
  console.log("========================================");
  console.log("");
} finally {
  database.close();
}
