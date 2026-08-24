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

// tests/assistant-page.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);
var import_react2 = __toESM(require("react"), 1);
var import_server = require("react-dom/server");
var import_node_test = __toESM(require("node:test"), 1);

// src/pages/AssistantPage.tsx
var import_react = __toESM(require("react"), 1);
var import_lucide_react2 = require("lucide-react");

// src/components/common/EmptyState.tsx
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
var EmptyState = ({
  title = "No verified data available",
  description = "This module has no connected operational data source yet.",
  icon: Icon = import_lucide_react.ShieldCheck,
  actionText,
  onAction,
  className = ""
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: `flex flex-col items-center justify-center p-10 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 ${className}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-500 dark:text-slate-400", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-6 h-6 text-slate-600 dark:text-slate-300" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-base font-semibold text-slate-900 dark:text-slate-100", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md", children: description }),
        actionText && onAction && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: onAction,
            type: "button",
            className: "mt-4 px-4 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer",
            children: actionText
          }
        )
      ]
    }
  );
};

// src/components/common/StatusBadge.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var StatusBadge = ({
  level = "NORMAL",
  label,
  size = "md",
  pulse = false
}) => {
  const displayLabel = label || level;
  let colorClasses = "bg-[#1A1A1A] text-[#999999] border-[#333333]";
  let dotColor = "bg-[#666666]";
  switch (level) {
    case "CRITICAL":
    case "BLOCKED":
    case "OFFLINE":
      colorClasses = "bg-red-950/60 text-red-400 border-red-900/60";
      dotColor = "bg-red-500";
      break;
    case "ELEVATED":
    case "CONSTRAINED":
    case "DEGRADED":
    case "P0_IMMEDIATE":
      colorClasses = "bg-orange-950/60 text-orange-400 border-orange-900/60";
      dotColor = "bg-orange-500";
      break;
    case "MODERATE":
    case "MONITORING":
    case "P1_HIGH":
      colorClasses = "bg-amber-950/60 text-amber-400 border-amber-900/60";
      dotColor = "bg-amber-500";
      break;
    case "AVAILABLE":
    case "FOUNDATION":
    case "NORMAL":
    case "RESOLVED":
    case "APPROVED":
      colorClasses = "bg-emerald-950/60 text-emerald-400 border-emerald-900/60";
      dotColor = "bg-emerald-500";
      break;
    case "NOT_CONNECTED":
      colorClasses = "bg-orange-950/60 text-orange-400 border-orange-900/60";
      dotColor = "bg-orange-400";
      break;
    case "UNKNOWN":
      colorClasses = "bg-blue-950/60 text-blue-400 border-blue-900/60";
      dotColor = "bg-blue-400";
      break;
  }
  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-sm";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "span",
    {
      className: `inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border font-semibold ${sizeClasses} ${colorClasses}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "span",
          {
            className: `w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? "animate-ping" : ""}`
          }
        ),
        displayLabel
      ]
    }
  );
};

// src/components/common/PageHeader.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var PageHeader = ({
  title,
  subtitle,
  badgeText,
  badgeLevel = "NOT_CONNECTED",
  actions
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { className: "text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDED]", children: title }),
        badgeText && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StatusBadge, { level: badgeLevel, label: badgeText, size: "sm" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-sm sm:text-base text-[#999999] mt-2 max-w-2xl leading-relaxed", children: subtitle })
    ] }),
    actions && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex items-center gap-2.5 flex-shrink-0", children: actions })
  ] });
};

