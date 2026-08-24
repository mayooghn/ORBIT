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

// tests/geopolitical-event-classification.test.ts
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
var GeopoliticalEventClassifier = class {
  classify(value) {
    return classifyGeopoliticalEvent(value);
  }
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

// tests/geopolitical-event-classification.test.ts
var validEvent = (overrides = {}) => ({
  id: "event-1",
  title: "Maritime security incident",
  description: "A documented maritime security incident affected commercial transit.",
  timestamp: "2026-08-21T12:00:00.000Z",
  source: "Government bulletin",
  sourceUrl: "https://example.gov/events/1",
  location: "Arabian Sea",
  countriesInvolved: ["India", "Oman"],
  category: "maritime_disruption",
  severity: "high",
  ...overrides
});
var ingest = (overrides = {}) => new GeopoliticalEventIngestionStore().ingest(validEvent(overrides));
(0, import_node_test.default)("classifies conflict events", () => {
  const result = classifyGeopoliticalEvent(ingest({ category: "conflict", title: "Armed conflict near oil infrastructure" }));
  import_strict.default.equal(result.eventId, "event-1");
  import_strict.default.equal(result.category, "conflict");
});
(0, import_node_test.default)("classifies sanctions events", () => {
  const result = classifyGeopoliticalEvent(ingest({ category: "sanctions", title: "Sanctions restrict crude exports" }));
  import_strict.default.equal(result.category, "sanctions");
  import_strict.default.equal(result.energyRelevant, true);
});
(0, import_node_test.default)("classifies maritime disruption events as energy relevant", () => {
  const result = classifyGeopoliticalEvent(ingest({ category: "maritime_disruption", title: "Shipping lane disruption" }));
  import_strict.default.equal(result.category, "maritime_disruption");
  import_strict.default.equal(result.energyRelevant, true);
});
(0, import_node_test.default)("classifies infrastructure disruption events", () => {
  const result = classifyGeopoliticalEvent(ingest({ category: "infrastructure_disruption", title: "Crude pipeline damaged" }));
  import_strict.default.equal(result.category, "infrastructure_disruption");
  import_strict.default.equal(result.energyRelevant, true);
});
(0, import_node_test.default)("preserves structured severity classification", () => {
  for (const severity of ["low", "medium", "high", "critical"]) {
    import_strict.default.equal(classifyGeopoliticalEvent(ingest({ severity })).severity, severity);
  }
});
(0, import_node_test.default)("returns geographic relevance from location and countries", () => {
  const result = classifyGeopoliticalEvent(ingest({ location: "Strait of Hormuz", countriesInvolved: ["India", "Iran", "Oman"] }));
  import_strict.default.deepEqual(result.countriesInvolved, ["India", "Iran", "Oman"]);
  import_strict.default.equal(result.location, "Strait of Hormuz");
  import_strict.default.equal(result.region, "Middle East");
});
(0, import_node_test.default)("identifies a non-energy event", () => {
  const result = classifyGeopoliticalEvent(ingest({
    title: "Diplomatic summit concludes",
    description: "European officials concluded a cultural cooperation agreement.",
    location: "Europe",
    countriesInvolved: ["France", "Germany"],
    category: "diplomatic_escalation"
  }));
  import_strict.default.equal(result.energyRelevant, false);
  import_strict.default.equal(result.region, "Europe");
});
(0, import_node_test.default)("classification reasons explain category, severity, geography, and energy rules", () => {
  const result = classifyGeopoliticalEvent(ingest({ category: "trade_restriction", severity: "critical", title: "Oil export restriction" }));
  import_strict.default.equal(result.classificationReasons.length, 4);
  import_strict.default.ok(result.classificationReasons.some((reason) => reason.includes("category rule")));
  import_strict.default.ok(result.classificationReasons.some((reason) => reason.includes("severity rule")));
  import_strict.default.ok(result.classificationReasons.some((reason) => reason.includes("geographic rule")));
  import_strict.default.ok(result.classificationReasons.some((reason) => reason.includes("energy rule")));
});
(0, import_node_test.default)("classification is deterministic across repeated calls", () => {
  const event = ingest({ id: "deterministic-event", category: "sanctions" });
  const classifier = new GeopoliticalEventClassifier();
  import_strict.default.deepEqual(classifier.classify(event), classifier.classify(event));
});
(0, import_node_test.default)("invalid events are rejected by the classifier", () => {
  import_strict.default.throws(() => classifyGeopoliticalEvent(validEvent({ category: "invalid" })), GeopoliticalEventValidationError);
  import_strict.default.throws(() => classifyGeopoliticalEvent({}), GeopoliticalEventValidationError);
});
(0, import_node_test.default)("classification does not mutate the input event", () => {
  const event = ingest({ id: "immutable-event", countriesInvolved: ["India", "Saudi Arabia"] });
  const before = JSON.stringify(event);
  const result = classifyGeopoliticalEvent(event);
  result.countriesInvolved.push("Iraq");
  import_strict.default.equal(JSON.stringify(event), before);
});
