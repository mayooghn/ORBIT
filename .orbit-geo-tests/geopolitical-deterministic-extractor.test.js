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

// tests/geopolitical-deterministic-extractor.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_test = __toESM(require("node:test"), 1);

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

// src/geopoliticalEvents/deterministicExtractor.ts
var import_node_crypto = require("node:crypto");

// src/services/dataIngestion/googleNews.ts
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

// src/geopoliticalEvents/deterministicExtractor.ts
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
var phraseMatches = (phrase, text) => {
  const normalizedPhrase = normalizeText(phrase);
  const normalizedText = normalizeText(text);
  if (!normalizedPhrase || !normalizedText) return false;
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
};
var textValue = (value) => typeof value === "string" ? value.trim() : "";
var articleText = (article2) => [
  textValue(article2.title),
  textValue(article2.description),
  textValue(article2.content)
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
var stableEventId = (article2, title, source, timestamp) => {
  const url = textValue(article2.url) || textValue(article2.sourceUrl);
  const identity = `${canonicalArticleUrlForDedup(url)}
${normalizeText(title)}
${source}
${timestamp}`;
  return `event-${(0, import_node_crypto.createHash)("sha256").update(identity, "utf8").digest("hex").slice(0, 24)}`;
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
var buildCountryCandidates = (graph2) => {
  const candidates = /* @__PURE__ */ new Map();
  for (const node of graph2.nodes) {
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
var findNodeMatches = (graph2, text) => graph2.nodes.flatMap((node) => {
  const alias = nodeAliases(node).find((candidate) => phraseMatches(candidate, text));
  return alias ? [{ node, alias }] : [];
}).sort((left, right) => left.node.nodeId.localeCompare(right.node.nodeId));
var findRegionMatches = (text) => KNOWN_REGIONS.filter((region) => region.pattern.test(text)).map((region) => ({ name: region.name, evidence: `known geographic signal matched "${region.name}".` }));
var findCountries = (graph2, text) => buildCountryCandidates(graph2).filter((candidate) => candidate.aliases.some((alias) => phraseMatches(alias, text)));
var matchingRule = (text) => {
  const maritime = EVENT_RULES[0];
  const conflict = EVENT_RULES[1];
  const infrastructure = EVENT_RULES[2];
  const trade = EVENT_RULES[3];
  const maritimeContext = /\b(?:tanker|shipping|maritime|chokepoint|strait|blockade|shipments?)\b/i.test(text);
  if (maritimeContext && maritime.patterns.some((pattern) => pattern.test(text))) return maritime;
  if (conflict.patterns.some((pattern) => pattern.test(text)) && /\b(?:attack|strike|war|conflict|missile|bombing|military)\b/i.test(text)) return conflict;
  if (infrastructure.patterns.some((pattern) => pattern.test(text))) return infrastructure;
  if (trade.patterns.some((pattern) => pattern.test(text))) return trade;
  return void 0;
};
var severityFor = (rule, text) => {
  if (/\b(?:war|armed\s+conflict|airstrike|missile\s+strike|bombing|blockade|chokepoint\s+(?:closed|closure))\b/i.test(text)) return "critical";
  if (/\b(?:attack(?:ed)?|strike|fire|damaged?|shutdown|outage|export\s+ban|embargo|major\s+closure|sanction(?:s|ed)?)\b/i.test(text)) return "high";
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
var categoryForTradeRule = (text) => /\b(?:sanction(?:s|ed)?|embargo)\b/i.test(text) ? "sanctions" : "trade_restriction";
var locationFor = (nodeMatches, regionMatches, countries) => nodeMatches[0]?.node.name || regionMatches[0]?.name || countries[0]?.canonicalName;
var extractionResult = (event, confidence, matchedEntities, extractionReasons) => ({
  ...event ? { event } : {},
  confidence,
  confidenceLevel: event && confidence >= HIGH_CONFIDENCE_THRESHOLD ? "HIGH" : "UNCERTAIN",
  matchedEntities: uniqueEntities(matchedEntities),
  extractionReasons,
  route: event && confidence >= HIGH_CONFIDENCE_THRESHOLD ? "DETERMINISTIC" : "GROQ_FALLBACK"
});
var extractDeterministicGeopoliticalEvent = (article2, graph2) => {
  if (!graph2 || !Array.isArray(graph2.nodes) || !Array.isArray(graph2.edges)) {
    throw new Error("A Digital Twin graph snapshot is required for deterministic extraction.");
  }
  const title = textValue(article2.title);
  const description = textValue(article2.description) || textValue(article2.content);
  const source = textValue(article2.source);
  const text = articleText(article2);
  const timestamp = normalizedTimestamp(textValue(article2.publishedAt));
  const sourceUrl = validHttpUrl(textValue(article2.url) || textValue(article2.sourceUrl));
  const nodeMatches = findNodeMatches(graph2, text);
  const regionMatches = findRegionMatches(text);
  const countries = findCountries(graph2, text);
  const rule = matchingRule(text);
  const energySignal = ENERGY_PATTERN.test(text) || ENERGY_EXPORT_PATTERN.test(text);
  const assetSignal = ASSET_PATTERN.test(text) || ENERGY_EXPORT_PATTERN.test(text);
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
  const category = rule.category === "trade_restriction" ? categoryForTradeRule(text) : rule.category;
  const event = {
    id: stableEventId(article2, title, source, timestamp),
    title,
    description: description || title,
    timestamp,
    source,
    ...sourceUrl ? { sourceUrl } : {},
    ...locationFor(nodeMatches, regionMatches, countries) ? { location: locationFor(nodeMatches, regionMatches, countries) } : {},
    countriesInvolved: countries.map((country) => country.canonicalName).sort((left, right) => left.localeCompare(right)),
    category,
    severity: severityFor({ ...rule, category }, text)
  };
  const validatedEvent = validateGeopoliticalEvent(event);
  reasons.push(`deterministic confidence score is ${confidence.toFixed(2)}; high-confidence threshold is ${HIGH_CONFIDENCE_THRESHOLD.toFixed(2)}.`);
  return extractionResult(validatedEvent, confidence, matchedEntities, reasons);
};

// tests/geopolitical-deterministic-extractor.test.ts
var graph = {
  modelVersion: 1,
  nodes: [
    {
      nodeId: "supplier-iran",
      nodeType: "supplier",
      name: "Iran",
      connectedNodeIds: [],
      operationalState: "operational",
      stateSource: "BASELINE",
      sourceReferences: [{ table: "supplier_imports", id: "iran" }],
      metadata: { sourceCountryName: "Iran", countryId: "country-iran" }
    },
    {
      nodeId: "supplier-saudi",
      nodeType: "supplier",
      name: "Saudi Arabia",
      connectedNodeIds: [],
      operationalState: "operational",
      stateSource: "BASELINE",
      sourceReferences: [{ table: "supplier_imports", id: "saudi" }],
      metadata: { sourceCountryName: "Saudi Arab", countryId: "country-saudi" }
    },
    {
      nodeId: "supplier-united-states",
      nodeType: "supplier",
      name: "United States",
      connectedNodeIds: [],
      operationalState: "operational",
      stateSource: "BASELINE",
      sourceReferences: [{ table: "supplier_imports", id: "united-states" }],
      metadata: { sourceCountryName: "United States", countryId: "country-us" }
    },
    {
      nodeId: "refinery-mangalore",
      nodeType: "refinery",
      name: "MRPL, Mangalore",
      connectedNodeIds: [],
      operationalState: "operational",
      stateSource: "BASELINE",
      sourceReferences: [{ table: "refineries", id: "mangalore" }],
      metadata: { company: "Mangalore Refinery and Petrochemicals Limited", state: "Karnataka" }
    },
    {
      nodeId: "chokepoint-strait-of-hormuz",
      nodeType: "chokepoint",
      name: "Strait of Hormuz",
      connectedNodeIds: ["shipping-route-hormuz-india"],
      operationalState: "operational",
      stateSource: "BASELINE",
      sourceReferences: [{ table: "external_source", id: "hormuz" }],
      metadata: { documentedRole: "major oil chokepoint" }
    },
    {
      nodeId: "shipping-route-hormuz-india",
      nodeType: "shipping_route",
      name: "Strait of Hormuz-India Crude Flow",
      connectedNodeIds: ["chokepoint-strait-of-hormuz"],
      operationalState: "operational",
      stateSource: "BASELINE",
      sourceReferences: [{ table: "external_source", id: "hormuz-route" }],
      metadata: { documentedDestination: "India among major Asian destinations" }
    }
  ],
  edges: []
};
var article = (overrides = {}) => ({
  id: "article-1",
  title: "Iran blocks oil shipments through the Strait of Hormuz after a tanker attack.",
  description: "Tanker traffic was disrupted after the attack.",
  source: "Example Energy Wire",
  url: "https://example.test/article-1",
  publishedAt: "2026-08-24T08:00:00.000Z",
  ...overrides
});
(0, import_node_test.default)("extracts a high-confidence Hormuz maritime disruption", () => {
  const result = extractDeterministicGeopoliticalEvent(article(), graph);
  import_strict.default.equal(result.confidenceLevel, "HIGH");
  import_strict.default.equal(result.route, "DETERMINISTIC");
  import_strict.default.equal(result.event?.category, "maritime_disruption");
  import_strict.default.ok(result.event?.countriesInvolved.includes("Iran"));
  import_strict.default.ok(result.matchedEntities.some((entity) => entity.entityId === "chokepoint-strait-of-hormuz"));
  import_strict.default.ok(result.event?.severity === "high" || result.event?.severity === "critical");
  import_strict.default.ok(result.confidence >= HIGH_CONFIDENCE_THRESHOLD);
});
(0, import_node_test.default)("extracts tanker attacks only when the article provides sufficient country/entity evidence", () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: "Tanker attack disrupts crude shipping near Iran",
    description: "The incident affected tanker movements."
  }), graph);
  import_strict.default.equal(result.confidenceLevel, "HIGH");
  import_strict.default.equal(result.event?.category, "maritime_disruption");
  import_strict.default.ok(result.event?.countriesInvolved.includes("Iran"));
});
(0, import_node_test.default)("extracts refinery outages and pipeline shutdowns as infrastructure disruption", () => {
  const refinery = extractDeterministicGeopoliticalEvent(article({
    title: "Saudi refinery shuts down after a fire",
    description: "Operations at the refinery were stopped."
  }), graph);
  const pipeline = extractDeterministicGeopoliticalEvent(article({
    title: "Iran pipeline shutdown interrupts crude operations",
    description: "The pipeline was taken offline."
  }), graph);
  import_strict.default.equal(refinery.confidenceLevel, "HIGH");
  import_strict.default.equal(refinery.event?.category, "infrastructure_disruption");
  import_strict.default.ok(refinery.event?.countriesInvolved.includes("Saudi Arabia"));
  import_strict.default.equal(pipeline.confidenceLevel, "HIGH");
  import_strict.default.equal(pipeline.event?.category, "infrastructure_disruption");
  import_strict.default.ok(pipeline.event?.countriesInvolved.includes("Iran"));
});
(0, import_node_test.default)("extracts sanctions and trade restrictions with country aliases", () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: "US announces sanctions restricting Iranian oil exports",
    description: "The measure restricts crude exports."
  }), graph);
  import_strict.default.equal(result.confidenceLevel, "HIGH");
  import_strict.default.ok(result.event?.category === "sanctions" || result.event?.category === "trade_restriction");
  import_strict.default.ok(result.event?.countriesInvolved.includes("Iran"));
  import_strict.default.ok(result.event?.countriesInvolved.includes("United States"));
});
(0, import_node_test.default)("classifies an explicit armed attack as conflict when maritime context does not take precedence", () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: "Military strike damages a Saudi oil terminal",
    description: "The attack damaged the energy facility."
  }), graph);
  import_strict.default.equal(result.confidenceLevel, "HIGH");
  import_strict.default.equal(result.event?.category, "conflict");
  import_strict.default.ok(result.event?.countriesInvolved.includes("Saudi Arabia"));
});
(0, import_node_test.default)("routes vague tension and generic oil-price stories to uncertainty", () => {
  const tension = extractDeterministicGeopoliticalEvent(article({
    title: "Strait of Hormuz tensions increase as markets worry about oil supplies",
    description: "Analysts expressed concern about possible disruption."
  }), graph);
  const prices = extractDeterministicGeopoliticalEvent(article({
    title: "Oil prices rise as investors remain concerned about global supply",
    description: "Markets reacted to broad supply concerns."
  }), graph);
  const capacity = extractDeterministicGeopoliticalEvent(article({
    title: "Refinery capacity remains under pressure",
    description: "No outage or shutdown was reported."
  }), graph);
  import_strict.default.equal(tension.confidenceLevel, "UNCERTAIN");
  import_strict.default.equal(tension.route, "GROQ_FALLBACK");
  import_strict.default.equal(prices.confidenceLevel, "UNCERTAIN");
  import_strict.default.equal(prices.event, void 0);
  import_strict.default.equal(capacity.confidenceLevel, "UNCERTAIN");
});
(0, import_node_test.default)("does not fabricate countries, entities, or timestamps", () => {
  const missingCountry = extractDeterministicGeopoliticalEvent(article({
    title: "Strait of Hormuz closure disrupts oil shipping"
  }), graph);
  const missingTimestamp = extractDeterministicGeopoliticalEvent(article({ publishedAt: void 0 }), graph);
  const unknownLocation = extractDeterministicGeopoliticalEvent(article({
    title: "Refinery outage reported near an unknown basin",
    description: "The refinery outage has not been linked to a known country."
  }), graph);
  import_strict.default.equal(missingCountry.confidenceLevel, "UNCERTAIN");
  import_strict.default.equal(missingCountry.event, void 0);
  import_strict.default.equal(missingTimestamp.confidenceLevel, "UNCERTAIN");
  import_strict.default.equal(missingTimestamp.event, void 0);
  import_strict.default.equal(unknownLocation.confidenceLevel, "UNCERTAIN");
  import_strict.default.equal(unknownLocation.event, void 0);
  import_strict.default.ok(missingTimestamp.extractionReasons.some((reason) => reason.includes("timestamp")));
});
(0, import_node_test.default)("uses descriptions, avoids false substring matches, and deduplicates entities", () => {
  const result = extractDeterministicGeopoliticalEvent(article({
    title: "Incident reported",
    description: "IRAN  blocks   crude exports; the warbler report was unrelated."
  }), graph);
  import_strict.default.equal(result.event?.category, "trade_restriction");
  import_strict.default.equal(result.confidenceLevel, "HIGH");
  import_strict.default.deepEqual(result.event?.countriesInvolved, ["Iran"]);
  import_strict.default.equal(result.matchedEntities.filter((entity) => entity.entityType === "country" && entity.name === "Iran").length, 1);
  import_strict.default.equal(result.extractionReasons.some((reason) => reason.includes("warbler")), false);
});
(0, import_node_test.default)("returns stable output for repeated extraction and preserves event validation compatibility", () => {
  const first = extractDeterministicGeopoliticalEvent(article(), graph);
  const second = extractDeterministicGeopoliticalEvent(article(), graph);
  import_strict.default.deepEqual(second, first);
  import_strict.default.ok(first.event);
  import_strict.default.deepEqual(validateGeopoliticalEvent(first.event), first.event);
});
