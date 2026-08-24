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

// tests/geopolitical-monitoring.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_http = require("node:http");
var import_node_fs3 = require("node:fs");
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_os = require("node:os");
var import_node_test = __toESM(require("node:test"), 1);

// server.ts
var import_express = __toESM(require("express"), 1);
var import_node_fs2 = require("node:fs");
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_process = require("node:process");
var import_vite = require("vite");

// src/services/dataIngestion/googleNews.ts
var import_node_crypto = require("node:crypto");
var GOOGLE_NEWS_QUERIES = [
  "energy supply disruption",
  "oil supply disruption",
  "gas supply disruption",
  "LNG disruption",
  "pipeline disruption",
  "refinery disruption",
  "tanker shipping disruption",
  "maritime energy disruption",
  "energy sanctions",
  "energy chokepoint",
  "geopolitical energy disruption"
];
var GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";
var REQUEST_TIMEOUT_MS = 1e4;
var ingestionStatus = "NOT_CONNECTED";
function getNewsIngestionStatus() {
  return ingestionStatus;
}
function buildFeedUrl(query) {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en"
  });
  return `${GOOGLE_NEWS_RSS_URL}?${params.toString()}`;
}
function decodeXmlEntities(value) {
  return value.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16))).replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}
function cleanText(value) {
  if (!value) return "";
  let cleaned = decodeXmlEntities(value);
  cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
  cleaned = cleaned.replace(/<[^>]*>/g, " ");
  cleaned = decodeXmlEntities(cleaned);
  return cleaned.replace(/\s+/g, " ").trim();
}
function extractTag(block, tagName) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  return tagPattern.exec(block)?.[1];
}
function extractRssItems(xml) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
}
function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return void 0;
    url.hash = "";
    return url.toString();
  } catch {
    return void 0;
  }
}
function parsePublishedAt(value) {
  const publishedText = cleanText(value);
  if (!publishedText) return "";
  const timestamp = Date.parse(publishedText);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}
function stableArticleId(url, title) {
  const identity = `${url}
${title}`;
  const digest = (0, import_node_crypto.createHash)("sha256").update(identity).digest("hex").slice(0, 24);
  return `news-${digest}`;
}
function sourceFromTitle(title) {
  const match = title.match(/^(.+?)\s+-\s+([^\-]+)$/);
  if (!match) return { title, source: "" };
  return {
    title: match[1].trim(),
    source: match[2].trim()
  };
}
function parseItem(itemXml, query, retrievedAt) {
  const rawTitle = cleanText(extractTag(itemXml, "title"));
  const url = normalizeUrl(cleanText(extractTag(itemXml, "link")));
  const rawPublishedAt = extractTag(itemXml, "pubDate") ?? extractTag(itemXml, "published");
  const publishedAt = parsePublishedAt(rawPublishedAt);
  if (!rawTitle || !url) return null;
  if (cleanText(rawPublishedAt) && !publishedAt) return null;
  const parsedTitle = sourceFromTitle(rawTitle);
  const explicitSource = cleanText(extractTag(itemXml, "source"));
  const description = cleanText(extractTag(itemXml, "description"));
  const article2 = {
    id: stableArticleId(url, parsedTitle.title),
    title: parsedTitle.title,
    url,
    source: explicitSource || parsedTitle.source,
    publishedAt,
    retrievedAt,
    query
  };
  if (description) article2.description = description;
  return article2;
}
function parseGoogleNewsRss(xml, query = "", retrievedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  return extractRssItems(xml).map((itemXml) => parseItem(itemXml, query, retrievedAt)).filter((article2) => article2 !== null);
}
async function fetchRssUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "ORBIT/Phase2 GoogleNewsIngestion"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Google News returned HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
var fetchFeed = async (query) => fetchRssUrl(buildFeedUrl(query));
async function fetchGoogleNews(options = {}) {
  const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
  const feeds = options.feedUrls?.length ? options.feedUrls.map((url) => ({ label: url, fetch: () => fetchRssUrl(url) })) : (options.queries?.length ? options.queries : GOOGLE_NEWS_QUERIES).map((query) => ({ label: query, fetch: () => fetchFeed(query) }));
  const results = await Promise.allSettled(
    feeds.map(async (feed) => ({
      query: feed.label,
      xml: await feed.fetch()
    }))
  );
  const articlesByUrl = /* @__PURE__ */ new Map();
  let successfulFeeds = 0;
  results.forEach((result, index) => {
    const query = feeds[index].label;
    if (result.status === "rejected") {
      console.warn(`[ORBIT News] Feed failed for "${query}":`, result.reason);
      return;
    }
    successfulFeeds += 1;
    try {
      for (const article2 of parseGoogleNewsRss(result.value.xml, query, retrievedAt)) {
        if (!articlesByUrl.has(article2.url)) {
          articlesByUrl.set(article2.url, article2);
        }
      }
    } catch (error) {
      console.warn(`[ORBIT News] Feed parsing failed for "${query}":`, error);
    }
  });
  const articles = [...articlesByUrl.values()].sort((a, b) => {
    const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return right - left;
  });
  if (successfulFeeds === 0) {
    ingestionStatus = "ERROR";
    return {
      status: "ERROR",
      source: "Google News RSS",
      retrievedAt,
      count: 0,
      articles: []
    };
  }
  ingestionStatus = "READY";
  return {
    status: "AVAILABLE",
    source: "Google News RSS",
    retrievedAt,
    count: articles.length,
    articles
  };
}

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
var DIGITAL_TWIN_NODE_TYPES = [
  "supplier",
  "port",
  "refinery",
  "strategic_reserve",
  "shipping_route",
  "chokepoint"
];
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
      affectedFlow: measurementSummary(affectedNodes, affectedEdges, "currentFlow")
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

// src/geopoliticalEvents/model.ts
var GEOPOLITICAL_EVENT_CATEGORIES = [
  "conflict",
  "sanctions",
  "political_instability",
  "trade_restriction",
  "maritime_disruption",
  "diplomatic_escalation",
  "infrastructure_disruption",
  "other"
];
var GEOPOLITICAL_EVENT_SEVERITIES = ["low", "medium", "high", "critical"];
var GeopoliticalEventValidationError = class extends Error {
  constructor(message) {
    super(`Invalid geopolitical event: ${message}`);
    this.name = "GeopoliticalEventValidationError";
  }
};
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var requiredText = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new GeopoliticalEventValidationError(`${field} is required.`);
  }
  return value.trim();
};
var optionalText = (value, field) => {
  if (value === void 0 || value === null) return void 0;
  return requiredText(value, field);
};
var validateTimestamp = (value) => {
  const timestamp = requiredText(value, "timestamp");
  if (!timestamp.includes("T") || !Number.isFinite(Date.parse(timestamp))) {
    throw new GeopoliticalEventValidationError("timestamp must be a valid date-time string.");
  }
  return timestamp;
};
var validateSourceUrl = (value) => {
  const sourceUrl = optionalText(value, "sourceUrl");
  if (sourceUrl === void 0) return void 0;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol");
  } catch {
    throw new GeopoliticalEventValidationError("sourceUrl must be a valid HTTP(S) URL.");
  }
  return sourceUrl;
};
var validateCountries = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new GeopoliticalEventValidationError("countriesInvolved must contain at least one country.");
  }
  const countries = value.map((country, index) => requiredText(country, `countriesInvolved[${index}]`));
  const seen = /* @__PURE__ */ new Set();
  for (const country of countries) {
    const key = country.toLocaleLowerCase();
    if (seen.has(key)) throw new GeopoliticalEventValidationError(`countriesInvolved contains a duplicate country: ${country}.`);
    seen.add(key);
  }
  return countries;
};
var validateEnum = (value, field, values) => {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new GeopoliticalEventValidationError(`${field} must be one of: ${values.join(", ")}.`);
  }
  return value;
};
var validateGeopoliticalEvent = (value) => {
  if (!isRecord(value)) throw new GeopoliticalEventValidationError("event must be an object.");
  return {
    id: requiredText(value.id, "id"),
    title: requiredText(value.title, "title"),
    description: requiredText(value.description, "description"),
    timestamp: validateTimestamp(value.timestamp),
    source: requiredText(value.source, "source"),
    sourceUrl: validateSourceUrl(value.sourceUrl),
    location: optionalText(value.location, "location"),
    countriesInvolved: validateCountries(value.countriesInvolved),
    category: validateEnum(value.category, "category", GEOPOLITICAL_EVENT_CATEGORIES),
    severity: validateEnum(value.severity, "severity", GEOPOLITICAL_EVENT_SEVERITIES)
  };
};

