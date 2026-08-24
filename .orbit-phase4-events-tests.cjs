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

// tests/geopolitical-events.test.ts
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

// tests/geopolitical-events.test.ts
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
(0, import_node_test.default)("valid event ingestion preserves attribution, location, and multiple countries", () => {
  const store = new GeopoliticalEventIngestionStore();
  const event = store.ingest(validEvent());
  import_strict.default.equal(event.id, "event-1");
  import_strict.default.equal(event.source, "Government bulletin");
  import_strict.default.equal(event.sourceUrl, "https://example.gov/events/1");
  import_strict.default.equal(event.location, "Arabian Sea");
  import_strict.default.deepEqual(event.countriesInvolved, ["India", "Oman"]);
  import_strict.default.equal(store.size, 1);
});
(0, import_node_test.default)("required fields are validated", () => {
  for (const field of ["id", "title", "description", "timestamp", "source", "countriesInvolved"]) {
    const event = validEvent({ [field]: field === "countriesInvolved" ? [] : "" });
    import_strict.default.throws(() => validateGeopoliticalEvent(event), GeopoliticalEventValidationError);
  }
});
(0, import_node_test.default)("category values are constrained", () => {
  for (const category of GEOPOLITICAL_EVENT_CATEGORIES) {
    import_strict.default.equal(validateGeopoliticalEvent(validEvent({ category })).category, category);
  }
  import_strict.default.throws(() => validateGeopoliticalEvent(validEvent({ category: "invalid" })), /category must be one of/);
});
(0, import_node_test.default)("severity values are constrained", () => {
  for (const severity of GEOPOLITICAL_EVENT_SEVERITIES) {
    import_strict.default.equal(validateGeopoliticalEvent(validEvent({ severity })).severity, severity);
  }
  import_strict.default.throws(() => validateGeopoliticalEvent(validEvent({ severity: "urgent" })), /severity must be one of/);
});
(0, import_node_test.default)("timestamps must be valid date-time strings", () => {
  import_strict.default.equal(validateGeopoliticalEvent(validEvent()).timestamp, "2026-08-21T12:00:00.000Z");
  import_strict.default.throws(() => validateGeopoliticalEvent(validEvent({ timestamp: "not-a-timestamp" })), /timestamp/);
  import_strict.default.throws(() => validateGeopoliticalEvent(validEvent({ timestamp: "2026-08-21" })), /timestamp/);
});
(0, import_node_test.default)("location is optional", () => {
  const event = validateGeopoliticalEvent(validEvent({ location: void 0 }));
  import_strict.default.equal(event.location, void 0);
});
(0, import_node_test.default)("malformed events and source URLs are rejected", () => {
  import_strict.default.throws(() => validateGeopoliticalEvent(null), GeopoliticalEventValidationError);
  import_strict.default.throws(() => validateGeopoliticalEvent(validEvent({ sourceUrl: "not-a-url" })), /sourceUrl/);
  import_strict.default.throws(() => validateGeopoliticalEvent(validEvent({ countriesInvolved: ["India", "india"] })), /duplicate country/);
});
(0, import_node_test.default)("duplicate event IDs are rejected", () => {
  const store = new GeopoliticalEventIngestionStore();
  store.ingest(validEvent());
  import_strict.default.throws(() => store.ingest(validEvent()), DuplicateGeopoliticalEventError);
});
(0, import_node_test.default)("events can be retrieved deterministically", () => {
  const store = new GeopoliticalEventIngestionStore();
  store.ingest(validEvent());
  const retrieved = store.getEvent("event-1");
  import_strict.default.deepEqual(retrieved, validateGeopoliticalEvent(validEvent()));
  import_strict.default.equal(store.getEvent("missing-event"), void 0);
  import_strict.default.deepEqual(store.getEvents().map((event) => event.id), ["event-1"]);
});
(0, import_node_test.default)("multiple events can be ingested as one validated batch", () => {
  const store = new GeopoliticalEventIngestionStore();
  const events = store.ingestMany([
    validEvent({ id: "event-1", category: "conflict", severity: "critical" }),
    validEvent({ id: "event-2", category: "sanctions", severity: "medium", countriesInvolved: ["India", "Russia"] })
  ]);
  import_strict.default.deepEqual(events.map((event) => event.id), ["event-1", "event-2"]);
  import_strict.default.deepEqual(store.getEvents().map((event) => event.id), ["event-1", "event-2"]);
});
(0, import_node_test.default)("batch ingestion is atomic when an event is invalid or duplicated", () => {
  const store = new GeopoliticalEventIngestionStore();
  import_strict.default.throws(() => store.ingestMany([validEvent({ id: "event-1" }), validEvent({ id: "event-1" })]), DuplicateGeopoliticalEventError);
  import_strict.default.equal(store.size, 0);
  import_strict.default.throws(() => store.ingestMany([validEvent({ id: "event-1" }), validEvent({ id: "event-2", severity: "invalid" })]), GeopoliticalEventValidationError);
  import_strict.default.equal(store.size, 0);
});
