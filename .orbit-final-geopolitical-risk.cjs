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

// tests/geopolitical-risk.test.ts
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

// src/digitalTwin/model.ts
var DIGITAL_TWIN_NODE_TYPES = [
  "supplier",
  "port",
  "refinery",
  "strategic_reserve",
  "shipping_route",
  "chokepoint"
];

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
var isRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var validateClassification = (event, value) => {
  if (!isRecord2(value)) throw new Error("A valid geopolitical event classification is required.");
  const canonical = classifyGeopoliticalEvent(event);
  if (value.eventId !== canonical.eventId || value.category !== canonical.category || value.severity !== canonical.severity || value.energyRelevant !== canonical.energyRelevant) {
    throw new Error("Geopolitical event classification does not match the event.");
  }
  return value;
};
var validateRelevance = (event, value) => {
  if (!isRecord2(value) || value.eventId !== event.id || typeof value.relevant !== "boolean") {
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
  const classification = validateClassification(event, classificationValue);
  const relevance = validateRelevance(event, relevanceValue);
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
var GeopoliticalRiskAssessor = class {
  assess(event, classification, relevance) {
    return assessGeopoliticalRisk(event, classification, relevance);
  }
};

// tests/geopolitical-risk.test.ts
var validEvent = (overrides = {}) => ({
  id: "event-1",
  title: "Crude supply disruption",
  description: "A documented crude oil disruption affected energy continuity.",
  timestamp: "2026-08-21T12:00:00.000Z",
  source: "Government bulletin",
  sourceUrl: "https://example.gov/events/1",
  location: "Arabian Sea",
  countriesInvolved: ["India", "Oman"],
  category: "maritime_disruption",
  severity: "medium",
  ...overrides
});
var relevanceFor = (eventId, matchedNodeTypes, matchedNodeIds = matchedNodeTypes.map((type, index) => `${type}-${index}`), relevant = true) => ({
  eventId,
  relevant,
  matchedNodeIds,
  matchedNodeTypes,
  matchedLocations: [],
  matchedCountries: [],
  relevanceReasons: []
});
var assess = (eventOverrides = {}, matchedTypes = ["port"]) => {
  const event = validEvent(eventOverrides);
  const classification = classifyGeopoliticalEvent(event);
  const relevance = relevanceFor(event.id, matchedTypes);
  return { event, classification, relevance, result: assessGeopoliticalRisk(event, classification, relevance) };
};
(0, import_node_test.default)("low-risk event produces a low score", () => {
  const { result } = assess({ id: "low-event", title: "Routine energy notice", severity: "low" }, ["port"]);
  import_strict.default.equal(result.riskLevel, "low");
  import_strict.default.ok(result.riskScore < 25);
});
(0, import_node_test.default)("medium-risk event produces a medium score", () => {
  const { result } = assess({ id: "medium-event", severity: "medium" }, ["port"]);
  import_strict.default.equal(result.riskLevel, "medium");
  import_strict.default.ok(result.riskScore >= 25 && result.riskScore < 50);
});
(0, import_node_test.default)("high-risk event produces a high score", () => {
  const { result } = assess({ id: "high-event", severity: "high" }, ["refinery"]);
  import_strict.default.equal(result.riskLevel, "high");
  import_strict.default.ok(result.riskScore >= 50 && result.riskScore < 80);
});
(0, import_node_test.default)("critical-risk event produces a critical score", () => {
  const { result } = assess({ id: "critical-event", severity: "critical", location: "Strait of Hormuz" }, ["chokepoint"]);
  import_strict.default.equal(result.riskLevel, "critical");
  import_strict.default.ok(result.riskScore >= 80);
});
(0, import_node_test.default)("irrelevant non-energy events are gated to low risk", () => {
  const event = validEvent({ id: "non-energy-event", title: "Cultural exchange", description: "A cultural exchange was announced.", location: "Liechtenstein", countriesInvolved: ["Liechtenstein", "Andorra"], category: "diplomatic_escalation", severity: "critical" });
  const classification = classifyGeopoliticalEvent(event);
  const relevance = relevanceFor(event.id, [], [], false);
  const result = assessGeopoliticalRisk(event, classification, relevance);
  import_strict.default.equal(result.energyRelevant, false);
  import_strict.default.equal(result.riskLevel, "low");
  import_strict.default.equal(result.riskScore, 0);
});
(0, import_node_test.default)("chokepoint exposure contributes a distinct factor", () => {
  const { result } = assess({ id: "chokepoint-event", location: "Strait of Hormuz", severity: "high" }, ["chokepoint"]);
  import_strict.default.ok(result.factors.some((factor) => factor.name === "chokepoint exposure"));
  import_strict.default.ok(result.riskScore >= 50);
});
(0, import_node_test.default)("port, refinery, and reserve exposure are scored by node type", () => {
  const { result } = assess({ id: "asset-event", severity: "high" }, ["port", "refinery", "strategic_reserve"]);
  import_strict.default.ok(result.factors.some((factor) => factor.name === "port exposure"));
  import_strict.default.ok(result.factors.some((factor) => factor.name === "refinery exposure"));
  import_strict.default.ok(result.factors.some((factor) => factor.name === "strategic reserve exposure"));
  import_strict.default.deepEqual(result.matchedNodeIds, ["port-0", "refinery-1", "strategic_reserve-2"]);
});
(0, import_node_test.default)("risk assessment is deterministic", () => {
  const { event, classification, relevance } = assess({ id: "deterministic-event", severity: "high" }, ["supplier", "port", "refinery"]);
  const assessor = new GeopoliticalRiskAssessor();
  import_strict.default.deepEqual(assessor.assess(event, classification, relevance), assessor.assess(event, classification, relevance));
});
(0, import_node_test.default)("factors and reasoning explain the score", () => {
  const { result } = assess({ id: "reason-event", severity: "critical", location: "Strait of Hormuz" }, ["chokepoint", "port"]);
  import_strict.default.ok(result.factors.length >= 4);
  import_strict.default.ok(result.reasoning.some((reason) => reason.includes("Severity critical")));
  import_strict.default.ok(result.reasoning.some((reason) => reason.includes("raw score")));
  import_strict.default.ok(result.reasoning.some((reason) => reason.includes("thresholds")));
});
(0, import_node_test.default)("risk assessment does not mutate inputs", () => {
  const { event, classification, relevance } = assess({ id: "immutable-event" }, ["port", "refinery"]);
  const eventBefore = JSON.stringify(event);
  const classificationBefore = JSON.stringify(classification);
  const relevanceBefore = JSON.stringify(relevance);
  const result = assessGeopoliticalRisk(event, classification, relevance);
  result.matchedNodeIds.push("new-node");
  result.factors.push({ name: "test", points: 0, explanation: "test" });
  import_strict.default.equal(JSON.stringify(event), eventBefore);
  import_strict.default.equal(JSON.stringify(classification), classificationBefore);
  import_strict.default.equal(JSON.stringify(relevance), relevanceBefore);
});
(0, import_node_test.default)("invalid event, classification, or relevance input is rejected", () => {
  const { event, classification, relevance } = assess({ id: "invalid-input-event" });
  import_strict.default.throws(() => assessGeopoliticalRisk({}, classification, relevance), /Invalid geopolitical event/);
  import_strict.default.throws(() => assessGeopoliticalRisk(event, { ...classification, eventId: "other-event" }, relevance), /classification does not match/);
  import_strict.default.throws(() => assessGeopoliticalRisk(event, classification, { ...relevance, eventId: "other-event" }), /relevance result/);
});