// src/geopoliticalEvents/classification.ts
var COUNTRY_REGIONS = {
  bangladesh: "South Asia",
  bahrain: "Middle East",
  china: "East Asia",
  egypt: "Middle East",
  france: "Europe",
  germany: "Europe",
  india: "South Asia",
  indonesia: "Southeast Asia",
  iran: "Middle East",
  iraq: "Middle East",
  israel: "Middle East",
  japan: "East Asia",
  jordan: "Middle East",
  kuwait: "Middle East",
  malaysia: "Southeast Asia",
  oman: "Middle East",
  pakistan: "South Asia",
  qatar: "Middle East",
  russia: "Eastern Europe / North Asia",
  saudiarabia: "Middle East",
  singapore: "Southeast Asia",
  srilanka: "South Asia",
  southkorea: "East Asia",
  turkey: "Middle East / Europe",
  unitedarabemirates: "Middle East",
  uae: "Middle East",
  ukraine: "Eastern Europe",
  unitedkingdom: "Europe",
  unitedstates: "North America",
  vietnam: "Southeast Asia",
  yemen: "Middle East"
};
var LOCATION_REGIONS = [
  [/strait of hormuz|persian gulf|gulf of oman|gulf region/i, "Middle East"],
  [/arabian sea|indian ocean|bay of bengal|gulf of kutch/i, "Indian Ocean"],
  [/strait of malacca|south china sea/i, "Southeast Asia"],
  [/red sea|suez/i, "Middle East / North Africa"],
  [/europe|black sea/i, "Europe"],
  [/north america|caribbean/i, "North America"],
  [/africa|west africa|east africa/i, "Africa"]
];
var ENERGY_TERMS = /\b(?:energy|crude|oil|petroleum|refinery|pipeline|tanker|lng|lpg|natural gas|fuel|power plant|strategic reserve|oil terminal)\b/i;
var ENERGY_LOCATIONS = /strait of hormuz|persian gulf|gulf of oman|arabian sea|indian ocean|gulf of kutch|strait of malacca|red sea|suez/i;
var compactCountry = (country) => country.toLowerCase().replace(/[^a-z]/g, "");
var classifyRegion = (event) => {
  const location = event.location || "";
  const locationRule = LOCATION_REGIONS.find(([pattern]) => pattern.test(location));
  if (locationRule) {
    return { region: locationRule[1], reason: `geographic rule: location "${event.location}" maps to ${locationRule[1]}.` };
  }
  const regions = [...new Set(event.countriesInvolved.map((country) => COUNTRY_REGIONS[compactCountry(country)]).filter(Boolean))];
  if (regions.length === 0) return {};
  return {
    region: regions.join(" / "),
    reason: `geographic rule: involved countries map to ${regions.join(" / ")}.`
  };
};
var classifyEnergyRelevance = (event) => {
  const searchableText = [event.title, event.description, event.location || ""].join(" ");
  if (event.category === "maritime_disruption") {
    return { energyRelevant: true, reason: "energy rule: maritime disruption is relevant to energy shipping continuity." };
  }
  if (ENERGY_TERMS.test(searchableText)) {
    return { energyRelevant: true, reason: "energy rule: energy-sector terminology appears in the event fields." };
  }
  if (ENERGY_LOCATIONS.test(searchableText)) {
    return { energyRelevant: true, reason: "energy rule: the event location is an established energy transit region." };
  }
  return { energyRelevant: false, reason: "energy rule: no energy-sector terminology or energy transit region was identified." };
};
var classifyGeopoliticalEvent = (value) => {
  const event = validateGeopoliticalEvent(value);
  const geographic = classifyRegion(event);
  const energy = classifyEnergyRelevance(event);
  const classificationReasons = [
    `category rule: using the validated structured category "${event.category}".`,
    `severity rule: using the validated structured severity "${event.severity}".`,
    ...geographic.reason ? [geographic.reason] : ["geographic rule: no recognized region was available from the location or countries."],
    energy.reason
  ];
  return {
    eventId: event.id,
    category: event.category,
    severity: event.severity,
    energyRelevant: energy.energyRelevant,
    countriesInvolved: [...event.countriesInvolved],
    location: event.location,
    region: geographic.region,
    classificationReasons
  };
};

