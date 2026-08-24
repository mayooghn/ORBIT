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

// tests/digital-twin-api.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_http = require("node:http");
var import_node_fs4 = require("node:fs");
var import_node_path4 = __toESM(require("node:path"), 1);
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
var ENERGY_MONITORING_QUERIES = [
  '"crude oil" export disruption',
  '"oil exports" sanctions',
  '"oil imports" disruption',
  '"Strait of Hormuz" oil',
  '"Persian Gulf" oil tanker',
  '"Red Sea" oil shipping',
  '"oil tanker" attack',
  "oil pipeline disruption",
  "oil refinery outage",
  "OPEC geopolitical disruption",
  '"Saudi Arabia" oil exports',
  '"Iran" oil sanctions',
  '"Russia" oil sanctions',
  '"Iraq" oil exports',
  '"United Arab Emirates" oil exports',
  '"Venezuela" oil sanctions',
  '"Nigeria" oil disruption'
];
var GOOGLE_NEWS_QUERIES = ENERGY_MONITORING_QUERIES;
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
function decodeXmlEntities(value2) {
  return value2.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16))).replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}
function cleanText(value2) {
  if (!value2) return "";
  let cleaned = decodeXmlEntities(value2);
  cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
  cleaned = cleaned.replace(/<[^>]*>/g, " ");
  cleaned = decodeXmlEntities(cleaned);
  return cleaned.replace(/\s+/g, " ").trim();
}
function extractTag(block, tagName) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  return tagPattern.exec(block)?.[1];
}
function extractAttribute(block, tagName, attributeName) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*\\/?\\s*>`, "i");
  return tagPattern.exec(block)?.[1];
}
function extractFeedEntries(xml) {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
}
function normalizeUrl(value2) {
  try {
    const url = new URL(value2);
    if (url.protocol !== "http:" && url.protocol !== "https:") return void 0;
    url.hash = "";
    return url.toString();
  } catch {
    return void 0;
  }
}
function canonicalUrlForDedup(value2) {
  try {
    const url = new URL(value2);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|oc$|ved$|usg$|ref$|source$|cmpid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value2.trim().toLowerCase();
  }
}
var normalizedStoryTitle = (title) => title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function parsePublishedAt(value2) {
  const publishedText = cleanText(value2);
  if (!publishedText) return "";
  const timestamp = Date.parse(publishedText);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}
function stableArticleId(url, title) {
  const identity = `${canonicalUrlForDedup(url)}
${normalizedStoryTitle(title)}`;
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
function parseItem(itemXml, query, retrievedAt, sourceType, feedUrl) {
  const rawTitle = cleanText(extractTag(itemXml, "title"));
  const rawLink = cleanText(extractTag(itemXml, "link")) || cleanText(extractAttribute(itemXml, "link", "href"));
  const url = normalizeUrl(rawLink);
  const rawPublishedAt = extractTag(itemXml, "pubDate") ?? extractTag(itemXml, "published") ?? extractTag(itemXml, "updated");
  const publishedAt = parsePublishedAt(rawPublishedAt);
  if (!rawTitle || !url) return null;
  if (cleanText(rawPublishedAt) && !publishedAt) return null;
  const parsedTitle = sourceFromTitle(rawTitle);
  const explicitSource = cleanText(extractTag(itemXml, "source"));
  const description = cleanText(extractTag(itemXml, "description") ?? extractTag(itemXml, "summary") ?? extractTag(itemXml, "content"));
  const article = {
    id: stableArticleId(url, parsedTitle.title),
    title: parsedTitle.title,
    url,
    source: explicitSource || parsedTitle.source,
    publishedAt,
    retrievedAt,
    query,
    sourceType,
    ...feedUrl ? { feedUrl } : {}
  };
  if (description) article.description = description;
  return article;
}
function parseRssFeed(xml, query = "", retrievedAt = (/* @__PURE__ */ new Date()).toISOString(), sourceType = "google_news", feedUrl) {
  return extractFeedEntries(xml).map((itemXml) => parseItem(itemXml, query, retrievedAt, sourceType, feedUrl)).filter((article) => article !== null);
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
      throw new Error(`RSS feed returned HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