// src/services/api.ts
var requestJson = async (url, init) => {
  const response = await fetch(url, init);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Request returned an invalid JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : `Request returned HTTP ${response.status}.`);
  }
  return body;
};
async function analyzeGeopoliticalRisk(request) {
  const body = await requestJson("/api/geopolitical-risk/agent", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ request })
  });
  if (body.status !== "AVAILABLE") throw new Error("Geopolitical risk agent returned an unavailable response.");
  return body;
}
async function fetchMonitoringStatus() {
  return requestJson("/api/geopolitical-risk/monitor/status", {
    method: "GET",
    headers: { Accept: "application/json" }
  });
}
async function refreshGeopoliticalMonitoring() {
  return requestJson("/api/geopolitical-risk/monitor/refresh", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
}
async function fetchMonitoredEvents(limit = 20) {
  return requestJson(`/api/geopolitical-risk/monitor/events?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
}
async function fetchHighRiskMonitoringAlerts(limit = 20) {
  return requestJson(`/api/geopolitical-risk/monitor/alerts/high?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
}
async function fetchCriticalMonitoringAlerts(limit = 20) {
  return requestJson(`/api/geopolitical-risk/monitor/alerts/critical?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
}

// src/pages/AssistantPage.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var EXAMPLE_PROMPTS = [
  "What happens if the Strait of Hormuz is disrupted?",
  "Assess the supply-chain risk of a disruption in Saudi Arabian crude exports."
];
var INITIAL_ASSISTANT_REQUEST = "";
var EXTERNAL_MONITORING_FRESHNESS_MS = 30 * 60 * 1e3;
var getExternalMonitoringStatus = (events, now = Date.now()) => {
  const externalEvents = events.filter((record) => record.article?.sourceType === "external_webhook");
  const latestExternalEvent = externalEvents.reduce((latest, record) => {
    if (!latest) return record;
    const latestDetectedAt = Date.parse(latest.detectedAt || "");
    const detectedAt = Date.parse(record.detectedAt || "");
    return Number.isFinite(detectedAt) && (!Number.isFinite(latestDetectedAt) || detectedAt > latestDetectedAt) ? record : latest;
  }, void 0);
  const hasRecentExternalEvent = externalEvents.some((record) => {
    if (record.article?.sourceType !== "external_webhook") return false;
    const detectedAt = Date.parse(record.detectedAt || "");
    const age = now - detectedAt;
    return Number.isFinite(detectedAt) && age >= 0 && age <= EXTERNAL_MONITORING_FRESHNESS_MS;
  });
  if (hasRecentExternalEvent) return { state: "ACTIVE", message: "External ingestion pipeline is receiving events." };
  if (externalEvents.length > 0) {
    const latestEventAt = latestExternalEvent?.detectedAt;
    return {
      state: "STANDBY",
      message: "No new external events recently.",
      ...latestEventAt && Number.isFinite(Date.parse(latestEventAt)) ? { latestEventAt } : {}
    };
  }
  return { state: "WAITING", message: "Waiting for the first event from the external ingestion pipeline." };
};
var formatExternalMonitoringEventTime = (timestamp) => {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
var monitoringRecordKey = (record) => record.article?.id || record.detectedAt || `${record.article?.title || "event"}-${record.article?.publishedAt || ""}`;
var valueOrUnavailable = (value) => typeof value === "string" && value.trim() ? value : "Not available";
var humanizeLabel = (value) => {
  if (typeof value !== "string" || !value.trim()) return "Not available";
  let label = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return label.replace(/\bhormuz\b/gi, "Hormuz").replace(/\bindia\b/gi, "India").replace(/\bsaudi arabia\b/gi, "Saudi Arabia").replace(/\bmiddle east\b/gi, "Middle East");
};
var nodeTypePrefixes = [
  ["shipping-route", "Shipping route"],
  ["shipping_route", "Shipping route"],
  ["chokepoint", "Chokepoint"],
  ["refinery", "Refinery"],
  ["supplier", "Supplier"],
  ["pipeline", "Pipeline"],
  ["terminal", "Terminal"],
  ["storage", "Storage"],
  ["reserve", "Strategic reserve"],
  ["port", "Port"]
];
var friendlyNodeLabel = (nodeId, nodeType) => {
  const normalizedId = nodeId.trim().toLowerCase();
  const prefix = nodeTypePrefixes.find(([candidate]) => normalizedId.startsWith(`${candidate}-`));
  const typeLabel = nodeType ? humanizeLabel(nodeType) : prefix?.[1];
  if (!typeLabel) return "Supply Chain Asset";
  const suffix = prefix ? nodeId.slice(prefix[0].length + 1).replace(/[_-]+/g, " ").trim() : "";
  const compactSuffix = suffix.replace(/\s/g, "");
  const opaqueSuffix = compactSuffix.length >= 16 && /^[a-z0-9]+$/i.test(compactSuffix) && /\d/.test(compactSuffix);
  if (suffix && !opaqueSuffix && (typeLabel === "Shipping route" || typeLabel === "Chokepoint")) {
    return `${typeLabel}: ${humanizeLabel(suffix)}`;
  }
  return typeLabel;
};
var humanizeTechnicalText = (value, preserveMarkdown = false) => {
  let text = valueOrUnavailable(value).replace(/`([^`]+)`/g, "$1").replace(/\bevt-[a-z0-9-]+\b/gi, "the event").replace(/\b(?:rel|edge)-[a-z0-9-]+\b/gi, "connected relationship");
  const technicalIdentifierPattern = /\b(?:shipping[-_]route|chokepoint|supplier|port|refinery|pipeline|terminal|storage|reserve|node|edge)[-_][a-z0-9_-]+\b/gi;
  text = text.replace(technicalIdentifierPattern, (identifier) => friendlyNodeLabel(identifier));
  return (preserveMarkdown ? text : text.replace(/\*\*/g, "")).replace(/[^\S\r\n]+/g, " ").trim();
};
var renderSafeAssessmentMarkdown = (value) => {
  const lines = humanizeTechnicalText(value, true).split(/\r?\n/);
  return lines.flatMap((line, lineIndex) => {
    const inlineParts = line.split(/(\*\*[^*]+?\*\*)/g).map((part, partIndex) => {
      const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
      if (boldMatch) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { className: "font-semibold text-[#EDEDED]", children: boldMatch[1] }, `${lineIndex}-bold-${partIndex}`);
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react.default.Fragment, { children: part.replace(/\*\*/g, "") }, `${lineIndex}-text-${partIndex}`);
    });
    return lineIndex < lines.length - 1 ? [...inlineParts, /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("br", {}, `${lineIndex}-break`)] : inlineParts;
  });
};
var listOrUnavailable = (values) => {
  if (!Array.isArray(values)) return "Not available";
  const items = values.filter((value) => typeof value === "string" && value.trim().length > 0);
  return items.length ? items.join(", ") : "Not available";
};
var humanizedListOrUnavailable = (values) => {
  if (!Array.isArray(values)) return "Not available";
  const items = values.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => humanizeLabel(value));
  return items.length ? items.join(", ") : "Not available";
};
var formatMeasurement = (summary) => {
  const values = [...summary?.nodeTotals || [], ...summary?.edgeTotals || []].filter((measurement) => typeof measurement.value === "number" && typeof measurement.unit === "string" && measurement.unit.trim());
  return values.length ? values.map((measurement) => `${measurement.value?.toLocaleString()} ${measurement.unit?.replaceAll("_", " ")}`).join(" \xB7 ") : "Not available";
};
var normalizedRiskLevel = (level) => {
  const normalized = level?.toLowerCase();
  return normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical" ? normalized : "unknown";
};
var riskCardClasses = {
  low: "border-emerald-500/30 bg-emerald-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  high: "border-orange-500/40 bg-orange-500/5",
  critical: "border-red-500/40 bg-red-500/5",
  unknown: "border-[#333333] bg-[#121212]"
};
var riskTextClasses = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
  unknown: "text-[#999999]"
};
var humanizeReason = (reason) => {
  const cleaned = humanizeTechnicalText(reason).replace(/\b(?:geographic|geographical|energy|severity|location|country|classification|relevance|impact|match|aggregation)\s+rule\s*:\s*/gi, "").replace(/\b(?:match|impact|aggregation)\s+rule\s*:\s*/gi, "").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Additional assessment detail.";
};
var uniqueSummaryItems = (items) => [...new Set(items.filter((item) => item.trim()))].slice(0, 4);
var classificationSummary = (result) => uniqueSummaryItems([
  result.classification?.energyRelevant === true ? "The event could affect energy supply continuity." : "",
  result.classification?.energyRelevant === false ? "The event is not currently matched to energy supply continuity." : "",
  result.classification?.region ? `Location places the event in ${humanizeLabel(result.classification.region)}.` : "",
  result.classification?.category ? `Classified as ${humanizeLabel(result.classification.category)}.` : "",
  ...result.classification?.classificationReasons?.length ? [humanizeReason(result.classification.classificationReasons[0])] : []
]);
var relevanceSummary = (result) => {
  const nodeTypes = (result.relevance?.matchedNodeTypes || []).map((type) => type.toLowerCase());
  const matchedCount = result.relevance?.matchedNodeIds?.length || 0;
  return uniqueSummaryItems([
    nodeTypes.some((type) => type.includes("chokepoint")) ? "The event affects a major energy chokepoint." : "",
    nodeTypes.length && !nodeTypes.some((type) => type.includes("chokepoint")) ? "The event matches existing energy supply-chain infrastructure." : "",
    result.relevance?.matchedLocations?.length || result.relevance?.matchedCountries?.length ? "The location or countries involved match existing supply-chain exposure." : "",
    matchedCount ? `${matchedCount} supply chain asset${matchedCount === 1 ? "" : "s"} match the event.` : "",
    result.relevance?.relevant === true ? "The event is relevant to energy supply continuity." : ""
  ]);
};
var impactSummary = (result) => {
  const affectedNodes = result.digitalTwinImpact?.affectedNodeIds?.length || 0;
  const affectedEdges = result.digitalTwinImpact?.affectedEdgeIds?.length || 0;
  const capacity = formatMeasurement(result.digitalTwinImpact?.affectedCapacity);
  return uniqueSummaryItems([
    affectedNodes ? `The supply chain network identifies ${affectedNodes} affected asset${affectedNodes === 1 ? "" : "s"}.` : "",
    affectedEdges ? `${affectedEdges} connected relationship${affectedEdges === 1 ? "" : "s"} are exposed.` : "",
    capacity !== "Not available" ? `Affected capacity totals ${capacity}.` : "",
    ...result.digitalTwinImpact?.impactReasons?.length ? [humanizeReason(result.digitalTwinImpact.impactReasons[0])] : []
  ]);
};
var compactAssessmentText = (value) => {
  const cleaned = humanizeTechnicalText(value, true);
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3).join(" ");
  return sentences.length > 420 ? `${sentences.slice(0, 417).trimEnd()}...` : sentences;
};
var ScoreCalculation = ({ score, factors, reasoning }) => {
  const parts = (factors || []).filter((factor) => typeof factor.points === "number").map((factor) => `${factor.points} ${humanizeLabel(factor.name).toLowerCase()}`);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mt-5 pt-4 border-t border-[#252525] space-y-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: "How the score was calculated" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-[#B0B0B0] leading-relaxed font-mono", children: score === null ? "Score calculation not available." : `${score} = ${parts.length ? parts.join(" + ") : "deterministic factors"}` }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "text-[11px] text-[#777777] leading-relaxed", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "font-semibold text-[#999999]", children: "Risk threshold:" }),
      " 0\u201324 Low \xB7 25\u201349 Medium \xB7 50\u201379 High \xB7 80\u2013100 Critical"
    ] }),
    reasoning?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "text-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { className: "cursor-pointer text-[#777777] hover:text-orange-300 font-mono", children: "View detailed score reasoning" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { className: "mt-2 space-y-1.5", children: reasoning.map((reason, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { className: "text-[11px] text-[#888888] leading-relaxed pl-3 border-l border-[#333333]", children: humanizeReason(reason) }, `${reason}-${index}`)) })
    ] }) : null
  ] });
};
var AssistantPage = ({ onNavigate }) => {
  const [request, setRequest] = (0, import_react.useState)(INITIAL_ASSISTANT_REQUEST);
  const [result, setResult] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [monitoring, setMonitoring] = (0, import_react.useState)();
  const [monitoredEvents, setMonitoredEvents] = (0, import_react.useState)([]);
  const [monitoringAlerts, setMonitoringAlerts] = (0, import_react.useState)([]);
  const [monitoringError, setMonitoringError] = (0, import_react.useState)(null);
  const [monitoringLoading, setMonitoringLoading] = (0, import_react.useState)(true);
  const [monitoringRefreshing, setMonitoringRefreshing] = (0, import_react.useState)(false);
  const [monitoringRefreshMessage, setMonitoringRefreshMessage] = (0, import_react.useState)(null);
  const [monitoringRefreshError, setMonitoringRefreshError] = (0, import_react.useState)(null);
  const viewDigitalTwin = () => onNavigate?.("/app/network");
  const loadMonitoring = async () => {
    try {
      const [statusResponse, eventsResponse, highAlertsResponse, criticalAlertsResponse] = await Promise.all([
        fetchMonitoringStatus(),
        fetchMonitoredEvents(200),
        fetchHighRiskMonitoringAlerts(10),
        fetchCriticalMonitoringAlerts(10)
      ]);
      setMonitoring(statusResponse.monitoring);
      const events = eventsResponse.events || [];
      const alerts = [...highAlertsResponse.alerts || [], ...criticalAlertsResponse.alerts || []];
      const byId = /* @__PURE__ */ new Map();
      [...events, ...alerts].forEach((record) => {
        const key = monitoringRecordKey(record);
        if (!byId.has(key)) byId.set(key, record);
      });
      const mergedEvents = [...byId.values()].sort((left, right) => String(right.detectedAt || "").localeCompare(String(left.detectedAt || "")));
      setMonitoredEvents(mergedEvents);
      const alertsById = /* @__PURE__ */ new Map();
      alerts.forEach((record) => {
        const key = monitoringRecordKey(record);
        if (!alertsById.has(key)) alertsById.set(key, record);
      });
      setMonitoringAlerts([...alertsById.values()].sort((left, right) => String(right.detectedAt || "").localeCompare(String(left.detectedAt || ""))));
      setMonitoringError(null);
      return { monitoring: statusResponse.monitoring, events: mergedEvents };
    } catch (monitorError) {
      setMonitoringError(monitorError instanceof Error ? monitorError.message : "Monitoring data could not be loaded.");
      return void 0;
    } finally {
      setMonitoringLoading(false);
    }
  };
  (0, import_react.useEffect)(() => {
    setRequest(INITIAL_ASSISTANT_REQUEST);
    setResult(null);
    setLoading(false);
    setError(null);
    void loadMonitoring();
    const timer = window.setInterval(() => {
      void loadMonitoring();
    }, 6e4);
    return () => window.clearInterval(timer);
  }, []);
  const handleRefreshNews = async () => {
    if (monitoringRefreshing) return;
    const previousEventKeys = new Set(monitoredEvents.map(monitoringRecordKey));
    setMonitoringRefreshing(true);
    setMonitoringRefreshMessage(null);
    setMonitoringRefreshError(null);
    try {
      const refreshResponse = await refreshGeopoliticalMonitoring();
      const requestedAt = refreshResponse.refresh?.requestedAt;
      let snapshot = await loadMonitoring();
      let externalScanCompleted = Boolean(
        requestedAt && snapshot?.monitoring?.lastSuccessfulExternalScan && Date.parse(snapshot.monitoring.lastSuccessfulExternalScan) >= Date.parse(requestedAt)
      );
      const deadline = Date.now() + 3e4;
      while (!externalScanCompleted && Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1e3));
        snapshot = await loadMonitoring();
        externalScanCompleted = Boolean(
          requestedAt && snapshot?.monitoring?.lastSuccessfulExternalScan && Date.parse(snapshot.monitoring.lastSuccessfulExternalScan) >= Date.parse(requestedAt)
        );
      }
      if (!externalScanCompleted) {
        setMonitoringRefreshMessage("Refresh triggered. Waiting for the external scan to complete.");
      } else {
        const hasNewEvents = snapshot?.events.some((record) => !previousEventKeys.has(monitoringRecordKey(record))) || false;
        setMonitoringRefreshMessage(hasNewEvents ? "News refreshed successfully." : "External scan complete. No new external events found.");
      }
    } catch (refreshError) {
      setMonitoringRefreshError(refreshError instanceof Error ? refreshError.message : "News refresh failed.");
    } finally {
      setMonitoringRefreshing(false);
    }
  };
  const handleAnalyze = async (event) => {
    event.preventDefault();
    const normalizedRequest = request.trim();
    if (!normalizedRequest) {
      setError("Describe a geopolitical event before starting the analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await analyzeGeopoliticalRisk(normalizedRequest));
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : "The geopolitical risk agent could not complete the analysis.");
    } finally {
      setLoading(false);
    }
  };
  const riskLevel = normalizedRiskLevel(result?.risk?.riskLevel);
  const riskScore = typeof result?.risk?.riskScore === "number" ? result.risk.riskScore : null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      PageHeader,
      {
        title: "Geopolitical Risk Agent",
        subtitle: "Describe a geopolitical event to assess its energy supply-chain relevance, risk, and infrastructure impact."
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "rounded-lg border border-[#222222] bg-[#121212] p-5 sm:p-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "w-9 h-9 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.BrainCircuit, { className: "w-4.5 h-4.5 text-orange-400" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "text-base font-semibold text-[#EDEDED]", children: "Geopolitical Event Analysis" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-[#888888] mt-1", children: "Describe the event, location, or disruption you want to assess." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("form", { onSubmit: handleAnalyze, className: "mt-6 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { htmlFor: "geopolitical-risk-request", className: "block text-xs uppercase tracking-widest text-[#666666] font-mono", children: "Describe the event or disruption" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "textarea",
          {
            id: "geopolitical-risk-request",
            value: request,
            onChange: (event) => setRequest(event.target.value),
            placeholder: "Describe the event or disruption you want ORBIT to assess.",
            rows: 4,
            disabled: loading,
            className: "w-full resize-y min-h-28 px-3 py-3 rounded-md border border-[#333333] bg-[#0D0D0D] text-sm text-[#EDEDED] placeholder:text-[#555555] focus:outline-none focus:border-orange-500 disabled:opacity-60"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex flex-wrap gap-2", children: EXAMPLE_PROMPTS.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setRequest(prompt),
              disabled: loading,
              className: "text-left px-3 py-2 rounded-md border border-[#333333] text-xs text-[#999999] hover:text-orange-300 hover:border-orange-500/50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
              children: prompt
            },
            prompt
          )) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "button",
            {
              type: "submit",
              disabled: loading || !request.trim(),
              className: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0",
              children: [
                loading ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Loader2, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.ShieldAlert, { className: "w-3.5 h-3.5" }),
                loading ? "Analyzing Risk..." : "Analyze Risk"
              ]
            }
          )
        ] })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { role: "alert", className: "flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-xs text-red-300", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.AlertCircle, { className: "w-4 h-4 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "font-semibold", children: "Analysis unavailable" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mt-1 text-red-300/80", children: error })
      ] })
    ] }),
    !result && !loading && !error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      EmptyState,
      {
        title: "Ready for geopolitical analysis",
        description: "Describe a geopolitical event or disruption and ORBIT will assess its energy supply-chain impact.",
        icon: import_lucide_react2.Bot
      }
    ),
    loading && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-300 flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Loader2, { className: "w-4 h-4 animate-spin" }),
      " Preparing your assessment."
    ] }),
    result && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { "aria-labelledby": "geopolitical-assessment-title", className: "rounded-xl border border-[#2A2A2A] bg-[#111111] p-4 sm:p-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-[#252525]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-[0.2em] text-orange-300/70 font-mono", children: "Analysis result" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { id: "geopolitical-assessment-title", className: "text-lg sm:text-xl font-semibold text-[#EDEDED] mt-1", children: "Geopolitical Assessment" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-[#888888] mt-1", children: "Structured risk, relevance, and infrastructure impact for the submitted event." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: "User analysis" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mt-6 space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("section", { className: `rounded-lg border p-4 sm:p-5 ${riskCardClasses[riskLevel]}`, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#777777] font-mono", children: "Risk summary" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-[#888888] mt-1", children: "Deterministic risk assessment" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3 mt-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatusBadge, { level: riskLevel === "critical" ? "CRITICAL" : riskLevel === "high" ? "ELEVATED" : riskLevel === "medium" ? "MODERATE" : riskLevel === "low" ? "AVAILABLE" : "UNKNOWN", label: riskLevel.toUpperCase(), size: "md" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: `text-3xl font-semibold font-mono ${riskTextClasses[riskLevel]}`, children: riskScore === null ? "\u2014" : riskScore }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-xs text-[#888888] font-mono", children: "/ 100 risk score" })
            ] })
          ] }),
          onNavigate && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", onClick: viewDigitalTwin, className: "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#EDEDED] hover:border-orange-500/60 hover:text-orange-300 cursor-pointer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Network, { className: "w-3.5 h-3.5" }),
            " View in Digital Twin ",
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.ArrowUpRight, { className: "w-3.5 h-3.5" })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ResultSection, { title: "Executive Assessment", icon: import_lucide_react2.BrainCircuit, emphasis: "primary", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm leading-7 text-[#D4D4D4]", children: renderSafeAssessmentMarkdown(compactAssessmentText(result.explanation)) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "grid grid-cols-1 xl:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(ResultSection, { title: "Event", icon: import_lucide_react2.ClipboardList, children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DetailGrid, { items: [
              ["Title", result.event?.title],
              ["Category", humanizeLabel(result.event?.category)],
              ["Severity", humanizeLabel(result.event?.severity)],
              ["Location", result.event?.location],
              ["Countries", listOrUnavailable(result.event?.countriesInvolved)],
              ["Source", result.event?.source]
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LongText, { label: "Description", value: result.event?.description }),
            result.event?.timestamp && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "mt-4 text-xs", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { className: "cursor-pointer text-[#777777] hover:text-orange-300 font-mono", children: "View event timestamp" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mt-2 text-[#B0B0B0]", children: result.event.timestamp })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(ResultSection, { title: "Classification", icon: import_lucide_react2.Globe2, children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DetailGrid, { items: [
              ["Energy relevance", result.classification?.energyRelevant === void 0 ? void 0 : result.classification.energyRelevant ? "Relevant" : "Not relevant"],
              ["Region", humanizeLabel(result.classification?.region)],
              ["Category", humanizeLabel(result.classification?.category)],
              ["Severity", humanizeLabel(result.classification?.severity)]
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ReasonList, { label: "Classification summary", values: result.classification?.classificationReasons, summary: classificationSummary(result), detailsLabel: "View classification reasoning" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(ResultSection, { title: "Supply-chain Relevance", icon: import_lucide_react2.Target, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DetailGrid, { items: [
            ["Relevant", result.relevance?.relevant === void 0 ? void 0 : result.relevance.relevant ? "Yes" : "No"],
            ["Matched node types", humanizedListOrUnavailable(result.relevance?.matchedNodeTypes)],
            ["Matched locations", listOrUnavailable(result.relevance?.matchedLocations)],
            ["Matched countries", listOrUnavailable(result.relevance?.matchedCountries)]
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NodeIdList, { label: "Matched assets", nodeIds: result.relevance?.matchedNodeIds, nodeTypes: result.relevance?.matchedNodeTypes, onViewDigitalTwin: onNavigate ? viewDigitalTwin : void 0 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ReasonList, { label: "Why this matters", values: result.relevance?.relevanceReasons, summary: relevanceSummary(result), detailsLabel: "View detailed reasoning" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(ResultSection, { title: "Supply Chain Impact", icon: import_lucide_react2.Network, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DetailGrid, { items: [
            ["Affected assets", result.digitalTwinImpact?.affectedNodeIds?.length],
            ["Affected connections", result.digitalTwinImpact?.affectedEdgeIds?.length],
            ["Asset types", humanizedListOrUnavailable(result.digitalTwinImpact?.affectedNodeTypes)],
            ["Capacity", formatMeasurement(result.digitalTwinImpact?.affectedCapacity)],
            ["Current flow", formatMeasurement(result.digitalTwinImpact?.affectedFlow)]
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NodeIdList, { label: "Affected assets", nodeIds: result.digitalTwinImpact?.affectedNodeIds, nodeTypes: result.digitalTwinImpact?.affectedNodeTypes, onViewDigitalTwin: onNavigate ? viewDigitalTwin : void 0 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NodeIdList, { label: "Affected connections", nodeIds: result.digitalTwinImpact?.affectedEdgeIds }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ReasonList, { label: "Impact summary", values: result.digitalTwinImpact?.impactReasons, summary: impactSummary(result), detailsLabel: "View detailed impact reasoning" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(ResultSection, { title: "Risk Factors and Reasoning", icon: import_lucide_react2.CheckCircle2, children: [
          result.risk?.factors?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "space-y-2", children: result.risk.factors.map((factor, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-start justify-between gap-4 p-3 rounded-md border border-[#222222] bg-[#0D0D0D]", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs font-semibold text-[#D4D4D4]", children: humanizeLabel(factor.name) }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[11px] text-[#888888] mt-1 leading-relaxed", children: renderSafeAssessmentMarkdown(factor.explanation) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-xs font-mono text-orange-300 whitespace-nowrap", children: typeof factor.points === "number" ? `+${factor.points}` : "N/A" })
          ] }, `${factor.name || "factor"}-${index}`)) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-[#888888]", children: "Not available" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ScoreCalculation, { score: riskScore, factors: result.risk?.factors, reasoning: result.risk?.reasoning })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pt-10 sm:pt-14 border-t border-[#252525]", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      MonitoringSection,
      {
        status: monitoring,
        events: monitoredEvents,
        loading: monitoringLoading,
        error: monitoringError,
        alerts: monitoringAlerts,
        onRefreshNews: handleRefreshNews,
        refreshing: monitoringRefreshing,
        refreshMessage: monitoringRefreshMessage,
        refreshError: monitoringRefreshError,
        onViewDigitalTwin: onNavigate ? viewDigitalTwin : void 0
      }
    ) })
  ] });
};
var getPageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
};
var Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPage, totalPages);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("nav", { "aria-label": "Monitored events pagination", className: "flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#222222]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onPageChange(currentPage - 1),
        disabled: currentPage === 1,
        className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#B0B0B0] hover:text-[#EDEDED] hover:border-[#555555] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.ChevronLeft, { className: "w-3.5 h-3.5" }),
          " Previous"
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex items-center gap-1 flex-wrap", children: pages.map((p, idx) => {
      if (p === "...") {
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "px-2 py-1 text-xs font-mono text-[#555555]", children: "..." }, `ellipsis-${idx}`);
      }
      const isCurrent = p === currentPage;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          onClick: () => onPageChange(p),
          className: `px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-colors ${isCurrent ? "border border-orange-500/60 bg-orange-500/10 text-orange-300 font-semibold" : "border border-[#252525] bg-[#0D0D0D] text-[#888888] hover:text-[#EDEDED] hover:border-[#444444]"}`,
          children: p
        },
        p
      );
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onPageChange(currentPage + 1),
        disabled: currentPage === totalPages,
        className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#B0B0B0] hover:text-[#EDEDED] hover:border-[#555555] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        children: [
          "Next ",
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.ChevronRight, { className: "w-3.5 h-3.5" })
        ]
      }
    )
  ] });
};
var MonitoringSection = ({ status, events, alerts, loading, error, onRefreshNews, refreshing, refreshMessage, refreshError, onViewDigitalTwin }) => {
  const externalStatus = getExternalMonitoringStatus(events);
  const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
  const pageSize = 10;
  (0, import_react.useEffect)(() => {
    setCurrentPage(1);
  }, [events.length, events[0]?.article?.id]);
  const totalEvents = events.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEvents);
  const pagedEvents = events.slice(startIndex, endIndex);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "rounded-lg border border-[#222222] bg-[#121212] p-4 sm:p-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Globe2, { className: "w-4 h-4 text-orange-400" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-[0.2em] text-orange-300/70 font-mono", children: "Live external intelligence" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "text-base font-semibold text-[#EDEDED] mt-1", children: "Automatic Geopolitical Monitoring" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-[#777777] mt-1", children: "Source-linked energy and geopolitical events for the command overview." })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", onClick: onRefreshNews, disabled: refreshing || loading, className: "inline-flex items-center justify-center gap-2 rounded-md border border-orange-500/40 px-3 py-2 text-xs font-mono text-orange-300 hover:border-orange-400 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto", children: [
          refreshing ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Loader2, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.RefreshCw, { className: "w-3.5 h-3.5" }),
          refreshing ? "Refreshing..." : "Refresh News"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col items-start sm:items-end gap-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatusBadge, { level: externalStatus.state === "ACTIVE" ? "AVAILABLE" : externalStatus.state === "STANDBY" ? "MONITORING" : "UNKNOWN", label: externalStatus.state, size: "sm" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-[10px] text-[#666666] font-mono", children: externalStatus.message }),
        externalStatus.state === "STANDBY" && externalStatus.latestEventAt && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-[10px] text-[#777777] font-mono", children: [
          "Last event: ",
          formatExternalMonitoringEventTime(externalStatus.latestEventAt)
        ] })
      ] })
    ] }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "py-5 text-xs text-[#888888] flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Loader2, { className: "w-3.5 h-3.5 animate-spin" }),
      " Loading monitoring status..."
    ] }) : error ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mt-4 flex items-start gap-2 text-xs text-amber-300", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.AlertCircle, { className: "w-4 h-4 flex-shrink-0" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: error })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MonitoringMetric, { label: "Detected", value: status?.detectedEvents }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MonitoringMetric, { label: "Relevant", value: status?.relevantEvents }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MonitoringMetric, { label: "High risk", value: status?.highRiskAlerts, color: "text-orange-400" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MonitoringMetric, { label: "Critical", value: status?.criticalAlerts, color: "text-red-400" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-wrap gap-x-5 gap-y-1 mt-4 text-xs font-mono text-[#777777]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
          "Source: ",
          valueOrUnavailable(status?.source)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
          "Last external scan: ",
          status?.lastSuccessfulExternalScan ? new Date(status.lastSuccessfulExternalScan).toLocaleString() : "Not available"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "UI refresh: 60s" })
      ] }),
      refreshMessage && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { role: "status", className: "mt-3 flex items-center gap-2 text-[11px] text-emerald-300", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.CheckCircle2, { className: "w-3.5 h-3.5" }),
        refreshMessage
      ] }),
      refreshError && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { role: "alert", className: "mt-3 flex items-center gap-2 text-[11px] text-amber-300", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.AlertCircle, { className: "w-3.5 h-3.5" }),
        refreshError
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mt-4 p-3 rounded-md border border-[#222222] bg-[#0D0D0D] text-[11px] text-[#888888]", children: externalStatus.message }),
      status?.lastError && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "mt-3 text-[11px] text-amber-300", children: [
        "Last monitor error: ",
        status.lastError
      ] }),
      events.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mt-6 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3 flex-wrap", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { className: "text-xs uppercase tracking-widest text-[#777777] font-mono", children: "Recent monitored events" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-xs text-orange-300/80 font-mono", children: [
              "Showing ",
              startIndex + 1,
              "\u2013",
              endIndex,
              " of ",
              totalEvents,
              " monitored events"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-xs text-[#555555] font-mono", children: "External sources only" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "space-y-3", children: pagedEvents.map((record) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MonitoredEventCard, { record, onViewDigitalTwin }, record.article?.id || record.detectedAt)) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Pagination,
          {
            currentPage: safePage,
            totalPages,
            onPageChange: setCurrentPage
          }
        )
      ] }),
      alerts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mt-6 space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { className: "text-xs uppercase tracking-widest text-red-300/80 font-mono", children: "Recent high-risk alerts" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-xs text-[#555555] font-mono", children: "High and critical risk only" })
        ] }),
        alerts.slice(0, 4).map((record) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MonitoredEventCard, { record, onViewDigitalTwin }, `alert-${record.article?.id || record.detectedAt}`))
      ] })
    ] })
  ] });
};
var MonitoringMetric = ({ label, value, color = "text-[#EDEDED]" }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rounded-md border border-[#222222] bg-[#0D0D0D] p-2.5", children: [
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: `mt-1 text-lg font-mono ${color}`, children: typeof value === "number" ? value.toLocaleString() : "\u2014" })
] });
var monitoredSourceLabel = (sourceType) => {
  if (sourceType === "google_news") return "Google News";
  if (sourceType === "direct_rss") return "Direct RSS";
  if (sourceType === "external_webhook") return "n8n / external webhook";
  return "External monitoring";
};
var MonitoredEventCard = ({ record, onViewDigitalTwin }) => {
  const analysis = record.analysis;
  const level = normalizedRiskLevel(analysis?.risk?.riskLevel || record.alertLevel);
  const affectedNodes = analysis?.digitalTwinImpact?.affectedNodeIds || [];
  const affectedEdges = analysis?.digitalTwinImpact?.affectedEdgeIds || [];
  const sourceUrl = record.article?.url;
  const sourceName = valueOrUnavailable(record.article?.source);
  const sourceNames = record.article?.sources?.length ? record.article.sources : [sourceName];
  const sourceReferences = record.article?.sourceReferences || [];
  const sourceLinks = sourceReferences.filter((reference) => reference.url);
  const eventLocation = valueOrUnavailable(analysis?.event?.location);
  const hasDigitalTwinImpact = affectedNodes.length > 0 || affectedEdges.length > 0;
  const detailedReasons = [
    ...analysis?.classification?.classificationReasons || [],
    ...analysis?.relevance?.relevanceReasons || [],
    ...analysis?.risk?.reasoning || [],
    ...analysis?.digitalTwinImpact?.impactReasons || []
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("article", { className: "rounded-lg border border-[#222222] bg-[#0D0D0D] p-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col lg:flex-row lg:items-start justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "min-w-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-xs uppercase tracking-widest text-orange-300/80 font-mono", children: "Monitored event" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatusBadge, { level: level === "critical" ? "CRITICAL" : level === "high" ? "ELEVATED" : level === "medium" ? "MODERATE" : level === "low" ? "AVAILABLE" : "UNKNOWN", label: level.toUpperCase(), size: "sm" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { className: "mt-1 text-sm font-semibold leading-snug text-[#EDEDED]", children: renderSafeAssessmentMarkdown(record.article?.title) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "mt-2 text-xs text-[#777777] font-mono", children: [
          record.article?.publishedAt ? new Date(record.article.publishedAt).toLocaleString() : "Timestamp not available",
          " \xB7 ",
          monitoredSourceLabel(record.article?.sourceType)
        ] })
      ] }),
      onViewDigitalTwin && hasDigitalTwinImpact && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", onClick: onViewDigitalTwin, className: "inline-flex items-center gap-1.5 text-xs font-mono text-orange-300 hover:text-orange-200 cursor-pointer flex-shrink-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Network, { className: "w-3.5 h-3.5" }),
        " View in Digital Twin"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs text-[#888888]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block text-[11px] uppercase tracking-wide text-[#666666] font-mono", children: "Risk" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block mt-1 font-semibold", children: level.toUpperCase() })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block text-[11px] uppercase tracking-wide text-[#666666] font-mono", children: "Score" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block mt-1 font-mono text-[#D4D4D4]", children: typeof analysis?.risk?.riskScore === "number" ? analysis.risk.riskScore.toLocaleString() : "Not available" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block text-[11px] uppercase tracking-wide text-[#666666] font-mono", children: "Location" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block mt-1 truncate", title: eventLocation, children: eventLocation })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block text-[11px] uppercase tracking-wide text-[#666666] font-mono", children: "Category" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "block mt-1 truncate", children: humanizeLabel(analysis?.classification?.category) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mt-4 text-sm leading-relaxed text-[#B0B0B0]", children: renderSafeAssessmentMarkdown(compactAssessmentText(analysis?.explanation)) }),
    detailedReasons.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "mt-4 text-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { className: "cursor-pointer text-[#777777] hover:text-orange-300 font-mono", children: "View detailed assessment" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { className: "mt-2 space-y-1.5", children: detailedReasons.map((reason, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { className: "text-[11px] text-[#888888] leading-relaxed pl-3 border-l border-[#333333]", children: humanizeReason(reason) }, `${reason}-${index}`)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mt-4 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-xs text-[#777777]", children: [
        "Sources: ",
        sourceNames.join(" \xB7 ")
      ] }),
      sourceUrl && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("a", { href: sourceUrl, target: "_blank", rel: "noreferrer", className: "inline-flex text-xs font-mono text-orange-300 hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 rounded", children: "Open source" })
    ] }),
    sourceLinks.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "mt-3 text-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { className: "cursor-pointer text-[#777777] hover:text-orange-300 font-mono", children: [
        "Source coverage \xB7 ",
        sourceLinks.length,
        " links"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-2", children: sourceLinks.map((reference) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("a", { href: reference.url, target: "_blank", rel: "noreferrer", className: "text-orange-300 hover:text-orange-200 underline-offset-2 hover:underline", children: reference.source }, `${reference.source}-${reference.url}`)) })
    ] }),
    hasDigitalTwinImpact && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "mt-4 rounded-md border border-[#222222] bg-[#121212]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { className: "cursor-pointer list-none px-3 py-2.5 text-xs font-mono text-[#B0B0B0] hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 rounded-md", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "inline-flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Network, { className: "w-3.5 h-3.5 text-orange-400" }),
        " Supply Chain Impact \xB7 ",
        affectedNodes.length,
        " assets \xB7 ",
        affectedEdges.length,
        " connections"
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 pb-3 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NodeIdList, { label: "Affected assets", nodeIds: affectedNodes, nodeTypes: analysis?.digitalTwinImpact?.affectedNodeTypes }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NodeIdList, { label: "Affected connections", nodeIds: affectedEdges })
      ] })
    ] })
  ] });
};
var ResultSection = ({ title, icon: Icon, children, emphasis = "technical" }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: emphasis === "primary" ? "rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-4 sm:p-5" : "border-t border-[#252525] pt-5", children: [
  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: `flex items-center gap-2 ${emphasis === "primary" ? "pb-3 border-b border-[#252525]" : "pb-2"}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Icon, { className: `w-4 h-4 ${emphasis === "primary" ? "text-orange-400" : "text-[#777777]"}` }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "text-sm font-semibold text-[#EDEDED]", children: title })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pt-4 space-y-4", children })
] });
var DetailGrid = ({ items }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-xs", children: items.map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { className: "mt-1 text-[#D4D4D4] break-words", children: typeof value === "number" ? value.toLocaleString() : humanizeTechnicalText(value) })
] }, label)) });
var LongText = ({ label, value }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mt-1 text-xs text-[#B0B0B0] leading-relaxed", children: renderSafeAssessmentMarkdown(value) })
] });
var ReasonList = ({ label, values, summary, detailsLabel = "View detailed reasoning" }) => {
  const visibleItems = summary?.length ? summary : values?.slice(0, 2).map(humanizeReason) || [];
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "space-y-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: label }),
    visibleItems.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { className: "space-y-1.5", children: visibleItems.map((value, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { className: "text-[11px] text-[#999999] leading-relaxed pl-3 border-l border-orange-500/30", children: humanizeTechnicalText(value) }, `${value}-${index}`)) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-[#777777]", children: "Not available" }),
    values?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "text-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { className: "cursor-pointer text-[#777777] hover:text-orange-300 font-mono", children: detailsLabel }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { className: "mt-2 space-y-1.5", children: values.map((value, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { className: "text-[11px] text-[#888888] leading-relaxed pl-3 border-l border-[#333333]", children: humanizeReason(value) }, `${value}-${index}`)) })
    ] }) : null
  ] });
};
var NodeIdList = ({ label, nodeIds, nodeTypes, onViewDigitalTwin }) => {
  const isConnectionList = /connection|edge/i.test(label);
  const technicalDetailsLabel = isConnectionList ? "View affected network details" : "View technical asset details";
  const friendlyLabels = [...new Set((nodeIds || []).map((nodeId, index) => friendlyNodeLabel(nodeId, nodeTypes?.[index])))];
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: label }),
      onViewDigitalTwin && nodeIds?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: onViewDigitalTwin, className: "text-[10px] font-mono text-orange-300 hover:text-orange-200 cursor-pointer", children: "Open network" }) : null
    ] }),
    nodeIds?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      isConnectionList ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "mt-2 text-xs text-[#B0B0B0]", children: [
        nodeIds.length,
        " connected relationship",
        nodeIds.length === 1 ? "" : "s",
        " affected"
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex flex-wrap gap-1.5 mt-2", children: friendlyLabels.map((labelText) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "px-2 py-1 rounded border border-[#333333] bg-[#0D0D0D] text-[10px] text-[#B0B0B0]", children: labelText }, labelText)) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "mt-3 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { className: "cursor-pointer text-[#777777] hover:text-orange-300 font-mono", children: technicalDetailsLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex flex-wrap gap-1.5 mt-2", children: nodeIds.map((nodeId) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "px-2 py-1 rounded border border-[#333333] bg-[#0D0D0D] text-[10px] font-mono text-[#888888] break-all", children: nodeId }, nodeId)) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mt-1 text-xs text-[#777777]", children: "Not available" })
  ] });
};

// tests/assistant-page.test.ts
var assistantSource = (0, import_node_fs.readFileSync)(import_node_path.default.join(process.cwd(), "src/pages/AssistantPage.tsx"), "utf8");
(0, import_node_test.default)("fresh Assistant page starts empty without an automatic executive assessment", () => {
  const markup = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(AssistantPage));
  const textareaStart = markup.indexOf("<textarea");
  const textareaEnd = markup.indexOf("</textarea>", textareaStart);
  const textareaMarkup = markup.slice(textareaStart, textareaEnd + "</textarea>".length);
  import_strict.default.equal(INITIAL_ASSISTANT_REQUEST, "");
  import_strict.default.ok(textareaStart >= 0);
  import_strict.default.doesNotMatch(textareaMarkup, /Strait of Hormuz/);
  import_strict.default.doesNotMatch(markup, /Executive Assessment/);
});
(0, import_node_test.default)("example prompts remain explicit input actions and analysis remains submit-driven", () => {
  import_strict.default.ok(EXAMPLE_PROMPTS.includes("What happens if the Strait of Hormuz is disrupted?"));
  import_strict.default.match(assistantSource, /onClick=\{\(\) => setRequest\(prompt\)\}/);
  import_strict.default.match(assistantSource, /onSubmit=\{handleAnalyze\}/);
  import_strict.default.match(assistantSource, /setResult\(await analyzeGeopoliticalRisk\(normalizedRequest\)\)/);
  import_strict.default.doesNotMatch(assistantSource, /useEffect\([\s\S]*analyzeGeopoliticalRisk\(request/);
});
(0, import_node_test.default)("analysis result renders before automatic monitoring in the page layout", () => {
  const resultMarkers = [
    "Deterministic risk assessment",
    "Executive Assessment",
    '<ResultSection title="Event"',
    '<ResultSection title="Classification"',
    "Supply-chain Relevance",
    "Supply Chain Impact",
    "Risk Factors and Reasoning"
  ];
  const resultPositions = resultMarkers.map((marker) => assistantSource.indexOf(marker));
  const monitoringRenderPosition = assistantSource.indexOf("<MonitoringSection");
  const assessmentContainerPosition = assistantSource.indexOf('aria-labelledby="geopolitical-assessment-title"');
  const monitoringDividerPosition = assistantSource.indexOf("pt-10 sm:pt-14 border-t border-[#252525]");
  import_strict.default.ok(resultPositions.every((position) => position >= 0));
  import_strict.default.ok(resultPositions.every((position, index) => index === 0 || position > resultPositions[index - 1]));
  import_strict.default.ok(assessmentContainerPosition >= 0);
  import_strict.default.ok(assessmentContainerPosition < resultPositions[0]);
  import_strict.default.ok(monitoringDividerPosition > resultPositions[resultPositions.length - 1]);
  import_strict.default.ok(monitoringRenderPosition > resultPositions[resultPositions.length - 1]);
  import_strict.default.match(assistantSource, /Live external intelligence/);
  import_strict.default.doesNotMatch(assistantSource, /Affected nodes/);
  import_strict.default.doesNotMatch(assistantSource, /Affected edges/);
});
(0, import_node_test.default)("Executive Assessment renders safe bold markdown without exposing raw syntax", () => {
  const markup = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement("p", null, renderSafeAssessmentMarkdown("**critical** event with a **score of 87** and `chokepoint-strait-of-hormuz`.")));
  import_strict.default.match(markup, /<strong[^>]*>critical<\/strong>/);
  import_strict.default.match(markup, /<strong[^>]*>score of 87<\/strong>/);
  import_strict.default.doesNotMatch(markup, /\*\*/);
  import_strict.default.doesNotMatch(markup, /`/);
  import_strict.default.doesNotMatch(markup, /chokepoint-strait-of-hormuz/);
  import_strict.default.match(markup, /Chokepoint: Strait of Hormuz/);
});
(0, import_node_test.default)("raw Digital Twin identifiers are hidden behind technical details", () => {
  const rawNodeId = "shipping-route-hormuz-india";
  const markup = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(NodeIdList, {
    label: "Affected assets",
    nodeIds: [rawNodeId],
    nodeTypes: ["shipping_route"]
  }));
  const defaultView = markup.slice(0, markup.indexOf("<details"));
  import_strict.default.doesNotMatch(defaultView, new RegExp(rawNodeId));
  import_strict.default.match(defaultView, /Shipping route: Hormuz India/);
  import_strict.default.match(markup, /View technical asset details/);
  import_strict.default.match(markup, new RegExp(rawNodeId));
});
(0, import_node_test.default)("analysis presentation uses concise summaries and expandable reasoning", () => {
  import_strict.default.match(assistantSource, /Why this matters/);
  import_strict.default.match(assistantSource, /Impact summary/);
  import_strict.default.match(assistantSource, /How the score was calculated/);
  import_strict.default.match(assistantSource, /View classification reasoning/);
  import_strict.default.match(assistantSource, /View detailed impact reasoning/);
  import_strict.default.doesNotMatch(assistantSource, /Assessment reasoning/);
});
var externalEvent = (detectedAt) => ({
  article: { sourceType: "external_webhook" },
  detectedAt
});
(0, import_node_test.default)("automatic monitoring reports ACTIVE for a recent external webhook event", () => {
  const now = Date.parse("2026-08-23T12:00:00.000Z");
  const status = getExternalMonitoringStatus([externalEvent("2026-08-23T11:45:00.000Z")], now);
  import_strict.default.equal(status.state, "ACTIVE");
  import_strict.default.equal(status.message, "External ingestion pipeline is receiving events.");
  import_strict.default.equal(status.latestEventAt, void 0);
  import_strict.default.doesNotMatch(status.message, /ORBIT_MONITORING_ENABLED|RSS polling/);
});
(0, import_node_test.default)("automatic monitoring reports STANDBY with the latest event time when external events are stale", () => {
  const now = Date.parse("2026-08-23T12:00:00.000Z");
  const detectedAt = new Date(now - EXTERNAL_MONITORING_FRESHNESS_MS - 1).toISOString();
  const status = getExternalMonitoringStatus([
    externalEvent(detectedAt)
  ], now);
  import_strict.default.equal(status.state, "STANDBY");
  import_strict.default.equal(status.message, "No new external events recently.");
  import_strict.default.equal(status.latestEventAt, detectedAt);
  import_strict.default.equal(formatExternalMonitoringEventTime(status.latestEventAt).length > 0, true);
  import_strict.default.match(assistantSource, /Last event:/);
});
(0, import_node_test.default)("automatic monitoring reports WAITING before the first external webhook event", () => {
  const status = getExternalMonitoringStatus([]);
  import_strict.default.equal(status.state, "WAITING");
  import_strict.default.equal(status.message, "Waiting for the first event from the external ingestion pipeline.");
  import_strict.default.equal(status.latestEventAt, void 0);
  import_strict.default.doesNotMatch(assistantSource, /Automatic monitoring is disabled|ORBIT_MONITORING_ENABLED/);
});
(0, import_node_test.default)("getPageNumbers generates compact Google-style pagination page numbers", () => {
  import_strict.default.deepEqual(getPageNumbers(1, 5), [1, 2, 3, 4, 5]);
  import_strict.default.deepEqual(getPageNumbers(1, 7), [1, 2, 3, 4, 5, 6, 7]);
  import_strict.default.deepEqual(getPageNumbers(1, 10), [1, 2, 3, 4, 5, "...", 10]);
  import_strict.default.deepEqual(getPageNumbers(6, 12), [1, "...", 5, 6, 7, "...", 12]);
  import_strict.default.deepEqual(getPageNumbers(11, 12), [1, "...", 8, 9, 10, 11, 12]);
});
(0, import_node_test.default)("Recent Monitored Events includes Google-style pagination components and range counters", () => {
  import_strict.default.match(assistantSource, /Showing \{startIndex \+ 1\}–\{endIndex\} of \{totalEvents\} monitored events/);
  import_strict.default.match(assistantSource, /nav aria-label="Monitored events pagination"/);
  import_strict.default.match(assistantSource, /Previous/);
  import_strict.default.match(assistantSource, /Next/);
  import_strict.default.match(assistantSource, /fetchMonitoredEvents\(200\)/);
});