// src/geopoliticalEvents/digitalTwinIntegration.ts
var RISK_LEVELS = ["low", "medium", "high", "critical"];
var NODE_TYPES = ["supplier", "port", "refinery", "strategic_reserve", "shipping_route", "chokepoint"];
var isRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
var uniqueSorted = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right));
var validateClassification = (value) => {
  if (!isRecord2(value) || typeof value.eventId !== "string" || typeof value.energyRelevant !== "boolean") {
    throw new Error("A valid classified geopolitical event is required.");
  }
  return value;
};
var validateRelevance = (value) => {
  if (!isRecord2(value) || typeof value.eventId !== "string" || typeof value.relevant !== "boolean") {
    throw new Error("A valid supply-chain relevance result is required.");
  }
  if (!isStringArray(value.matchedNodeIds)) {
    throw new Error("Supply-chain relevance matchedNodeIds must be an array of strings.");
  }
  if (!Array.isArray(value.matchedNodeTypes) || !value.matchedNodeTypes.every((nodeType) => NODE_TYPES.includes(nodeType))) {
    throw new Error("Supply-chain relevance matchedNodeTypes contains an invalid node type.");
  }
  return value;
};
var validateRisk = (value) => {
  if (!isRecord2(value) || typeof value.eventId !== "string" || !RISK_LEVELS.includes(value.riskLevel) || typeof value.riskScore !== "number" || !Number.isFinite(value.riskScore) || value.riskScore < 0 || value.riskScore > 100 || typeof value.energyRelevant !== "boolean" || !isStringArray(value.matchedNodeIds)) {
    throw new Error("A valid geopolitical risk assessment is required.");
  }
  return value;
};
var assertMatchingInputs = (classification, relevance, risk) => {
  if (classification.eventId !== relevance.eventId || classification.eventId !== risk.eventId) {
    throw new Error("Geopolitical integration inputs must reference the same event.");
  }
  if (classification.energyRelevant !== risk.energyRelevant) {
    throw new Error("Geopolitical risk energy relevance does not match the classification.");
  }
  if (uniqueSorted(relevance.matchedNodeIds).join("\0") !== uniqueSorted(risk.matchedNodeIds).join("\0")) {
    throw new Error("Geopolitical risk matched nodes do not match the relevance result.");
  }
};
var emptyMeasurementSummary = () => ({ nodeTotals: [], edgeTotals: [] });
var summarize2 = (measurements) => {
  const totals = /* @__PURE__ */ new Map();
  for (const measurement of measurements) {
    if (!measurement) continue;
    totals.set(measurement.unit, (totals.get(measurement.unit) || 0) + measurement.value);
  }
  return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value]) => ({ value, unit }));
};
var measurementSummary2 = (nodes, edges, field) => ({
  nodeTotals: summarize2(nodes.map((node) => node[field])),
  edgeTotals: summarize2(edges.map((edge) => edge[field]))
});
var assertGraphNodesExist = (graph, nodeIds) => {
  const graphNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const missingNodeId = nodeIds.find((nodeId) => !graphNodeIds.has(nodeId));
  if (missingNodeId) throw new Error(`Digital Twin node not found: ${missingNodeId}`);
};
var irrelevantResult = (classification, relevance, risk) => {
  const reason = !classification.energyRelevant || !risk.energyRelevant ? "No Digital Twin impact analysis was performed because the event is not energy relevant." : "No Digital Twin impact analysis was performed because the event has no relevant matched node.";
  return {
    eventId: classification.eventId,
    relevant: false,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    matchedNodeIds: [...risk.matchedNodeIds],
    affectedNodeIds: [],
    affectedEdgeIds: [],
    affectedNodeTypes: [],
    affectedCapacity: emptyMeasurementSummary(),
    affectedFlow: emptyMeasurementSummary(),
    impactReasons: [reason]
  };
};
var integrateGeopoliticalRiskWithDigitalTwin = (classificationValue, relevanceValue, riskValue, runtime2) => {
  const classification = validateClassification(classificationValue);
  const relevance = validateRelevance(relevanceValue);
  const risk = validateRisk(riskValue);
  assertMatchingInputs(classification, relevance, risk);
  const currentGraph = runtime2.stateEngine.getCurrentTwin();
  const matchedNodeIds = [...risk.matchedNodeIds];
  assertGraphNodesExist(currentGraph, matchedNodeIds);
  if (!relevance.relevant || !classification.energyRelevant || !risk.energyRelevant) {
    return irrelevantResult(classification, relevance, risk);
  }
  const analysisStateEngine = new DigitalTwinStateEngine(currentGraph);
  const analysisGraph = analysisStateEngine.getCurrentTwin();
  const nodeById = new Map(analysisGraph.nodes.map((node) => [node.nodeId, node]));
  for (const nodeId of uniqueSorted(matchedNodeIds)) {
    const node = nodeById.get(nodeId);
    if (node && node.operationalState !== "disrupted" && node.operationalState !== "blocked") {
      analysisStateEngine.updateNodeState(nodeId, "disrupted");
    }
  }
  const impactAnalyzer = new DigitalTwinImpactAnalyzer(analysisStateEngine);
  const affectedNodeIds = /* @__PURE__ */ new Set();
  const affectedEdgeIds = /* @__PURE__ */ new Set();
  const impactReasons = [
    `match rule: event ${classification.eventId} matched Digital Twin node(s): ${uniqueSorted(matchedNodeIds).join(", ")}.`
  ];
  const edgeById = new Map(analysisGraph.edges.map((edge) => [edge.edgeId, edge]));
  for (const nodeId of uniqueSorted(matchedNodeIds)) {
    const impact = impactAnalyzer.analyzeNode(nodeId);
    impact.affectedNodeIds.forEach((affectedId) => affectedNodeIds.add(affectedId));
    impact.affectedEdgeIds.forEach((affectedId) => affectedEdgeIds.add(affectedId));
    const edgeDetails = impact.affectedEdgeIds.map((edgeId) => {
      const edge = edgeById.get(edgeId);
      return edge ? `${edgeId} (${edge.edgeType})` : edgeId;
    }).join(", ");
    if (impact.affectedNodeIds.length === 0 && impact.affectedEdgeIds.length === 0) {
      impactReasons.push(`impact rule: matched node ${nodeId} has no connected affected nodes or edges.`);
    } else {
      impactReasons.push(`impact rule: matched node ${nodeId} affects node(s) ${impact.affectedNodeIds.join(", ") || "none"} through edge(s) ${edgeDetails || "none"}.`);
    }
  }
  const finalGraph = analysisStateEngine.getCurrentTwin();
  const finalNodeById = new Map(finalGraph.nodes.map((node) => [node.nodeId, node]));
  const finalEdgeById = new Map(finalGraph.edges.map((edge) => [edge.edgeId, edge]));
  const affectedNodes = uniqueSorted([...affectedNodeIds]).map((nodeId) => finalNodeById.get(nodeId)).filter((node) => Boolean(node));
  const affectedEdges = uniqueSorted([...affectedEdgeIds]).map((edgeId) => finalEdgeById.get(edgeId)).filter((edge) => Boolean(edge));
  const finalAffectedNodeIds = affectedNodes.map((node) => node.nodeId);
  const finalAffectedEdgeIds = affectedEdges.map((edge) => edge.edgeId);
  const finalAffectedNodeTypes = [...new Set(affectedNodes.map((node) => node.nodeType))].sort();
  if (matchedNodeIds.length > 1) {
    impactReasons.push(`aggregation rule: combined impact deduplicated ${finalAffectedNodeIds.length} affected node(s) and ${finalAffectedEdgeIds.length} affected edge(s).`);
  }
  return {
    eventId: classification.eventId,
    relevant: true,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    matchedNodeIds,
    affectedNodeIds: finalAffectedNodeIds,
    affectedEdgeIds: finalAffectedEdgeIds,
    affectedNodeTypes: finalAffectedNodeTypes,
    affectedCapacity: measurementSummary2(affectedNodes, affectedEdges, "capacity"),
    affectedFlow: measurementSummary2(affectedNodes, affectedEdges, "currentFlow"),
    impactReasons
  };
};

// src/geopoliticalEvents/ingestion.ts
var DuplicateGeopoliticalEventError = class extends Error {
  constructor(eventId) {
    super(`Geopolitical event already exists: ${eventId}`);
    this.name = "DuplicateGeopoliticalEventError";
  }
};
var cloneEvent = (event) => ({
  ...event,
  countriesInvolved: [...event.countriesInvolved]
});
var GeopoliticalEventIngestionStore = class {
  constructor() {
    this.events = /* @__PURE__ */ new Map();
  }
  ingest(event) {
    const validated = validateGeopoliticalEvent(event);
    if (this.events.has(validated.id)) throw new DuplicateGeopoliticalEventError(validated.id);
    const stored = cloneEvent(validated);
    this.events.set(stored.id, stored);
    return cloneEvent(stored);
  }
  ingestMany(events) {
    const validated = events.map((event) => validateGeopoliticalEvent(event));
    const batchIds = /* @__PURE__ */ new Set();
    for (const event of validated) {
      if (this.events.has(event.id) || batchIds.has(event.id)) throw new DuplicateGeopoliticalEventError(event.id);
      batchIds.add(event.id);
    }
    for (const event of validated) this.events.set(event.id, cloneEvent(event));
    return validated.map(cloneEvent);
  }
  getEvent(eventId) {
    const event = this.events.get(eventId);
    return event ? cloneEvent(event) : void 0;
  }
  getEvents() {
    return [...this.events.values()].map(cloneEvent);
  }
  get size() {
    return this.events.size;
  }
  clear() {
    this.events.clear();
  }
};

// src/geopoliticalEvents/relevance.ts
var normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
var phraseMatches = (phrase, text2) => {
  const normalizedPhrase = normalize(phrase);
  const normalizedText = normalize(text2);
  return normalizedPhrase.length >= 3 && normalizedText.includes(normalizedPhrase);
};
var metadataText = (node) => Object.values(node.metadata).filter((value) => typeof value === "string" && value.trim().length > 0).join(" ");
var explicitCountryText = (node) => [
  node.name,
  typeof node.metadata.country === "string" ? node.metadata.country : "",
  typeof node.metadata.sourceCountryName === "string" ? node.metadata.sourceCountryName : ""
].join(" ");
var nodeText = (node) => [node.name, node.description || "", metadataText(node)].join(" ");
var findNodeMatch = (event, node) => {
  const eventText = [event.title, event.description, event.location || ""].join(" ");
  const nameMatched = phraseMatches(node.name, eventText);
  const locationMatched = event.location !== void 0 && phraseMatches(event.location, nodeText(node));
  const countryMatches = event.countriesInvolved.filter((country) => phraseMatches(country, explicitCountryText(node)));
  if (!nameMatched && !locationMatched && countryMatches.length === 0) return void 0;
  return { node, nameMatched, locationMatched, countryMatches };
};
var assertGraph = (graph) => {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("A Digital Twin graph snapshot is required.");
  }
};
var classifyInput = (event, classification) => {
  if (!classification) return classifyGeopoliticalEvent(event);
  if (classification.eventId !== event.id) throw new Error("Classification eventId does not match the event id.");
  return classification;
};
var analyzeGeopoliticalSupplyChainRelevance = (value, graph, classification) => {
  const event = validateGeopoliticalEvent(value);
  assertGraph(graph);
  const classified = classifyInput(event, classification);
  const matches = graph.nodes.map((node) => findNodeMatch(event, node)).filter((match) => match !== void 0);
  const orderedMatches = [...matches].sort((left, right) => left.node.nodeId.localeCompare(right.node.nodeId));
  const matchedNodeIds = orderedMatches.map((match) => match.node.nodeId);
  const matchedNodeTypes = [...new Set(orderedMatches.map((match) => match.node.nodeType))].sort();
  const matchedLocations = event.location && orderedMatches.some((match) => match.locationMatched) ? [event.location] : [];
  const matchedCountries = [...new Set(orderedMatches.flatMap((match) => match.countryMatches))].sort((left, right) => left.localeCompare(right));
  const relevanceReasons = [
    `classification rule: evaluated event ${classified.eventId} as ${classified.category} with ${classified.severity} severity.`
  ];
  for (const match of orderedMatches) {
    const reasons = [];
    if (match.nameMatched) reasons.push(`entity name match for ${match.node.nodeType} "${match.node.name}"`);
    if (match.locationMatched && event.location) reasons.push(`location "${event.location}" matches the entity name or metadata`);
    if (match.countryMatches.length > 0) reasons.push(`country match for ${match.countryMatches.join(", ")}`);
    if (match.node.connectedNodeIds.length > 0) reasons.push(`existing graph relationships connect this entity to ${match.node.connectedNodeIds.length} node(s)`);
    relevanceReasons.push(`match rule: ${reasons.join("; ")}.`);
  }
  if (matchedNodeIds.length === 0) relevanceReasons.push("no-match rule: no existing Digital Twin node name, location metadata, or explicit country field matched.");
  return {
    eventId: event.id,
    relevant: matchedNodeIds.length > 0,
    matchedNodeIds,
    matchedNodeTypes,
    matchedLocations,
    matchedCountries,
    relevanceReasons
  };
};