var fetchFeed = async (query) => fetchRssUrl(buildFeedUrl(query));
async function fetchGoogleNews(options = {}) {
  const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
  const googleQueries = options.queries?.length ? [...options.queries] : options.feedUrls?.length ? [] : [...GOOGLE_NEWS_QUERIES];
  const feeds = [
    ...googleQueries.map((query) => ({ label: query, sourceType: "google_news", fetch: () => fetchFeed(query) })),
    ...(options.feedUrls || []).map((url) => ({ label: url, sourceType: "direct_rss", fetch: () => fetchRssUrl(url) }))
  ];
  const results = await Promise.allSettled(
    feeds.map(async (feed) => ({
      query: feed.label,
      xml: await feed.fetch()
    }))
  );
  const articlesByKey = /* @__PURE__ */ new Map();
  const seenArticleKeys = /* @__PURE__ */ new Set();
  const successfulSourceTypes = /* @__PURE__ */ new Set();
  const failedFeeds = [];
  let successfulFeeds = 0;
  results.forEach((result, index) => {
    const query = feeds[index].label;
    if (result.status === "rejected") {
      console.warn(`[ORBIT News] Feed failed for "${query}":`, result.reason);
      failedFeeds.push(query);
      return;
    }
    successfulFeeds += 1;
    successfulSourceTypes.add(feeds[index].sourceType);
    try {
      for (const article of parseRssFeed(result.value.xml, query, retrievedAt, feeds[index].sourceType, feeds[index].sourceType === "direct_rss" ? query : void 0)) {
        const urlKey = `url:${canonicalUrlForDedup(article.url)}`;
        const publishedKey = article.publishedAt ? article.publishedAt.slice(0, 16) : "undated";
        const storyKey = `story:${normalizedStoryTitle(article.title)}:${publishedKey}`;
        if (seenArticleKeys.has(urlKey) || seenArticleKeys.has(storyKey)) continue;
        seenArticleKeys.add(urlKey);
        seenArticleKeys.add(storyKey);
        articlesByKey.set(urlKey, article);
      }
    } catch (error) {
      console.warn(`[ORBIT News] Feed parsing failed for "${query}":`, error);
      failedFeeds.push(query);
    }
  });
  const articles = [...articlesByKey.values()].sort((a, b) => {
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
      articles: [],
      sources: [],
      failedFeeds
    };
  }
  ingestionStatus = "READY";
  const sources = [...successfulSourceTypes];
  const source = sources.length === 2 ? "Google News + Direct RSS" : sources[0] === "direct_rss" ? "Direct RSS" : "Google News RSS";
  return {
    status: "AVAILABLE",
    source,
    retrievedAt,
    count: articles.length,
    articles,
    sources,
    ...failedFeeds.length ? { failedFeeds } : {}
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
var isRecord = (value2) => typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
var requiredText = (value2, field) => {
  if (typeof value2 !== "string" || !value2.trim()) {
    throw new GeopoliticalEventValidationError(`${field} is required.`);
  }
  return value2.trim();
};
var optionalText = (value2, field) => {
  if (value2 === void 0 || value2 === null) return void 0;
  return requiredText(value2, field);
};
var validateTimestamp = (value2) => {
  const timestamp = requiredText(value2, "timestamp");
  if (!timestamp.includes("T") || !Number.isFinite(Date.parse(timestamp))) {
    throw new GeopoliticalEventValidationError("timestamp must be a valid date-time string.");
  }
  return timestamp;
};
var validateSourceUrl = (value2) => {
  const sourceUrl = optionalText(value2, "sourceUrl");
  if (sourceUrl === void 0) return void 0;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol");
  } catch {
    throw new GeopoliticalEventValidationError("sourceUrl must be a valid HTTP(S) URL.");
  }
  return sourceUrl;
};
var validateCountries = (value2) => {
  if (!Array.isArray(value2) || value2.length === 0) {
    throw new GeopoliticalEventValidationError("countriesInvolved must contain at least one country.");
  }
  const countries = value2.map((country, index) => requiredText(country, `countriesInvolved[${index}]`));
  const seen = /* @__PURE__ */ new Set();
  for (const country of countries) {
    const key = country.toLocaleLowerCase();
    if (seen.has(key)) throw new GeopoliticalEventValidationError(`countriesInvolved contains a duplicate country: ${country}.`);
    seen.add(key);
  }
  return countries;
};
var validateEnum = (value2, field, values) => {
  if (typeof value2 !== "string" || !values.includes(value2)) {
    throw new GeopoliticalEventValidationError(`${field} must be one of: ${values.join(", ")}.`);
  }
  return value2;
};
var validateGeopoliticalEvent = (value2) => {
  if (!isRecord(value2)) throw new GeopoliticalEventValidationError("event must be an object.");
  return {
    id: requiredText(value2.id, "id"),
    title: requiredText(value2.title, "title"),
    description: requiredText(value2.description, "description"),
    timestamp: validateTimestamp(value2.timestamp),
    source: requiredText(value2.source, "source"),
    sourceUrl: validateSourceUrl(value2.sourceUrl),
    location: optionalText(value2.location, "location"),
    countriesInvolved: validateCountries(value2.countriesInvolved),
    category: validateEnum(value2.category, "category", GEOPOLITICAL_EVENT_CATEGORIES),
    severity: validateEnum(value2.severity, "severity", GEOPOLITICAL_EVENT_SEVERITIES)
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
var classifyGeopoliticalEvent = (value2) => {
  const event = validateGeopoliticalEvent(value2);
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
var isRecord2 = (value2) => typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
var isStringArray = (value2) => Array.isArray(value2) && value2.every((item) => typeof item === "string");
var uniqueSorted = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right));
var validateClassification = (value2) => {
  if (!isRecord2(value2) || typeof value2.eventId !== "string" || typeof value2.energyRelevant !== "boolean") {
    throw new Error("A valid classified geopolitical event is required.");
  }
  return value2;
};
var validateRelevance = (value2) => {
  if (!isRecord2(value2) || typeof value2.eventId !== "string" || typeof value2.relevant !== "boolean") {
    throw new Error("A valid supply-chain relevance result is required.");
  }
  if (!isStringArray(value2.matchedNodeIds)) {
    throw new Error("Supply-chain relevance matchedNodeIds must be an array of strings.");
  }
  if (!Array.isArray(value2.matchedNodeTypes) || !value2.matchedNodeTypes.every((nodeType) => NODE_TYPES.includes(nodeType))) {
    throw new Error("Supply-chain relevance matchedNodeTypes contains an invalid node type.");
  }
  return value2;
};
var validateRisk = (value2) => {
  if (!isRecord2(value2) || typeof value2.eventId !== "string" || !RISK_LEVELS.includes(value2.riskLevel) || typeof value2.riskScore !== "number" || !Number.isFinite(value2.riskScore) || value2.riskScore < 0 || value2.riskScore > 100 || typeof value2.energyRelevant !== "boolean" || !isStringArray(value2.matchedNodeIds)) {
    throw new Error("A valid geopolitical risk assessment is required.");
  }
  return value2;
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
  return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value2]) => ({ value: value2, unit }));
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
var integrateGeopoliticalRiskWithDigitalTwin = (classificationValue, relevanceValue, riskValue, runtime) => {
  const classification = validateClassification(classificationValue);
  const relevance = validateRelevance(relevanceValue);
  const risk = validateRisk(riskValue);
  assertMatchingInputs(classification, relevance, risk);
  const currentGraph = runtime.stateEngine.getCurrentTwin();
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
var normalize = (value2) => value2.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
var phraseMatches = (phrase, text2) => {
  const normalizedPhrase = normalize(phrase);
  const normalizedText = normalize(text2);
  return normalizedPhrase.length >= 3 && normalizedText.includes(normalizedPhrase);
};
var metadataText = (node) => Object.values(node.metadata).filter((value2) => typeof value2 === "string" && value2.trim().length > 0).join(" ");
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
var analyzeGeopoliticalSupplyChainRelevance = (value2, graph, classification) => {
  const event = validateGeopoliticalEvent(value2);
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
var isRecord3 = (value2) => typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
var validateClassification2 = (event, value2) => {
  if (!isRecord3(value2)) throw new Error("A valid geopolitical event classification is required.");
  const canonical = classifyGeopoliticalEvent(event);
  if (value2.eventId !== canonical.eventId || value2.category !== canonical.category || value2.severity !== canonical.severity || value2.energyRelevant !== canonical.energyRelevant) {
    throw new Error("Geopolitical event classification does not match the event.");
  }
  return value2;
};
var validateRelevance2 = (event, value2) => {
  if (!isRecord3(value2) || value2.eventId !== event.id || typeof value2.relevant !== "boolean") {
    throw new Error("A valid supply-chain relevance result for the event is required.");
  }
  if (!Array.isArray(value2.matchedNodeIds) || !value2.matchedNodeIds.every((nodeId) => typeof nodeId === "string")) {
    throw new Error("Supply-chain relevance matchedNodeIds must be an array of strings.");
  }
  if (!Array.isArray(value2.matchedNodeTypes) || !value2.matchedNodeTypes.every((nodeType) => DIGITAL_TWIN_NODE_TYPES.includes(nodeType))) {
    throw new Error("Supply-chain relevance matchedNodeTypes contains an invalid node type.");
  }
  return value2;
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
var removeCodeFence = (value2) => value2.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
var clone = (value2) => structuredClone(value2);
var isEnergySupplyChainRelevant = (classification, relevance, risk) => classification.energyRelevant && relevance.relevant && risk.energyRelevant;
var deterministicExplanation = (classification, relevance, risk) => {
  const reason = !classification.energyRelevant ? "classification marked the event as not energy relevant" : !relevance.relevant ? "no existing Digital Twin entity matched the event" : "the deterministic risk gate marked the event as not energy relevant";
  return `No Gemini explanation was required: ${reason}. ORBIT retained the deterministic risk at ${risk.riskLevel} (${risk.riskScore}) with no Digital Twin impact.`;
};
var GeopoliticalRiskIntelligenceAgent = class {
  constructor(runtime, gemini) {
    this.runtime = runtime;
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
    const explanation = isEnergySupplyChainRelevant(classification, relevance, risk) ? await this.gemini.explain(clone(deterministicResults)) : deterministicExplanation(classification, relevance, risk);
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
var createGeopoliticalRiskIntelligenceAgent = (runtime, gemini = new GoogleGeminiService()) => new GeopoliticalRiskIntelligenceAgent(runtime, gemini);

// src/geopoliticalEvents/monitoring.ts
var import_node_crypto3 = require("node:crypto");
var DuplicateMonitoredEventError = class extends Error {
  constructor(articleId) {
    super(`Monitored event already exists: ${articleId}`);
    this.name = "DuplicateMonitoredEventError";
  }
};
var DEFAULT_MONITORING_QUERIES = ENERGY_MONITORING_QUERIES;
var DEFAULT_POLL_INTERVAL_MS = 15 * 60 * 1e3;
var MAX_POLL_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var DEFAULT_MAX_ARTICLES_PER_SCAN = 5;
var MAX_ARTICLES_PER_SCAN = 100;
var isTrue = (value2) => value2?.trim().toLowerCase() === "true";
var positiveInteger = (value2, fallback) => Number.isInteger(value2) && value2 && value2 >= 1e4 && value2 <= MAX_POLL_INTERVAL_MS ? value2 : fallback;
var boundedArticleCount = (value2, fallback) => Number.isInteger(value2) && value2 && value2 >= 1 && value2 <= MAX_ARTICLES_PER_SCAN ? value2 : fallback;
var envList = (value2) => value2 ? value2.split(",").map((item) => item.trim()).filter(Boolean) : [];
var getMonitoringConfig = (overrides = {}) => ({
  enabled: overrides.enabled ?? isTrue(process.env.ORBIT_MONITORING_ENABLED),
  pollIntervalMs: positiveInteger(overrides.pollIntervalMs ?? Number(process.env.ORBIT_MONITORING_INTERVAL_MS || process.env.ORBIT_MONITORING_POLL_INTERVAL_MS), DEFAULT_POLL_INTERVAL_MS),
  queries: overrides.queries?.length ? [...overrides.queries] : envList(process.env.ORBIT_MONITORING_QUERIES).length ? envList(process.env.ORBIT_MONITORING_QUERIES) : [...DEFAULT_MONITORING_QUERIES],
  feedUrls: overrides.feedUrls?.length ? [...overrides.feedUrls] : envList(process.env.ORBIT_MONITORING_RSS_FEEDS),
  maxArticlesPerScan: boundedArticleCount(overrides.maxArticlesPerScan ?? Number(process.env.ORBIT_MONITORING_MAX_ARTICLES_PER_SCAN), DEFAULT_MAX_ARTICLES_PER_SCAN)
});
var toMonitoringArticle = (article) => ({
  ...article,
  sourceType: article.sourceType || "google_news"
});
var ENERGY_ARTICLE_TERMS = /\b(?:crude oil|oil exports?|oil imports?|oil tanker|tankers?|refiner(?:y|ies)|pipelines?|oilfield|oil terminal|oil flows?|barrels?|petroleum|opec|lng|lpg|fuel shipment|export route|shipping lane)\b/i;
var ENERGY_TRANSIT_TERMS = /strait of hormuz|persian gulf|red sea|suez/i;
var SUPPLY_THREAT_TERMS = /\b(?:sanction(?:s|ed)?|embargo|disrupt(?:ion|ed)?|attack(?:ed)?|strike|conflict|war|tension|blockade|closure|outage|shutdown|seiz(?:e|ed|ure)|military|missile|drone|geopolitical|restriction|shortage|supply cut|production cut|reroute|avoid|alternative route|flows? stall(?:ed)?|halt(?:ed)?|hit|pirat(?:e|es)|fire|warning|alert|risk)\b/i;
var isEnergyMonitoringCandidate = (article) => {
  const text2 = `${article.title} ${article.description || ""}`;
  return (ENERGY_ARTICLE_TERMS.test(text2) || ENERGY_TRANSIT_TERMS.test(text2)) && SUPPLY_THREAT_TERMS.test(text2);
};
var isEnergySupplyChainRelevant2 = (analysis) => analysis.classification.energyRelevant && analysis.relevance.relevant && analysis.risk.energyRelevant;
var articleRequest = (article) => [
  `News article title: ${article.title}`,
  article.description ? `Article description: ${article.description}` : "",
  article.source ? `Source: ${article.source}` : "",
  article.publishedAt ? `Published at: ${article.publishedAt}` : "",
  article.url ? `Source URL: ${article.url}` : ""
].filter(Boolean).join("\n");
var alertLevelFor = (analysis) => {
  if (!isEnergySupplyChainRelevant2(analysis)) return "informational";
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
var textField = (value2, field, required = false) => {
  if (value2 === void 0 || value2 === null) {
    if (required) throw new Error(`${field} is required.`);
    return "";
  }
  if (typeof value2 !== "string" || required && !value2.trim()) throw new Error(`${field} is ${required ? "required" : "invalid"}.`);
  return value2.trim();
};
var ensureSchema = (database2) => {
  database2.exec(`
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_results (
      article_id TEXT PRIMARY KEY,
      detected_at TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      event_id TEXT,
      relevant INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      record_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_processed (
      article_id TEXT PRIMARY KEY,
      event_id TEXT,
      processed_at TEXT NOT NULL,
      duplicate_of TEXT
    );
  `);
  const columns = database2.prepare("PRAGMA table_info(geopolitical_monitor_results)").all();
  if (!columns.some((column) => column.name === "event_id")) database2.exec("ALTER TABLE geopolitical_monitor_results ADD COLUMN event_id TEXT");
  database2.exec("CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_event_id ON geopolitical_monitor_results(event_id)");
};
var readMeta = (database2, key) => {
  const row = database2.prepare("SELECT value FROM geopolitical_monitor_metadata WHERE key = ?").get(key);
  return row?.value;
};
var writeMeta = (database2, key, value2) => {
  database2.prepare("INSERT INTO geopolitical_monitor_metadata(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value2);
};
var cloneRecord = (record) => structuredClone(record);
var sourceLabel = (sourceTypes) => {
  const labels = new Set(sourceTypes);
  if (labels.has("google_news") && labels.has("direct_rss")) return "Google News + direct RSS";
  if (labels.has("google_news")) return "Google News RSS";
  if (labels.has("direct_rss")) return "Direct RSS";
  if (labels.has("external_webhook")) return "n8n/external webhook";
  return "Monitoring sources";
};
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
    if (news.failedFeeds?.length) this.lastError = `${news.failedFeeds.length} monitoring feed(s) failed; partial results were processed.`;
    let eventsProcessed = 0;
    let eventsSkipped = 0;
    let failedEvents = 0;
    let alertsCreated = 0;
    const candidateArticles = news.articles.filter((rawArticle) => !rawArticle.sourceType || isEnergyMonitoringCandidate(toMonitoringArticle(rawArticle)));
    const articlesToProcess = candidateArticles.slice(0, this.config.maxArticlesPerScan);
    eventsSkipped += Math.max(0, news.articles.length - articlesToProcess.length);
    for (const rawArticle of articlesToProcess) {
      const article = toMonitoringArticle(rawArticle);
      if (this.hasArticle(article.id)) {
        eventsSkipped += 1;
        continue;
      }
      try {
        const analysis = await this.agent.analyze(articleRequest(article));
        const record = { article, detectedAt: (/* @__PURE__ */ new Date()).toISOString(), alertLevel: alertLevelFor(analysis), analysis };
        this.saveRecord(record);
        eventsProcessed += 1;
        if (record.alertLevel === "high" || record.alertLevel === "critical") alertsCreated += 1;
      } catch (error) {
        failedEvents += 1;
        console.warn(`[ORBIT Monitoring] Article failed: ${article.id}`, error instanceof Error ? error.message : error);
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
    const article = {
      id: stableExternalArticleId(input, title, source, publishedAt),
      title,
      source,
      retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sourceType: "external_webhook",
      ...description ? { description } : {},
      ...sourceUrl ? { url: sourceUrl } : {},
      ...publishedAt ? { publishedAt: new Date(Date.parse(publishedAt)).toISOString() } : {}
    };
    if (this.hasArticle(article.id)) throw new DuplicateMonitoredEventError(article.id);
    const analysis = await this.agent.analyze(articleRequest(article));
    if (this.hasEvent(analysis.event.id, "external_webhook")) throw new DuplicateMonitoredEventError(analysis.event.id);
    const record = { article, detectedAt: (/* @__PURE__ */ new Date()).toISOString(), alertLevel: alertLevelFor(analysis), analysis };
    this.saveRecord(record);
    return cloneRecord(record);
  }
  getStatus() {
    const records = this.readAllRecords();
    const relevantRecords = records.filter((record) => isEnergySupplyChainRelevant2(record.analysis));
    const sources = ["google_news"];
    if (this.config.feedUrls.length) sources.push("direct_rss");
    for (const record of this.readRecords(200)) {
      if (record.article.sourceType && !sources.includes(record.article.sourceType)) sources.push(record.article.sourceType);
    }
    return {
      enabled: this.config.enabled,
      state: this.state,
      source: sourceLabel(sources),
      sources,
      pollIntervalMs: this.config.pollIntervalMs,
      maxArticlesPerScan: this.config.maxArticlesPerScan,
      lastSuccessfulScan: readMeta(this.database, "lastSuccessfulScan"),
      lastError: this.lastError,
      detectedEvents: records.length,
      relevantEvents: relevantRecords.length,
      highRiskAlerts: relevantRecords.filter((record) => record.alertLevel === "high").length,
      criticalAlerts: relevantRecords.filter((record) => record.alertLevel === "critical").length
    };
  }
  getEvents(limit = 50) {
    return this.readRecords(limit);
  }
  getRelevantEvents(limit = 50) {
    return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant2(record.analysis));
  }
  getAlerts(limit = 50) {
    return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant2(record.analysis) && (record.alertLevel === "high" || record.alertLevel === "critical"));
  }
  getHighRiskAlerts(limit = 50) {
    return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant2(record.analysis) && record.alertLevel === "high");
  }
  getCriticalAlerts(limit = 50) {
    return this.readRecords(limit).filter((record) => isEnergySupplyChainRelevant2(record.analysis) && record.alertLevel === "critical");
  }
  hasArticle(articleId) {
    return Boolean(
      this.database.prepare("SELECT article_id FROM geopolitical_monitor_processed WHERE article_id = ?").get(articleId) || this.database.prepare("SELECT article_id FROM geopolitical_monitor_results WHERE article_id = ?").get(articleId)
    );
  }
  hasEvent(eventId, sourceType) {
    const rows = this.database.prepare("SELECT event_id, record_json FROM geopolitical_monitor_results WHERE event_id = ?").all(eventId);
    if (rows.some((row) => !sourceType || JSON.parse(row.record_json).article.sourceType === sourceType)) return true;
    const fallbackRows = this.database.prepare("SELECT record_json FROM geopolitical_monitor_results WHERE event_id IS NULL LIMIT 200").all();
    return fallbackRows.some((row) => {
      const record = JSON.parse(row.record_json);
      return record.analysis.event.id === eventId && (!sourceType || record.article.sourceType === sourceType);
    });
  }
  markProcessed(articleId, eventId, duplicateOf) {
    this.database.prepare("INSERT OR IGNORE INTO geopolitical_monitor_processed(article_id, event_id, processed_at, duplicate_of) VALUES(?, ?, ?, ?)").run(articleId, eventId, (/* @__PURE__ */ new Date()).toISOString(), duplicateOf || null);
  }
  saveRecord(record) {
    this.database.prepare(`INSERT INTO geopolitical_monitor_results(article_id, detected_at, title, source, source_url, event_id, relevant, risk_level, risk_score, record_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.article.id,
      record.detectedAt,
      record.article.title,
      record.article.source,
      record.article.url || null,
      record.analysis.event.id,
      isEnergySupplyChainRelevant2(record.analysis) ? 1 : 0,
      record.analysis.risk.riskLevel,
      record.analysis.risk.riskScore,
      JSON.stringify(record)
    );
    this.markProcessed(record.article.id, record.analysis.event.id);
  }
  readRecords(limit) {
    const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 50;
    const rows = this.database.prepare("SELECT record_json FROM geopolitical_monitor_results ORDER BY detected_at DESC LIMIT ?").all(boundedLimit);
    return rows.map((row) => cloneRecord(JSON.parse(row.record_json)));
  }
  readAllRecords() {
    const rows = this.database.prepare("SELECT record_json FROM geopolitical_monitor_results ORDER BY detected_at DESC").all();
    return rows.map((row) => cloneRecord(JSON.parse(row.record_json)));
  }
};

// server.ts
var envLocalPath = import_node_path2.default.resolve(process.cwd(), ".env.local");
if ((0, import_node_fs2.existsSync)(envLocalPath)) (0, import_node_process.loadEnvFile)(envLocalPath);
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
  app.get("/api/geopolitical-risk/monitor/relevant-events", (request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    const limit = queryInteger(request, "limit", 50, 1, 200) || 50;
    const events = monitoring.getRelevantEvents(limit);
    response.json({ status: "AVAILABLE", count: events.length, events });
  });
  app.get("/api/geopolitical-risk/monitor/alerts/high", (request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    const limit = queryInteger(request, "limit", 50, 1, 200) || 50;
    const alerts = monitoring.getHighRiskAlerts(limit);
    response.json({ status: "AVAILABLE", count: alerts.length, alerts });
  });
  app.get("/api/geopolitical-risk/monitor/alerts/critical", (request, response) => {
    if (!monitoring) {
      response.status(503).json({ status: "ERROR", error: "Geopolitical monitoring is not configured." });
      return;
    }
    const limit = queryInteger(request, "limit", 50, 1, 200) || 50;
    const alerts = monitoring.getCriticalAlerts(limit);
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

// src/dataLayer/importer.ts
var import_node_crypto4 = require("node:crypto");
var import_node_fs3 = require("node:fs");
var import_node_path3 = __toESM(require("node:path"), 1);
var DEFAULT_PROCESSED_DIR = import_node_path3.default.join(process.cwd(), "data", "processed");
var stableId = (prefix, identity) => {
  const digest = (0, import_node_crypto4.createHash)("sha256").update(identity, "utf8").digest("hex").slice(0, 20);
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
var readCsv = (processedDir2, fileName) => {
  const filePath = import_node_path3.default.join(processedDir2, fileName);
  if (!(0, import_node_fs3.existsSync)(filePath)) throw new Error(`Processed dataset not found: ${filePath}`);
  return parseCsv((0, import_node_fs3.readFileSync)(filePath, "utf8"));
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
var insertShippingLanes = (database2, processedDir2, rows, sourceIds) => {
  const statement = database2.prepare(`INSERT INTO shipping_lanes (shipping_lane_id, source_feature_id, source_object_id, feature_name, lane_category, geometry_type, line_part_count, coordinate_point_count, geometry_valid, geometry_bounds_lon_lat, source_geometry_crs_status, data_source_id, source_feature_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const geometryStatement = database2.prepare(`INSERT INTO shipping_lane_geometries (shipping_lane_geometry_id, shipping_lane_id, geometry_type, geometry_json, source_geometry_crs_status, geometry_status) VALUES (?, ?, ?, ?, ?, ?)`);
  const geoJsonPath = import_node_path3.default.join(processedDir2, "shipping_lanes_v1.geojson");
  if (!(0, import_node_fs3.existsSync)(geoJsonPath)) throw new Error(`Processed shipping-lane GeoJSON not found: ${geoJsonPath}`);
  const geoJson = JSON.parse((0, import_node_fs3.readFileSync)(geoJsonPath, "utf8"));
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
var insertFacts = (database2, processedDir2, sourceIds, periodIds, countryIds, productIds) => {
  const counts = {};
  const supplierRows = readCsv(processedDir2, "supplier_imports.csv");
  const supplierStatement = database2.prepare(`INSERT INTO supplier_imports (supplier_import_id, financial_period_id, country_id, quantity_tonnes, quantity_unit, source_country_name, source_country_normalized_name, country_code, source_product_code, source_product_description, product_id, source_quantity_unit, source_trade_value_source_units, trade_value_unit_status, data_source_id, source_row_number, country_mapping_status, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of supplierRows) {
    const sourceDataset = value(row, "source_dataset");
    supplierStatement.run(stableId("supplier-import", `${sourceDataset}:${value(row, "source_row_number")}`), periodIds.get(value(row, "financial_year")), nullable(row, "country_id"), requiredNumber(row, "quantity_tonnes"), value(row, "quantity_unit"), value(row, "source_country_name"), value(row, "source_country_normalized_name"), value(row, "country_code"), value(row, "source_product_code"), value(row, "source_product_description"), value(row, "product_id"), value(row, "source_quantity_unit"), numberValue(row, "source_trade_value_source_units"), "UNDOCUMENTED", sourceIds.get(sourceDataset), requiredNumber(row, "source_row_number"), value(row, "country_mapping_status"), value(row, "validation_status"));
  }
  counts.supplier_imports = supplierRows.length;
  const crudeRows = readCsv(processedDir2, "crude_import_totals.csv");
  const crudeStatement = database2.prepare(`INSERT INTO crude_import_totals (crude_import_total_id, financial_period_id, quantity_thousand_metric_tonnes, quantity_unit, source_financial_year, data_source_id, source_row_number, validation_status, time_series_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of crudeRows) crudeStatement.run(stableId("crude-import-total", `${value(row, "source_dataset")}:${value(row, "source_row_number")}`), periodIds.get(value(row, "financial_year")), requiredNumber(row, "quantity_thousand_metric_tonnes"), value(row, "quantity_unit"), value(row, "source_financial_year"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"), value(row, "time_series_scope"));
  counts.crude_import_totals = crudeRows.length;
  const consumptionRows = readCsv(processedDir2, "petroleum_consumption.csv");
  const consumptionStatement = database2.prepare(`INSERT INTO petroleum_consumption (petroleum_consumption_id, product_id, financial_period_id, source_product_name, calendar_year, month_number, month_name, consumption_metric_tonnes, consumption_unit, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of consumptionRows) consumptionStatement.run(stableId("petroleum-consumption", `${value(row, "source_dataset")}:${value(row, "source_row_number")}`), value(row, "product_id"), periodIds.get(value(row, "financial_year")), value(row, "source_product_name"), requiredNumber(row, "calendar_year"), requiredNumber(row, "month_number"), value(row, "month_name"), requiredNumber(row, "consumption_metric_tonnes"), value(row, "consumption_unit"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"));
  counts.petroleum_consumption = consumptionRows.length;
  const globalRows = readCsv(processedDir2, "global_oil_snapshot.csv");
  const globalStatement = database2.prepare(`INSERT INTO global_oil_snapshots (global_oil_snapshot_id, country_id, canonical_country_name, source_country_name, source_rank, rank, source_proven_reserves_barrels, proven_reserves_barrels, source_production_barrels_per_day, production_barrels_per_day, source_consumption_barrels_per_day, consumption_barrels_per_day, source_exports_barrels_per_day, exports_barrels_per_day, source_imports_barrels_per_day, imports_barrels_per_day, as_of_date, data_source_id, source_row_number, missing_metric_count, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of globalRows) globalStatement.run(value(row, "global_oil_snapshot_id"), value(row, "country_id"), value(row, "canonical_country_name"), value(row, "source_country_name"), nullable(row, "source_rank"), numberValue(row, "rank"), nullable(row, "source_proven_reserves_barrels"), numberValue(row, "proven_reserves_barrels"), nullable(row, "source_production_barrels_per_day"), numberValue(row, "production_barrels_per_day"), nullable(row, "source_consumption_barrels_per_day"), numberValue(row, "consumption_barrels_per_day"), nullable(row, "source_exports_barrels_per_day"), numberValue(row, "exports_barrels_per_day"), nullable(row, "source_imports_barrels_per_day"), numberValue(row, "imports_barrels_per_day"), nullable(row, "as_of_date"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), requiredNumber(row, "missing_metric_count"), value(row, "validation_status"));
  counts.global_oil_snapshots = globalRows.length;
  const activityRows = readCsv(processedDir2, "daily_port_activity.csv");
  const identityIds = /* @__PURE__ */ new Map();
  for (const row of readCsv(processedDir2, "port_source_mapping.csv")) identityIds.set(`${value(row, "source_dataset")}|${value(row, "source_record_key")}`, stableId("port-source", `${value(row, "source_dataset")}|${value(row, "source_record_key")}`));
  const activityFields = ["portcalls_container", "portcalls_dry_bulk", "portcalls_general_cargo", "portcalls_roro", "portcalls_tanker", "portcalls_cargo", "portcalls", "import_container", "import_dry_bulk", "import_general_cargo", "import_roro", "import_tanker", "import_cargo", "import", "export_container", "export_dry_bulk", "export_general_cargo", "export_roro", "export_tanker", "export_cargo", "export"];
  const activityStatement = database2.prepare(`INSERT INTO daily_port_activity (daily_activity_id, port_id, port_source_identity_id, source_port_id, source_port_name, canonical_port_name, port_mapping_status, port_mapping_method, activity_date, source_timestamp, source_year, source_month, source_day, source_country, source_iso3, ${activityFields.join(", ")}, source_object_id, import_export_unit_status, data_source_id, source_row_number, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${activityFields.map(() => "?").join(", ")}, ?, ?, ?, ?, ?)`);
  for (const row of activityRows) {
    const identityId = identityIds.get(`${value(row, "source_dataset")}|${value(row, "source_port_id")}`);
    if (!identityId) throw new Error(`Missing port source identity for ${value(row, "source_port_id")}`);
    activityStatement.run(value(row, "daily_activity_id"), nullable(row, "port_id"), identityId, value(row, "source_port_id"), value(row, "source_port_name"), nullable(row, "canonical_port_name"), value(row, "port_mapping_status"), value(row, "port_mapping_method"), value(row, "activity_date"), value(row, "source_timestamp"), requiredNumber(row, "source_year"), requiredNumber(row, "source_month"), requiredNumber(row, "source_day"), value(row, "source_country"), value(row, "source_iso3"), ...activityFields.map((field) => requiredNumber(row, field)), value(row, "source_object_id"), value(row, "import_export_unit_status"), sourceIds.get(value(row, "source_dataset")), requiredNumber(row, "source_row_number"), value(row, "validation_status"));
  }
  counts.daily_port_activity = activityRows.length;
  return counts;
};
var insertQuality = (database2, processedDir2, sourceIds) => {
  const counts = {};
  const summaryRows = readCsv(processedDir2, "data_quality_summary.csv");
  const summaryStatement = database2.prepare(`INSERT INTO data_quality_summaries (dataset, processed_file, source_dataset, input_row_count, output_row_count, excluded_row_count, null_count_by_important_field, duplicate_count, invalid_value_count, unresolved_mapping_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of summaryRows) summaryStatement.run(value(row, "dataset"), value(row, "processed_file"), value(row, "source_dataset"), requiredNumber(row, "input_row_count"), requiredNumber(row, "output_row_count"), requiredNumber(row, "excluded_row_count"), readJson(value(row, "null_count_by_important_field")), requiredNumber(row, "duplicate_count"), requiredNumber(row, "invalid_value_count"), requiredNumber(row, "unresolved_mapping_count"), value(row, "notes"));
  counts.data_quality_summaries = summaryRows.length;
  const issueRows = readCsv(processedDir2, "data_quality_issues.csv");
  const issueStatement = database2.prepare(`INSERT INTO data_quality_issues (data_quality_issue_id, data_source_id, source_dataset, source_row_number, source_record_key, issue_type, field_name, severity, issue_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of issueRows) issueStatement.run(stableId("quality-issue", JSON.stringify(row)), sourceIds.get(value(row, "source_dataset")), value(row, "source_dataset"), numberValue(row, "source_row_number"), value(row, "source_record_key"), value(row, "issue_type"), value(row, "field_name"), value(row, "severity"), value(row, "issue_status"), value(row, "description"));
  counts.data_quality_issues = issueRows.length;
  return counts;
};
var insertManualReview = (database2, processedDir2, sourceIds) => {
  const countryRows = readCsv(import_node_path3.default.join(processedDir2, "manual_review"), "country_manual_review.csv");
  const portRows = readCsv(import_node_path3.default.join(processedDir2, "manual_review"), "port_manual_review.csv");
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
    ["strategic_reserve", "Strategic reserve", "NOT_CONNECTED", "phase2-data-model.md", "No strategic-reserve dataset is supplied."]
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

// tests/digital-twin-api.test.ts
var processedDir = import_node_path4.default.join(process.cwd(), "data", "processed");
var temporaryDirectory = (0, import_node_fs4.mkdtempSync)(import_node_path4.default.join((0, import_node_os.tmpdir)(), "orbit-digital-twin-api-"));
var databasePath = import_node_path4.default.join(temporaryDirectory, "phase2.sqlite");
var database = openPhase2Database({ dbPath: databasePath });
var server;
var baseUrl = "";
var portNodeId = "";
(0, import_node_test.before)(async () => {
  importPhase2Data({ dbPath: databasePath, processedDir });
  database.close();
  database = openPhase2Database({ dbPath: databasePath });
  const repository = new Phase2Repository(database);
  const app = createApp(repository);
  server = (0, import_node_http.createServer)(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
  const graphResponse = await fetch(`${baseUrl}/api/digital-twin`);
  const graphBody = await graphResponse.json();
  portNodeId = graphBody.graph.nodes.find((node) => node.nodeType === "port" && node.name === "Kochi (Cochin)")?.nodeId || "";
  import_strict.default.ok(portNodeId);
});
(0, import_node_test.after)(() => {
  server.close();
  database.close();
  (0, import_node_fs4.rmSync)(temporaryDirectory, { recursive: true, force: true });
});
(0, import_node_test.default)("GET /api/digital-twin returns the current real-data graph", async () => {
  const response = await fetch(`${baseUrl}/api/digital-twin`);
  import_strict.default.equal(response.status, 200);
  const body = await response.json();
  import_strict.default.equal(body.status, "AVAILABLE");
  import_strict.default.equal(body.graph.nodes.filter((node) => node.nodeType === "port").length, 59);
  import_strict.default.equal(body.graph.nodes.filter((node) => node.nodeType === "refinery").length, 24);
  import_strict.default.equal(body.graph.nodes.filter((node) => node.nodeType === "chokepoint").length, 2);
  import_strict.default.equal(body.graph.nodes.filter((node) => node.nodeType === "strategic_reserve").length, 3);
  import_strict.default.equal(body.graph.edges.length, 27);
  import_strict.default.ok(body.graph.edges.some((edge) => edge.edgeId === "relationship-hormuz-to-india-facing-route"));
  import_strict.default.ok(body.graph.edges.some((edge) => edge.edgeId === "relationship-port-vishakhapatnam-refinery-hpc-vizag"));
  import_strict.default.ok(body.graph.edges.some((edge) => edge.edgeId === "relationship-hormuz-india-route-to-mumbai-port" && edge.edgeType === "shipping_route_to_port" && edge.sourceUrl));
});
(0, import_node_test.default)("GET and POST node state use the existing Twin State Engine", async () => {
  const initialResponse = await fetch(`${baseUrl}/api/digital-twin/state/${portNodeId}`);
  import_strict.default.equal(initialResponse.status, 200);
  import_strict.default.equal((await initialResponse.json()).state.operationalState, "operational");
  const updateResponse = await fetch(`${baseUrl}/api/digital-twin/state`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodeId: portNodeId, state: "reduced" }) });
  import_strict.default.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  import_strict.default.deepEqual(updateBody.state, { nodeId: portNodeId, operationalState: "reduced", stateSource: "OVERRIDE" });
});
(0, import_node_test.default)("state API rejects invalid node IDs and states", async () => {
  const unknownNode = await fetch(`${baseUrl}/api/digital-twin/state/missing-node`);
  import_strict.default.equal(unknownNode.status, 404);
  const unknownUpdate = await fetch(`${baseUrl}/api/digital-twin/state`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodeId: "missing-node", state: "blocked" }) });
  import_strict.default.equal(unknownUpdate.status, 404);
  const invalidState = await fetch(`${baseUrl}/api/digital-twin/state`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodeId: portNodeId, state: "invalid" }) });
  import_strict.default.equal(invalidState.status, 400);
});
(0, import_node_test.default)("reset and impact APIs return state-engine and impact-engine results", async () => {
  const disrupted = await fetch(`${baseUrl}/api/digital-twin/state`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodeId: portNodeId, state: "disrupted" }) });
  import_strict.default.equal(disrupted.status, 200);
  const impact = await fetch(`${baseUrl}/api/digital-twin/impact`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodeId: portNodeId }) });
  import_strict.default.equal(impact.status, 200);
  const impactBody = await impact.json();
  import_strict.default.equal(impactBody.impact.sourceNode.nodeId, portNodeId);
  import_strict.default.equal(impactBody.impact.sourceNode.operationalState, "disrupted");
  import_strict.default.deepEqual(impactBody.impact.affectedNodeIds, ["refinery-refinery-ae548d16e9f8e503e505"]);
  import_strict.default.deepEqual(impactBody.impact.affectedEdgeIds, ["relationship-port-kochi-refinery-bpc"]);
  const reset = await fetch(`${baseUrl}/api/digital-twin/reset`, { method: "POST" });
  import_strict.default.equal(reset.status, 200);
  const resetBody = await reset.json();
  import_strict.default.equal(resetBody.summary.nodeCount, resetBody.graph.nodes.length);
  import_strict.default.equal(resetBody.summary.byState.operational, resetBody.summary.nodeCount);
});
(0, import_node_test.default)("existing Phase 2 API remains functional", async () => {
  const response = await fetch(`${baseUrl}/api/phase2/ports?pageSize=1`);
  import_strict.default.equal(response.status, 200);
  const body = await response.json();
  import_strict.default.equal(body.data.length, 1);
  import_strict.default.equal(body.pagination.total, 59);
});
