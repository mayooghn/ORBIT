var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  createApp: () => createApp,
  startServer: () => startServer
});
module.exports = __toCommonJS(server_exports);
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
function extractAttribute(block, tagName, attributeName) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*\\/?\\s*>`, "i");
  return tagPattern.exec(block)?.[1];
}
function extractFeedEntries(xml) {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
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
function canonicalArticleUrlForDedup(value) {
  try {
    const url = new URL(value);
    const redirectedUrl = url.hostname.toLowerCase() === "news.google.com" ? url.searchParams.get("url") || url.searchParams.get("u") : void 0;
    if (redirectedUrl) return canonicalArticleUrlForDedup(decodeURIComponent(redirectedUrl));
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|oc$|ved$|usg$|ref$|source$|cmpid$|gclid$|fbclid$|output$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.port = url.port === "80" && url.protocol === "http:" || url.port === "443" && url.protocol === "https:" ? "" : url.port;
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().toLowerCase();
  }
}
var normalizedStoryTitle = (title) => title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function parsePublishedAt(value) {
  const publishedText = cleanText(value);
  if (!publishedText) return "";
  const timestamp = Date.parse(publishedText);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}
function stableArticleId(url, title) {
  const identity = `${canonicalArticleUrlForDedup(url)}
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
        const urlKey = `url:${canonicalArticleUrlForDedup(article.url)}`;
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

// src/dataLayer/repository.ts
var import_node_crypto2 = require("node:crypto");
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
var stableIdentity = (value) => (0, import_node_crypto3.createHash)("sha256").update(value, "utf8").digest("hex").slice(0, 20);
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
    const importTanker = latestActivity ? number(latestActivity, "import_tanker") : void 0;
    const exportTanker = latestActivity ? number(latestActivity, "export_tanker") : void 0;
    const currentFlow = importTanker === void 0 || exportTanker === void 0 ? void 0 : {
      value: importTanker + exportTanker,
      unit: "source_tanker_units_per_activity_day"
    };
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
        currentFlowSource: currentFlow ? "daily_port_activity.import_tanker + export_tanker" : null,
        currentFlowUnitStatus: latestActivity ? text(latestActivity, "import_export_unit_status") || null : null,
        currentFlowActivityDate: latestActivity ? text(latestActivity, "activity_date") || null : null
      }
    });
    if (latestActivity && currentFlow) {
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
    return hasConfirmedConnection || hasVerifiedMeasurement || hasMeaningfulSourceBackedData || requiredByAnotherModule;
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
  const flowNodesById = new Map(
    [...matchedNodeIds, ...finalAffectedNodeIds].map((nodeId) => finalNodeById.get(nodeId)).filter((node) => Boolean(node)).map((node) => [node.nodeId, node])
  );
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
    affectedFlow: measurementSummary2([...flowNodesById.values()], affectedEdges, "currentFlow"),
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

// src/geopoliticalEvents/groq.ts
var import_groq_sdk = __toESM(require("groq-sdk"), 1);
var GroqConfigurationError = class extends Error {
  constructor(message = "Groq is not configured. Set GROQ_AGENT_API_KEY or GROQ_NEWS_API_KEY on the server.") {
    super(message);
    this.name = "GroqConfigurationError";
  }
};
var GroqServiceError = class extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GroqServiceError";
    this.status = status;
  }
};
var GroqRateLimitError = class extends GroqServiceError {
  constructor(retryAfterMs) {
    const boundedRetryAfterMs = Math.max(1e3, Math.min(Math.round(retryAfterMs), 24 * 60 * 60 * 1e3));
    const retryAt = new Date(Date.now() + boundedRetryAfterMs).toISOString();
    super(`Groq rate limit reached. Automated monitoring is paused until ${retryAt}.`, 429);
    this.name = "GroqRateLimitError";
    this.retryAfterMs = boundedRetryAfterMs;
    this.retryAt = retryAt;
  }
};
var DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
var geopoliticalEventSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    timestamp: { type: "string" },
    source: { type: "string" },
    sourceUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
    location: { anyOf: [{ type: "string" }, { type: "null" }] },
    countriesInvolved: { type: "array", items: { type: "string" }, minItems: 1 },
    category: {
      type: "string",
      enum: ["conflict", "sanctions", "political_instability", "trade_restriction", "maritime_disruption", "diplomatic_escalation", "infrastructure_disruption", "other"]
    },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
  },
  required: ["id", "title", "description", "timestamp", "source", "sourceUrl", "location", "countriesInvolved", "category", "severity"]
};
var extractionSystemPrompt = "Return one JSON ORBIT event matching the schema. Extract only event facts; do not calculate risk or invent Digital Twin assets. For hypothetical requests, use the request as source and current time as timestamp.";
var explanationSystemPrompt = "Write 2 concise sentences explaining the supplied deterministic ORBIT result. Use only its values; do not recalculate risk or invent assets, relationships, capacities, or flows.";
var DEFAULT_RATE_LIMIT_RETRY_MS = 24 * 60 * 60 * 1e3;
var getExtractionMaxCompletionTokens = () => {
  const raw = process.env.EXTRACTION_MAX_COMPLETION_TOKENS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 1e3;
};
var getExplanationMaxCompletionTokens = () => {
  const raw = process.env.EXPLANATION_MAX_COMPLETION_TOKENS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 400;
};
var headerValue = (error, name) => {
  if (!error || typeof error !== "object") return void 0;
  const headers = error.headers;
  if (headers && typeof headers.get === "function") {
    const value = headers.get(name);
    return value || void 0;
  }
  if (headers && typeof headers === "object") {
    const record = headers;
    const value = record[name] ?? record[name.toLowerCase()];
    return typeof value === "string" ? value : void 0;
  }
  return void 0;
};
var retryAfterMsFor = (error) => {
  const retryAfterMsHeader = headerValue(error, "retry-after-ms");
  if (retryAfterMsHeader) {
    const milliseconds = Number(retryAfterMsHeader);
    if (Number.isFinite(milliseconds) && milliseconds >= 0) return milliseconds;
  }
  const retryAfterHeader = headerValue(error, "retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1e3;
    const retryAt = Date.parse(retryAfterHeader);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }
  return DEFAULT_RATE_LIMIT_RETRY_MS;
};
var isRateLimitError = (error) => {
  if (!error || typeof error !== "object") return false;
  const status = error.status;
  const message = error instanceof Error ? error.message : String(error);
  return status === 429 || /\b429\b|rate[_ -]?limit|tokens? per day|rate_limit_exceeded/i.test(message);
};
var responseText = (response) => {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new GroqServiceError("Groq returned an empty response.");
  return content.trim();
};
var compactExplanationInput = (input) => ({
  request: input.request,
  event: {
    title: input.event?.title,
    description: input.event?.description,
    location: input.event?.location,
    countriesInvolved: input.event?.countriesInvolved,
    category: input.event?.category,
    severity: input.event?.severity
  },
  classification: {
    energyRelevant: input.classification?.energyRelevant,
    region: input.classification?.region
  },
  relevance: {
    relevant: input.relevance?.relevant,
    matchedNodeTypes: input.relevance?.matchedNodeTypes,
    matchedLocations: input.relevance?.matchedLocations,
    matchedCountries: input.relevance?.matchedCountries
  },
  risk: {
    riskLevel: input.risk?.riskLevel,
    riskScore: input.risk?.riskScore,
    factors: input.risk?.factors?.map(({ name, points }) => ({ name, points }))
  },
  digitalTwinImpact: {
    relevant: input.digitalTwinImpact?.relevant,
    affectedNodeTypes: input.digitalTwinImpact?.affectedNodeTypes,
    affectedCapacity: input.digitalTwinImpact?.affectedCapacity,
    affectedFlow: input.digitalTwinImpact?.affectedFlow
  }
});
var GroqService = class {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model || DEFAULT_GROQ_MODEL;
    this.configurationName = options.configurationName;
    this.client = options.client;
  }
  getClient() {
    if (this.client) return this.client;
    if (!this.apiKey) {
      const keyName = this.configurationName ? `GROQ_${this.configurationName}_API_KEY` : "GROQ_API_KEY";
      throw new GroqConfigurationError(`Groq is not configured. Set ${keyName} on the server.`);
    }
    this.client = new import_groq_sdk.default({ apiKey: this.apiKey, maxRetries: 0 });
    return this.client;
  }
  toJSON() {
    return { provider: "GroqService", model: this.model };
  }
  async generate(messages, structured = false) {
    const client = this.getClient();
    const maxCompletionTokens = structured ? getExtractionMaxCompletionTokens() : getExplanationMaxCompletionTokens();
    console.log("[ORBIT AGENT DEBUG] Groq request", {
      provider: this.configurationName ?? "UNKNOWN",
      credentialSource: this.configurationName === "AGENT" ? "GROQ_AGENT_API_KEY" : this.configurationName === "NEWS" ? "GROQ_NEWS_API_KEY" : "GROQ_API_KEY",
      model: this.model,
      responseFormat: structured ? "json_schema" : "text",
      maxCompletionTokens
    });
    const attempt = async () => {
      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        max_completion_tokens: maxCompletionTokens,
        ...structured ? {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "geopolitical_event",
              description: "A validated ORBIT geopolitical event.",
              strict: true,
              schema: geopoliticalEventSchema
            }
          }
        } : {}
      });
      const rawChoice = response.choices?.[0];
      console.log("[ORBIT AGENT DEBUG] Groq response", {
        provider: this.configurationName ?? "UNKNOWN",
        model: this.model,
        responseFormat: structured ? "json_schema" : "text",
        maxCompletionTokens,
        choicesLength: response.choices?.length ?? 0,
        finishReason: rawChoice?.finish_reason ?? "N/A",
        hasMessage: rawChoice?.message !== void 0,
        hasContent: typeof rawChoice?.message?.content === "string",
        contentLength: typeof rawChoice?.message?.content === "string" ? rawChoice.message.content.length : 0
      });
      return responseText(response);
    };
    const isJsonValidateFailedError = (error) => {
      if (!error || typeof error !== "object") return false;
      const message = error instanceof Error ? error.message : String(error);
      return /json_validate_failed/i.test(message);
    };
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof GroqServiceError) throw error;
      if (isRateLimitError(error)) {
        console.warn("[ORBIT Groq] Rate limit reached; automatic retries are disabled.", {
          model: this.model,
          retryAfterMs: retryAfterMsFor(error)
        });
        throw new GroqRateLimitError(retryAfterMsFor(error));
      }
      const errMsg = error instanceof Error ? error.message : "unknown error";
      const errCode = error instanceof Error && "code" in error ? String(error.code) : "N/A";
      const httpStatus = error instanceof Error && "status" in error ? String(error.status) : "N/A";
      console.error("[ORBIT AGENT DEBUG] Groq error", {
        provider: this.configurationName ?? "UNKNOWN",
        model: this.model,
        responseFormat: structured ? "json_schema" : "text",
        maxCompletionTokens,
        errorCode: errCode,
        errorStatus: httpStatus,
        errorMessage: errMsg
      });
      if (structured && isJsonValidateFailedError(error)) {
        console.warn("[ORBIT Groq] json_validate_failed on structured extraction, retrying once.", {
          model: this.model,
          provider: this.configurationName ?? "UNKNOWN"
        });
        try {
          return await attempt();
        } catch (retryError) {
          if (retryError instanceof GroqServiceError) throw retryError;
          if (isRateLimitError(retryError)) {
            throw new GroqRateLimitError(retryAfterMsFor(retryError));
          }
          const retryMsg = retryError instanceof Error ? retryError.message : "unknown error";
          console.error("[ORBIT Groq] Retry also failed", { model: this.model, errorMessage: retryMsg });
          throw new GroqServiceError(`Groq request failed after retry: ${retryMsg}`);
        }
      }
      console.error("[ORBIT Groq] Request failed", {
        model: this.model,
        responseFormat: structured ? "json_schema" : "text",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: errMsg
      });
      throw new GroqServiceError(`Groq request failed: ${errMsg}`);
    }
  }
  async extractEvent(request) {
    const response = await this.generate([
      { role: "system", content: extractionSystemPrompt },
      { role: "user", content: request }
    ], true);
    try {
      return JSON.parse(response);
    } catch {
      throw new GroqServiceError("Groq returned invalid structured event JSON.");
    }
  }
  async explain(input) {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.generate([
          { role: "system", content: explanationSystemPrompt },
          { role: "user", content: JSON.stringify(compactExplanationInput(input)) }
        ]);
      } catch (error) {
        if (error instanceof GroqServiceError && error.message.includes("empty response")) {
          if (attempt < maxAttempts - 1) {
            console.warn("[ORBIT Groq] Empty explanation response, retrying...", { attempt: attempt + 1 });
            continue;
          }
        }
        throw error;
      }
    }
    console.warn("[ORBIT Groq] Unable to obtain explanation after retries; returning fallback message.");
    return "Explanation could not be generated at this time.";
  }
};
var createGroqAgentProvider = (overrides = {}) => new GroqService({
  ...overrides,
  apiKey: overrides.apiKey ?? process.env.GROQ_AGENT_API_KEY ?? "",
  model: overrides.model ?? process.env.GROQ_AGENT_MODEL ?? DEFAULT_GROQ_MODEL,
  configurationName: "AGENT"
});
var createGroqNewsProvider = (overrides = {}) => new GroqService({
  ...overrides,
  apiKey: overrides.apiKey ?? process.env.GROQ_NEWS_API_KEY ?? "",
  model: overrides.model ?? process.env.GROQ_NEWS_MODEL ?? DEFAULT_GROQ_MODEL,
  configurationName: "NEWS"
});