// src/geopoliticalEvents/risk.ts
var SEVERITY_POINTS = {
  low: 5,
  medium: 20,
  high: 40,
  critical: 55
};
var NODE_TYPE_POINTS = {
  chokepoint: 10,
  strategic_reserve: 5,
  refinery: 5,
  port: 3,
  supplier: 3
};
var NODE_TYPE_LABELS = {
  supplier: "supplier",
  port: "port",
  refinery: "refinery",
  strategic_reserve: "strategic reserve",
  shipping_route: "shipping route",
  chokepoint: "chokepoint"
};
var riskLevelForScore = (score) => {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
};
var isRecord3 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var validateClassification2 = (event, value) => {
  if (!isRecord3(value)) throw new Error("A valid geopolitical event classification is required.");
  const canonical = classifyGeopoliticalEvent(event);
  if (value.eventId !== canonical.eventId || value.category !== canonical.category || value.severity !== canonical.severity || value.energyRelevant !== canonical.energyRelevant) {
    throw new Error("Geopolitical event classification does not match the event.");
  }
  return value;
};
var validateRelevance2 = (event, value) => {
  if (!isRecord3(value) || value.eventId !== event.id || typeof value.relevant !== "boolean") {
    throw new Error("A valid supply-chain relevance result for the event is required.");
  }
  if (!Array.isArray(value.matchedNodeIds) || !value.matchedNodeIds.every((nodeId) => typeof nodeId === "string")) {
    throw new Error("Supply-chain relevance matchedNodeIds must be an array of strings.");
  }
  if (!Array.isArray(value.matchedNodeTypes) || !value.matchedNodeTypes.every((nodeType) => DIGITAL_TWIN_NODE_TYPES.includes(nodeType))) {
    throw new Error("Supply-chain relevance matchedNodeTypes contains an invalid node type.");
  }
  return value;
};
var addFactor = (factors, name, points, explanation) => {
  if (points > 0) factors.push({ name, points, explanation });
};
var assessGeopoliticalRisk = (eventValue, classificationValue, relevanceValue) => {
  const event = validateGeopoliticalEvent(eventValue);
  const classification = validateClassification2(event, classificationValue);
  const relevance = validateRelevance2(event, relevanceValue);
  const matchedNodeIds = [...relevance.matchedNodeIds];
  const factors = [];
  if (!classification.energyRelevant || !relevance.relevant) {
    const reason = !classification.energyRelevant ? "The classified event is not energy relevant, so no ORBIT energy-supply-chain risk points are applied." : "The event is energy relevant but has no matched Digital Twin entity, so no exposed-network risk points are applied.";
    factors.push({ name: "supply-chain relevance gate", points: 0, explanation: reason });
    return {
      eventId: event.id,
      riskLevel: "low",
      riskScore: 0,
      factors,
      reasoning: [reason],
      matchedNodeIds,
      energyRelevant: classification.energyRelevant
    };
  }
  addFactor(factors, "event severity", SEVERITY_POINTS[classification.severity], `Severity ${classification.severity} contributes ${SEVERITY_POINTS[classification.severity]} points.`);
  addFactor(factors, "energy relevance", 10, "The classified event is relevant to the energy supply chain and contributes 10 points.");
  addFactor(factors, "Digital Twin relevance", 5, "At least one existing Digital Twin entity is matched and contributes 5 points.");
  const matchedTypes = [...new Set(relevance.matchedNodeTypes)];
  for (const nodeType of DIGITAL_TWIN_NODE_TYPES) {
    if (!matchedTypes.includes(nodeType)) continue;
    const points = NODE_TYPE_POINTS[nodeType] || 0;
    addFactor(factors, `${NODE_TYPE_LABELS[nodeType]} exposure`, points, `A matched ${NODE_TYPE_LABELS[nodeType]} contributes ${points} points.`);
  }
  const breadthPoints = Math.min(4, Math.max(0, matchedNodeIds.length - 1));
  addFactor(factors, "matched asset breadth", breadthPoints, `${matchedNodeIds.length} matched Digital Twin node(s) contribute ${breadthPoints} breadth point(s), capped at 4.`);
  const rawScore = factors.reduce((total, factor) => total + factor.points, 0);
  const riskScore = Math.min(100, rawScore);
  const reasoning = [
    ...factors.map((factor) => factor.explanation),
    `The deterministic raw score is ${rawScore}; the reported score is capped at ${riskScore} on a 0-100 scale.`,
    `Risk level ${riskLevelForScore(riskScore)} is assigned using thresholds: low 0-24, medium 25-49, high 50-79, critical 80-100.`
  ];
  return {
    eventId: event.id,
    riskLevel: riskLevelForScore(riskScore),
    riskScore,
    factors,
    reasoning,
    matchedNodeIds,
    energyRelevant: classification.energyRelevant
  };
};

