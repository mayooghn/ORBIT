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
var import_lucide_react = require("lucide-react");

// src/components/common/StatusBadge.tsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "span",
    {
      className: `inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border font-semibold ${sizeClasses} ${colorClasses}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
var import_jsx_runtime2 = require("react/jsx-runtime");
var PageHeader = ({
  title,
  subtitle,
  badgeText,
  badgeLevel = "NOT_CONNECTED",
  actions
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDED]", children: title }),
        badgeText && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StatusBadge, { level: badgeLevel, label: badgeText, size: "sm" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm sm:text-base text-[#999999] mt-2 max-w-2xl leading-relaxed", children: subtitle })
    ] }),
    actions && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center gap-2.5 flex-shrink-0", children: actions })
  ] });
};

// src/services/api.ts
var requestJson = async (url, init) => {
  const response = await fetch(url, init);
  let body = null;
  const rawText = await response.text();
  if (rawText && rawText.trim()) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const errorMsg = typeof body?.error === "string" ? body.error : `Request failed with HTTP status ${response.status}.`;
    throw new Error(errorMsg);
  }
  if (!body) {
    throw new Error("Server returned an unexpected response format. Please try again.");
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
var import_jsx_runtime3 = require("react/jsx-runtime");
var EXAMPLE_PROMPTS = [
  "What happens if the Strait of Hormuz is disrupted?",
  "Assess the supply-chain risk of a disruption in Saudi Arabian crude exports.",
  "What is the impact of a maritime blockade in the Bab el-Mandeb Strait?",
  "Evaluate energy supply vulnerability from a disruption at the Port of Ras Tanura."
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
var friendlyNodeLabel = (nodeId, nodeType, nodeName) => {
  if (nodeName && nodeName.trim() && !nodeName.startsWith("refinery-") && !nodeName.startsWith("port-") && !nodeName.startsWith("supplier-") && !nodeName.startsWith("shipping_route-") && !nodeName.startsWith("chokepoint-")) {
    return nodeName.trim();
  }
  const normalizedId = nodeId.trim().toLowerCase();
  const prefix = nodeTypePrefixes.find(([candidate]) => normalizedId.startsWith(`${candidate}-`));
  const typeLabel = nodeType ? humanizeLabel(nodeType) : prefix?.[1];
  const suffix = prefix ? nodeId.slice(prefix[0].length + 1).replace(/[_-]+/g, " ").trim() : "";
  const compactSuffix = suffix.replace(/\s/g, "");
  const opaqueSuffix = compactSuffix.length >= 16 && /^[a-z0-9]+$/i.test(compactSuffix) && /\d/.test(compactSuffix);
  if (suffix && !opaqueSuffix) {
    const formattedSuffix = humanizeLabel(suffix);
    if (typeLabel && !formattedSuffix.toLowerCase().includes(typeLabel.toLowerCase())) {
      return `${typeLabel}: ${formattedSuffix}`;
    }
    return formattedSuffix;
  }
  return typeLabel || "Supply Chain Asset";
};
var humanizeTechnicalText = (value, preserveMarkdown = false) => {
  let text = valueOrUnavailable(value).replace(/`([^`]+)`/g, "$1").replace(/\bevt-[a-z0-9-]+\b/gi, "the event").replace(/\b(?:rel|edge)-[a-z0-9-]+\b/gi, "connected relationship").replace(/,?\s*(?:calculated from|driven by)\s+.*?(?:event severity|energy relevance|digital twin relevance|supplier exposure|severity|points for)[^.\n]*/gi, "").replace(/\s*\(\d+\s+points for [^)]+\)/gi, "");
  const technicalIdentifierPattern = /\b(?:shipping[-_]route|chokepoint|supplier|port|refinery|pipeline|terminal|storage|reserve|node|edge)[-_][a-z0-9_-]+\b/gi;
  text = text.replace(technicalIdentifierPattern, (identifier) => friendlyNodeLabel(identifier));
  text = text.replace(/\s+\./g, ".").replace(/\.{2,}/g, ".").replace(/\s{2,}/g, " ");
  return (preserveMarkdown ? text : text.replace(/\*\*/g, "")).replace(/[^\S\r\n]+/g, " ").trim();
};
var renderSafeAssessmentMarkdown = (value) => {
  const lines = humanizeTechnicalText(value, true).split(/\r?\n/);
  return lines.flatMap((line, lineIndex) => {
    const inlineParts = line.split(/(\*\*[^*]+?\*\*)/g).map((part, partIndex) => {
      const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
      if (boldMatch) return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "font-semibold text-slate-100", children: boldMatch[1] }, `${lineIndex}-bold-${partIndex}`);
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react.default.Fragment, { children: part.replace(/\*\*/g, "") }, `${lineIndex}-text-${partIndex}`);
    });
    return lineIndex < lines.length - 1 ? [...inlineParts, /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("br", {}, `${lineIndex}-break`)] : inlineParts;
  });
};
var formatMeasurementParts = (summary) => {
  const values = [...summary?.nodeTotals || [], ...summary?.edgeTotals || []].filter((measurement) => typeof measurement.value === "number" && typeof measurement.unit === "string" && measurement.unit.trim());
  if (!values.length) return { value: "Not available", unit: "" };
  const first = values[0];
  const valStr = first.value != null ? first.value.toLocaleString() : "0";
  const unitStr = first.unit ? first.unit.replaceAll("_", " ") : "";
  return { value: valStr, unit: unitStr };
};
var normalizedRiskLevel = (level) => {
  const normalized = level?.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") {
    return normalized;
  }
  return "unknown";
};
var riskBadgeConfig = {
  low: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", label: "LOW RISK" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", label: "MODERATE" },
  high: { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400", label: "HIGH RISK" },
  critical: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", label: "CRITICAL" },
  unknown: { bg: "bg-slate-800/40", border: "border-slate-700/40", text: "text-slate-400", label: "UNKNOWN" }
};
var compactAssessmentText = (value) => {
  return humanizeTechnicalText(value, true);
};
var AssistantPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = (0, import_react.useState)("assess");
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
  const [feedRiskFilter, setFeedRiskFilter] = (0, import_react.useState)("all");
  const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
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
        setMonitoringRefreshMessage("Refresh triggered. External scan in progress.");
      } else {
        const hasNewEvents = snapshot?.events.some((record) => !previousEventKeys.has(monitoringRecordKey(record))) || false;
        setMonitoringRefreshMessage(hasNewEvents ? "News refreshed successfully." : "Scan complete. No new events found.");
      }
    } catch {
      setMonitoringRefreshMessage("Scan requested. Waiting for updates.");
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
      const res = await analyzeGeopoliticalRisk(normalizedRequest);
      setResult(res);
      setActiveTab("assess");
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : "The geopolitical risk agent could not complete the analysis.");
    } finally {
      setLoading(false);
    }
  };
  const riskLevel = normalizedRiskLevel(result?.risk?.riskLevel);
  const riskScore = typeof result?.risk?.riskScore === "number" ? result.risk.riskScore : null;
  const cfg = riskBadgeConfig[riskLevel] || riskBadgeConfig.unknown;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-6 max-w-7xl mx-auto pb-12", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      PageHeader,
      {
        title: "Geopolitical Risk Agent",
        subtitle: "Evaluate energy supply-chain vulnerabilities, simulate crisis scenarios, and monitor real-time global disruptions."
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-1.5 rounded-xl border border-slate-800 bg-[#090d16]/90 backdrop-blur-md shadow-lg", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 p-1 bg-slate-900/80 rounded-lg border border-slate-800/80", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => setActiveTab("assess"),
            className: `inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${activeTab === "assess" ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.ShieldAlert, { className: "w-4 h-4" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Risk Assessment" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => setActiveTab("monitor"),
            className: `inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${activeTab === "monitor" ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Globe2, { className: "w-4 h-4" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Live Intelligence Feed" }),
              monitoredEvents.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "monitor" ? "bg-white/20 text-white" : "bg-slate-800 text-orange-400 border border-orange-500/30"}`, children: monitoredEvents.length })
            ]
          }
        )
      ] }),
      activeTab === "monitor" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex items-center gap-3 px-3", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          onClick: handleRefreshNews,
          disabled: monitoringRefreshing,
          className: "inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-orange-300 transition-colors cursor-pointer disabled:opacity-50",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.RefreshCw, { className: `w-3.5 h-3.5 ${monitoringRefreshing ? "animate-spin text-orange-400" : ""}` }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: monitoringRefreshing ? "Scanning Live Intelligence..." : "Refresh News" })
          ]
        }
      ) })
    ] }),
    activeTab === "assess" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "rounded-xl border border-slate-800/90 bg-[#0c1019] p-5 sm:p-7 shadow-xl relative overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex items-center justify-between pb-4 border-b border-slate-800/80", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.BrainCircuit, { className: "w-5 h-5" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "text-base font-semibold text-slate-100 flex items-center gap-2", children: "Geopolitical Event Assessment Simulator" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-xs text-slate-400 mt-0.5", children: "Enter any geopolitical conflict, chokepoint shutdown, or supply disruption scenario to run real-time impact scoring." })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("form", { onSubmit: handleAnalyze, className: "mt-5 space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { htmlFor: "geopolitical-risk-request", className: "text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Sparkles, { className: "w-3.5 h-3.5 text-orange-400" }),
                " Scenario Prompt"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[11px] text-slate-500 font-mono", children: "Real-time Digital Twin evaluation" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "textarea",
              {
                id: "geopolitical-risk-request",
                value: request,
                onChange: (e) => setRequest(e.target.value),
                placeholder: "e.g. Assess the energy supply-chain impact of an escalating blockade in the Strait of Hormuz...",
                rows: 3,
                disabled: loading,
                className: "w-full resize-none p-4 rounded-lg border border-slate-800 bg-[#070a10] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/50 transition-all font-sans leading-relaxed disabled:opacity-60"
              }
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2", children: "Quick Presets:" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-wrap gap-2", children: EXAMPLE_PROMPTS.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                onClick: () => setRequest(prompt),
                disabled: loading,
                className: "px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-orange-500/40 text-xs text-slate-300 hover:text-orange-300 transition-all cursor-pointer text-left flex items-center gap-2",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Zap, { className: "w-3 h-3 text-orange-400 flex-shrink-0" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "truncate max-w-xs", children: prompt })
                ]
              },
              prompt
            )) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex items-center justify-end pt-2", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "submit",
              disabled: loading || !request.trim(),
              className: "inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all",
              children: loading ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Loader2, { className: "w-4 h-4 animate-spin" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Computing Digital Twin Impact..." })
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.ShieldAlert, { className: "w-4 h-4" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Analyze Risk Scenario" })
              ] })
            }
          ) })
        ] })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-300 flex items-start gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "font-semibold text-sm", children: "Analysis Exception" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "mt-1 text-red-300/80", children: error })
        ] })
      ] }),
      loading && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-8 rounded-xl border border-orange-500/30 bg-orange-500/5 text-center flex flex-col items-center justify-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "relative", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.BrainCircuit, { className: "w-6 h-6 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-sm font-semibold text-slate-200 font-mono", children: "Running Geopolitical Risk Engine..." }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-xs text-slate-400 max-w-md", children: "Matching scenario against maritime chokepoints, refinery networks, and strategic reserves..." })
      ] }),
      result && !loading && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-6 animate-fadeIn", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: `rounded-xl border ${cfg.border} bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden`, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-5 pr-6 border-b lg:border-b-0 lg:border-r border-slate-800 pb-5 lg:pb-0", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "relative flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: `w-24 h-24 rounded-2xl border ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center shadow-lg`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `text-4xl font-black font-mono tracking-tight ${cfg.text}`, children: riskScore !== null ? riskScore : "\u2014" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5", children: "/ 100" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                StatusBadge,
                {
                  level: riskLevel === "critical" ? "CRITICAL" : riskLevel === "high" ? "ELEVATED" : riskLevel === "medium" ? "MODERATE" : "AVAILABLE",
                  label: cfg.label,
                  size: "md"
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: "text-lg font-bold text-slate-100", children: result.event?.title || "Geopolitical Risk Assessment" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-xs font-mono text-slate-400", children: "Evaluated by ORBIT Supply Chain Intelligence Engine" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-3 rounded-lg border border-slate-800 bg-[#070a10]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-slate-500 uppercase tracking-wider block", children: "Affected Assets" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-base font-bold font-mono text-slate-200 mt-1 block", children: [
                result.digitalTwinImpact?.affectedNodeIds?.length || 0,
                " Nodes"
              ] })
            ] }),
            (() => {
              const flowParts = formatMeasurementParts(result.digitalTwinImpact?.affectedFlow);
              const capacityParts = formatMeasurementParts(result.digitalTwinImpact?.affectedCapacity);
              return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-3 rounded-lg border border-slate-800 bg-[#070a10]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-slate-500 uppercase tracking-wider block", children: "Flow Reduction" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-base font-bold font-mono text-orange-400 mt-1 block", children: flowParts.value }),
                  flowParts.unit && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs font-mono text-orange-400/80 block mt-0.5 leading-snug", children: flowParts.unit })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-3 rounded-lg border border-slate-800 bg-[#070a10] col-span-2 sm:col-span-1", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-slate-500 uppercase tracking-wider block", children: "Capacity Exposed" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-base font-bold font-mono text-amber-400 mt-1 block", children: capacityParts.value }),
                  capacityParts.unit && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs font-mono text-amber-400/80 block mt-0.5 leading-snug", children: capacityParts.unit })
                ] })
              ] });
            })()
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rounded-xl border border-slate-800/80 bg-[#0c1019] p-6 shadow-lg", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.BrainCircuit, { className: "w-4 h-4 text-orange-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: "text-sm font-semibold font-mono text-slate-200 uppercase tracking-wider", children: "Executive Threat Assessment" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "text-sm text-slate-300 leading-relaxed space-y-3 font-sans", children: renderSafeAssessmentMarkdown(compactAssessmentText(result.explanation)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 pb-3 border-b border-slate-800", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Network, { className: "w-4 h-4 text-orange-400" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { className: "text-xs font-mono uppercase tracking-wider font-semibold text-slate-200", children: "Impacted Supply Chain" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-3 text-xs", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1", children: "Impacted Assets" }),
              result.digitalTwinImpact?.affectedNodeIds?.length ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "space-y-2 max-h-80 overflow-y-auto pr-1", children: result.digitalTwinImpact.affectedNodeIds.map((nodeId, idx) => {
                const nodeType = result.digitalTwinImpact?.affectedNodeTypes?.[idx];
                const nodeName = result.digitalTwinImpact?.affectedNodeNames?.[idx];
                const label = friendlyNodeLabel(nodeId, nodeType, nodeName);
                return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "li",
                  {
                    className: "flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10] font-mono text-xs",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold text-slate-200", children: label })
                      ] }),
                      nodeType && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700/50", children: humanizeLabel(nodeType) })
                    ]
                  },
                  `${nodeId}-${idx}`
                );
              }) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-slate-500 italic", children: "No specific nodes impacted" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rounded-xl border border-slate-800 bg-[#0c1019] p-5 space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 pb-3 border-b border-slate-800", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Globe2, { className: "w-4 h-4 text-cyan-400" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { className: "text-xs font-mono uppercase tracking-wider font-semibold text-slate-200", children: "Geopolitical Classification" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-3 text-xs", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("ul", { className: "divide-y divide-slate-800/80 rounded-lg border border-slate-800/80 bg-[#070a10] overflow-hidden font-mono", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { className: "flex items-center justify-between p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] text-slate-500 uppercase tracking-wider", children: "Region" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold text-slate-200", children: humanizeLabel(result.classification?.region) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { className: "flex items-center justify-between p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] text-slate-500 uppercase tracking-wider", children: "Category" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold text-slate-200", children: humanizeLabel(result.classification?.category) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { className: "flex items-center justify-between p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] text-slate-500 uppercase tracking-wider", children: "Severity" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold text-orange-400", children: humanizeLabel(result.classification?.severity) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { className: "flex items-center justify-between p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] text-slate-500 uppercase tracking-wider", children: "Energy Relevance" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold text-emerald-400", children: result.classification?.energyRelevant ? "Confirmed" : "Indirect" })
                ] })
              ] }),
              result.event?.description && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "pt-2 border-t border-slate-800/60 text-xs", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1", children: "Scenario Description" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-slate-400 leading-relaxed text-[11px] font-sans", children: result.event.description })
              ] })
            ] })
          ] })
        ] })
      ] })
    ] }),
    activeTab === "monitor" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-6", children: [
      (() => {
        const status = getExternalMonitoringStatus(monitoredEvents);
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800/80 bg-[#0c1019] shadow-sm font-mono text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `h-2 w-2 rounded-full ${status.state === "ACTIVE" ? "bg-emerald-500" : status.state === "STANDBY" ? "bg-amber-500" : "bg-slate-500"}` }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-slate-400", children: [
              "Ingestion Status: ",
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-slate-200 font-semibold", children: status.state })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-slate-600", children: "\xB7" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-slate-400", children: status.message })
          ] }),
          status.latestEventAt && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-slate-500", children: [
            "Last event: ",
            formatExternalMonitoringEventTime(status.latestEventAt)
          ] })
        ] });
      })(),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[11px] font-mono uppercase tracking-wider text-slate-400 block", children: "Total Monitored" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-2xl font-bold font-mono text-slate-100 mt-1 block", children: monitoring?.detectedEvents ?? monitoredEvents.length }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-slate-400 mt-1 block", children: "Live external stream" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[11px] font-mono uppercase tracking-wider text-slate-400 block", children: "Energy Relevant" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-2xl font-bold font-mono text-emerald-400 mt-1 block", children: monitoring?.relevantEvents ?? monitoredEvents.filter((e) => e.analysis?.classification?.energyRelevant).length }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-emerald-400/80 mt-1 block", children: "Supply chain matched" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[11px] font-mono uppercase tracking-wider text-slate-400 block", children: "High Risk Alerts" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-2xl font-bold font-mono text-orange-400 mt-1 block", children: monitoring?.highRiskAlerts ?? monitoredEvents.filter((e) => normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel) === "high").length }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-orange-400/80 mt-1 block", children: "Elevated priority" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-4 rounded-xl border border-slate-800 bg-[#0c1019] shadow-md", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[11px] font-mono uppercase tracking-wider text-slate-400 block", children: "Critical Threats" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-2xl font-bold font-mono text-red-400 mt-1 block", children: monitoring?.criticalAlerts ?? monitoredEvents.filter((e) => normalizedRiskLevel(e.alertLevel || e.analysis?.risk?.riskLevel) === "critical").length }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] font-mono text-red-400/80 mt-1 block", children: "Immediate action required" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-[#0c1019]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-xs font-mono text-slate-400 mr-2 flex items-center gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Filter, { className: "w-3.5 h-3.5" }),
            " Filter:"
          ] }),
          ["all", "critical", "high"].map((filter) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setFeedRiskFilter(filter),
              className: `px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${feedRiskFilter === filter ? "bg-slate-800 text-orange-400 border border-orange-500/40 font-bold" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"}`,
              children: filter
            },
            filter
          ))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "relative min-w-[220px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Search, { className: "w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "input",
            {
              type: "text",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              placeholder: "Search headline or location...",
              className: "w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 bg-[#070a10] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/80"
            }
          )
        ] })
      ] }),
      monitoringRefreshMessage && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2 font-mono", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.CheckCircle2, { className: "w-4 h-4 text-emerald-400 flex-shrink-0" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: monitoringRefreshMessage })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        FilteredMonitoredFeed,
        {
          events: monitoredEvents,
          alerts: monitoringAlerts,
          riskFilter: feedRiskFilter,
          searchQuery,
          loading: monitoringLoading,
          error: monitoringError
        }
      )
    ] })
  ] });
};
var FilteredMonitoredFeed = ({ events, riskFilter, searchQuery, loading, error }) => {
  const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
  const pageSize = 8;
  const filtered = events.filter((record) => {
    const level = normalizedRiskLevel(record.alertLevel || record.analysis?.risk?.riskLevel);
    if (riskFilter === "critical" && level !== "critical") return false;
    if (riskFilter === "high" && level !== "high") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = record.article?.title?.toLowerCase() || "";
      const location = record.analysis?.event?.location?.toLowerCase() || "";
      const category = record.analysis?.classification?.category?.toLowerCase() || "";
      return title.includes(q) || location.includes(q) || category.includes(q);
    }
    return true;
  });
  const totalEvents = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(page * pageSize, totalEvents);
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-12 text-center rounded-xl border border-slate-800 bg-[#0c1019] flex flex-col items-center justify-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Loader2, { className: "w-6 h-6 animate-spin text-orange-400" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs font-mono text-slate-400", children: "Loading live geopolitical telemetry..." })
    ] });
  }
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center gap-2 font-mono", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.AlertCircle, { className: "w-4 h-4 flex-shrink-0" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: error })
    ] });
  }
  if (!totalEvents) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-12 text-center rounded-xl border border-slate-800 bg-[#0c1019] space-y-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Globe2, { className: "w-8 h-8 text-slate-600 mx-auto" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-sm font-semibold text-slate-300", children: "No events matched your criteria" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-xs text-slate-500", children: "Try adjusting the risk filter or search keywords." })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center justify-between text-xs font-mono text-slate-400 px-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
        "Showing ",
        startIndex + 1,
        "\u2013",
        endIndex,
        " of ",
        totalEvents,
        " monitored events"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Real-time Google News & RSS Stream" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "space-y-3", children: paged.map((record) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FeedCard, { record }, record.article?.id || record.detectedAt)) }),
    totalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Pagination, { currentPage: page, totalPages, onPageChange: setCurrentPage })
  ] });
};
var FeedCard = ({ record }) => {
  const analysis = record.analysis;
  const level = normalizedRiskLevel(record.alertLevel || analysis?.risk?.riskLevel);
  const cfg = riskBadgeConfig[level] || riskBadgeConfig.unknown;
  const affectedNodes = analysis?.digitalTwinImpact?.affectedNodeIds || [];
  const sourceUrl = record.article?.url;
  const title = record.article?.title || "Geopolitical Event";
  const publishedAt = record.article?.publishedAt ? new Date(record.article.publishedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent";
  const location = analysis?.event?.location || analysis?.classification?.region || "Global";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: "rounded-xl border border-slate-800/90 bg-[#0c1019] hover:border-slate-700/80 p-5 transition-all shadow-md hover:shadow-lg space-y-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-1.5 flex-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wider ${cfg.bg} ${cfg.border} ${cfg.text}`, children: cfg.label }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-[11px] font-mono text-slate-500", children: [
          "\xB7 ",
          publishedAt
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-[11px] font-mono text-slate-500", children: [
          "\xB7 ",
          location
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: "text-sm font-semibold text-slate-100 leading-snug hover:text-orange-300 transition-colors", children: renderSafeAssessmentMarkdown(title) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
        affectedNodes.slice(0, 3).map((nodeId, idx) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-400", children: friendlyNodeLabel(
          nodeId,
          analysis?.digitalTwinImpact?.affectedNodeTypes?.[idx],
          analysis?.digitalTwinImpact?.affectedNodeNames?.[idx]
        ) }, nodeId)),
        affectedNodes.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-[10px] font-mono text-slate-500", children: [
          "+",
          affectedNodes.length - 3,
          " more"
        ] })
      ] }),
      sourceUrl && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "a",
        {
          href: sourceUrl,
          target: "_blank",
          rel: "noreferrer",
          className: "inline-flex items-center gap-1 text-xs font-mono text-orange-400 hover:text-orange-300 transition-colors",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Source Article" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.ExternalLink, { className: "w-3 h-3" })
          ]
        }
      )
    ] })
  ] });
};
var getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
};
var Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPage, totalPages);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("nav", { "aria-label": "Monitored events pagination", className: "flex items-center justify-between gap-3 pt-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onPageChange(currentPage - 1),
        disabled: currentPage === 1,
        className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.ChevronLeft, { className: "w-3.5 h-3.5" }),
          " Previous"
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex items-center gap-1", children: pages.map((p, idx) => {
      if (p === "...") return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "px-2 text-xs text-slate-600 font-mono", children: "..." }, idx);
      const isCurrent = p === currentPage;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          onClick: () => onPageChange(p),
          className: `px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all ${isCurrent ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"}`,
          children: p
        },
        p
      );
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onPageChange(currentPage + 1),
        disabled: currentPage === totalPages,
        className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        children: [
          "Next ",
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.ChevronRight, { className: "w-3.5 h-3.5" })
        ]
      }
    )
  ] });
};
var NodeIdList = ({ label, nodeIds, nodeTypes, nodeNames, onViewDigitalTwin }) => {
  const friendlyLabels = [...new Set((nodeIds || []).map((nodeId, index) => friendlyNodeLabel(nodeId, nodeTypes?.[index], nodeNames?.[index])))];
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center justify-between gap-3 mb-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-slate-500 font-mono", children: label }),
      onViewDigitalTwin && nodeIds?.length ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: onViewDigitalTwin, className: "text-[10px] font-mono text-orange-400 hover:text-orange-300 cursor-pointer", children: "Open network" }) : null
    ] }),
    nodeIds?.length ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-wrap gap-1.5", children: friendlyLabels.map((labelText) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] text-slate-300 font-mono", children: labelText }, labelText)) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-xs text-slate-500", children: "Not available" })
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