// src/geopoliticalEvents/agent.ts
var clone = (value) => structuredClone(value);
var isEnergySupplyChainRelevant = (classification, relevance, risk) => classification.energyRelevant && relevance.relevant && risk.energyRelevant;
var deterministicExplanation = (classification, relevance, risk) => {
  const reason = !classification.energyRelevant ? "classification marked the event as not energy relevant" : !relevance.relevant ? "no existing Digital Twin entity matched the event" : "the deterministic risk gate marked the event as not energy relevant";
  return `No Groq explanation was required: ${reason}. ORBIT retained the deterministic risk at ${risk.riskLevel} (${risk.riskScore}) with no Digital Twin impact.`;
};
var deterministicRelevantExplanation = (risk, digitalTwinImpact) => {
  const impact = digitalTwinImpact.affectedNodeIds.length || digitalTwinImpact.affectedEdgeIds.length ? `Digital Twin impact covers ${digitalTwinImpact.affectedNodeIds.length} node(s) and ${digitalTwinImpact.affectedEdgeIds.length} edge(s).` : "No downstream Digital Twin nodes or edges were affected.";
  return `ORBIT retained the deterministic risk at ${risk.riskLevel} (${risk.riskScore}) after applying the validated event and network rules. ${impact}`;
};
var analyzeEventDeterministically = (eventValue, runtime) => {
  const event = new GeopoliticalEventIngestionStore().ingest(eventValue);
  const classification = classifyGeopoliticalEvent(event);
  const relevance = analyzeGeopoliticalSupplyChainRelevance(event, runtime.stateEngine.getCurrentTwin(), classification);
  const risk = assessGeopoliticalRisk(event, classification, relevance);
  const digitalTwinImpact = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, runtime);
  return {
    event: clone(event),
    classification: clone(classification),
    relevance: clone(relevance),
    risk: clone(risk),
    digitalTwinImpact: clone(digitalTwinImpact)
  };
};
var analyzeGeopoliticalEventDeterministically = (request, eventValue, runtime) => {
  const normalizedRequest = typeof request === "string" ? request.trim() : "";
  if (!normalizedRequest) throw new Error("request is required.");
  const analysis = analyzeEventDeterministically(eventValue, runtime);
  const { classification, relevance, risk, digitalTwinImpact } = analysis;
  const explanation = !isEnergySupplyChainRelevant(classification, relevance, risk) ? deterministicExplanation(classification, relevance, risk) : deterministicRelevantExplanation(risk, digitalTwinImpact);
  return {
    request: normalizedRequest,
    ...analysis,
    explanation
  };
};
var GeopoliticalRiskIntelligenceAgent = class {
  constructor(runtime, llm) {
    this.runtime = runtime;
    this.llm = llm;
  }
  async analyze(request, options = {}) {
    const normalizedRequest = typeof request === "string" ? request.trim() : "";
    if (!normalizedRequest) throw new Error("request is required.");
    const extractedEvent = await this.llm.extractEvent(normalizedRequest);
    const analysis = analyzeEventDeterministically(extractedEvent, this.runtime);
    const { event, classification, relevance, risk, digitalTwinImpact } = analysis;
    const deterministicResults = {
      request: normalizedRequest,
      event: clone(event),
      classification: clone(classification),
      relevance: clone(relevance),
      risk: clone(risk),
      digitalTwinImpact: clone(digitalTwinImpact)
    };
    const explanation = !isEnergySupplyChainRelevant(classification, relevance, risk) ? deterministicExplanation(classification, relevance, risk) : options.explanation === "deterministic" ? deterministicRelevantExplanation(risk, digitalTwinImpact) : await this.llm.explain(clone(deterministicResults));
    if (typeof explanation !== "string" || !explanation.trim()) throw new Error("Groq returned an empty explanation.");
    return {
      request: normalizedRequest,
      ...analysis,
      explanation: explanation.trim()
    };
  }
};
var createGeopoliticalRiskIntelligenceAgent = (runtime, llm = createGroqAgentProvider()) => new GeopoliticalRiskIntelligenceAgent(runtime, llm);

// src/geopoliticalEvents/monitoring.ts
var import_node_crypto5 = require("node:crypto");