// src/geopoliticalEvents/gemini.ts
var import_genai = require("@google/genai");
var GeminiConfigurationError = class extends Error {
  constructor(message = "Gemini is not configured. Set GEMINI_API_KEY on the server.") {
    super(message);
    this.name = "GeminiConfigurationError";
  }
};
var GeminiServiceError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "GeminiServiceError";
  }
};
var removeCodeFence = (value) => value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
var extractionPrompt = (request) => `
You are the extraction component of the ORBIT geopolitical risk agent.
Convert the user's natural-language request into one JSON object matching this exact event shape:
{
  "id": "stable event identifier",
  "title": "short event title",
  "description": "factual event description",
  "timestamp": "ISO-8601 date-time",
  "source": "source attribution or User request",
  "sourceUrl": "optional HTTP(S) URL",
  "location": "optional location",
  "countriesInvolved": ["at least one directly relevant country"],
  "category": "conflict | sanctions | political_instability | trade_restriction | maritime_disruption | diplomatic_escalation | infrastructure_disruption | other",
  "severity": "low | medium | high | critical"
}
Return JSON only. Do not include markdown. Do not invent Digital Twin nodes, relationships, capacities, flows, risk scores, or affected assets. Extract only event information needed by ORBIT; for a hypothetical request, use the request as the source and the request time as timestamp.

User request:
${request}
`;
var explanationPrompt = (input) => `
You are the explanation component of the ORBIT geopolitical risk agent.
Explain the deterministic ORBIT result in 2-4 concise sentences for a human operator.
Use only the supplied JSON. Do not recalculate or change riskLevel, riskScore, node IDs, edge IDs, capacities, flows, or any other factual value. If a value is empty or unavailable, say so plainly. Do not introduce assets or relationships not present in the supplied result.

Supplied ORBIT result:
${JSON.stringify(input)}
`;
var GoogleGeminiService = class {
  constructor(options = {}) {
    this.apiKey = options.apiKey !== void 0 ? options.apiKey : process.env.GEMINI_API_KEY;
    this.model = options.model || process.env.GEMINI_MODEL || "gemini-3.6-flash";
    this.client = options.client;
  }
  getClient() {
    if (this.client) return this.client;
    if (!this.apiKey) throw new GeminiConfigurationError();
    this.client = new import_genai.GoogleGenAI({ apiKey: this.apiKey });
    return this.client;
  }
  async generate(prompt, jsonResponse = false) {
    const client = this.getClient();
    try {
      const response = await client.models.generateContent({
        model: this.model,
        contents: prompt,
        ...jsonResponse ? { config: { responseMimeType: "application/json" } } : {}
      });
      const text2 = response.text?.trim();
      if (!text2) throw new GeminiServiceError("Gemini returned an empty response.");
      return text2;
    } catch (error) {
      if (error instanceof GeminiServiceError) throw error;
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause : void 0;
      console.error("[ORBIT Gemini] Request failed", {
        model: this.model,
        responseFormat: jsonResponse ? "json" : "text",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "unknown error",
        causeName: cause?.name,
        causeMessage: cause?.message,
        causeCode: cause && "code" in cause ? cause.code : void 0
      });
      throw new GeminiServiceError(`Gemini request failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  async extractEvent(request) {
    const response = await this.generate(extractionPrompt(request), true);
    try {
      return JSON.parse(removeCodeFence(response));
    } catch {
      throw new GeminiServiceError("Gemini returned invalid structured event JSON.");
    }
  }
  async explain(input) {
    return this.generate(explanationPrompt(input));
  }
};

// src/geopoliticalEvents/agent.ts
var clone = (value) => structuredClone(value);
var GeopoliticalRiskIntelligenceAgent = class {
  constructor(runtime2, gemini) {
    this.runtime = runtime2;
    this.gemini = gemini;
  }
  async analyze(request) {
    const normalizedRequest = typeof request === "string" ? request.trim() : "";
    if (!normalizedRequest) throw new Error("request is required.");
    const extractedEvent = await this.gemini.extractEvent(normalizedRequest);
    const event = new GeopoliticalEventIngestionStore().ingest(extractedEvent);
    const classification = classifyGeopoliticalEvent(event);
    const relevance = analyzeGeopoliticalSupplyChainRelevance(event, this.runtime.stateEngine.getCurrentTwin(), classification);
    const risk = assessGeopoliticalRisk(event, classification, relevance);
    const digitalTwinImpact = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, this.runtime);
    const deterministicResults = {
      request: normalizedRequest,
      event: clone(event),
      classification: clone(classification),
      relevance: clone(relevance),
      risk: clone(risk),
      digitalTwinImpact: clone(digitalTwinImpact)
    };
    const explanation = await this.gemini.explain(clone(deterministicResults));
    if (typeof explanation !== "string" || !explanation.trim()) throw new Error("Gemini returned an empty explanation.");
    return {
      request: normalizedRequest,
      event: clone(event),
      classification: clone(classification),
      relevance: clone(relevance),
      risk: clone(risk),
      digitalTwinImpact: clone(digitalTwinImpact),
      explanation: explanation.trim()
    };
  }
};
var createGeopoliticalRiskIntelligenceAgent = (runtime2, gemini = new GoogleGeminiService()) => new GeopoliticalRiskIntelligenceAgent(runtime2, gemini);

// src/geopoliticalEvents/monitoring.ts
var import_node_crypto3 = require("node:crypto");
var DuplicateMonitoredEventError = class extends Error {
  constructor(articleId) {
    super(`Monitored event already exists: ${articleId}`);
    this.name = "DuplicateMonitoredEventError";
  }
};
var DEFAULT_MONITORING_QUERIES = [
  "oil",
  "crude oil",
  "oil supply",
  "tanker",
  "shipping disruption",
  "Strait of Hormuz",
  "Red Sea",
  "sanctions",
  "refinery disruption",
  "pipeline disruption",
  "LNG",
  "OPEC"
];
var DEFAULT_POLL_INTERVAL_MS = 15 * 60 * 1e3;
var MAX_POLL_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var isTrue = (value) => value?.trim().toLowerCase() === "true";
var positiveInteger = (value, fallback) => Number.isInteger(value) && value && value >= 1e4 && value <= MAX_POLL_INTERVAL_MS ? value : fallback;
var envList = (value) => value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
var getMonitoringConfig = (overrides = {}) => ({
  enabled: overrides.enabled ?? isTrue(process.env.ORBIT_MONITORING_ENABLED),
  pollIntervalMs: positiveInteger(overrides.pollIntervalMs ?? Number(process.env.ORBIT_MONITORING_INTERVAL_MS), DEFAULT_POLL_INTERVAL_MS),
  queries: overrides.queries?.length ? [...overrides.queries] : envList(process.env.ORBIT_MONITORING_QUERIES).length ? envList(process.env.ORBIT_MONITORING_QUERIES) : [...DEFAULT_MONITORING_QUERIES],
  feedUrls: overrides.feedUrls?.length ? [...overrides.feedUrls] : envList(process.env.ORBIT_MONITORING_RSS_FEEDS)
});
var toMonitoringArticle = (article2) => ({ ...article2 });
var articleRequest = (article2) => [
  `News article title: ${article2.title}`,
  article2.description ? `Article description: ${article2.description}` : "",
  article2.source ? `Source: ${article2.source}` : "",
  article2.publishedAt ? `Published at: ${article2.publishedAt}` : "",
  article2.url ? `Source URL: ${article2.url}` : ""
].filter(Boolean).join("\n");
var alertLevelFor = (analysis) => {
  if (!analysis.relevance.relevant) return "informational";
  return analysis.risk.riskLevel;
};
var stableExternalArticleId = (input, title, source, publishedAt) => {
  if (typeof input.id === "string" && input.id.trim()) return `external-${input.id.trim()}`;
  const identity = `${typeof input.sourceUrl === "string" ? input.sourceUrl.trim() : ""}
${title}
${source}
${publishedAt}`;
  return `external-${(0, import_node_crypto3.createHash)("sha256").update(identity).digest("hex").slice(0, 24)}`;
};
var textField = (value, field, required = false) => {
  if (value === void 0 || value === null) {
    if (required) throw new Error(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string" || required && !value.trim()) throw new Error(`${field} is ${required ? "required" : "invalid"}.`);
  return value.trim();
};
var ensureSchema = (database2) => {
  database2.exec(`
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_results (
      article_id TEXT PRIMARY KEY,
      detected_at TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      relevant INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      record_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
};
var readMeta = (database2, key) => {
  const row = database2.prepare("SELECT value FROM geopolitical_monitor_metadata WHERE key = ?").get(key);
  return row?.value;
};
var writeMeta = (database2, key, value) => {
  database2.prepare("INSERT INTO geopolitical_monitor_metadata(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
};
var cloneRecord = (record) => structuredClone(record);
var GeopoliticalMonitoringService = class {
  constructor(database2, agent, config = {}, source) {
    this.database = database2;
    this.agent = agent;
    ensureSchema(database2);
    this.config = getMonitoringConfig(config);
    const fetchOptions = { queries: this.config.queries, feedUrls: this.config.feedUrls };
    this.source = source || { fetch: () => fetchGoogleNews(fetchOptions) };
    this.state = this.config.enabled ? "IDLE" : "DISABLED";
  }
  start() {
    if (!this.config.enabled || this.timer) return;
    this.state = "IDLE";
    void this.scan();
    this.timer = setInterval(() => {
      void this.scan();
    }, this.config.pollIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = void 0;
    if (this.config.enabled) this.state = "IDLE";
  }
  async scan() {
    if (!this.config.enabled) {
      return { retrievedAt: (/* @__PURE__ */ new Date()).toISOString(), articlesSeen: 0, eventsProcessed: 0, eventsSkipped: 0, failedEvents: 0, alertsCreated: 0 };
    }
    if (this.scanPromise) return this.scanPromise;
    this.scanPromise = this.runScan();
    try {
      return await this.scanPromise;
    } finally {
      this.scanPromise = void 0;
    }
  }
  async runScan() {
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.state = "RUNNING";
    this.lastError = void 0;
    let news;
    try {
      news = await this.source.fetch();
    } catch (error) {
      this.state = "ERROR";
      this.lastError = error instanceof Error ? error.message : "RSS source failed.";
      console.error("[ORBIT Monitoring] RSS source failed:", this.lastError);
      return { retrievedAt, articlesSeen: 0, eventsProcessed: 0, eventsSkipped: 0, failedEvents: 0, alertsCreated: 0 };
    }
    if (news.status === "ERROR") {
      this.state = "ERROR";
      this.lastError = "All configured RSS feeds failed.";
      return { retrievedAt, articlesSeen: 0, eventsProcessed: 0, eventsSkipped: 0, failedEvents: 0, alertsCreated: 0 };
    }
    let eventsProcessed = 0;
    let eventsSkipped = 0;
    let failedEvents = 0;
    let alertsCreated = 0;
    for (const rawArticle of news.articles) {
      const article2 = toMonitoringArticle(rawArticle);
      if (this.hasArticle(article2.id)) {
        eventsSkipped += 1;
        continue;
      }
      try {
        const analysis = await this.agent.analyze(articleRequest(article2));
        const record = { article: article2, detectedAt: (/* @__PURE__ */ new Date()).toISOString(), alertLevel: alertLevelFor(analysis), analysis };
        this.saveRecord(record);
        eventsProcessed += 1;
        if (record.alertLevel === "high" || record.alertLevel === "critical") alertsCreated += 1;
      } catch (error) {
        failedEvents += 1;
        console.warn(`[ORBIT Monitoring] Article failed: ${article2.id}`, error instanceof Error ? error.message : error);
      }
    }
    this.state = "READY";
    writeMeta(this.database, "lastSuccessfulScan", retrievedAt);
    return { retrievedAt, articlesSeen: news.articles.length, eventsProcessed, eventsSkipped, failedEvents, alertsCreated };
  }
  async ingestExternal(input) {
    const title = textField(input.title, "title", true);
    const source = textField(input.source, "source", true);
    const description = textField(input.description, "description");
    const sourceUrl = textField(input.sourceUrl, "sourceUrl");
    const publishedAt = textField(input.publishedAt, "publishedAt");
    if (sourceUrl) {
      try {
        const parsedUrl = new URL(sourceUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error("unsupported protocol");
      } catch {
        throw new Error("sourceUrl is invalid.");
      }
    }
    if (publishedAt && Number.isNaN(Date.parse(publishedAt))) throw new Error("publishedAt is invalid.");
    const article2 = {
      id: stableExternalArticleId(input, title, source, publishedAt),
      title,
      source,
      retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...description ? { description } : {},
      ...sourceUrl ? { url: sourceUrl } : {},
      ...publishedAt ? { publishedAt: new Date(Date.parse(publishedAt)).toISOString() } : {}
    };
    if (this.hasArticle(article2.id)) throw new DuplicateMonitoredEventError(article2.id);
    const analysis = await this.agent.analyze(articleRequest(article2));
    const record = { article: article2, detectedAt: (/* @__PURE__ */ new Date()).toISOString(), alertLevel: alertLevelFor(analysis), analysis };
    this.saveRecord(record);
    return cloneRecord(record);
  }
  getStatus() {
    const counts = this.database.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(relevant), 0) AS relevant, COALESCE(SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END), 0) AS high, COALESCE(SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END), 0) AS critical FROM geopolitical_monitor_results`).get();
    return {
      enabled: this.config.enabled,
      state: this.state,
      source: "Google News RSS",
      pollIntervalMs: this.config.pollIntervalMs,
      lastSuccessfulScan: readMeta(this.database, "lastSuccessfulScan"),
      lastError: this.lastError,
      detectedEvents: Number(counts.total || 0),
      relevantEvents: Number(counts.relevant || 0),
      highRiskAlerts: Number(counts.high || 0),
      criticalAlerts: Number(counts.critical || 0)
    };
  }
  getEvents(limit = 50) {
    return this.readRecords(limit);
  }
  getAlerts(limit = 50) {
    return this.readRecords(limit).filter((record) => record.alertLevel === "high" || record.alertLevel === "critical");
  }
  hasArticle(articleId) {
    return Boolean(this.database.prepare("SELECT article_id FROM geopolitical_monitor_results WHERE article_id = ?").get(articleId));
  }
  saveRecord(record) {
    this.database.prepare(`INSERT INTO geopolitical_monitor_results(article_id, detected_at, title, source, source_url, relevant, risk_level, risk_score, record_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.article.id,
      record.detectedAt,
      record.article.title,
      record.article.source,
      record.article.url || null,
      record.analysis.relevance.relevant ? 1 : 0,
      record.analysis.risk.riskLevel,
      record.analysis.risk.riskScore,
      JSON.stringify(record)
    );
  }
  readRecords(limit) {
    const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 50;
    const rows = this.database.prepare("SELECT record_json FROM geopolitical_monitor_results ORDER BY detected_at DESC LIMIT ?").all(boundedLimit);
    return rows.map((row) => cloneRecord(JSON.parse(row.record_json)));
  }
};

// server.ts
if ((0, import_node_fs2.existsSync)(".env.local")) (0, import_node_process.loadEnvFile)(".env.local");
var queryText = (request, name) => {
  const raw = request.query[name];
  return typeof raw === "string" && raw.trim() ? raw.trim() : void 0;
};
var queryInteger = (request, name, defaultValue, min = 1, max = 2200) => {
  const text2 = queryText(request, name);
  if (text2 === void 0) return defaultValue;
  const parsed = Number(text2);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return defaultValue;
  return parsed;
};
var queryBoolean = (request, name) => {
  const text2 = queryText(request, name)?.toLowerCase();
  if (text2 === "true") return true;
  if (text2 === "false") return false;
  return void 0;
};
var listOptions = (request, defaultPageSize = 50) => ({
  page: queryInteger(request, "page", 1, 1, 1e5),
  pageSize: queryInteger(request, "pageSize", defaultPageSize, 1, 1e3)
});
var dateQuery = (request, name) => {
  const text2 = queryText(request, name);
  return text2 && /^\d{4}-\d{2}-\d{2}$/.test(text2) ? text2 : void 0;
};
var handlePhase2Error = (response, error) => {
  console.error("[ORBIT Phase 2] Data query failed:", error);
  response.status(500).json({ status: "ERROR", error: "Phase 2 data query failed." });
};
var handleDigitalTwinError = (response, error) => {
  const message = error instanceof Error ? error.message : "Digital Twin request failed.";
  const statusCode = message.includes("not found") ? 404 : message.includes("not disrupted or blocked") ? 409 : 400;
  response.status(statusCode).json({ status: "ERROR", error: message });
};
var handleGeopoliticalAgentError = (response, error) => {
  const message = error instanceof Error ? error.message : "Geopolitical risk agent request failed.";
  const statusCode = error instanceof GeminiConfigurationError ? 503 : error instanceof GeminiServiceError ? 502 : message.includes("Invalid geopolitical event") || message.includes("request is required") ? 400 : 500;
  response.status(statusCode).json({ status: "ERROR", error: message });
};
var handleMonitoringError = (response, error) => {
  const message = error instanceof Error ? error.message : "Geopolitical monitoring request failed.";
  const statusCode = error instanceof DuplicateMonitoredEventError ? 409 : message.includes("required") || message.includes("invalid") ? 400 : 502;
  response.status(statusCode).json({ status: "ERROR", error: message });
};
var readStateUpdate = (request) => {
  const body = request.body;
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
  if (!nodeId) return { error: "nodeId is required." };
  if (!isOperationalState(body?.state)) return { error: "state must be one of: operational, reduced, disrupted, blocked." };
  return { nodeId, state: body.state };
};
var stateSummary = (nodes) => {
  const counts = { operational: 0, reduced: 0, disrupted: 0, blocked: 0 };
  for (const node of nodes) counts[node.operationalState] = (counts[node.operationalState] || 0) + 1;
  return { nodeCount: nodes.length, byState: counts };
};
var createApp = (repository, digitalTwin = createDigitalTwinRuntime(repository), geopoliticalRiskAgent = createGeopoliticalRiskIntelligenceAgent(digitalTwin), monitoring) => {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/api/health", (_request, response) => {
    response.json({
      status: "AVAILABLE",
      service: "ORBIT application server",
      phase: "Phase 2 - Real Data Ingestion and Data Layer",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      capabilities: {
        authentication: "READY",
        newsIngestion: getNewsIngestionStatus(),
        phase2DataLayer: repository.getStatus(),
        digitalTwin: "NOT_CONNECTED",
        mlInference: "NOT_CONNECTED",
        geminiAssistant: "NOT_CONNECTED"
      }
    });
  });
  app.get("/api/news", async (_request, response) => {
    try {
      response.json(await fetchGoogleNews());
    } catch (error) {
      console.error("[ORBIT News] Ingestion failed unexpectedly:", error);
      response.json({
        status: "ERROR",
        source: "Google News RSS",
        retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
        count: 0,
        articles: []
      });
    }
  });
  app.post("/api/geopolitical-risk/agent", async (request, response) => {
    const body = request.body;
    if (typeof body?.request !== "string" || !body.request.trim()) {
      response.status(400).json({ status: "ERROR", error: "request is required." });
      return;
    }
    try {
      response.json({ status: "AVAILABLE", ...await geopoliticalRiskAgent.analyze(body.request) });
    } catch (error) {
      handleGeopoliticalAgentError(response, error);
    }
  });
  app.get("/api/geopolitical-risk/monitor/status", (_request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    response.json({ status: "AVAILABLE", monitoring: monitoring.getStatus() });
  });
  app.get("/api/geopolitical-risk/monitor/events", (request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    const limit = queryInteger(request, "limit", 50, 1, 200) || 50;
    const events = monitoring.getEvents(limit);
    response.json({ status: "AVAILABLE", count: events.length, events });
  });
  app.get("/api/geopolitical-risk/monitor/alerts", (request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    const limit = queryInteger(request, "limit", 50, 1, 200) || 50;
    const alerts = monitoring.getAlerts(limit);
    response.json({ status: "AVAILABLE", count: alerts.length, alerts });
  });
  app.post("/api/geopolitical-risk/monitor/events", async (request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    try {
      const record = await monitoring.ingestExternal(request.body);
      response.status(201).json({ status: "AVAILABLE", event: record, alert: record.alertLevel === "high" || record.alertLevel === "critical" });
    } catch (error) {
      handleMonitoringError(response, error);
    }
  });
  app.get("/api/digital-twin", (_request, response) => {
    try {
      const graph = digitalTwin.stateEngine.getCurrentTwin();
      response.json({ status: "AVAILABLE", graph });
    } catch (error) {
      handleDigitalTwinError(response, error);
    }
  });
  app.get("/api/digital-twin/state/:nodeId", (request, response) => {
    try {
      response.json({ status: "AVAILABLE", state: digitalTwin.stateEngine.getCurrentNodeState(request.params.nodeId) });
    } catch (error) {
      handleDigitalTwinError(response, error);
    }
  });
  app.post("/api/digital-twin/state", (request, response) => {
    const update = readStateUpdate(request);
    if ("error" in update) {
      response.status(400).json({ status: "ERROR", error: update.error });
      return;
    }
    try {
      response.json({ status: "AVAILABLE", state: digitalTwin.stateEngine.updateNodeState(update.nodeId, update.state) });
    } catch (error) {
      handleDigitalTwinError(response, error);
    }
  });
  app.post("/api/digital-twin/reset", (_request, response) => {
    try {
      const graph = digitalTwin.stateEngine.resetToBaseline();
      response.json({ status: "AVAILABLE", graph, summary: stateSummary(graph.nodes) });
    } catch (error) {
      handleDigitalTwinError(response, error);
    }
  });
  app.post("/api/digital-twin/impact", (request, response) => {
    const body = request.body;
    const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
    if (!nodeId) {
      response.status(400).json({ status: "ERROR", error: "nodeId is required." });
      return;
    }
    try {
      response.json({ status: "AVAILABLE", impact: digitalTwin.impactAnalyzer.analyzeNode(nodeId) });
    } catch (error) {
      handleDigitalTwinError(response, error);
    }
  });
  app.get("/api/phase2/countries", (request, response) => {
    try {
      const query = { ...listOptions(request), search: queryText(request, "search"), mappingStatus: queryText(request, "mappingStatus") };
      response.json(repository.getCountries(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/ports", (request, response) => {
    try {
      const query = { ...listOptions(request), search: queryText(request, "search"), mappingStatus: queryText(request, "mappingStatus") };
      response.json(repository.getPorts(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/refineries", (request, response) => {
    try {
      const query = { ...listOptions(request), search: queryText(request, "search"), company: queryText(request, "company"), state: queryText(request, "state"), hasCoordinates: queryBoolean(request, "hasCoordinates") };
      response.json(repository.getRefineries(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/suppliers", (request, response) => {
    try {
      const query = { ...listOptions(request), financialYear: queryText(request, "financialYear"), countryId: queryText(request, "countryId"), country: queryText(request, "country") };
      response.json(repository.getSuppliers(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/imports/crude", (request, response) => {
    try {
      const query = { ...listOptions(request), financialYear: queryText(request, "financialYear") };
      response.json(repository.getCrudeImports(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/imports/crude/totals", (request, response) => {
    try {
      const query = { ...listOptions(request), financialYear: queryText(request, "financialYear") };
      response.json(repository.getCrudeImportTotals(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/consumption", (request, response) => {
    try {
      const query = { ...listOptions(request), financialYear: queryText(request, "financialYear"), product: queryText(request, "product"), productId: queryText(request, "productId"), month: queryInteger(request, "month", void 0, 1, 12) };
      response.json(repository.getConsumption(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/global-oil", (request, response) => {
    try {
      const query = { ...listOptions(request), country: queryText(request, "country"), countryId: queryText(request, "country_id") || queryText(request, "countryId") };
      response.json(repository.getGlobalOil(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/lanes", (request, response) => {
    try {
      response.json(repository.getLanes({ ...listOptions(request), category: queryText(request, "category") }));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  app.get("/api/phase2/chokepoints", (request, response) => {
    try {
      response.json(repository.getChokepoints(listOptions(request)));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  const portActivityHandler = (request, response) => {
    try {
      const query = { ...listOptions(request, 100), portId: queryText(request, "portId"), year: queryInteger(request, "year", void 0, 1900, 2200), from: dateQuery(request, "from"), to: dateQuery(request, "to") };
      response.json(repository.getPortActivity(query));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  };
  app.get("/api/phase2/port-activity", portActivityHandler);
  app.get("/api/phase2/daily-port-activity", portActivityHandler);
  app.get("/api/phase2/data-quality", (request, response) => {
    try {
      response.json(repository.getDataQuality({ ...listOptions(request), issueType: queryText(request, "issueType"), severity: queryText(request, "severity"), status: queryText(request, "status") }));
    } catch (error) {
      handlePhase2Error(response, error);
    }
  });
  return app;
};
async function startServer() {
  const database2 = openPhase2Database();
  const repository = new Phase2Repository(database2);
  const digitalTwin = createDigitalTwinRuntime(repository);
  const geopoliticalRiskAgent = createGeopoliticalRiskIntelligenceAgent(digitalTwin);
  const monitoring = new GeopoliticalMonitoringService(database2, geopoliticalRiskAgent);
  const app = createApp(repository, digitalTwin, geopoliticalRiskAgent, monitoring);
  monitoring.start();
  const PORT = 3e3;
  const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_node_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_request, response) => {
      response.sendFile(import_node_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ORBIT Core] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[ORBIT Phase 2] Data layer status: ${repository.getStatus()}`);
  });
}
var isServerEntry = process.env.ORBIT_START_SERVER === "true" || process.argv.includes("--production") || /[\\/]server\.(ts|js)$/.test(process.argv[1] || "");
if (isServerEntry) {
  startServer().catch((error) => {
    console.error("[ORBIT Core] Failed to start server:", error);
    process.exit(1);
  });
}

// tests/geopolitical-monitoring.test.ts
var temporaryDirectory = (0, import_node_fs3.mkdtempSync)(import_node_path3.default.join((0, import_node_os.tmpdir)(), "orbit-geopolitical-monitoring-"));
var databasePath = import_node_path3.default.join(temporaryDirectory, "phase2.sqlite");
var database = openPhase2Database({ dbPath: databasePath });
var runtime;
var rssXml = `<?xml version="1.0"?><rss><channel><item><title>Strait of Hormuz disruption - Test Wire</title><link>https://example.test/hormuz</link><pubDate>Fri, 21 Aug 2026 12:00:00 GMT</pubDate><description>Crude shipping disruption reported.</description><source>Test Wire</source></item><item><title>Malformed item</title><link>not-a-url</link></item></channel></rss>`;
var article = (overrides = {}) => ({
  id: "news-hormuz",
  title: "Strait of Hormuz disruption",
  url: "https://example.test/hormuz",
  source: "Test Wire",
  publishedAt: "2026-08-21T12:00:00.000Z",
  description: "Crude shipping disruption reported.",
  retrievedAt: "2026-08-21T12:01:00.000Z",
  query: "Strait of Hormuz",
  ...overrides
});
var analysisFor = (request) => {
  const relevant = request.toLowerCase().includes("hormuz");
  const riskLevel = relevant ? "critical" : "low";
  const eventId = relevant ? "monitor-hormuz" : "monitor-unrelated";
  return {
    request,
    event: { id: eventId, title: relevant ? "Strait of Hormuz disruption" : "Unrelated event", description: request, timestamp: "2026-08-21T12:00:00.000Z", source: "Test Wire", countriesInvolved: relevant ? ["Iran", "Oman"] : ["France"], category: relevant ? "maritime_disruption" : "other", severity: relevant ? "critical" : "low" },
    classification: { eventId, category: relevant ? "maritime_disruption" : "other", severity: relevant ? "critical" : "low", energyRelevant: relevant, countriesInvolved: relevant ? ["Iran", "Oman"] : ["France"], region: relevant ? "Middle East" : "Europe", classificationReasons: [] },
    relevance: { eventId, relevant, matchedNodeIds: relevant ? ["chokepoint-strait-of-hormuz"] : [], matchedNodeTypes: relevant ? ["chokepoint"] : [], matchedLocations: relevant ? ["Strait of Hormuz"] : [], matchedCountries: relevant ? ["Iran", "Oman"] : [], relevanceReasons: [] },
    risk: { eventId, riskLevel, riskScore: relevant ? 87 : 0, factors: [], reasoning: [], matchedNodeIds: relevant ? ["chokepoint-strait-of-hormuz"] : [], energyRelevant: relevant },
    digitalTwinImpact: { eventId, relevant, riskLevel, riskScore: relevant ? 87 : 0, matchedNodeIds: relevant ? ["chokepoint-strait-of-hormuz"] : [], affectedNodeIds: relevant ? ["shipping-route-hormuz-india"] : [], affectedEdgeIds: relevant ? ["relationship-hormuz-to-india-facing-route"] : [], affectedNodeTypes: relevant ? ["shipping_route"] : [], affectedCapacity: { nodeTotals: [], edgeTotals: [] }, affectedFlow: { nodeTotals: [], edgeTotals: [] }, impactReasons: [] },
    explanation: relevant ? "The deterministic monitor identified a critical maritime energy risk." : "No energy supply-chain relevance was found."
  };
};
var MockAgent = class {
  constructor() {
    this.calls = [];
  }
  async analyze(request) {
    this.calls.push(request);
    return analysisFor(request);
  }
};
var sourceFor = (articles) => ({
  async fetch() {
    return { status: "AVAILABLE", source: "Google News RSS", retrievedAt: (/* @__PURE__ */ new Date()).toISOString(), count: articles.length, articles };
  }
});
(0, import_node_test.before)(() => {
  runtime = createDigitalTwinRuntime(new Phase2Repository(database));
});
(0, import_node_test.after)(() => {
  database.close();
  (0, import_node_fs3.rmSync)(temporaryDirectory, { recursive: true, force: true });
});
(0, import_node_test.default)("RSS parser extracts valid articles and ignores malformed items", () => {
  const articles = parseGoogleNewsRss(rssXml, "Hormuz", "2026-08-21T12:01:00.000Z");
  import_strict.default.equal(articles.length, 1);
  import_strict.default.equal(articles[0].title, "Strait of Hormuz disruption");
  import_strict.default.equal(articles[0].source, "Test Wire");
  import_strict.default.equal(articles[0].publishedAt, "2026-08-21T12:00:00.000Z");
});
(0, import_node_test.default)("one failed RSS feed does not prevent another feed from returning real articles", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("failed.test")) throw new Error("feed unavailable");
    return new Response(rssXml, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  try {
    const response = await fetchGoogleNews({ feedUrls: ["https://failed.test/rss", "https://working.test/rss"] });
    import_strict.default.equal(response.status, "AVAILABLE");
    import_strict.default.equal(response.count, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
(0, import_node_test.default)("monitoring deduplicates already processed articles and reuses the existing agent pipeline", async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([article(), article()]));
  const first = await service.scan();
  const second = await service.scan();
  import_strict.default.equal(first.eventsProcessed, 1);
  import_strict.default.equal(first.eventsSkipped, 1);
  import_strict.default.equal(second.eventsProcessed, 0);
  import_strict.default.equal(second.eventsSkipped, 2);
  import_strict.default.equal(agent.calls.length, 1);
  import_strict.default.equal(service.getEvents().length, 1);
});
(0, import_node_test.default)("relevant high and critical results create alerts while irrelevant events remain informational", async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([
    article({ id: "news-alert", title: "Strait of Hormuz disruption", url: "https://example.test/alert" }),
    article({ id: "news-unrelated", title: "Cultural exchange", url: "https://example.test/unrelated", description: "A cultural exchange was announced." })
  ]));
  const result = await service.scan();
  import_strict.default.equal(result.alertsCreated, 1);
  import_strict.default.ok(service.getAlerts().length >= 1);
  import_strict.default.equal(service.getAlerts()[0].alertLevel, "critical");
  import_strict.default.ok(service.getStatus().relevantEvents >= 1);
  import_strict.default.equal(service.getEvents().some((event) => event.alertLevel === "informational"), true);
});
(0, import_node_test.default)("monitoring results survive service recreation in the existing SQLite data layer", async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: true }, sourceFor([article({ id: "news-persisted", url: "https://example.test/persisted" })]));
  await service.scan();
  const recreated = new GeopoliticalMonitoringService(database, new MockAgent(), { enabled: false });
  import_strict.default.ok(recreated.getEvents().some((event) => event.article.id === "news-persisted"));
});
(0, import_node_test.default)("external webhook events use the same Phase 4 agent and reject duplicates", async () => {
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(database, agent, { enabled: false });
  const record = await service.ingestExternal({ id: "webhook-hormuz", title: "Strait of Hormuz disruption", description: "Crude maritime disruption.", source: "n8n", sourceUrl: "https://example.test/webhook", publishedAt: "2026-08-21T12:00:00.000Z" });
  import_strict.default.equal(record.alertLevel, "critical");
  import_strict.default.equal(agent.calls.length, 1);
  await import_strict.default.rejects(() => service.ingestExternal({ id: "webhook-hormuz", title: "Strait of Hormuz disruption", description: "Crude maritime disruption.", source: "n8n" }), DuplicateMonitoredEventError);
});
(0, import_node_test.default)("monitoring APIs expose status, recent events, alerts, and webhook ingestion", async () => {
  const apiDatabasePath = import_node_path3.default.join(temporaryDirectory, "api.sqlite");
  const apiDatabase = openPhase2Database({ dbPath: apiDatabasePath });
  const repository = new Phase2Repository(apiDatabase);
  const apiRuntime = createDigitalTwinRuntime(repository);
  const agent = new MockAgent();
  const service = new GeopoliticalMonitoringService(apiDatabase, agent, { enabled: false });
  const app = createApp(repository, apiRuntime, agent, service);
  const server = (0, import_node_http.createServer)(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const status = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/status`);
    import_strict.default.equal(status.status, 200);
    import_strict.default.equal((await status.json()).monitoring.enabled, false);
    const webhook = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "api-hormuz", title: "Strait of Hormuz disruption", description: "Crude maritime disruption.", source: "n8n" }) });
    import_strict.default.equal(webhook.status, 201);
    import_strict.default.equal((await webhook.json()).alert, true);
    const events = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/events`);
    import_strict.default.equal((await events.json()).count, 1);
    const alerts = await fetch(`${baseUrl}/api/geopolitical-risk/monitor/alerts`);
    import_strict.default.equal((await alerts.json()).count, 1);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
    apiDatabase.close();
    (0, import_node_fs3.rmSync)(apiDatabasePath, { force: true });
  }
});