// src/geopoliticalEvents/deduplication.ts
var STOP_WORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "near",
  "of",
  "off",
  "on",
  "or",
  "the",
  "to",
  "with",
  "after",
  "amid",
  "around",
  "coast",
  "latest",
  "new",
  "news",
  "report",
  "reported",
  "reports",
  "says",
  "said",
  "today",
  "update",
  "updates"
]);
var SYNONYMS = {
  attacked: "attack",
  attacks: "attack",
  attacking: "attack",
  blocked: "blockade",
  blocking: "blockade",
  closes: "closure",
  closed: "closure",
  closing: "closure",
  disruptions: "disruption",
  disrupted: "disruption",
  disrupting: "disruption",
  hijacked: "hijack",
  hijacking: "hijack",
  hijacks: "hijack",
  imports: "import",
  imported: "import",
  importing: "import",
  pipelines: "pipeline",
  pirates: "pirate",
  piracy: "pirate",
  refineries: "refinery",
  seized: "seize",
  seizes: "seize",
  seizing: "seize",
  sanctions: "sanction",
  sanctioned: "sanction",
  tankers: "tanker",
  exports: "export",
  exported: "export",
  exporting: "export"
};
var ACTION_TERMS = /* @__PURE__ */ new Set([
  "attack",
  "blockade",
  "closure",
  "conflict",
  "disruption",
  "fire",
  "halt",
  "hijack",
  "import",
  "missile",
  "outage",
  "pirate",
  "reroute",
  "sanction",
  "seize",
  "shutdown",
  "strike",
  "war"
]);
var normalizeWord = (word) => {
  const mapped = SYNONYMS[word] || word;
  if (mapped.length > 4 && mapped.endsWith("ies")) return `${mapped.slice(0, -3)}y`;
  if (mapped.length > 4 && mapped.endsWith("s") && !mapped.endsWith("ss")) return mapped.slice(0, -1);
  return mapped;
};
var stripSourceSuffix = (title, source) => {
  const normalizedSource = source?.trim();
  if (!normalizedSource) return title;
  const escapedSource = normalizedSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title.replace(new RegExp(`\\s+-\\s+${escapedSource}\\s*$`, "i"), "");
};
var normalizedDedupTokens = (value, source) => {
  const normalized = stripSourceSuffix(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), source).replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = normalized.split(/\s+/).map(normalizeWord).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  return [...new Set(tokens)].sort();
};
var buildArticleFingerprint = (article) => normalizedDedupTokens(`${article.title} ${article.description || ""}`, article.source).join("|");
var buildEventFingerprint = (event) => {
  const category = event.category?.trim().toLowerCase() || "";
  const location = normalizedDedupTokens(event.location || "").join("|");
  const countries = (event.countriesInvolved || []).flatMap((country) => normalizedDedupTokens(country)).sort().join("|");
  const concepts = normalizedDedupTokens(`${event.title} ${event.description || ""}`, event.source).join("|");
  return `category:${category};location:${location};countries:${countries};concepts:${concepts}`;
};
var asSet = (tokens) => new Set(tokens);
var jaccardSimilarity = (left, right) => {
  const leftSet = asSet(left);
  const rightSet = asSet(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = (/* @__PURE__ */ new Set([...leftSet, ...rightSet])).size;
  return union === 0 ? 0 : intersection / union;
};
var areEventDatesWithinWindow = (left, right, windowMs = 72 * 60 * 60 * 1e3) => {
  if (!left || !right) return true;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return Number.isNaN(leftMs) || Number.isNaN(rightMs) || Math.abs(leftMs - rightMs) <= windowMs;
};
var overlappingAnchors = (left, right) => {
  const rightSet = asSet(right);
  return left.filter((token) => rightSet.has(token));
};
var areLikelySameEvent = (left, right) => {
  if (!areEventDatesWithinWindow(left.publishedAt || left.timestamp, right.publishedAt || right.timestamp)) return false;
  const categoryMismatch = Boolean(left.category && right.category && left.category !== right.category);
  const leftLocation = normalizedDedupTokens(left.location || "");
  const rightLocation = normalizedDedupTokens(right.location || "");
  if (leftLocation.length && rightLocation.length && !overlappingAnchors(leftLocation, rightLocation).length) return false;
  const leftCountries = normalizedDedupTokens((left.countriesInvolved || []).join(" "));
  const rightCountries = normalizedDedupTokens((right.countriesInvolved || []).join(" "));
  if (leftCountries.length && rightCountries.length && !overlappingAnchors(leftCountries, rightCountries).length) return false;
  const leftTitleTokens = normalizedDedupTokens(left.title, left.source);
  const rightTitleTokens = normalizedDedupTokens(right.title, right.source);
  const sharedTitleTokens = overlappingAnchors(leftTitleTokens, rightTitleTokens);
  const titleSimilarity = jaccardSimilarity(leftTitleTokens, rightTitleTokens);
  const actionOverlap = sharedTitleTokens.some((token) => ACTION_TERMS.has(token));
  if (sharedTitleTokens.length >= 3 && actionOverlap && titleSimilarity >= 0.78) return true;
  const leftTokens = normalizedDedupTokens(`${left.title} ${left.description || ""}`, left.source);
  const rightTokens = normalizedDedupTokens(`${right.title} ${right.description || ""}`, right.source);
  const sharedTokens = overlappingAnchors(leftTokens, rightTokens);
  if (categoryMismatch) return false;
  return sharedTokens.length >= 4 && sharedTokens.some((token) => ACTION_TERMS.has(token)) && jaccardSimilarity(leftTokens, rightTokens) >= 0.84;
};

// src/geopoliticalEvents/deterministicExtractor.ts
var import_node_crypto4 = require("node:crypto");
var HIGH_CONFIDENCE_THRESHOLD = 0.85;
var ENERGY_PATTERN = /\b(?:energy|crude|oil|petroleum|refiner(?:y|ies)|pipeline(?:s)?|tanker(?:s)?|lng|lpg|natural gas|fuel|power plant|strategic reserve|oil terminal)\b/i;
var ASSET_PATTERN = /\b(?:refiner(?:y|ies)|pipeline(?:s)?|terminal(?:s)?|tanker(?:s)?|shipping|maritime|chokepoint(?:s)?|strait(?:s)?|route(?:s)?|port(?:s)?|facility|facilities)\b/i;
var ENERGY_EXPORT_PATTERN = /\b(?:crude|oil|petroleum)\s+exports?\b|\bexports?\s+of\s+(?:crude|oil|petroleum)\b/i;
var EVENT_RULES = [
  {
    id: "maritime-disruption",
    category: "maritime_disruption",
    patterns: [
      /\btanker\s+(?:attack(?:ed)?|strike|fire)\b/i,
      /\bshipping\s+(?:disruption|blocked|blockade|rerouted|halted)\b/i,
      /\b(?:chokepoint|strait)\s+(?:closed|closure|blocked|blockade|disruption)\b/i,
      /\b(?:blockade|maritime\s+disruption)\b/i,
      /\b(?:blocks?|blocked|halts?|halted)\s+(?:oil\s+)?shipments?\b/i,
      /\brerouted\s+shipping\b/i
    ],
    reason: "a maritime disruption pattern links a shipping-related asset or action to the article."
  },
  {
    id: "conflict",
    category: "conflict",
    patterns: [
      /\bairstrike\b/i,
      /\bmissile\s+strike\b/i,
      /\bbombing\b/i,
      /\barmed\s+conflict\b/i,
      /\bmilitary\s+strike\b/i,
      /\bwar\b/i,
      /\battack(?:ed)?\b/i
    ],
    reason: "an explicit attack, strike, war, or armed-conflict pattern was identified."
  },
  {
    id: "infrastructure-disruption",
    category: "infrastructure_disruption",
    patterns: [
      /\brefiner(?:y|ies)\s+(?:outage|shutdown|fire|damaged?|offline|shuts?\s+down)\b/i,
      /\bpipeline(?:s)?\s+(?:outage|shutdown|fire|damaged?|offline|shuts?\s+down)\b/i,
      /\bterminal(?:s)?\s+(?:outage|shutdown|fire|damaged?|offline|shuts?\s+down)\b/i,
      /\bfacilit(?:y|ies)\s+(?:damaged?|outage|shutdown|offline)\b/i,
      /\b(?:outage|shutdown|fire|damaged?|offline)\s+(?:at|hits?|affects?)\s+(?:the\s+)?(?:refiner(?:y|ies)|pipeline(?:s)?|terminal(?:s)?|facility|facilities)\b/i
    ],
    reason: "an explicit refinery, pipeline, terminal, or facility disruption pattern was identified."
  },
  {
    id: "sanctions-or-trade-restriction",
    category: "trade_restriction",
    patterns: [
      /\b(?:sanction(?:s|ed)?|embargo)\b/i,
      /\b(?:export|import|shipping)\s+(?:ban|restriction|restrictions?)\b/i,
      /\brestrict(?:s|ed|ing)?\b[\s\S]{0,80}\b(?:oil|crude|petroleum)?\s*exports?\b/i,
      /\b(?:export|import)\s+restriction\b/i,
      /\b(?:blocks?|blocked|halts?|halted)\s+(?:crude|oil|petroleum)\s+exports?\b/i
    ],
    reason: "an explicit sanctions, embargo, ban, or trade-restriction pattern was identified."
  }
];
var KNOWN_REGIONS = [
  { name: "Strait of Hormuz", pattern: /\bstrait\s+of\s+hormuz\b/i },
  { name: "Strait of Malacca", pattern: /\bstrait\s+of\s+malacca\b/i },
  { name: "Persian Gulf", pattern: /\bpersian\s+gulf\b/i },
  { name: "Red Sea", pattern: /\bred\s+sea\b/i },
  { name: "Suez", pattern: /\bsuez\b/i }
];
var COUNTRY_ALIASES = {
  Iran: ["Iranian"],
  Iraq: ["Iraqi"],
  Oman: ["Omani"],
  Qatar: ["Qatari"],
  Russia: ["Russian"],
  "Saudi Arabia": ["Saudi", "Saudi Arabian"],
  "United Arab Emirates": ["UAE", "U.A.E.", "Emirati"],
  "United States": ["US", "U.S.", "USA", "U.S.A.", "American"],
  Venezuela: ["Venezuelan"],
  Nigeria: ["Nigerian"],
  Yemen: ["Yemeni"]
};
var normalizeText = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
var phraseMatches2 = (phrase, text2) => {
  const normalizedPhrase = normalizeText(phrase);
  const normalizedText = normalizeText(text2);
  if (!normalizedPhrase || !normalizedText) return false;
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
};
var textValue = (value) => typeof value === "string" ? value.trim() : "";
var articleText = (article) => [
  textValue(article.title),
  textValue(article.description),
  textValue(article.content)
].filter(Boolean).join(" ");
var validHttpUrl = (value) => {
  if (!value) return void 0;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return void 0;
    return url.toString();
  } catch {
    return void 0;
  }
};
var normalizedTimestamp = (value) => {
  if (!value) return void 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : void 0;
};
var stableEventId = (article, title, source, timestamp) => {
  const url = textValue(article.url) || textValue(article.sourceUrl);
  const identity = `${canonicalArticleUrlForDedup(url)}
${normalizeText(title)}
${source}
${timestamp}`;
  return `event-${(0, import_node_crypto4.createHash)("sha256").update(identity, "utf8").digest("hex").slice(0, 24)}`;
};
var sourceCountryNames = (node) => {
  const values = [
    node.name,
    typeof node.metadata.sourceCountryName === "string" ? node.metadata.sourceCountryName : "",
    typeof node.metadata.country === "string" ? node.metadata.country : ""
  ];
  return values.filter(Boolean);
};
var aliasesForCountry = (canonicalName, sourceNames) => [
  canonicalName,
  ...sourceNames,
  ...COUNTRY_ALIASES[canonicalName] || []
];
var buildCountryCandidates = (graph) => {
  const candidates = /* @__PURE__ */ new Map();
  for (const node of graph.nodes) {
    const sourceNames = sourceCountryNames(node);
    const canonicalName = node.nodeType === "supplier" ? node.name : typeof node.metadata.country === "string" ? node.metadata.country : "";
    if (!canonicalName) continue;
    const key = normalizeText(canonicalName);
    const existing = candidates.get(key);
    if (existing) {
      existing.aliases = [.../* @__PURE__ */ new Set([...existing.aliases, ...aliasesForCountry(canonicalName, sourceNames)])];
      existing.nodeId ||= node.nodeId;
      continue;
    }
    candidates.set(key, {
      canonicalName,
      aliases: aliasesForCountry(canonicalName, sourceNames),
      nodeId: node.nodeType === "supplier" ? node.nodeId : void 0
    });
  }
  return [...candidates.values()].sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
};
var nodeAliases = (node) => {
  const aliases = [node.name];
  const commaSeparatedParts = node.name.split(",").map((part) => part.trim()).filter((part) => part.length >= 4);
  aliases.push(...commaSeparatedParts);
  if (node.nodeType === "supplier" && typeof node.metadata.sourceCountryName === "string") aliases.push(node.metadata.sourceCountryName);
  return [...new Set(aliases)];
};
var findNodeMatches = (graph, text2) => graph.nodes.flatMap((node) => {
  const alias = nodeAliases(node).find((candidate) => phraseMatches2(candidate, text2));
  return alias ? [{ node, alias }] : [];
}).sort((left, right) => left.node.nodeId.localeCompare(right.node.nodeId));
var findRegionMatches = (text2) => KNOWN_REGIONS.filter((region) => region.pattern.test(text2)).map((region) => ({ name: region.name, evidence: `known geographic signal matched "${region.name}".` }));
var findCountries = (graph, text2) => buildCountryCandidates(graph).filter((candidate) => candidate.aliases.some((alias) => phraseMatches2(alias, text2)));
var matchingRule = (text2) => {
  const maritime = EVENT_RULES[0];
  const conflict = EVENT_RULES[1];
  const infrastructure = EVENT_RULES[2];
  const trade = EVENT_RULES[3];
  const maritimeContext = /\b(?:tanker|shipping|maritime|chokepoint|strait|blockade|shipments?)\b/i.test(text2);
  if (maritimeContext && maritime.patterns.some((pattern) => pattern.test(text2))) return maritime;
  if (conflict.patterns.some((pattern) => pattern.test(text2)) && /\b(?:attack|strike|war|conflict|missile|bombing|military)\b/i.test(text2)) return conflict;
  if (infrastructure.patterns.some((pattern) => pattern.test(text2))) return infrastructure;
  if (trade.patterns.some((pattern) => pattern.test(text2))) return trade;
  return void 0;
};
var severityFor = (rule, text2) => {
  if (/\b(?:war|armed\s+conflict|airstrike|missile\s+strike|bombing|blockade|chokepoint\s+(?:closed|closure))\b/i.test(text2)) return "critical";
  if (/\b(?:attack(?:ed)?|strike|fire|damaged?|shutdown|outage|export\s+ban|embargo|major\s+closure|sanction(?:s|ed)?)\b/i.test(text2)) return "high";
  if (rule.category === "trade_restriction") return "medium";
  return "medium";
};
var matchedEntityKey = (entity) => `${entity.entityType}:${entity.entityId || normalizeText(entity.name)}`;
var uniqueEntities = (entities) => {
  const seen = /* @__PURE__ */ new Set();
  return entities.filter((entity) => {
    const key = matchedEntityKey(entity);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
var confidenceFor = ({
  rule,
  countries,
  nodeMatches,
  regionMatches,
  energySignal,
  assetSignal
}) => {
  let score = 0;
  if (rule) score += 0.35;
  if (countries.length > 0) score += 0.2;
  if (nodeMatches.length > 0 || countries.length > 0 && assetSignal) score += 0.2;
  if (regionMatches.length > 0) score += 0.1;
  if (assetSignal) score += 0.15;
  if (energySignal) score += 0.1;
  return Math.min(0.99, Number(score.toFixed(2)));
};
var categoryForTradeRule = (text2) => /\b(?:sanction(?:s|ed)?|embargo)\b/i.test(text2) ? "sanctions" : "trade_restriction";
var locationFor = (nodeMatches, regionMatches, countries) => nodeMatches[0]?.node.name || regionMatches[0]?.name || countries[0]?.canonicalName;
var extractionResult = (event, confidence, matchedEntities, extractionReasons) => ({
  ...event ? { event } : {},
  confidence,
  confidenceLevel: event && confidence >= HIGH_CONFIDENCE_THRESHOLD ? "HIGH" : "UNCERTAIN",
  matchedEntities: uniqueEntities(matchedEntities),
  extractionReasons,
  route: event && confidence >= HIGH_CONFIDENCE_THRESHOLD ? "DETERMINISTIC" : "GROQ_FALLBACK"
});
var extractDeterministicGeopoliticalEvent = (article, graph) => {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("A Digital Twin graph snapshot is required for deterministic extraction.");
  }
  const title = textValue(article.title);
  const description = textValue(article.description) || textValue(article.content);
  const source = textValue(article.source);
  const text2 = articleText(article);
  const timestamp = normalizedTimestamp(textValue(article.publishedAt));
  const sourceUrl = validHttpUrl(textValue(article.url) || textValue(article.sourceUrl));
  const nodeMatches = findNodeMatches(graph, text2);
  const regionMatches = findRegionMatches(text2);
  const countries = findCountries(graph, text2);
  const rule = matchingRule(text2);
  const energySignal = ENERGY_PATTERN.test(text2) || ENERGY_EXPORT_PATTERN.test(text2);
  const assetSignal = ASSET_PATTERN.test(text2) || ENERGY_EXPORT_PATTERN.test(text2);
  const confidence = confidenceFor({ rule, countries, nodeMatches, regionMatches, energySignal, assetSignal });
  const matchedEntities = [
    ...nodeMatches.map(({ node, alias }) => ({
      entityId: node.nodeId,
      entityType: node.nodeType,
      name: node.name,
      evidence: `Digital Twin ${node.nodeType} matched by "${alias}".`
    })),
    ...countries.map((country) => ({
      ...country.nodeId ? { entityId: country.nodeId } : {},
      entityType: "country",
      name: country.canonicalName,
      evidence: `source-backed country matched from an existing Digital Twin country reference.`
    })),
    ...regionMatches.map((region) => ({
      entityType: "region",
      name: region.name,
      evidence: region.evidence
    }))
  ];
  const reasons = [];
  if (rule) reasons.push(rule.reason);
  else reasons.push("no supported explicit geopolitical action pattern was identified.");
  if (countries.length) reasons.push(`identified country evidence: ${countries.map((country) => country.canonicalName).join(", ")}.`);
  else reasons.push("no country was explicitly matched against the existing Digital Twin country references.");
  if (nodeMatches.length) reasons.push(`matched ${nodeMatches.length} existing Digital Twin node(s).`);
  if (regionMatches.length) reasons.push(`matched known geographic signal(s): ${regionMatches.map((region) => region.name).join(", ")}.`);
  if (assetSignal) reasons.push("an explicit energy asset or shipping signal was identified.");
  if (!timestamp) reasons.push("the article has no usable publication timestamp; the current time was not fabricated.");
  if (!source) reasons.push("the article source is missing.");
  if (!title) reasons.push("the article title is missing.");
  if (rule && !countries.length) reasons.push("the canonical event contract requires a country, so this result remains uncertain.");
  if (rule && !nodeMatches.length && !regionMatches.length) reasons.push("the affected entity was not reliably matched to the existing Digital Twin.");
  const requiredFieldsAvailable = Boolean(title && source && timestamp && countries.length > 0);
  const entityEvidenceAvailable = nodeMatches.length > 0 || regionMatches.length > 0 || countries.length > 0 && assetSignal;
  const supportedEvent = Boolean(rule && energySignal && entityEvidenceAvailable && requiredFieldsAvailable);
  if (!supportedEvent) return extractionResult(void 0, confidence, matchedEntities, reasons);
  const category = rule.category === "trade_restriction" ? categoryForTradeRule(text2) : rule.category;
  const event = {
    id: stableEventId(article, title, source, timestamp),
    title,
    description: description || title,
    timestamp,
    source,
    ...sourceUrl ? { sourceUrl } : {},
    ...locationFor(nodeMatches, regionMatches, countries) ? { location: locationFor(nodeMatches, regionMatches, countries) } : {},
    countriesInvolved: countries.map((country) => country.canonicalName).sort((left, right) => left.localeCompare(right)),
    category,
    severity: severityFor({ ...rule, category }, text2)
  };
  const validatedEvent = validateGeopoliticalEvent(event);
  reasons.push(`deterministic confidence score is ${confidence.toFixed(2)}; high-confidence threshold is ${HIGH_CONFIDENCE_THRESHOLD.toFixed(2)}.`);
  return extractionResult(validatedEvent, confidence, matchedEntities, reasons);
};

// src/geopoliticalEvents/monitoring.ts
var MonitoringRefreshConfigurationError = class extends Error {
  constructor() {
    super("Manual monitoring refresh is not configured. Set ORBIT_N8N_REFRESH_WEBHOOK_URL on the ORBIT server.");
    this.name = "MonitoringRefreshConfigurationError";
  }
};
var MonitoringRefreshTriggerError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MonitoringRefreshTriggerError";
  }
};
var DuplicateMonitoredEventError = class extends Error {
  constructor(articleId) {
    super(`Monitored event already exists: ${articleId}`);
    this.name = "DuplicateMonitoredEventError";
  }
};
var IrrelevantMonitoringCandidateError = class extends Error {
  constructor() {
    super("Monitoring candidate was rejected before LLM processing because it does not contain an energy/geopolitical supply threat.");
    this.name = "IrrelevantMonitoringCandidateError";
  }
};
var ExternalCandidateBudgetExceededError = class extends Error {
  constructor(maxCandidates) {
    super(`External candidate budget exceeded for this refresh scan. Maximum allowed candidates per refresh is ${maxCandidates}.`);
    this.name = "ExternalCandidateBudgetExceededError";
    this.maxCandidates = maxCandidates;
  }
};
var DEFAULT_MONITORING_QUERIES = ENERGY_MONITORING_QUERIES;
var DEFAULT_POLL_INTERVAL_MS = 15 * 60 * 1e3;
var MAX_POLL_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var DEFAULT_MAX_ARTICLES_PER_SCAN = 5;
var MAX_ARTICLES_PER_SCAN = 100;
var isTrue = (value) => value?.trim().toLowerCase() === "true";
var positiveInteger = (value, fallback) => Number.isInteger(value) && value && value >= 1e4 && value <= MAX_POLL_INTERVAL_MS ? value : fallback;
var boundedArticleCount = (value, fallback) => Number.isInteger(value) && value && value >= 1 && value <= MAX_ARTICLES_PER_SCAN ? value : fallback;
var envList = (value) => value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
var emptyScanSummary = (status) => ({
  status,
  articlesFetched: 0,
  candidatesAfterFiltering: 0,
  deterministicHighConfidence: 0,
  deterministicRejected: 0,
  groqFallbackCandidates: 0,
  groqFallbackSuccessful: 0,
  groqRateLimited: 0,
  groqDeferred: 0,
  groqFailed: 0,
  duplicates: 0,
  invalidEvents: 0,
  newEventsPersisted: 0
});
var scanResult = (retrievedAt, summary, eventsSkipped, alertsCreated) => ({
  ...summary,
  retrievedAt,
  articlesSeen: summary.articlesFetched,
  eventsProcessed: summary.newEventsPersisted,
  eventsSkipped,
  failedEvents: summary.groqRateLimited + summary.groqDeferred + summary.groqFailed + summary.invalidEvents,
  alertsCreated
});
var scanSummaryFromMeta = (value) => {
  if (!value) return void 0;
  try {
    const parsed = JSON.parse(value);
    if ((parsed.status === "SUCCESS" || parsed.status === "PARTIAL" || parsed.status === "NO_NEW_EVENTS" || parsed.status === "FAILED") && Object.entries(parsed).every(([key, entry]) => key === "status" || typeof entry === "number" && Number.isFinite(entry) && entry >= 0)) {
      return parsed;
    }
  } catch {
  }
  return void 0;
};
var externalScanSummaryFromMeta = (value) => {
  if (!value) return void 0;
  try {
    const parsed = JSON.parse(value);
    if ((parsed.status === "SUCCESS" || parsed.status === "PARTIAL" || parsed.status === "NO_NEW_EVENTS" || parsed.status === "FAILED") && typeof parsed.articlesFetched === "number" && Number.isFinite(parsed.articlesFetched) && parsed.articlesFetched >= 0 && Object.entries(parsed).every(([key, entry]) => key === "status" || typeof entry === "number" && Number.isFinite(entry) && entry >= 0)) {
      return parsed;
    }
  } catch {
  }
  return void 0;
};
var getMonitoringConfig = (overrides = {}) => ({
  enabled: overrides.enabled ?? isTrue(process.env.ORBIT_MONITORING_ENABLED),
  pollIntervalMs: positiveInteger(overrides.pollIntervalMs ?? Number(process.env.ORBIT_MONITORING_INTERVAL_MS || process.env.ORBIT_MONITORING_POLL_INTERVAL_MS), DEFAULT_POLL_INTERVAL_MS),
  queries: overrides.queries?.length ? [...overrides.queries] : envList(process.env.ORBIT_MONITORING_QUERIES).length ? envList(process.env.ORBIT_MONITORING_QUERIES) : [...DEFAULT_MONITORING_QUERIES],
  feedUrls: overrides.feedUrls?.length ? [...overrides.feedUrls] : envList(process.env.ORBIT_MONITORING_RSS_FEEDS),
  maxArticlesPerScan: boundedArticleCount(overrides.maxArticlesPerScan ?? Number(process.env.ORBIT_MONITORING_MAX_ARTICLES_PER_SCAN), DEFAULT_MAX_ARTICLES_PER_SCAN)
});
var toMonitoringArticle = (article) => ({
  ...article,
  sourceType: article.sourceType || "google_news",
  sources: [article.source],
  sourceReferences: [{
    source: article.source,
    url: article.url,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    retrievedAt: article.retrievedAt,
    sourceType: article.sourceType || "google_news",
    feedUrl: article.feedUrl
  }]
});
var ENERGY_ARTICLE_TERMS = /\b(?:energy|crude oil|oil|gas|natural gas|oil exports?|oil imports?|exports?|imports?|sanctions?|oil tanker|tankers?|refiner(?:y|ies)|pipelines?|oilfield|oil terminal|oil flows?|barrels?|petroleum|opec|lng|lpg|fuel shipment|export route|shipping lane)\b/i;
var ENERGY_TRANSIT_TERMS = /strait of hormuz|persian gulf|red sea|suez/i;
var GEOPOLITICAL_ENERGY_TERMS = /\b(?:iran|iraq|oman|saudi arabia|united arab emirates|uae|russia|yemen|qatar|kuwait|nigeria|venezuela)\b/i;
var SUPPLY_THREAT_TERMS = /\b(?:sanction(?:s|ed)?|embargo|disrupt(?:ion|ed)?|attack(?:ed)?|strike|conflict|war|tension|blockade|closure|outage|shutdown|seiz(?:e|ed|ure)|military|missile|drone|geopolitical|restriction|shortage|supply cut|production cut|reroute|avoid|alternative route|flows? stall(?:ed)?|halt(?:ed)?|hit|pirat(?:e|es)|fire|warning|alert|risk)\b/i;
var isEnergyMonitoringCandidate = (article) => {
  const text2 = `${article.title} ${article.description || ""}`;
  return (ENERGY_ARTICLE_TERMS.test(text2) || ENERGY_TRANSIT_TERMS.test(text2) || GEOPOLITICAL_ENERGY_TERMS.test(text2)) && SUPPLY_THREAT_TERMS.test(text2);
};
var isEnergySupplyChainRelevant2 = (analysis) => analysis.classification.energyRelevant && analysis.relevance.relevant && analysis.risk.energyRelevant;
var articleRequest = (article) => JSON.stringify({
  title: article.title,
  ...article.description ? { description: article.description } : {},
  ...article.source ? { source: article.source } : {},
  ...article.publishedAt ? { publishedAt: article.publishedAt } : {},
  ...article.url ? { sourceUrl: article.url } : {}
});
var alertLevelFor = (analysis) => {
  if (!isEnergySupplyChainRelevant2(analysis)) return "informational";
  return analysis.risk.riskLevel;
};
var stableExternalArticleId = (input, title, source, publishedAt) => {
  if (typeof input.id === "string" && input.id.trim()) return `external-${input.id.trim()}`;
  if (typeof input.sourceUrl === "string" && input.sourceUrl.trim()) {
    return `external-url-${(0, import_node_crypto5.createHash)("sha256").update(canonicalArticleUrlForDedup(input.sourceUrl.trim())).digest("hex").slice(0, 24)}`;
  }
  const identity = `${title}
${source}
${publishedAt}`;
  return `external-${(0, import_node_crypto5.createHash)("sha256").update(identity).digest("hex").slice(0, 24)}`;
};
var textField = (value, field, required = false) => {
  if (value === void 0 || value === null) {
    if (required) throw new Error(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string" || required && !value.trim()) throw new Error(`${field} is ${required ? "required" : "invalid"}.`);
  return value.trim();
};
var nonNegativeIntegerField = (value, field) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`${field} is invalid.`);
  return value;
};
var createN8nMonitoringRefreshTrigger = (fetchImplementation = fetch) => ({
  async trigger(requestedAt) {
    const url = process.env.ORBIT_N8N_REFRESH_WEBHOOK_URL?.trim();
    if (!url) throw new MonitoringRefreshConfigurationError();
    let response;
    try {
      response = await fetchImplementation(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-ORBIT-Refresh": "true" },
        body: JSON.stringify({ source: "orbit", requestedAt })
      });
    } catch (error) {
      throw new MonitoringRefreshTriggerError(error instanceof Error ? `n8n refresh trigger failed: ${error.message}` : "n8n refresh trigger failed.");
    }
    const body = await response.text();
    if (!response.ok) throw new MonitoringRefreshTriggerError(`n8n refresh trigger returned HTTP ${response.status}.`);
    if (body.trim()) {
      try {
        JSON.parse(body);
      } catch {
        throw new MonitoringRefreshTriggerError("n8n refresh trigger returned an invalid response.");
      }
    }
  }
});
var ensureSchema = (database) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS geopolitical_monitor_results (
      article_id TEXT PRIMARY KEY,
      detected_at TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      event_id TEXT,
      event_fingerprint TEXT,
      article_fingerprint TEXT,
      article_url_key TEXT,
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
      duplicate_of TEXT,
      event_fingerprint TEXT,
      article_fingerprint TEXT,
      article_url_key TEXT
    );
  `);
  const resultColumns = database.prepare("PRAGMA table_info(geopolitical_monitor_results)").all();
  if (!resultColumns.some((column) => column.name === "event_id")) database.exec("ALTER TABLE geopolitical_monitor_results ADD COLUMN event_id TEXT");
  if (!resultColumns.some((column) => column.name === "event_fingerprint")) database.exec("ALTER TABLE geopolitical_monitor_results ADD COLUMN event_fingerprint TEXT");
  if (!resultColumns.some((column) => column.name === "article_fingerprint")) database.exec("ALTER TABLE geopolitical_monitor_results ADD COLUMN article_fingerprint TEXT");
  if (!resultColumns.some((column) => column.name === "article_url_key")) database.exec("ALTER TABLE geopolitical_monitor_results ADD COLUMN article_url_key TEXT");
  const processedColumns = database.prepare("PRAGMA table_info(geopolitical_monitor_processed)").all();
  if (!processedColumns.some((column) => column.name === "event_fingerprint")) database.exec("ALTER TABLE geopolitical_monitor_processed ADD COLUMN event_fingerprint TEXT");
  if (!processedColumns.some((column) => column.name === "article_fingerprint")) database.exec("ALTER TABLE geopolitical_monitor_processed ADD COLUMN article_fingerprint TEXT");
  if (!processedColumns.some((column) => column.name === "article_url_key")) database.exec("ALTER TABLE geopolitical_monitor_processed ADD COLUMN article_url_key TEXT");
  database.exec("CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_event_id ON geopolitical_monitor_results(event_id)");
  database.exec("CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_event_fingerprint ON geopolitical_monitor_results(event_fingerprint)");
  database.exec("CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_results_article_url_key ON geopolitical_monitor_results(article_url_key)");
  database.exec("CREATE INDEX IF NOT EXISTS idx_geopolitical_monitor_processed_article_url_key ON geopolitical_monitor_processed(article_url_key)");
};
var readMeta = (database, key) => {
  const row = database.prepare("SELECT value FROM geopolitical_monitor_metadata WHERE key = ?").get(key);
  return row?.value;
};
var writeMeta = (database, key, value) => {
  database.prepare("INSERT INTO geopolitical_monitor_metadata(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
};
var cloneRecord = (record) => structuredClone(record);
var eventInputFor = (article, event) => ({
  title: event.title || article.title,
  description: event.description || article.description,
  source: article.source,
  publishedAt: article.publishedAt,
  url: article.url,
  category: event.category,
  location: event.location,
  countriesInvolved: event.countriesInvolved,
  timestamp: event.timestamp
});
var articleInputFor = (article) => ({
  title: article.title || "",
  description: article.description,
  source: article.source,
  publishedAt: article.publishedAt,
  url: article.url
});
var sourceReferenceFor = (article) => ({
  source: article.source,
  url: article.url,
  title: article.title,
  description: article.description,
  publishedAt: article.publishedAt,
  retrievedAt: article.retrievedAt,
  sourceType: article.sourceType,
  feedUrl: article.feedUrl
});
var sourceReferencesFor = (article) => {
  const references = article.sourceReferences?.length ? [...article.sourceReferences] : [];
  if (!references.length || !references.some((reference) => reference.source === article.source && reference.url === article.url)) {
    references.unshift(sourceReferenceFor(article));
  }
  return references;
};
var sourceAuthorityScore = (reference) => {
  const source = reference.source.toLowerCase();
  const url = reference.url?.toLowerCase() || "";
  let score = 0;
  if (/associated press|\bap news\b|\bap\b/.test(source) || /apnews\.com/.test(url)) score = 100;
  else if (/reuters/.test(source) || /reuters\.com/.test(url)) score = 95;
  else if (/bloomberg/.test(source) || /bloomberg\.com/.test(url)) score = 90;
  else if (/financial times|\bft\b/.test(source) || /ft\.com/.test(url)) score = 88;
  else if (/bbc/.test(source) || /bbc\.com/.test(url)) score = 84;
  else if (/al jazeera/.test(source) || /aljazeera\.com/.test(url)) score = 82;
  return score + (reference.url ? 2 : 0) + Math.min(10, Math.floor((reference.description?.length || 0) / 200));
};
var referenceKey = (reference) => {
  const url = reference.url ? canonicalArticleUrlForDedup(reference.url) : "";
  const title = buildArticleFingerprint({ title: reference.title || "", description: reference.description, source: reference.source });
  return `${reference.source.toLowerCase()}|${url || title}`;
};
var latestIsoTimestamp = (values) => {
  const valid = values.filter((value) => Boolean(value && !Number.isNaN(Date.parse(value))));
  return valid.length ? valid.sort((left, right) => Date.parse(right) - Date.parse(left))[0] : values.find(Boolean);
};
var mergeArticleMetadata = (existing, incoming) => {
  const byKey = /* @__PURE__ */ new Map();
  for (const reference of [...sourceReferencesFor(existing), ...sourceReferencesFor(incoming)]) {
    const key = referenceKey(reference);
    const prior = byKey.get(key);
    if (!prior || sourceAuthorityScore(reference) > sourceAuthorityScore(prior) || (reference.description?.length || 0) > (prior.description?.length || 0)) {
      byKey.set(key, { ...reference });
    }
  }
  const references = [...byKey.values()].sort((left, right) => sourceAuthorityScore(right) - sourceAuthorityScore(left) || left.source.localeCompare(right.source));
  const primary = references[0] || sourceReferenceFor(existing);
  const sources = [...new Set(references.map((reference) => reference.source).filter(Boolean))];
  return {
    ...existing,
    title: [existing.title, incoming.title].sort((left, right) => right.length - left.length)[0] || existing.title,
    source: primary.source || existing.source,
    url: primary.url || existing.url,
    publishedAt: latestIsoTimestamp(references.map((reference) => reference.publishedAt)) || existing.publishedAt,
    description: [existing.description || "", incoming.description || ""].sort((left, right) => right.length - left.length)[0] || void 0,
    retrievedAt: latestIsoTimestamp([existing.retrievedAt, incoming.retrievedAt]) || existing.retrievedAt,
    query: primary.sourceType === existing.sourceType ? incoming.query || existing.query : existing.query,
    sourceType: primary.sourceType || existing.sourceType,
    feedUrl: primary.feedUrl || existing.feedUrl,
    sources: sources.length ? sources : [primary.source],
    sourceReferences: references
  };
};
var eventFingerprintFor = (article, analysis) => buildEventFingerprint(eventInputFor(article, analysis.event));
var eventMatches = (article, analysis, existing, storedEventFingerprint) => {
  const candidateFingerprint = eventFingerprintFor(article, analysis);
  const existingEvent = existing.analysis.event;
  if (storedEventFingerprint && storedEventFingerprint === candidateFingerprint && areEventDatesWithinWindow(analysis.event.timestamp, existingEvent.timestamp)) return true;
  if (existingEvent.id === analysis.event.id && areEventDatesWithinWindow(analysis.event.timestamp, existingEvent.timestamp)) return true;
  const incoming = eventInputFor(article, analysis.event);
  for (const reference of sourceReferencesFor(existing.article)) {
    if (areLikelySameEvent(incoming, {
      ...articleInputFor(reference),
      category: existingEvent.category,
      location: existingEvent.location,
      countriesInvolved: existingEvent.countriesInvolved,
      timestamp: existingEvent.timestamp
    })) return true;
  }
  return areLikelySameEvent(incoming, eventInputFor(existing.article, existingEvent));
};
var rawArticleMatches = (article, existing) => {
  const incoming = articleInputFor(article);
  const existingEvent = existing.analysis.event;
  return sourceReferencesFor(existing.article).some((reference) => areLikelySameEvent(incoming, {
    ...articleInputFor(reference),
    category: existingEvent.category,
    location: existingEvent.location,
    countriesInvolved: existingEvent.countriesInvolved,
    timestamp: existingEvent.timestamp
  }));
};
var sourceLabel = (sourceTypes) => {
  const labels = new Set(sourceTypes);
  if (labels.has("google_news") && labels.has("direct_rss")) return "Google News + direct RSS";
  if (labels.has("google_news")) return "Google News RSS";
  if (labels.has("direct_rss")) return "Direct RSS";
  if (labels.has("external_webhook")) return "n8n/external webhook";
  return "Monitoring sources";
};
var GeopoliticalMonitoringService = class {
  constructor(database, agent, config = {}, source, refreshTrigger = createN8nMonitoringRefreshTrigger(), analysisOptions = {}) {
    this.database = database;
    this.agent = agent;
    this.refreshTrigger = refreshTrigger;
    this.groqBlockedUntil = 0;
    ensureSchema(database);
    this.reconcilePersistedRecords();
    this.config = getMonitoringConfig(config);
    this.analysisRuntime = analysisOptions.runtime;
    this.newsProvider = analysisOptions.newsProvider;
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
      return scanResult((/* @__PURE__ */ new Date()).toISOString(), emptyScanSummary("NO_NEW_EVENTS"), 0, 0);
    }
    if (!this.analysisRuntime && this.groqBlockedUntil > Date.now()) {
      this.state = "ERROR";
      this.lastError = `Automated monitoring is paused after a Groq rate limit until ${new Date(this.groqBlockedUntil).toISOString()}.`;
      const summary = emptyScanSummary("PARTIAL");
      return scanResult((/* @__PURE__ */ new Date()).toISOString(), summary, 0, 0);
    }
    if (this.groqBlockedUntil <= Date.now()) this.groqBlockedUntil = 0;
    if (this.scanPromise) return this.scanPromise;
    this.scanPromise = this.runScan();
    try {
      return await this.scanPromise;
    } finally {
      this.scanPromise = void 0;
    }
  }
  getOrCreateExternalRefreshSession() {
    const now = Date.now();
    if (!this.activeExternalRefreshSession || now - Date.parse(this.activeExternalRefreshSession.requestedAt) > 5 * 60 * 1e3) {
      this.activeExternalRefreshSession = {
        requestedAt: new Date(now).toISOString(),
        processedCandidateIds: /* @__PURE__ */ new Set(),
        candidateCount: 0
      };
    }
    return this.activeExternalRefreshSession;
  }
  async triggerExternalRefresh() {
    if (this.refreshPromise) return this.refreshPromise;
    const requestedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.activeExternalRefreshSession = {
      requestedAt,
      processedCandidateIds: /* @__PURE__ */ new Set(),
      candidateCount: 0
    };
    this.refreshPromise = this.refreshTrigger.trigger(requestedAt).then(() => ({ requestedAt, trigger: "n8n" }));
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = void 0;
    }
  }
  async analyzeArticle(article) {
    if (!this.analysisRuntime) {
      return {
        outcome: "GROQ_FALLBACK_SUCCESS",
        analysis: await this.agent.analyze(articleRequest(article), { explanation: "deterministic" })
      };
    }
    const extraction = extractDeterministicGeopoliticalEvent(article, this.analysisRuntime.stateEngine.getCurrentTwin());
    if (extraction.route === "DETERMINISTIC" && extraction.event) {
      return {
        outcome: "DETERMINISTIC",
        analysis: analyzeGeopoliticalEventDeterministically(articleRequest(article), extraction.event, this.analysisRuntime)
      };
    }
    if (this.groqBlockedUntil > Date.now()) {
      return {
        outcome: "GROQ_DEFERRED",
        retryAt: new Date(this.groqBlockedUntil).toISOString(),
        error: new Error(`NEWS Groq fallback is deferred until ${new Date(this.groqBlockedUntil).toISOString()}.`)
      };
    }
    if (!this.newsProvider) {
      return {
        outcome: "GROQ_DEFERRED",
        error: new Error("NEWS Groq fallback is not configured.")
      };
    }
    try {
      const extractedEvent = await this.newsProvider.extractEvent(articleRequest(article));
      const event = new GeopoliticalEventIngestionStore().ingest(extractedEvent);
      return {
        outcome: "GROQ_FALLBACK_SUCCESS",
        analysis: analyzeGeopoliticalEventDeterministically(articleRequest(article), event, this.analysisRuntime)
      };
    } catch (error) {
      if (error instanceof GroqRateLimitError) {
        this.groqBlockedUntil = Date.now() + error.retryAfterMs;
        return { outcome: "GROQ_RATE_LIMITED", error, retryAt: error.retryAt };
      }
      if (error instanceof GeopoliticalEventValidationError) {
        return { outcome: "INVALID_EVENT", error };
      }
      return { outcome: "GROQ_FAILED", error };
    }
  }
  finalizeScan(retrievedAt, summary, eventsSkipped, alertsCreated) {
    writeMeta(this.database, "lastScanSummary", JSON.stringify(summary));
    if (summary.status === "SUCCESS" || summary.status === "NO_NEW_EVENTS") {
      writeMeta(this.database, "lastSuccessfulScan", retrievedAt);
    }
    return scanResult(retrievedAt, summary, eventsSkipped, alertsCreated);
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
      return this.finalizeScan(retrievedAt, emptyScanSummary("FAILED"), 0, 0);
    }
    if (news.status === "ERROR") {
      this.state = "ERROR";
      this.lastError = "All configured RSS feeds failed.";
      const summary2 = emptyScanSummary("FAILED");
      summary2.articlesFetched = news.articles.length;
      return this.finalizeScan(retrievedAt, summary2, 0, 0);
    }
    if (news.failedFeeds?.length) this.lastError = `${news.failedFeeds.length} monitoring feed(s) failed; partial results were processed.`;
    let eventsSkipped = 0;
    let alertsCreated = 0;
    let rateLimitReached = false;
    let processingFailure = Boolean(news.failedFeeds?.length);
    const summary = emptyScanSummary("NO_NEW_EVENTS");
    summary.articlesFetched = news.articles.length;
    const candidateArticles = news.articles.filter((rawArticle) => !rawArticle.sourceType || isEnergyMonitoringCandidate(toMonitoringArticle(rawArticle)));
    const articlesToProcess = candidateArticles.slice(0, this.config.maxArticlesPerScan);
    summary.candidatesAfterFiltering = candidateArticles.length;
    eventsSkipped += Math.max(0, news.articles.length - articlesToProcess.length);
    for (const rawArticle of articlesToProcess) {
      const article = toMonitoringArticle(rawArticle);
      if (this.hasArticle(article)) {
        summary.duplicates += 1;
        eventsSkipped += 1;
        continue;
      }
      const existingEvent = this.findMatchingEvent(article);
      if (existingEvent) {
        this.mergeIntoExisting(existingEvent, article);
        this.markProcessed(article, existingEvent.analysis.event.id, existingEvent.article.id);
        summary.duplicates += 1;
        eventsSkipped += 1;
        continue;
      }
      try {
        const processing = await this.analyzeArticle(article);
        if (processing.outcome === "DETERMINISTIC") summary.deterministicHighConfidence += 1;
        else {
          summary.deterministicRejected += 1;
          summary.groqFallbackCandidates += 1;
        }
        if (processing.outcome === "GROQ_FALLBACK_SUCCESS") summary.groqFallbackSuccessful += 1;
        if (processing.outcome === "GROQ_RATE_LIMITED") summary.groqRateLimited += 1;
        if (processing.outcome === "GROQ_DEFERRED") summary.groqDeferred += 1;
        if (processing.outcome === "GROQ_FAILED") summary.groqFailed += 1;
        if (processing.outcome === "INVALID_EVENT") summary.invalidEvents += 1;
        if (!processing.analysis) {
          processingFailure = true;
          const errorMessage = processing.error instanceof Error ? processing.error.message : `Monitoring outcome: ${processing.outcome}.`;
          this.lastError = processing.retryAt ? `${errorMessage} Retry after ${processing.retryAt}.` : errorMessage;
          this.state = "ERROR";
          continue;
        }
        const analysis = processing.analysis;
        const matchingEvent = this.findMatchingEvent(article, analysis);
        if (matchingEvent) {
          this.mergeIntoExisting(matchingEvent, article, eventFingerprintFor(article, analysis));
          this.markProcessed(article, matchingEvent.analysis.event.id, matchingEvent.article.id);
          summary.duplicates += 1;
          eventsSkipped += 1;
          continue;
        }
        const record = { article, detectedAt: (/* @__PURE__ */ new Date()).toISOString(), alertLevel: alertLevelFor(analysis), analysis };
        this.saveRecord(record, buildArticleFingerprint(articleInputFor(article)), eventFingerprintFor(article, analysis));
        summary.newEventsPersisted += 1;
        if (record.alertLevel === "high" || record.alertLevel === "critical") alertsCreated += 1;
      } catch (error) {
        processingFailure = true;
        this.lastError = error instanceof Error ? error.message : "Monitoring article processing failed.";
        this.state = "ERROR";
        if (error instanceof GroqRateLimitError) {
          this.groqBlockedUntil = Date.now() + error.retryAfterMs;
          this.lastError = error.message;
          this.state = "ERROR";
          summary.deterministicRejected += 1;
          summary.groqFallbackCandidates += 1;
          summary.groqRateLimited += 1;
          rateLimitReached = true;
          break;
        }
        console.warn(`[ORBIT Monitoring] Article failed: ${article.id}`, error instanceof Error ? error.message : error);
      }
    }
    if (rateLimitReached) processingFailure = true;
    summary.status = processingFailure ? "PARTIAL" : summary.newEventsPersisted > 0 ? "SUCCESS" : "NO_NEW_EVENTS";
    this.state = processingFailure ? "ERROR" : "READY";
    return this.finalizeScan(retrievedAt, summary, eventsSkipped, alertsCreated);
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
      sources: [source],
      ...description ? { description } : {},
      ...sourceUrl ? { url: sourceUrl } : {},
      ...publishedAt ? { publishedAt: new Date(Date.parse(publishedAt)).toISOString() } : {}
    };
    article.sourceReferences = [sourceReferenceFor(article)];
    if (this.hasArticle(article)) throw new DuplicateMonitoredEventError(article.id);
    const existingEvent = this.findMatchingEvent(article);
    if (existingEvent) {
      const merged = this.mergeIntoExisting(existingEvent, article);
      this.markProcessed(article, existingEvent.analysis.event.id, existingEvent.article.id);
      return cloneRecord(merged);
    }
    if (!isEnergyMonitoringCandidate(article)) throw new IrrelevantMonitoringCandidateError();
    const session = this.getOrCreateExternalRefreshSession();
    if (session.processedCandidateIds.has(article.id)) {
      throw new DuplicateMonitoredEventError(article.id);
    }
    if (session.candidateCount >= this.config.maxArticlesPerScan) {
      throw new ExternalCandidateBudgetExceededError(this.config.maxArticlesPerScan);
    }
    session.candidateCount += 1;
    session.processedCandidateIds.add(article.id);
    const processing = await this.analyzeArticle(article);
    if (!processing.analysis) {
      if (processing.error instanceof Error) throw processing.error;
      throw new Error(`Monitoring outcome: ${processing.outcome}.`);
    }
    const analysis = processing.analysis;
    const matchingEvent = this.findMatchingEvent(article, analysis);
    if (matchingEvent) {
      const merged = this.mergeIntoExisting(matchingEvent, article, eventFingerprintFor(article, analysis));
      this.markProcessed(article, matchingEvent.analysis.event.id, matchingEvent.article.id);
      return cloneRecord(merged);
    }
    const record = { article, detectedAt: (/* @__PURE__ */ new Date()).toISOString(), alertLevel: alertLevelFor(analysis), analysis };
    this.saveRecord(record, buildArticleFingerprint(articleInputFor(article)), eventFingerprintFor(article, analysis));
    return cloneRecord(record);
  }
  recordExternalScan(input) {
    const scanId = textField(input.scanId, "scanId", true);
    const requestedStatus = textField(input.status, "status", true);
    const scannedAt = textField(input.scannedAt, "scannedAt", true);
    const source = textField(input.source, "source", true);
    const status = requestedStatus === "ERROR" ? "FAILED" : requestedStatus;
    const articlesSeen = nonNegativeIntegerField(input.articlesSeen ?? input.articlesFetched, "articlesSeen");
    const articlesFetched = input.articlesFetched === void 0 ? articlesSeen : nonNegativeIntegerField(input.articlesFetched, "articlesFetched");
    if (!["SUCCESS", "PARTIAL", "NO_NEW_EVENTS", "FAILED"].includes(status)) throw new Error("status is invalid.");
    if (source !== "n8n_google_news") throw new Error("source is invalid.");
    if (Number.isNaN(Date.parse(scannedAt))) throw new Error("scannedAt is invalid.");
    const normalizedScannedAt = new Date(Date.parse(scannedAt)).toISOString();
    if (status === "SUCCESS" || status === "NO_NEW_EVENTS") writeMeta(this.database, "lastSuccessfulExternalScan", normalizedScannedAt);
    writeMeta(this.database, "lastExternalScanArticlesSeen", String(articlesSeen));
    writeMeta(this.database, "lastExternalScanStatus", status);
    const summaryFields = [
      "candidatesAfterFiltering",
      "deterministicHighConfidence",
      "deterministicRejected",
      "groqFallbackCandidates",
      "groqFallbackSuccessful",
      "groqRateLimited",
      "groqDeferred",
      "groqFailed",
      "duplicates",
      "invalidEvents",
      "newEventsPersisted"
    ];
    const hasSummary = input.articlesFetched !== void 0 || summaryFields.some((field) => input[field] !== void 0);
    if (!hasSummary && status === "SUCCESS") return { scanId, scannedAt: normalizedScannedAt, articlesSeen };
    const summary = {
      status,
      articlesFetched
    };
    for (const field of summaryFields) {
      if (input[field] !== void 0) summary[field] = nonNegativeIntegerField(input[field], field);
    }
    writeMeta(this.database, "lastExternalScanSummary", JSON.stringify(summary));
    return { scanId, scannedAt: normalizedScannedAt, articlesSeen, summary };
  }
  getStatus() {
    const records = this.readAllRecords();
    const relevantRecords = records.filter((record) => isEnergySupplyChainRelevant2(record.analysis));
    const lastScanSummary = scanSummaryFromMeta(readMeta(this.database, "lastScanSummary"));
    const lastExternalScanSummary = externalScanSummaryFromMeta(readMeta(this.database, "lastExternalScanSummary"));
    const storedExternalScanStatus = readMeta(this.database, "lastExternalScanStatus");
    const lastExternalScanStatus = storedExternalScanStatus === "SUCCESS" || storedExternalScanStatus === "PARTIAL" || storedExternalScanStatus === "NO_NEW_EVENTS" || storedExternalScanStatus === "FAILED" ? storedExternalScanStatus : void 0;
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
      lastSuccessfulExternalScan: readMeta(this.database, "lastSuccessfulExternalScan"),
      lastExternalScanArticlesSeen: Number(readMeta(this.database, "lastExternalScanArticlesSeen")) || void 0,
      ...lastExternalScanStatus ? { lastExternalScanStatus } : {},
      ...lastExternalScanSummary ? { lastExternalScanSummary } : {},
      ...lastScanSummary ? {
        lastScanStatus: lastScanSummary.status,
        lastScanSummary
      } : {},
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
  reconcilePersistedRecords() {
    const rows = this.database.prepare("SELECT article_id, detected_at, event_fingerprint, record_json FROM geopolitical_monitor_results ORDER BY detected_at ASC, article_id ASC").all();
    const kept = [];
    this.database.exec("BEGIN");
    try {
      for (const row of rows) {
        const record = JSON.parse(row.record_json);
        const eventFingerprint = row.event_fingerprint || eventFingerprintFor(record.article, record.analysis);
        const duplicate = kept.find((candidate) => canonicalArticleUrlForDedup(record.article.url || "") === canonicalArticleUrlForDedup(candidate.record.article.url || "") && record.article.url && candidate.record.article.url) || kept.find((candidate) => eventMatches(record.article, record.analysis, candidate.record, candidate.eventFingerprint));
        if (!duplicate) {
          const articleFingerprint = buildArticleFingerprint(articleInputFor(record.article));
          this.updateStoredRecord(row.article_id, record, articleFingerprint, eventFingerprint);
          kept.push({ articleId: row.article_id, record, eventFingerprint });
          continue;
        }
        const mergedRecord = {
          ...duplicate.record,
          article: mergeArticleMetadata(duplicate.record.article, record.article)
        };
        const mergedArticleFingerprint = buildArticleFingerprint(articleInputFor(mergedRecord.article));
        this.updateStoredRecord(duplicate.articleId, mergedRecord, mergedArticleFingerprint, duplicate.eventFingerprint);
        this.database.prepare("DELETE FROM geopolitical_monitor_results WHERE article_id = ?").run(row.article_id);
        this.markProcessed(record.article, duplicate.record.analysis.event.id, duplicate.articleId, duplicate.eventFingerprint);
        duplicate.record = mergedRecord;
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  hasArticle(article) {
    const articleUrlKey = article.url ? canonicalArticleUrlForDedup(article.url) : "";
    if (this.database.prepare("SELECT article_id FROM geopolitical_monitor_processed WHERE article_id = ? OR (? <> '' AND article_url_key = ?) LIMIT 1").get(article.id, articleUrlKey, articleUrlKey)) return true;
    if (this.database.prepare("SELECT article_id FROM geopolitical_monitor_results WHERE article_id = ? OR (? <> '' AND article_url_key = ?) LIMIT 1").get(article.id, articleUrlKey, articleUrlKey)) return true;
    const rows = this.database.prepare("SELECT article_id, source_url, record_json FROM geopolitical_monitor_results").all();
    return rows.some((row) => row.article_id === article.id || articleUrlKey && canonicalArticleUrlForDedup(row.source_url || "") === articleUrlKey || JSON.parse(row.record_json).article.id === article.id);
  }
  findMatchingEvent(article, analysis) {
    const rows = this.database.prepare("SELECT record_json, event_fingerprint FROM geopolitical_monitor_results ORDER BY detected_at ASC").all();
    for (const row of rows) {
      const record = JSON.parse(row.record_json);
      if (analysis ? eventMatches(article, analysis, record, row.event_fingerprint) : rawArticleMatches(article, record)) return record;
    }
    return void 0;
  }
  markProcessed(article, eventId, duplicateOf, eventFingerprint) {
    const articleUrlKey = article.url ? canonicalArticleUrlForDedup(article.url) : null;
    const articleFingerprint = buildArticleFingerprint(articleInputFor(article));
    this.database.prepare(`
      INSERT INTO geopolitical_monitor_processed(article_id, event_id, processed_at, duplicate_of, event_fingerprint, article_fingerprint, article_url_key)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(article_id) DO UPDATE SET
        event_id = excluded.event_id,
        processed_at = excluded.processed_at,
        duplicate_of = COALESCE(excluded.duplicate_of, geopolitical_monitor_processed.duplicate_of),
        event_fingerprint = COALESCE(excluded.event_fingerprint, geopolitical_monitor_processed.event_fingerprint),
        article_fingerprint = COALESCE(excluded.article_fingerprint, geopolitical_monitor_processed.article_fingerprint),
        article_url_key = COALESCE(excluded.article_url_key, geopolitical_monitor_processed.article_url_key)
    `).run(article.id, eventId, (/* @__PURE__ */ new Date()).toISOString(), duplicateOf || null, eventFingerprint || null, articleFingerprint, articleUrlKey);
  }
  updateStoredRecord(articleId, record, articleFingerprint, eventFingerprint) {
    const articleUrlKey = record.article.url ? canonicalArticleUrlForDedup(record.article.url) : null;
    this.database.prepare(`UPDATE geopolitical_monitor_results SET title = ?, source = ?, source_url = ?, event_id = ?, event_fingerprint = ?, article_fingerprint = ?, article_url_key = ?, relevant = ?, risk_level = ?, risk_score = ?, record_json = ? WHERE article_id = ?`).run(
      record.article.title,
      record.article.source,
      record.article.url || null,
      record.analysis.event.id,
      eventFingerprint,
      articleFingerprint,
      articleUrlKey,
      isEnergySupplyChainRelevant2(record.analysis) ? 1 : 0,
      record.analysis.risk.riskLevel,
      record.analysis.risk.riskScore,
      JSON.stringify(record),
      articleId
    );
  }
  mergeIntoExisting(existing, incoming, eventFingerprint) {
    const merged = {
      ...existing,
      article: mergeArticleMetadata(existing.article, incoming)
    };
    this.updateStoredRecord(
      existing.article.id,
      merged,
      buildArticleFingerprint(articleInputFor(merged.article)),
      eventFingerprint || eventFingerprintFor(existing.article, existing.analysis)
    );
    return merged;
  }
  saveRecord(record, articleFingerprint, eventFingerprint) {
    const articleUrlKey = record.article.url ? canonicalArticleUrlForDedup(record.article.url) : null;
    this.database.prepare(`INSERT INTO geopolitical_monitor_results(article_id, detected_at, title, source, source_url, event_id, event_fingerprint, article_fingerprint, article_url_key, relevant, risk_level, risk_score, record_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.article.id,
      record.detectedAt,
      record.article.title,
      record.article.source,
      record.article.url || null,
      record.analysis.event.id,
      eventFingerprint,
      articleFingerprint,
      articleUrlKey,
      isEnergySupplyChainRelevant2(record.analysis) ? 1 : 0,
      record.analysis.risk.riskLevel,
      record.analysis.risk.riskScore,
      JSON.stringify(record)
    );
    this.markProcessed(record.article, record.analysis.event.id, void 0, eventFingerprint);
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

// src/scenarios/scenario-node-catalog.ts
var SCENARIO_SELECTABLE_NODE_TYPES = [
  "chokepoint",
  "port",
  "refinery",
  "shipping_route",
  "strategic_reserve",
  "supplier"
];
var nodeTypeOrder = new Map(
  SCENARIO_SELECTABLE_NODE_TYPES.map((nodeType, index) => [
    nodeType,
    index
  ])
);
var emptyTypeCounts = () => Object.fromEntries(
  SCENARIO_SELECTABLE_NODE_TYPES.map((nodeType) => [nodeType, 0])
);
var buildScenarioNodeList = (graph, baselineProvider) => {
  const eligibleTypes = new Set(SCENARIO_SELECTABLE_NODE_TYPES);
  const nodes = graph.nodes.filter(
    (node) => eligibleTypes.has(node.nodeType) && node.nodeId.trim().length > 0 && node.name.trim().length > 0
  ).filter(
    (node) => baselineProvider.getBaseline(
      {
        eventId: `scenario-node-catalog:${node.nodeId}`,
        durationDays: 1,
        severity: "LOW",
        affectedNodeId: node.nodeId,
        capacityReductionPercent: 100
      },
      { graph }
    ) !== null
  ).sort((left, right) => {
    const typeDifference = (nodeTypeOrder.get(left.nodeType) ?? Number.MAX_SAFE_INTEGER) - (nodeTypeOrder.get(right.nodeType) ?? Number.MAX_SAFE_INTEGER);
    if (typeDifference !== 0) return typeDifference;
    const nameDifference = left.name.localeCompare(right.name);
    return nameDifference !== 0 ? nameDifference : left.nodeId.localeCompare(right.nodeId);
  }).map((node) => ({
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    name: node.name,
    operationalState: node.operationalState,
    capacity: node.capacity ? { ...node.capacity } : null,
    metadata: { ...node.metadata }
  }));
  const byType = emptyTypeCounts();
  for (const node of nodes) byType[node.nodeType] += 1;
  return {
    status: "AVAILABLE",
    nodes,
    totals: {
      total: nodes.length,
      nodeCount: nodes.length
    },
    typeCounts: byType
  };
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
      return null;
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
var isRecord4 = (value) => typeof value === "object" && value !== null;
var isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
var nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var addIssue = (issues, path3, message) => {
  issues.push({ path: path3, message });
};
var validateProcurementRequest = (input) => {
  const issues = [];
  if (!isRecord4(input)) {
    return {
      valid: false,
      issues: [{ path: "request", message: "A procurement request is required." }]
    };
  }
  const request = input;
  const supplyGap = request.supplyGap;
  if (!isRecord4(supplyGap)) {
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
  const supplierUnit = isRecord4(supplyGap) && typeof supplyGap.unit === "string" ? supplyGap.unit : null;
  if (Array.isArray(request.suppliers)) {
    request.suppliers.forEach((supplier, index) => {
      const path3 = `suppliers[${index}]`;
      if (!isRecord4(supplier)) {
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
      if (!isRecord4(route)) {
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
      if (!isRecord4(lane)) {
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
    ...isRecord4(providedWeights) ? providedWeights : {}
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

// src/procurement/scenario-adapter.ts
var buildProcurementRequestFromScenario = (scenario, graph, provider) => {
  const dataResolution = provider.resolve({ scenario, graph });
  if (dataResolution.status === "UNAVAILABLE") {
    return dataResolution;
  }
  return {
    status: "AVAILABLE",
    source: dataResolution.data.source,
    request: {
      supplyGap: {
        quantity: scenario.shortage,
        unit: scenario.shortageUnit
      },
      suppliers: dataResolution.data.suppliers,
      routes: dataResolution.data.routes,
      lanes: dataResolution.data.lanes
    }
  };
};
var hasFiniteMeasurement = (value, unit) => typeof value === "number" && Number.isFinite(value) && typeof unit === "string" && unit.trim().length > 0;
var SqliteScenarioProcurementDataProvider = class {
  constructor(repository) {
    this.repository = repository;
  }
  resolve({ scenario, graph }) {
    const supplierRows = this.repository.getSuppliers({ page: 1, pageSize: 1 });
    const routeRows = this.repository.getLanes({ page: 1, pageSize: 1 });
    const sourceBackedSupplier = graph.nodes.some(
      (node) => node.nodeType === "supplier" && hasFiniteMeasurement(node.currentFlow?.value, node.currentFlow?.unit)
    );
    const sourceBackedRoute = graph.nodes.some(
      (node) => node.nodeType === "shipping_route" && (hasFiniteMeasurement(node.capacity?.value, node.capacity?.unit) || hasFiniteMeasurement(node.currentFlow?.value, node.currentFlow?.unit))
    );
    const sourceSummary = `Phase 2 SQLite has ${supplierRows.pagination.total} supplier import rows and ${routeRows.pagination.total} shipping-lane geometry rows for scenario unit '${scenario.shortageUnit}'.`;
    if (!sourceBackedSupplier || !sourceBackedRoute) {
      return {
        status: "UNAVAILABLE",
        source: "Phase 2 SQLite / Digital Twin",
        reason: `${sourceSummary} It does not verify a unit-compatible supplier capacity, route capacity, and supplier-route procurement attributes (cost, transit time, risk, and reliability).`
      };
    }
    return {
      status: "UNAVAILABLE",
      source: "Phase 2 SQLite / Digital Twin",
      reason: `${sourceSummary} Source-backed measurements exist, but no verified supplier-route lane can be constructed without incompatible-unit conversion or inferred capacity.`
    };
  }
};

// src/procurement/demo-scenario-provider.ts
var DemoScenarioProcurementDataProvider = class {
  resolve({ scenario }) {
    const gap = Math.max(0, scenario.shortage);
    const unit = scenario.shortageUnit;
    return {
      status: "AVAILABLE",
      data: {
        source: "Demo procurement data (deterministic fixture; not live data)",
        suppliers: [
          {
            supplierId: "demo-supplier-a",
            name: "Demo Supplier A",
            capacity: gap * 0.65,
            capacityUnit: unit
          },
          {
            supplierId: "demo-supplier-b",
            name: "Demo Supplier B",
            capacity: gap * 0.55,
            capacityUnit: unit
          }
        ],
        routes: [
          {
            routeId: "demo-route-west",
            name: "Demo Western Route",
            capacity: gap * 0.75,
            capacityUnit: unit
          },
          {
            routeId: "demo-route-east",
            name: "Demo Eastern Route",
            capacity: gap * 0.75,
            capacityUnit: unit
          }
        ],
        lanes: [
          {
            laneId: "demo-lane-a-west",
            supplierId: "demo-supplier-a",
            routeId: "demo-route-west",
            compatible: true,
            procurementCostPerUnit: 72,
            procurementCostUnit: "demo_cost_per_unit",
            transitTimeDays: 6,
            riskScore: 18,
            reliabilityScore: 0.92
          },
          {
            laneId: "demo-lane-a-east",
            supplierId: "demo-supplier-a",
            routeId: "demo-route-east",
            compatible: true,
            procurementCostPerUnit: 68,
            procurementCostUnit: "demo_cost_per_unit",
            transitTimeDays: 9,
            riskScore: 28,
            reliabilityScore: 0.89
          },
          {
            laneId: "demo-lane-b-west",
            supplierId: "demo-supplier-b",
            routeId: "demo-route-west",
            compatible: true,
            procurementCostPerUnit: 61,
            procurementCostUnit: "demo_cost_per_unit",
            transitTimeDays: 8,
            riskScore: 35,
            reliabilityScore: 0.84
          },
          {
            laneId: "demo-lane-b-east",
            supplierId: "demo-supplier-b",
            routeId: "demo-route-east",
            compatible: true,
            procurementCostPerUnit: 64,
            procurementCostUnit: "demo_cost_per_unit",
            transitTimeDays: 7,
            riskScore: 22,
            reliabilityScore: 0.9
          }
        ]
      }
    };
  }
};

// src/reserves/optimizer.ts
var INPUT_FIELDS = [
  "currentReserve",
  "demand",
  "supplyGap",
  "disruptionDuration",
  "alternativeProcurement",
  "replenishmentRate",
  "minimumReserveThreshold"
];
var validateStrategicReserveInput = (value) => {
  if (!value || typeof value !== "object") {
    return {
      valid: false,
      issues: [{ path: "request", message: "A strategic reserve request is required." }]
    };
  }
  const candidate = value;
  const issues = INPUT_FIELDS.flatMap((field) => {
    const fieldValue = candidate[field];
    if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) {
      return [{ path: field, message: "Value must be a finite number." }];
    }
    if (fieldValue < 0) {
      return [{ path: field, message: "Value must be non-negative." }];
    }
    return [];
  });
  if (issues.length > 0) return { valid: false, issues };
  return {
    valid: true,
    issues: [],
    input: candidate
  };
};
var optimizeStrategicReserve = (input) => {
  const validation = validateStrategicReserveInput(input);
  if (!validation.valid || !validation.input) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" ")
    );
  }
  const normalized = validation.input;
  const effectiveGap = Math.max(
    0,
    normalized.supplyGap - normalized.alternativeProcurement
  );
  const totalNeed = effectiveGap * normalized.disruptionDuration;
  const safeAvailableReserve = Math.max(
    0,
    normalized.currentReserve - normalized.minimumReserveThreshold
  );
  const drawdownAmount = Math.min(totalNeed, safeAvailableReserve);
  const remainingReserve = normalized.currentReserve - drawdownAmount;
  const shortfall = Math.max(0, totalNeed - drawdownAmount);
  const fullyCovered = shortfall === 0;
  return {
    effectiveGap,
    totalNeed,
    safeAvailableReserve,
    drawdownAmount,
    drawdownRate: normalized.disruptionDuration === 0 ? 0 : drawdownAmount / normalized.disruptionDuration,
    duration: normalized.disruptionDuration,
    durationUnit: "days",
    remainingReserve,
    replenishmentRequirement: Math.max(0, drawdownAmount),
    shortfall,
    fullyCovered,
    coverageStatus: effectiveGap === 0 ? "NO_EFFECTIVE_GAP" : fullyCovered ? "FULLY_COVERED" : safeAvailableReserve === 0 && normalized.currentReserve < normalized.minimumReserveThreshold ? "RESERVE_BELOW_THRESHOLD" : "PARTIALLY_COVERED"
  };
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
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
};
var queryBoolean = (request, name) => {
  const text2 = queryText(request, name)?.toLowerCase();
  if (text2 === "true") return true;
  if (text2 === "false") return false;
  return void 0;
};
var listOptions = (request, defaultPageSize = 50) => ({
  page: queryInteger(
    request,
    "page",
    1,
    1,
    1e5
  ),
  pageSize: queryInteger(
    request,
    "pageSize",
    defaultPageSize,
    1,
    1e3
  )
});
var dateQuery = (request, name) => {
  const text2 = queryText(request, name);
  return text2 && /^\d{4}-\d{2}-\d{2}$/.test(text2) ? text2 : void 0;
};
var handlePhase2Error = (response, error) => {
  console.error(
    "[ORBIT Phase 2] Data query failed:",
    error
  );
  response.status(500).json({
    status: "ERROR",
    error: "Phase 2 data query failed."
  });
};
var handleDigitalTwinError = (response, error) => {
  const message = error instanceof Error ? error.message : "Digital Twin request failed.";
  const statusCode = message.includes("not found") ? 404 : message.includes("not disrupted or blocked") ? 409 : 400;
  response.status(statusCode).json({
    status: "ERROR",
    error: message
  });
};
var handleGeopoliticalAgentError = (response, error) => {
  const message = error instanceof Error ? error.message : "Geopolitical risk agent request failed.";
  if (error instanceof GroqRateLimitError) {
    response.status(429).json({
      status: "ERROR",
      code: "GROQ_RATE_LIMITED",
      error: message,
      retryAfterMs: error.retryAfterMs,
      retryAt: error.retryAt
    });
    return;
  }
  const statusCode = error instanceof GroqConfigurationError ? 503 : error instanceof GroqServiceError ? 502 : message.includes("Invalid geopolitical event") || message.includes("request is required") ? 400 : 500;
  response.status(statusCode).json({
    status: "ERROR",
    error: message
  });
};
var handleMonitoringError = (response, error) => {
  const message = error instanceof Error ? error.message : "Geopolitical monitoring request failed.";
  if (error instanceof GroqRateLimitError) {
    response.status(429).json({
      status: "ERROR",
      code: "GROQ_RATE_LIMITED",
      error: message,
      retryAfterMs: error.retryAfterMs,
      retryAt: error.retryAt
    });
    return;
  }
  if (error instanceof ExternalCandidateBudgetExceededError) {
    response.status(429).json({
      status: "ERROR",
      code: "EXTERNAL_CANDIDATE_BUDGET_EXCEEDED",
      error: message,
      maxCandidates: error.maxCandidates
    });
    return;
  }
  const statusCode = error instanceof DuplicateMonitoredEventError ? 409 : error instanceof IrrelevantMonitoringCandidateError ? 422 : message.includes("required") || message.includes("invalid") ? 400 : 502;
  response.status(statusCode).json({
    status: "ERROR",
    error: message
  });
};
var handleMonitoringRefreshError = (response, error) => {
  const message = error instanceof Error ? error.message : "External monitoring refresh failed.";
  const statusCode = error instanceof MonitoringRefreshConfigurationError ? 503 : error instanceof MonitoringRefreshTriggerError ? 502 : 500;
  response.status(statusCode).json({ status: "ERROR", error: message });
};
var parseScenarioInput = (body) => {
  const candidate = body;
  if (typeof candidate?.eventId !== "string" || !candidate.eventId.trim()) {
    return { error: "eventId is required." };
  }
  if (typeof candidate.durationDays !== "number" || !Number.isFinite(candidate.durationDays) || candidate.durationDays <= 0) {
    return {
      error: "durationDays must be greater than zero."
    };
  }
  if (candidate.severity !== "LOW" && candidate.severity !== "MEDIUM" && candidate.severity !== "HIGH" && candidate.severity !== "CRITICAL") {
    return {
      error: "severity must be LOW, MEDIUM, HIGH, or CRITICAL."
    };
  }
  if (typeof candidate.affectedNodeId !== "string" || !candidate.affectedNodeId.trim()) {
    return { error: "affectedNodeId is required." };
  }
  if (typeof candidate.capacityReductionPercent !== "number" || !Number.isFinite(candidate.capacityReductionPercent) || candidate.capacityReductionPercent < 0 || candidate.capacityReductionPercent > 100) {
    return {
      error: "capacityReductionPercent must be between 0 and 100."
    };
  }
  return {
    input: {
      eventId: candidate.eventId.trim(),
      durationDays: candidate.durationDays,
      severity: candidate.severity,
      affectedNodeId: candidate.affectedNodeId.trim(),
      capacityReductionPercent: candidate.capacityReductionPercent
    }
  };
};
var parseScenarioReserveAnalysis = (body) => {
  if (!body || typeof body !== "object" || !("reserveAnalysis" in body)) {
    return void 0;
  }
  const candidate = body.reserveAnalysis;
  if (!candidate || typeof candidate !== "object") {
    return { error: "reserveAnalysis must be an object." };
  }
  const value = candidate;
  const fields = [
    "currentReserve",
    "demand",
    "replenishmentRate",
    "minimumReserveThreshold"
  ];
  for (const field of fields) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field]) || value[field] < 0) {
      return {
        error: `reserveAnalysis.${field} must be a finite, non-negative number.`
      };
    }
  }
  return { config: value };
};
var readStateUpdate = (request) => {
  const body = request.body;
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
  if (!nodeId) {
    return {
      error: "nodeId is required."
    };
  }
  if (!isOperationalState(body?.state)) {
    return {
      error: "state must be one of: operational, reduced, disrupted, blocked."
    };
  }
  return {
    nodeId,
    state: body.state
  };
};
var stateSummary = (nodes) => {
  const counts = {
    operational: 0,
    reduced: 0,
    disrupted: 0,
    blocked: 0
  };
  for (const node of nodes) {
    counts[node.operationalState] = (counts[node.operationalState] || 0) + 1;
  }
  return {
    nodeCount: nodes.length,
    byState: counts
  };
};
var createApp = (repository, digitalTwin = createDigitalTwinRuntime(repository), geopoliticalRiskAgent = createGeopoliticalRiskIntelligenceAgent(
  digitalTwin,
  createGroqAgentProvider()
), monitoring, scenarioProcurementDataProvider) => {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  const scenarioBaselineProvider = new SqliteScenarioBaselineProvider(repository);
  const scenarioEngine = new ScenarioEngine(
    scenarioBaselineProvider
  );
  const procurementDataProvider = scenarioProcurementDataProvider ?? new SqliteScenarioProcurementDataProvider(repository);
  const demoProcurementDataProvider = new DemoScenarioProcurementDataProvider();
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
      response.json(
        await fetchGoogleNews()
      );
    } catch (error) {
      console.error(
        "[ORBIT News] Ingestion failed unexpectedly:",
        error
      );
      response.json({
        status: "ERROR",
        source: "Google News RSS",
        retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
        count: 0,
        articles: []
      });
    }
  });
  app.post(
    "/api/geopolitical-risk/agent",
    async (request, response) => {
      const body = request.body;
      if (typeof body?.request !== "string" || !body.request.trim()) {
        response.status(400).json({
          status: "ERROR",
          error: "request is required."
        });
        return;
      }
      try {
        response.json({
          status: "AVAILABLE",
          ...await geopoliticalRiskAgent.analyze(
            body.request
          )
        });
      } catch (error) {
        handleGeopoliticalAgentError(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/geopolitical-risk/monitor/status",
    (_request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      response.json({
        status: "AVAILABLE",
        monitoring: monitoring.getStatus()
      });
    }
  );
  app.post(
    "/api/geopolitical-risk/monitor/refresh",
    async (_request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      try {
        const refresh = await monitoring.triggerExternalRefresh();
        response.status(202).json({ status: "TRIGGERED", refresh });
      } catch (error) {
        handleMonitoringRefreshError(response, error);
      }
    }
  );
  app.post(
    "/api/geopolitical-risk/monitor/scans",
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      try {
        const scan = monitoring.recordExternalScan(request.body);
        response.status(201).json({ status: "AVAILABLE", scan });
      } catch (error) {
        handleMonitoringError(response, error);
      }
    }
  );
  app.get(
    "/api/geopolitical-risk/monitor/events",
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      const limit = queryInteger(
        request,
        "limit",
        50,
        1,
        200
      ) || 50;
      const events = monitoring.getEvents(limit);
      response.json({
        status: "AVAILABLE",
        count: events.length,
        events
      });
    }
  );
  app.get(
    "/api/geopolitical-risk/monitor/alerts",
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      const limit = queryInteger(
        request,
        "limit",
        50,
        1,
        200
      ) || 50;
      const alerts = monitoring.getAlerts(limit);
      response.json({
        status: "AVAILABLE",
        count: alerts.length,
        alerts
      });
    }
  );
  app.get(
    "/api/geopolitical-risk/monitor/relevant-events",
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      const limit = queryInteger(
        request,
        "limit",
        50,
        1,
        200
      ) || 50;
      const events = monitoring.getRelevantEvents(limit);
      response.json({
        status: "AVAILABLE",
        count: events.length,
        events
      });
    }
  );
  app.get(
    "/api/geopolitical-risk/monitor/alerts/high",
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      const limit = queryInteger(
        request,
        "limit",
        50,
        1,
        200
      ) || 50;
      const alerts = monitoring.getHighRiskAlerts(limit);
      response.json({
        status: "AVAILABLE",
        count: alerts.length,
        alerts
      });
    }
  );
  app.get(
    "/api/geopolitical-risk/monitor/alerts/critical",
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      const limit = queryInteger(
        request,
        "limit",
        50,
        1,
        200
      ) || 50;
      const alerts = monitoring.getCriticalAlerts(limit);
      response.json({
        status: "AVAILABLE",
        count: alerts.length,
        alerts
      });
    }
  );
  app.post(
    "/api/geopolitical-risk/monitor/events",
    async (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: "ERROR",
          error: "Geopolitical monitoring is not configured."
        });
        return;
      }
      try {
        const record = await monitoring.ingestExternal(
          request.body
        );
        response.status(201).json({
          status: "AVAILABLE",
          event: record,
          alert: record.alertLevel === "high" || record.alertLevel === "critical"
        });
      } catch (error) {
        handleMonitoringError(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/scenarios/nodes",
    (_request, response) => {
      try {
        const nodeList = buildScenarioNodeList(
          digitalTwin.stateEngine.getCurrentTwin(),
          scenarioBaselineProvider
        );
        response.json(nodeList);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Scenario node list unavailable.";
        response.status(500).json({
          status: "ERROR",
          error: message
        });
      }
    }
  );
  app.post(
    "/api/scenarios/simulate",
    (request, response) => {
      const body = request.body;
      if (typeof body?.eventId !== "string" || !body.eventId.trim()) {
        response.status(400).json({
          status: "ERROR",
          error: "eventId is required."
        });
        return;
      }
      if (typeof body.durationDays !== "number" || !Number.isFinite(body.durationDays) || body.durationDays <= 0) {
        response.status(400).json({
          status: "ERROR",
          error: "durationDays must be greater than zero."
        });
        return;
      }
      if (body.severity !== "LOW" && body.severity !== "MEDIUM" && body.severity !== "HIGH" && body.severity !== "CRITICAL") {
        response.status(400).json({
          status: "ERROR",
          error: "severity must be LOW, MEDIUM, HIGH, or CRITICAL."
        });
        return;
      }
      if (typeof body.affectedNodeId !== "string" || !body.affectedNodeId.trim()) {
        response.status(400).json({
          status: "ERROR",
          error: "affectedNodeId is required."
        });
        return;
      }
      if (typeof body.capacityReductionPercent !== "number" || !Number.isFinite(
        body.capacityReductionPercent
      ) || body.capacityReductionPercent < 0 || body.capacityReductionPercent > 100) {
        response.status(400).json({
          status: "ERROR",
          error: "capacityReductionPercent must be between 0 and 100."
        });
        return;
      }
      const reserveAnalysis = parseScenarioReserveAnalysis(request.body);
      if (reserveAnalysis && "error" in reserveAnalysis) {
        response.status(400).json({
          status: "ERROR",
          error: reserveAnalysis.error
        });
        return;
      }
      const reserveConfig = reserveAnalysis && "config" in reserveAnalysis ? reserveAnalysis.config : void 0;
      try {
        const input = {
          eventId: body.eventId.trim(),
          durationDays: body.durationDays,
          severity: body.severity,
          affectedNodeId: body.affectedNodeId.trim(),
          capacityReductionPercent: body.capacityReductionPercent
        };
        const result = scenarioEngine.run(
          digitalTwin.stateEngine,
          input
        );
        const reserveOptimization = reserveConfig ? (() => {
          if (result.shortageUnit === "unavailable") {
            return {
              status: "UNAVAILABLE",
              error: "Strategic reserve analysis is unavailable because the scenario supply gap is not verified."
            };
          }
          const reserveInput = {
            ...reserveConfig,
            supplyGap: result.shortage,
            disruptionDuration: result.input.durationDays,
            alternativeProcurement: result.alternativeCapacity
          };
          const reserve = optimizeStrategicReserve(reserveInput);
          repository.saveStrategicReserveOptimization(
            reserveInput,
            reserve
          );
          return { status: "AVAILABLE", reserve };
        })() : void 0;
        response.json({
          status: "AVAILABLE",
          scenario: result,
          ...reserveOptimization ? { reserveOptimization } : {}
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Scenario simulation failed.";
        const statusCode = message.includes("not found") ? 404 : message.includes("required") || message.includes("must be") || message.includes("between") ? 400 : 500;
        response.status(statusCode).json({
          status: "ERROR",
          error: message
        });
      }
    }
  );
  app.post(
    "/api/reserves/optimize",
    (request, response) => {
      const validation = validateStrategicReserveInput(request.body);
      if (!validation.valid || !validation.input) {
        response.status(400).json({
          status: "ERROR",
          error: "Invalid strategic reserve optimization request.",
          issues: validation.issues
        });
        return;
      }
      try {
        const reserve = optimizeStrategicReserve(validation.input);
        repository.saveStrategicReserveOptimization(
          validation.input,
          reserve
        );
        response.json({
          status: "AVAILABLE",
          reserve
        });
      } catch (error) {
        console.error(
          "[ORBIT Strategic Reserve] Optimization failed:",
          error
        );
        response.status(500).json({
          status: "ERROR",
          error: "Strategic reserve optimization failed."
        });
      }
    }
  );
  app.post(
    "/api/scenarios/procurement",
    async (request, response) => {
      const parsedInput = parseScenarioInput(request.body);
      if ("error" in parsedInput) {
        response.status(400).json({
          status: "ERROR",
          error: parsedInput.error
        });
        return;
      }
      try {
        const scenario = scenarioEngine.run(
          digitalTwin.stateEngine,
          parsedInput.input
        );
        const resolution = buildProcurementRequestFromScenario(
          scenario,
          digitalTwin.stateEngine.getCurrentTwin(),
          request.query.dataSource === "demo" ? demoProcurementDataProvider : procurementDataProvider
        );
        if (resolution.status === "UNAVAILABLE" || !resolution.request) {
          response.status(422).json({
            status: "UNAVAILABLE",
            error: resolution.reason || "Procurement data is unavailable.",
            source: resolution.source,
            scenario
          });
          return;
        }
        const procurement = await optimizeProcurement(
          resolution.request
        );
        if (procurement.status === "INFEASIBLE") {
          response.status(200).json({
            status: "INFEASIBLE",
            scenario,
            procurement,
            source: resolution.source
          });
          return;
        }
        if (procurement.status === "OPTIMAL") {
          response.status(200).json({
            status: "OPTIMAL",
            scenario,
            procurement,
            source: resolution.source
          });
          return;
        }
        console.error(
          "[ORBIT Scenario Procurement] Optimization returned an internal error:",
          procurement.error
        );
        response.status(500).json({
          status: "ERROR",
          error: "Scenario procurement optimization failed."
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Scenario procurement integration failed.";
        const statusCode = message.includes("not found") ? 404 : 500;
        console.error(
          "[ORBIT Scenario Procurement] Integration failed:",
          error
        );
        response.status(statusCode).json({
          status: "ERROR",
          error: message
        });
      }
    }
  );
  app.post(
    "/api/procurement/optimize",
    async (request, response) => {
      const validation = validateProcurementRequest(request.body);
      if (!validation.valid || !validation.request) {
        response.status(400).json({
          status: "ERROR",
          error: "Invalid procurement request.",
          issues: validation.issues
        });
        return;
      }
      try {
        const result = await optimizeProcurement(validation.request);
        if (result.status === "INFEASIBLE") {
          response.status(200).json({
            status: "INFEASIBLE",
            procurement: result
          });
          return;
        }
        if (result.status === "OPTIMAL") {
          response.status(200).json({
            status: "OPTIMAL",
            procurement: result
          });
          return;
        }
        console.error(
          "[ORBIT Procurement] Optimization returned an internal error:",
          result.error
        );
        response.status(500).json({
          status: "ERROR",
          error: "Procurement optimization failed."
        });
      } catch (error) {
        console.error(
          "[ORBIT Procurement] Optimization failed unexpectedly:",
          error
        );
        response.status(500).json({
          status: "ERROR",
          error: "Procurement optimization failed unexpectedly."
        });
      }
    }
  );
  app.get(
    "/api/digital-twin",
    (_request, response) => {
      try {
        const graph = digitalTwin.stateEngine.getCurrentTwin();
        response.json({
          status: "AVAILABLE",
          graph
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/digital-twin/state/:nodeId",
    (request, response) => {
      try {
        response.json({
          status: "AVAILABLE",
          state: digitalTwin.stateEngine.getCurrentNodeState(
            request.params.nodeId
          )
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error
        );
      }
    }
  );
  app.post(
    "/api/digital-twin/state",
    (request, response) => {
      const update = readStateUpdate(request);
      if ("error" in update) {
        response.status(400).json({
          status: "ERROR",
          error: update.error
        });
        return;
      }
      try {
        response.json({
          status: "AVAILABLE",
          state: digitalTwin.stateEngine.updateNodeState(
            update.nodeId,
            update.state
          )
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error
        );
      }
    }
  );
  app.post(
    "/api/digital-twin/reset",
    (_request, response) => {
      try {
        const graph = digitalTwin.stateEngine.resetToBaseline();
        response.json({
          status: "AVAILABLE",
          graph,
          summary: stateSummary(
            graph.nodes
          )
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error
        );
      }
    }
  );
  app.post(
    "/api/digital-twin/impact",
    (request, response) => {
      const body = request.body;
      const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
      if (!nodeId) {
        response.status(400).json({
          status: "ERROR",
          error: "nodeId is required."
        });
        return;
      }
      try {
        response.json({
          status: "AVAILABLE",
          impact: digitalTwin.impactAnalyzer.analyzeNode(
            nodeId
          )
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/countries",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          search: queryText(
            request,
            "search"
          ),
          mappingStatus: queryText(
            request,
            "mappingStatus"
          )
        };
        response.json(
          repository.getCountries(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/ports",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          search: queryText(
            request,
            "search"
          ),
          mappingStatus: queryText(
            request,
            "mappingStatus"
          )
        };
        response.json(
          repository.getPorts(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/refineries",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          search: queryText(
            request,
            "search"
          ),
          company: queryText(
            request,
            "company"
          ),
          state: queryText(
            request,
            "state"
          ),
          hasCoordinates: queryBoolean(
            request,
            "hasCoordinates"
          )
        };
        response.json(
          repository.getRefineries(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/suppliers",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          financialYear: queryText(
            request,
            "financialYear"
          ),
          countryId: queryText(
            request,
            "countryId"
          ),
          country: queryText(
            request,
            "country"
          )
        };
        response.json(
          repository.getSuppliers(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/imports/crude",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          financialYear: queryText(
            request,
            "financialYear"
          )
        };
        response.json(
          repository.getCrudeImports(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/imports/crude/totals",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          financialYear: queryText(
            request,
            "financialYear"
          )
        };
        response.json(
          repository.getCrudeImportTotals(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/consumption",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          financialYear: queryText(
            request,
            "financialYear"
          ),
          product: queryText(
            request,
            "product"
          ),
          productId: queryText(
            request,
            "productId"
          ),
          month: queryInteger(
            request,
            "month",
            void 0,
            1,
            12
          )
        };
        response.json(
          repository.getConsumption(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/global-oil",
    (request, response) => {
      try {
        const query = {
          ...listOptions(request),
          country: queryText(
            request,
            "country"
          ),
          countryId: queryText(
            request,
            "country_id"
          ) || queryText(
            request,
            "countryId"
          )
        };
        response.json(
          repository.getGlobalOil(query)
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/lanes",
    (request, response) => {
      try {
        response.json(
          repository.getLanes({
            ...listOptions(request),
            category: queryText(
              request,
              "category"
            )
          })
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  app.get(
    "/api/phase2/chokepoints",
    (request, response) => {
      try {
        response.json(
          repository.getChokepoints(
            listOptions(request)
          )
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  const portActivityHandler = (request, response) => {
    try {
      const query = {
        ...listOptions(
          request,
          100
        ),
        portId: queryText(
          request,
          "portId"
        ),
        year: queryInteger(
          request,
          "year",
          void 0,
          1900,
          2200
        ),
        from: dateQuery(
          request,
          "from"
        ),
        to: dateQuery(
          request,
          "to"
        )
      };
      response.json(
        repository.getPortActivity(
          query
        )
      );
    } catch (error) {
      handlePhase2Error(
        response,
        error
      );
    }
  };
  app.get(
    "/api/phase2/port-activity",
    portActivityHandler
  );
  app.get(
    "/api/phase2/daily-port-activity",
    portActivityHandler
  );
  app.get(
    "/api/phase2/data-quality",
    (request, response) => {
      try {
        response.json(
          repository.getDataQuality({
            ...listOptions(request),
            issueType: queryText(
              request,
              "issueType"
            ),
            severity: queryText(
              request,
              "severity"
            ),
            status: queryText(
              request,
              "status"
            )
          })
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error
        );
      }
    }
  );
  return app;
};
async function startServer() {
  const database = openPhase2Database();
  const repository = new Phase2Repository(
    database
  );
  const digitalTwin = createDigitalTwinRuntime(
    repository
  );
  const geopoliticalRiskAgent = createGeopoliticalRiskIntelligenceAgent(
    digitalTwin,
    createGroqAgentProvider()
  );
  const newsGroqProvider = createGroqNewsProvider();
  const monitoring = new GeopoliticalMonitoringService(
    database,
    geopoliticalRiskAgent,
    {},
    void 0,
    void 0,
    {
      runtime: digitalTwin,
      newsProvider: newsGroqProvider
    }
  );
  const app = createApp(
    repository,
    digitalTwin,
    geopoliticalRiskAgent,
    monitoring
  );
  monitoring.start();
  const PORT = 3e3;
  const isProduction = process.env.NODE_ENV === "production" || process.argv.includes(
    "--production"
  );
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT
      },
      appType: "spa"
    });
    app.use(
      vite.middlewares
    );
  } else {
    const distPath = import_node_path2.default.join(
      process.cwd(),
      "dist"
    );
    app.use(
      import_express.default.static(
        distPath
      )
    );
    app.get(
      "*",
      (_request, response) => {
        response.sendFile(
          import_node_path2.default.join(
            distPath,
            "index.html"
          )
        );
      }
    );
  }
  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `[ORBIT Core] Server running on http://0.0.0.0:${PORT}`
      );
      console.log(
        `[ORBIT Phase 2] Data layer status: ${repository.getStatus()}`
      );
    }
  );
}
var isServerEntry = process.env.ORBIT_START_SERVER === "true" || process.argv.includes(
  "--production"
) || /[\\/]server\.(ts|js)$/.test(
  process.argv[1] || ""
);
if (isServerEntry) {
  startServer().catch(
    (error) => {
      console.error(
        "[ORBIT Core] Failed to start server:",
        error
      );
      process.exit(1);
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp,
  startServer
});
