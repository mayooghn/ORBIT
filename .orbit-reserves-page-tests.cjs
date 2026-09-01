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

// tests/reserves-page.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);
var import_react2 = __toESM(require("react"), 1);
var import_server = require("react-dom/server");
var import_node_test = __toESM(require("node:test"), 1);

// src/pages/ReservesPage.tsx
var import_react = require("react");
var import_lucide_react3 = require("lucide-react");

// src/components/common/ErrorState.tsx
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
var ErrorState = ({
  title = "Unable to retrieve intelligence telemetry",
  message = "A temporary connection timeout occurred while synchronizing with the telemetry gateway.",
  onRetry,
  className = ""
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: `flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 ${className}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.AlertCircle, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-sm font-semibold text-red-600 dark:text-red-400", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm", children: message }),
        onRetry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            onClick: onRetry,
            type: "button",
            className: "mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.RefreshCw, { className: "w-3.5 h-3.5" }),
              "Retry Connection"
            ]
          }
        )
      ]
    }
  );
};

// src/components/common/LoadingState.tsx
var import_lucide_react2 = require("lucide-react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var LoadingState = ({
  message = "Loading ORBIT foundation...",
  subtext = "Verifying application and authentication state",
  className = ""
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: `flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 ${className}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "relative mb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-12 h-12 rounded-full border-2 border-sky-500/20 dark:border-sky-500/30 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Loader2, { className: "w-6 h-6 text-sky-500 animate-spin" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute inset-0 rounded-full border-t-2 border-sky-400 animate-ping opacity-25" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide font-mono", children: message }),
        subtext && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm", children: subtext })
      ]
    }
  );
};

// src/components/common/MetricCard.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var MetricCard = ({
  title,
  value,
  unit,
  change,
  changeType = "neutral",
  icon: Icon,
  subtext,
  statusColor = "cyan"
}) => {
  let iconBg = "bg-[#1A1A1A] text-orange-400 border border-[#333333]";
  if (statusColor === "emerald") {
    iconBg = "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40";
  } else if (statusColor === "amber") {
    iconBg = "bg-amber-950/40 text-amber-400 border border-amber-800/40";
  } else if (statusColor === "crimson") {
    iconBg = "bg-red-950/40 text-red-400 border border-red-800/40";
  }
  let changeColor = "text-[#777777]";
  if (changeType === "positive") changeColor = "text-emerald-400";
  if (changeType === "negative") changeColor = "text-red-400";
  if (changeType === "warning") changeColor = "text-amber-400";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      className: "relative p-4 rounded-lg border border-[#222222] bg-[#121212] hover:border-[#333333] transition-colors min-w-0 overflow-hidden",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center justify-between gap-1.5 min-w-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[10px] sm:text-xs uppercase tracking-wider text-[#666666] font-semibold truncate", children: title }),
          Icon && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: `p-1.5 rounded shrink-0 ${iconBg}`, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { className: "w-3.5 h-3.5" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-2 flex items-baseline gap-1.5 min-w-0 overflow-hidden", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDED] font-mono truncate", children: value }),
          unit && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs font-medium text-[#777777] font-mono shrink-0", children: unit })
        ] }),
        (change || subtext) && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-[#1C1C1C] min-w-0", children: [
          change && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `font-mono font-medium ${changeColor} truncate`, children: change }),
          subtext && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[#666666] text-[11px] truncate", children: subtext })
        ] })
      ]
    }
  );
};

// src/components/common/StatusBadge.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "span",
    {
      className: `inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border font-semibold ${sizeClasses} ${colorClasses}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
var import_jsx_runtime5 = require("react/jsx-runtime");
var PageHeader = ({
  title,
  subtitle,
  badgeText,
  badgeLevel = "NOT_CONNECTED",
  actions
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h1", { className: "text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDED]", children: title }),
        badgeText && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatusBadge, { level: badgeLevel, label: badgeText, size: "sm" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-sm sm:text-base text-[#999999] mt-2 max-w-2xl leading-relaxed", children: subtitle })
    ] }),
    actions && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex items-center gap-2.5 flex-shrink-0", children: actions })
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
async function optimizeStrategicReserve(input) {
  const body = await requestJson(
    "/api/reserves/optimize",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
  if (body.status !== "AVAILABLE" || !body.reserve) {
    throw new Error(body.error || "Strategic reserve optimization returned no result.");
  }
  return {
    ...body.reserve,
    procurementProvenance: body.procurementProvenance,
    optimizationId: body.optimizationId
  };
}
async function fetchRealAlternativeProcurement(params) {
  const query = new URLSearchParams();
  if (params?.excludedCountry) query.set("excludedCountry", params.excludedCountry);
  if (params?.financialYear) query.set("financialYear", params.financialYear);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  const body = await requestJson(
    `/api/reserves/alternative-procurement${qs}`,
    {
      method: "GET",
      headers: { Accept: "application/json" }
    }
  );
  if (body.status !== "AVAILABLE" || !body.procurement) {
    throw new Error(body.error || "Failed to retrieve real alternative procurement from SQLite.");
  }
  return body.procurement;
}
async function fetchStrategicReserveState() {
  const body = await requestJson(
    "/api/reserves/state",
    {
      method: "GET",
      headers: { Accept: "application/json" }
    }
  );
  if (body.status !== "AVAILABLE" || !body.state) {
    throw new Error(body.error || "Failed to retrieve strategic reserve state.");
  }
  return body.state;
}
async function fetchStrategicReserveHistory(limit = 20) {
  const body = await requestJson(
    `/api/reserves/history?limit=${limit}`,
    {
      method: "GET",
      headers: { Accept: "application/json" }
    }
  );
  if (body.status !== "AVAILABLE" || !body.runs) {
    throw new Error(body.error || "Failed to retrieve strategic reserve optimization history.");
  }
  return body.runs;
}
async function fetchOptimizedReplacementSupply(params) {
  return requestJson("/api/procurement/optimize-gap", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });
}

// src/pages/ReservesPage.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var formatValue = (value) => value.toLocaleString(void 0, { maximumFractionDigits: 2 });
var PRESET_SCENARIOS = [
  {
    name: "Normal Supply Disruption",
    description: "Typical 30-day oil supply disruption used to evaluate a standard reserve response.",
    input: {
      currentReserve: 5e6,
      demand: 655271,
      availableSupply: 555271,
      supplyGap: 1e5,
      disruptionDuration: 30,
      alternativeProcurement: 5e4,
      replenishmentRate: 2e4,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Strait of Hormuz Crisis",
    description: "Major geopolitical shipping disruption with a severe crude supply deficit.",
    input: {
      currentReserve: 5e6,
      demand: 655271,
      availableSupply: 305271,
      supplyGap: 35e4,
      disruptionDuration: 60,
      alternativeProcurement: 1e5,
      replenishmentRate: 25e3,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Strong Backup Supply",
    description: "Disruption where alternative supplier capacity significantly reduces the need for reserve drawdown.",
    input: {
      currentReserve: 5e6,
      demand: 655271,
      availableSupply: 575271,
      supplyGap: 8e4,
      disruptionDuration: 14,
      alternativeProcurement: 15e4,
      replenishmentRate: 2e4,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Reserve Safety Limit",
    description: "Extreme disruption that tests ORBIT's hard minimum reserve safety constraint.",
    input: {
      currentReserve: 2e6,
      demand: 655271,
      availableSupply: 455271,
      supplyGap: 2e5,
      disruptionDuration: 45,
      alternativeProcurement: 2e4,
      replenishmentRate: 15e3,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Reserve Already Below Safe Level",
    description: "Emergency scenario where the starting reserve is already below the minimum safety threshold.",
    input: {
      currentReserve: 12e5,
      demand: 655271,
      availableSupply: 505271,
      supplyGap: 15e4,
      disruptionDuration: 30,
      alternativeProcurement: 3e4,
      replenishmentRate: 1e4,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Custom Crisis",
    description: "Create your own disruption scenario by entering the assumptions.",
    isCustom: true,
    input: {
      currentReserve: 5e6,
      demand: 655271,
      availableSupply: 555271,
      supplyGap: 1e5,
      disruptionDuration: 30,
      alternativeProcurement: 5e4,
      replenishmentRate: 2e4,
      minimumReserveThreshold: 15e5
    }
  }
];
var ResultMetric = ({ label, value, detail, highlight }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: `rounded-lg border p-3.5 min-w-0 overflow-hidden ${highlight ? "border-orange-500/40 bg-orange-950/10" : "border-[#222222] bg-[#121212]"}`, children: [
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#666666] truncate", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: `mt-1.5 font-mono text-lg sm:text-[22px] font-bold truncate ${highlight ? "text-orange-400" : "text-[#EDEDED]"}`, children: value }),
  detail && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-[11px] text-[#777777] truncate", children: detail })
] });
var buildRealBaselineOptimizationInput = (state, procurement, scenarioParams) => {
  const altProc = procurement?.availableAlternativeDailyTonnes ? Math.round(procurement.availableAlternativeDailyTonnes) : state.alternativeProcurement?.availableAlternativeDailyTonnes ? Math.round(state.alternativeProcurement.availableAlternativeDailyTonnes) : 0;
  const demand = Math.round(state.currentDemand);
  const targetGap = scenarioParams?.supplyGap ?? 1e5;
  const availableSupply = scenarioParams?.availableSupply ?? Math.max(0, demand - targetGap);
  return {
    currentReserve: state.currentReserve,
    demand,
    availableSupply,
    supplyGap: Math.max(0, demand - availableSupply),
    disruptionDuration: scenarioParams?.disruptionDuration ?? 30,
    alternativeProcurement: altProc,
    replenishmentRate: state.defaultReplenishmentRate,
    minimumReserveThreshold: state.minimumReserveThreshold
  };
};
var ReservesPage = () => {
  const [activeInput, setActiveInput] = (0, import_react.useState)(null);
  const [inputMode, setInputMode] = (0, import_react.useState)("REAL_BASELINE");
  const [activePresetName, setActivePresetName] = (0, import_react.useState)(null);
  const [result, setResult] = (0, import_react.useState)(null);
  const [optimizing, setOptimizing] = (0, import_react.useState)(false);
  const [optimizerError, setOptimizerError] = (0, import_react.useState)("");
  const [isCustomMode, setIsCustomMode] = (0, import_react.useState)(false);
  const [liveState, setLiveState] = (0, import_react.useState)(null);
  const [realProcurement, setRealProcurement] = (0, import_react.useState)(null);
  const [initialDataLoading, setInitialDataLoading] = (0, import_react.useState)(true);
  const [dataError, setDataError] = (0, import_react.useState)("");
  const [historyRuns, setHistoryRuns] = (0, import_react.useState)([]);
  const loadAllData = (0, import_react.useCallback)(async () => {
    setInitialDataLoading(true);
    setDataError("");
    setOptimizerError("");
    try {
      const [state, procurement, history] = await Promise.all([
        fetchStrategicReserveState(),
        fetchRealAlternativeProcurement({ limit: 50 }).catch(() => null),
        fetchStrategicReserveHistory(10).catch(() => [])
      ]);
      if (!state) {
        throw new Error("Unable to retrieve real strategic reserve state from SQLite database.");
      }
      setLiveState(state);
      const resolvedProcurement = procurement || state.alternativeProcurement || null;
      setRealProcurement(resolvedProcurement);
      setHistoryRuns(history);
      const baselineInput = buildRealBaselineOptimizationInput(state, resolvedProcurement);
      setActiveInput(baselineInput);
      setInputMode("REAL_BASELINE");
      const initialOptimization = await optimizeStrategicReserve(baselineInput);
      setResult(initialOptimization);
    } catch (err) {
      setLiveState(null);
      setRealProcurement(null);
      setActiveInput(null);
      setResult(null);
      setDataError(err instanceof Error ? err.message : "Failed to load real strategic reserve data.");
    } finally {
      setInitialDataLoading(false);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void loadAllData();
  }, [loadAllData]);
  const runOptimization = (0, import_react.useCallback)(async (customInput) => {
    const inputToUse = customInput ?? activeInput;
    if (!inputToUse) {
      setOptimizerError("No active baseline inputs available for optimization.");
      return;
    }
    const fieldsToCheck = [
      { name: "currentReserve", label: "Current reserve" },
      { name: "demand", label: "Daily demand" },
      { name: "availableSupply", label: "Available supply" },
      { name: "disruptionDuration", label: "Disruption duration" },
      { name: "alternativeProcurement", label: "Alternative procurement" },
      { name: "replenishmentRate", label: "Replenishment rate" },
      { name: "minimumReserveThreshold", label: "Minimum reserve threshold" }
    ];
    for (const { name, label } of fieldsToCheck) {
      const val = inputToUse[name];
      if (typeof val !== "number" || isNaN(val) || !Number.isFinite(val)) {
        setOptimizerError(`Invalid input for ${label}: Value must be a valid number.`);
        return;
      }
      if (val < 0) {
        setOptimizerError(`Invalid input for ${label}: Value cannot be negative.`);
        return;
      }
    }
    setOptimizing(true);
    setOptimizerError("");
    try {
      const response = await optimizeStrategicReserve(inputToUse);
      setResult(response);
    } catch (requestError) {
      setResult(null);
      setOptimizerError(requestError instanceof Error ? requestError.message : "Reserve optimization failed.");
    } finally {
      setOptimizing(false);
    }
  }, [activeInput]);
  const handleSelectPreset = (presetInput, presetName) => {
    setInputMode("PRESET");
    setActivePresetName(presetName);
    setIsCustomMode(false);
    setActiveInput(presetInput);
    void runOptimization(presetInput);
  };
  const handleSelectCustomCrisis = () => {
    setInputMode("CUSTOM");
    setActivePresetName("Custom Crisis");
    setIsCustomMode(true);
    const demand = liveState ? Math.round(liveState.currentDemand) : 655271;
    const availableSupply = activeInput?.availableSupply ?? Math.max(0, demand - 1e5);
    const customDefaults = activeInput ? {
      ...activeInput,
      supplyGap: Math.max(0, activeInput.demand - activeInput.availableSupply)
    } : {
      currentReserve: liveState?.currentReserve ?? 5e6,
      demand,
      availableSupply,
      supplyGap: Math.max(0, demand - availableSupply),
      disruptionDuration: 30,
      alternativeProcurement: realProcurement?.availableAlternativeDailyTonnes ? Math.round(realProcurement.availableAlternativeDailyTonnes) : liveState?.alternativeProcurement?.availableAlternativeDailyTonnes ? Math.round(liveState.alternativeProcurement.availableAlternativeDailyTonnes) : 5e4,
      replenishmentRate: liveState?.defaultReplenishmentRate ?? 2e4,
      minimumReserveThreshold: liveState?.minimumReserveThreshold ?? 15e5
    };
    setActiveInput(customDefaults);
    void runOptimization(customDefaults);
  };
  const handleResetToRealBaseline = () => {
    if (!liveState) return;
    const baseline = buildRealBaselineOptimizationInput(liveState, realProcurement);
    setInputMode("REAL_BASELINE");
    setActivePresetName(null);
    setIsCustomMode(false);
    setActiveInput(baseline);
    setOptimizerError("");
    void runOptimization(baseline);
  };
  const handleApplyRealAlternative = (dailyTonnes) => {
    if (!activeInput) return;
    const updated = { ...activeInput, alternativeProcurement: Math.round(dailyTonnes) };
    setActiveInput(updated);
    setInputMode("CUSTOM");
    setActivePresetName("Custom Crisis");
    setIsCustomMode(true);
    void runOptimization(updated);
  };
  const handleInputChange = (field, value) => {
    if (!activeInput) return;
    setInputMode("CUSTOM");
    setActivePresetName("Custom Crisis");
    setIsCustomMode(true);
    const updated = { ...activeInput, [field]: value };
    updated.supplyGap = Math.max(0, (updated.demand ?? 0) - (updated.availableSupply ?? 0));
    setActiveInput(updated);
    void runOptimization(updated);
  };
  const [mainTab, setMainTab] = (0, import_react.useState)("telemetry");
  const [replacementResult, setReplacementResult] = (0, import_react.useState)(null);
  const [replacementLoading, setReplacementLoading] = (0, import_react.useState)(false);
  const [replacementError, setReplacementError] = (0, import_react.useState)("");
  const loadReplacementSupply = (0, import_react.useCallback)(async () => {
    if (!activeInput || activeInput.supplyGap <= 0) {
      setReplacementResult(null);
      setReplacementError("");
      return;
    }
    setReplacementLoading(true);
    setReplacementError("");
    try {
      let affectedNodeId = void 0;
      if (activePresetName === "Strait of Hormuz Crisis") {
        affectedNodeId = "chokepoint-strait-of-hormuz";
      }
      const res = await fetchOptimizedReplacementSupply({
        supplyGap: activeInput.supplyGap,
        disruptionDuration: activeInput.disruptionDuration,
        affectedNodeId
      });
      setReplacementResult(res);
      if (res.status === "ERROR" && res.error) {
        setReplacementError(res.error);
      }
    } catch (err) {
      setReplacementResult(null);
      setReplacementError(err instanceof Error ? err.message : "Failed to retrieve optimized replacement supply.");
    } finally {
      setReplacementLoading(false);
    }
  }, [activeInput, activePresetName]);
  (0, import_react.useEffect)(() => {
    if (mainTab === "replacement") {
      void loadReplacementSupply();
    }
  }, [mainTab, loadReplacementSupply]);
  if (initialDataLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        PageHeader,
        {
          title: "Reserve Management",
          subtitle: "Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        LoadingState,
        {
          message: "Loading strategic reserve and procurement data...",
          subtext: "Querying database for ISPRL storage facilities, MoPNG daily petroleum consumption, and bilateral supplier import records."
        }
      )
    ] });
  }
  if (dataError || !liveState || !activeInput) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        PageHeader,
        {
          title: "Reserve Management",
          subtitle: "Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        ErrorState,
        {
          title: "Reserve data unavailable",
          message: dataError || "Failed to retrieve verified strategic reserve baselines from database.",
          onRetry: () => void loadAllData()
        }
      )
    ] });
  }
  const coverageIsComplete = result?.fullyCovered === true;
  const isSafetyCapActive = result && result.maximumSafeReserveDrawdown < result.residualSupplyGap * activeInput.disruptionDuration;
  const isBelowThreshold = result && result.constraintStatus === "BELOW_THRESHOLD";
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      PageHeader,
      {
        title: "Reserve Management",
        subtitle: "Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-1.5 flex items-center gap-2 overflow-x-auto shadow-md", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setMainTab("telemetry"),
          className: `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${mainTab === "telemetry" ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold" : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Database, { className: "h-4 w-4" }),
            "Strategic Reserve Sites",
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${mainTab === "telemetry" ? "bg-slate-950/30 text-slate-950" : "bg-cyan-950/60 text-cyan-400 border border-cyan-800/50"}`, children: "3 Sites" })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setMainTab("optimizer"),
          className: `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${mainTab === "optimizer" ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold" : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Calculator, { className: "h-4 w-4" }),
            "Reserve Optimizer"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setMainTab("suppliers"),
          className: `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${mainTab === "suppliers" ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold" : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Globe, { className: "h-4 w-4" }),
            "Backup Crude Supply",
            realProcurement && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${mainTab === "suppliers" ? "bg-slate-950/30 text-slate-950" : "bg-orange-950/60 text-orange-400 border border-orange-800/50"}`, children: realProcurement.supplierCount })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setMainTab("replacement"),
          className: `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${mainTab === "replacement" ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold" : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Ship, { className: "h-4 w-4" }),
            "Replacement Supply"
          ]
        }
      )
    ] }),
    mainTab === "optimizer" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Real Daily Demand" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-base font-bold text-emerald-400", children: [
            formatValue(liveState.currentDemand),
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "t/d" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#6B7280]", children: "MoPNG national consumption" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Current Strategic Reserve" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-base font-bold text-[#F3F4F6]", children: [
                formatValue(liveState.currentReserve),
                " ",
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "tonnes" })
              ] })
            ] }),
            liveState.currentReserveStatus === "POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[9px] font-mono font-bold text-amber-400 border border-amber-900/60 bg-amber-950/60 px-1.5 py-0.5 rounded cursor-help", title: liveState.currentReserveSource, children: "POLICY ESTIMATE" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#6B7280]", children: "Active stock across caverns" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Backup Import Supply" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 font-mono text-base font-bold text-indigo-400", children: realProcurement ? `${formatValue(realProcurement.availableAlternativeDailyTonnes)} t/d` : "N/A" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#6B7280]", children: realProcurement ? `${realProcurement.supplierCount} bilateral suppliers` : "Alternative origins" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Safety Reserve Floor" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-base font-bold text-amber-400", children: [
            formatValue(liveState.minimumReserveThreshold),
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "tonnes" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#6B7280]", children: "30-day statutory protection" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-4 shadow-sm space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Layers, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-sm font-semibold text-[#F3F4F6]", children: "Choose a Crisis Scenario" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A22] text-orange-400 border border-[#2A2A36]", children: activePresetName || "Scenario Selected" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF]", children: "Select a predefined crisis or create your own to see how the strategic reserve responds." })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("label", { htmlFor: "crisis-scenario-select", className: "sr-only", children: "Select Crisis Scenario" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "select",
              {
                id: "crisis-scenario-select",
                value: activePresetName || "Custom Crisis",
                onChange: (e) => {
                  const selectedName = e.target.value;
                  const preset = PRESET_SCENARIOS.find((p) => p.name === selectedName);
                  if (preset) {
                    if (preset.isCustom) {
                      handleSelectCustomCrisis();
                    } else {
                      handleSelectPreset(preset.input, preset.name);
                    }
                  }
                },
                className: "w-full sm:w-auto min-w-[260px] rounded-lg border border-[#2F2F3B] bg-[#18181E] px-3.5 py-2 text-xs font-semibold text-[#F3F4F6] hover:border-orange-500/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition cursor-pointer",
                children: PRESET_SCENARIOS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("option", { value: preset.name, className: "bg-[#18181E] text-[#F3F4F6]", children: [
                  preset.name,
                  " ",
                  preset.isCustom ? "(Custom Editable)" : `(${preset.input.disruptionDuration}-day disruption)`
                ] }, preset.name))
              }
            )
          ] })
        ] }),
        (() => {
          const activeScenario = PRESET_SCENARIOS.find(
            (p) => p.isCustom && inputMode === "CUSTOM" && activePresetName === "Custom Crisis" || !p.isCustom && inputMode === "PRESET" && activePresetName === p.name
          ) || PRESET_SCENARIOS.find((p) => p.isCustom);
          return activeScenario ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "text-xs text-[#9CA3AF] border-t border-[#1E1E26] pt-2.5 leading-relaxed", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "font-semibold text-[#D1D5DB]", children: [
              activeScenario.name,
              ": "
            ] }),
            activeScenario.description
          ] }) : null;
        })()
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-6 lg:grid-cols-12 items-start", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "lg:col-span-6 space-y-5", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "section",
          {
            id: "optimizer-inputs-section",
            className: "rounded-xl border border-[#22222A] bg-[#121215] p-4 shadow-sm",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between border-b border-[#1E1E26] pb-3 mb-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Sliders, { className: "h-4 w-4" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-sm font-semibold text-[#F3F4F6]", children: "Scenario Inputs" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A22] text-[#9CA3AF] border border-[#2A2A36]", children: isCustomMode ? "EDITABLE MODE" : "READ-ONLY" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF] mb-3 leading-relaxed", children: "ORBIT uses current reserve and supply information as the starting point. Crisis assumptions can be adjusted to test different situations." }),
              isCustomMode || inputMode === "CUSTOM" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-2.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-2 sm:grid-cols-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Daily Demand",
                      value: activeInput.demand,
                      unit: "tonnes/day",
                      onChange: (val) => handleInputChange("demand", val),
                      detail: "Estimated daily oil demand"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Available Supply",
                      value: activeInput.availableSupply,
                      unit: "tonnes/day",
                      onChange: (val) => handleInputChange("availableSupply", val),
                      detail: "Expected daily incoming supply during crisis",
                      badge: "SCENARIO INPUT"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Calculated Supply Gap",
                      value: Math.max(0, activeInput.demand - activeInput.availableSupply),
                      unit: "tonnes/day",
                      detail: "Calculated: Daily Demand - Available Supply",
                      badge: "CALCULATED",
                      highlight: true
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Crisis Duration",
                      value: activeInput.disruptionDuration,
                      unit: "days",
                      onChange: (val) => handleInputChange("disruptionDuration", val),
                      detail: "How long the disruption is expected to last",
                      badge: "SCENARIO"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Backup Supply",
                      value: activeInput.alternativeProcurement,
                      unit: "tonnes/day",
                      onChange: (val) => handleInputChange("alternativeProcurement", val),
                      detail: "Available supply from alternative sources"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Refill Rate",
                      value: activeInput.replenishmentRate,
                      unit: "tonnes/day",
                      onChange: (val) => handleInputChange("replenishmentRate", val),
                      detail: "Maximum daily reserve refill"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Current Reserve",
                      value: activeInput.currentReserve,
                      unit: "tonnes",
                      onChange: (val) => handleInputChange("currentReserve", val),
                      detail: "Current strategic reserve available"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    EditableInput,
                    {
                      label: "Safety Reserve",
                      value: activeInput.minimumReserveThreshold,
                      unit: "tonnes",
                      onChange: (val) => handleInputChange("minimumReserveThreshold", val),
                      detail: "Minimum reserve that must be protected"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => void runOptimization(),
                    disabled: optimizing,
                    className: "w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition disabled:opacity-60 shadow-md",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Calculator, { className: "h-4 w-4" }),
                      optimizing ? "Calculating..." : "Run Custom Scenario"
                    ]
                  }
                )
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-2.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-2 sm:grid-cols-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Daily Demand",
                      value: activeInput.demand,
                      unit: "tonnes/day",
                      detail: "Estimated daily oil demand"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Available Supply",
                      value: activeInput.availableSupply,
                      unit: "tonnes/day",
                      detail: "Expected daily incoming supply during crisis",
                      badge: "SCENARIO INPUT"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Calculated Supply Gap",
                      value: Math.max(0, activeInput.demand - activeInput.availableSupply),
                      unit: "tonnes/day",
                      detail: "Calculated: Daily Demand - Available Supply",
                      badge: "CALCULATED",
                      highlight: true
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Crisis Duration",
                      value: activeInput.disruptionDuration,
                      unit: "days",
                      detail: "How long the disruption is expected to last",
                      badge: "SCENARIO",
                      highlight: true
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Backup Supply",
                      value: activeInput.alternativeProcurement,
                      unit: "tonnes/day",
                      detail: "Available supply from alternative sources"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Refill Rate",
                      value: activeInput.replenishmentRate,
                      unit: "tonnes/day",
                      detail: "Maximum daily reserve refill"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Current Reserve",
                      value: activeInput.currentReserve,
                      unit: "tonnes",
                      detail: "Current strategic reserve available"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    ParameterCard,
                    {
                      label: "Safety Reserve",
                      value: activeInput.minimumReserveThreshold,
                      unit: "tonnes",
                      detail: "Minimum reserve that must be protected"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: handleSelectCustomCrisis,
                    className: "w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-[#2F2F3B] bg-[#18181E] px-3 py-2 text-xs font-semibold text-[#F3F4F6] hover:border-orange-500/50 hover:text-orange-400 transition",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Sliders, { className: "h-3.5 w-3.5" }),
                      "Customize Assumptions"
                    ]
                  }
                )
              ] })
            ]
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "lg:col-span-6 space-y-5", children: [
          optimizing && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            LoadingState,
            {
              message: "Running Phase 8 reserve optimizer",
              subtext: "Evaluating inputs with deterministic Phase 8 optimizer"
            }
          ),
          !optimizing && optimizerError && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            ErrorState,
            {
              title: "Reserve optimization failed",
              message: optimizerError,
              onRetry: () => void runOptimization()
            }
          ),
          !optimizing && !optimizerError && result && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "space-y-5", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1E1E26] pb-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.ShieldCheck, { className: "h-5 w-5" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-base font-semibold text-[#F3F4F6]", children: "Reserve Optimization Result" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] text-[#9CA3AF]", children: "Deterministic Phase 8 reserve allocation & release recommendation" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  StatusBadge,
                  {
                    level: result.feasibility === "FEASIBLE" ? "AVAILABLE" : result.feasibility === "PARTIALLY_FEASIBLE" ? "ELEVATED" : "CRITICAL",
                    label: result.coverageStatus.replaceAll("_", " "),
                    size: "sm"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#18181E] border border-[#2A2A36] text-[#D1D5DB]", children: result.constraintStatus })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 grid-cols-2 sm:grid-cols-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                MetricCard,
                {
                  title: "Current reserve",
                  value: formatValue(activeInput.currentReserve),
                  subtext: "Total starting stock",
                  icon: import_lucide_react3.Database,
                  statusColor: "cyan"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                MetricCard,
                {
                  title: "Effective supply gap",
                  value: formatValue(result.effectiveGap),
                  subtext: "After alternative procurement",
                  icon: import_lucide_react3.Calculator,
                  statusColor: "amber"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                MetricCard,
                {
                  title: "Drawdown amount",
                  value: formatValue(result.drawdownAmount),
                  subtext: "Recommended release",
                  icon: import_lucide_react3.ShieldCheck,
                  statusColor: coverageIsComplete ? "emerald" : "amber"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                MetricCard,
                {
                  title: "Remaining reserve",
                  value: formatValue(result.remainingReserve),
                  subtext: `Safety threshold: ${formatValue(result.minimumReserveConstraint)}`,
                  icon: import_lucide_react3.Database,
                  statusColor: result.remainingReserve >= result.minimumReserveConstraint ? "emerald" : "rose"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5 space-y-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-xs", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF] font-medium", children: "Post-Drawdown Reserve Balance" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "font-mono text-[11px] text-[#F3F4F6]", children: [
                  "Drawdown: ",
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-amber-400 font-bold", children: [
                    formatValue(result.drawdownAmount),
                    " t"
                  ] }),
                  " | Remaining: ",
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-emerald-400 font-bold", children: [
                    formatValue(result.remainingReserve),
                    " t"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "h-2.5 w-full rounded-full bg-[#1A1A22] overflow-hidden flex border border-[#2A2A36]", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "div",
                  {
                    className: "bg-emerald-400 h-full transition-all",
                    style: { width: `${result.remainingReserve / activeInput.currentReserve * 100}%` },
                    title: "Remaining Reserve"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "div",
                  {
                    className: "bg-amber-500 h-full transition-all",
                    style: { width: `${result.drawdownAmount / activeInput.currentReserve * 100}%` },
                    title: "Drawdown Amount"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-2.5 grid-cols-2 sm:grid-cols-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ResultMetric, { label: "Drawdown rate", value: formatValue(result.drawdownRate), detail: "reserve units per day" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ResultMetric, { label: "Duration", value: `${formatValue(result.duration)} days` }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                ResultMetric,
                {
                  label: "Replenishment requirement",
                  value: formatValue(result.replenishmentRequirement),
                  detail: result.replenishmentDays > 0 ? `Est. ${result.replenishmentDays} days to refill` : "No replenishment required"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                ResultMetric,
                {
                  label: "Fully covered",
                  value: result.fullyCovered ? "YES" : "NO",
                  detail: `Shortfall: ${formatValue(result.shortfall)} units`,
                  highlight: !result.fullyCovered
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Lock, { className: "h-4 w-4 text-emerald-400" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-xs font-semibold uppercase tracking-wider text-[#D1D5DB]", children: "Deterministic Safety Constraint Verification" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-2 text-xs md:grid-cols-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded border border-[#262632] bg-[#121215] p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF] font-medium", children: "1. Supply Gap & Backup Supply" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 font-mono text-xs font-semibold text-[#F3F4F6]", children: [
                    formatValue(activeInput.demand),
                    " Demand - ",
                    formatValue(activeInput.availableSupply),
                    " Supply = ",
                    formatValue(result.grossSupplyGap),
                    " Gap/day"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 text-[10px] text-[#6B7280]", children: [
                    "Effective Gap: ",
                    formatValue(result.residualSupplyGap),
                    " t/day after ",
                    formatValue(result.procurementCoverage),
                    " t/day backup supply. Total cumulative need: ",
                    formatValue(result.requiredReserveDrawdown),
                    " units across ",
                    result.duration,
                    " days."
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded border border-[#262632] bg-[#121215] p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF] font-medium", children: "2. Safe Drawdown Capacity" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 font-mono text-xs font-semibold text-emerald-400", children: [
                    "Max Safe Release: ",
                    formatValue(result.maximumSafeReserveDrawdown),
                    " units"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 text-[10px] text-[#6B7280]", children: [
                    "Calculated as Current (",
                    formatValue(activeInput.currentReserve),
                    ") - Floor (",
                    formatValue(result.minimumReserveConstraint),
                    ")."
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded border border-[#262632] bg-[#121215] p-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF] font-medium", children: "3. Safety Floor Guarantee" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.CheckCircle2, { className: "h-3.5 w-3.5 text-emerald-400 shrink-0" }),
                    "Remaining: ",
                    formatValue(result.remainingReserve),
                    " \u2265 ",
                    formatValue(result.minimumReserveConstraint)
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-[10px] text-[#6B7280]", children: "Strict guarantee: Drawdown never breaches statutory safety reserve." })
                ] })
              ] }),
              isSafetyCapActive && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.AlertTriangle, { className: "h-4 w-4 shrink-0 text-amber-400 mt-0.5" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "font-semibold", children: "Safety Limit Enforced: " }),
                  "Required drawdown (",
                  formatValue(result.requiredReserveDrawdown),
                  ") exceeded available safe capacity (",
                  formatValue(result.maximumSafeReserveDrawdown),
                  "). Drawdown was deterministically capped to protect the ",
                  formatValue(result.minimumReserveConstraint),
                  " unit strategic reserve floor. Unmet shortfall: ",
                  formatValue(result.shortfall),
                  " units."
                ] })
              ] }),
              isBelowThreshold && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-start gap-2 rounded border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.AlertTriangle, { className: "h-4 w-4 shrink-0 text-rose-400 mt-0.5" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "font-semibold", children: "Infeasible Reserve Drawdown: " }),
                  "Current reserve (",
                  formatValue(activeInput.currentReserve),
                  ") is already below the minimum safety threshold (",
                  formatValue(result.minimumReserveConstraint),
                  "). Drawdown is locked at 0."
                ] })
              ] })
            ] })
          ] }) })
        ] })
      ] })
    ] }),
    mainTab === "telemetry" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-lg relative overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#1E1E26] pb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Database, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-base font-semibold text-[#F3F4F6] tracking-tight", children: "National Strategic Petroleum Reserve Overview" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF]", children: "ISPRL Phase-1 Underground Cavern Storage Network" })
            ] })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-xs text-[#9CA3AF]", children: [
              "Baseline Year: ",
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("strong", { className: "text-emerald-400 font-mono font-medium", children: [
                "FY ",
                liveState.demandFinancialYear || "2024-25"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "h-3 w-px bg-[#2D2D38]" }),
            liveState.currentReserveStatus === "POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "inline-flex items-center gap-1.5 text-xs text-amber-400 font-mono font-medium bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/40 cursor-help", title: liveState.currentReserveSource, children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "h-2 w-2 rounded-full bg-amber-400 animate-pulse" }),
              "POLICY ESTIMATE"
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-medium bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-800/40", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "h-2 w-2 rounded-full bg-cyan-400 animate-pulse" }),
              "TELEMETRY VERIFIED"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-4 space-y-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-xs font-mono", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF]", children: "Reserve Fill Level" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[#F3F4F6]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { className: "text-cyan-400", children: formatValue(liveState.currentReserve) }),
              " / ",
              formatValue(liveState.totalCapacity),
              " tonnes (",
              (liveState.currentReserve / liveState.totalCapacity * 100).toFixed(1),
              "%)"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "relative h-3 w-full rounded-full bg-[#1A1A22] border border-[#2A2A36] overflow-hidden p-0.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "div",
              {
                className: "absolute top-0 bottom-0 bg-amber-500/30 border-r-2 border-amber-400 z-10",
                style: { width: `${liveState.minimumReserveThreshold / liveState.totalCapacity * 100}%` },
                title: "Mandatory Statutory Safety Floor"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "div",
              {
                className: "h-full rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-500",
                style: { width: `${liveState.currentReserve / liveState.totalCapacity * 100}%` }
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-[10px] text-[#6B7280]", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "0 Tonnes" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-amber-400/90 font-mono", children: [
              "\u25B2 Statutory Safety Floor (",
              formatValue(liveState.minimumReserveThreshold),
              " t)"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
              "Nameplate Cap: ",
              formatValue(liveState.totalCapacity),
              " t"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between border-b border-[#1E1E26] pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-sm font-semibold text-[#F3F4F6]", children: "India Strategic Petroleum Reserves (ISPRL) Facilities" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs text-[#9CA3AF]", children: "Phase 1 Underground Rock Caverns" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-4 sm:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm font-semibold text-[#F3F4F6]", children: "Visakhapatnam" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-mono text-cyan-400 font-bold", children: "1.33 MMT" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF] leading-relaxed", children: "Underground rock cavern facility serving eastern sea-board refineries and petrochemical complexes." }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "pt-2 border-t border-[#22222A] flex items-center justify-between text-xs text-[#6B7280]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "~9.77 Million Barrels" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-emerald-400 font-medium", children: "Operational" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm font-semibold text-[#F3F4F6]", children: "Mangalore" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-mono text-cyan-400 font-bold", children: "1.50 MMT" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF] leading-relaxed", children: "Underground rock cavern storage facility with 2 separate compartments handling crude grades." }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "pt-2 border-t border-[#22222A] flex items-center justify-between text-xs text-[#6B7280]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "~11.0 Million Barrels" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-emerald-400 font-medium", children: "Operational" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm font-semibold text-[#F3F4F6]", children: "Padur" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-mono text-cyan-400 font-bold", children: "2.50 MMT" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF] leading-relaxed", children: "Largest Phase-1 underground storage site with 4 independent cavern compartments." }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "pt-2 border-t border-[#22222A] flex items-center justify-between text-xs text-[#6B7280]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "~18.37 Million Barrels" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-emerald-400 font-medium", children: "Operational" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    mainTab === "suppliers" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between border-b border-[#1E1E26] pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Globe, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-base font-semibold text-[#F3F4F6]", children: "Import Origins" }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-xs font-mono text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-800/40", children: [
            realProcurement?.supplierCount || 41,
            " Active Origins"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 sm:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Alternative Daily Capacity" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-indigo-400", children: [
              realProcurement ? formatValue(realProcurement.availableAlternativeDailyTonnes) : "N/A",
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "t/d" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Annual Crude Imports" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-[#F3F4F6]", children: [
              realProcurement ? formatValue(realProcurement.totalAnnualImportTonnes) : "N/A",
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "t/yr" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Active Trade Partners" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-emerald-400", children: [
              realProcurement?.supplierCount || 41,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "countries" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between border-b border-[#1E1E26] pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-xs font-semibold text-[#F3F4F6]", children: "Select a Supplier to Apply Daily Import Capacity to Optimizer" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] text-[#9CA3AF]", children: "Click supplier origin card" })
        ] }),
        realProcurement && realProcurement.suppliers.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: realProcurement.suppliers.map((s) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => {
              handleApplyRealAlternative(s.dailyCapacityTonnes);
              setMainTab("optimizer");
            },
            className: "flex flex-col text-left rounded-lg border border-[#22222A] bg-[#18181E] p-3 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition group shadow-sm",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between w-full", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#F3F4F6] group-hover:text-indigo-300", children: s.canonicalName }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-400 border border-indigo-800/40", children: [
                  s.shareOfTotalImportsPercent,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-2 flex items-center justify-between w-full text-xs text-[#9CA3AF]", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
                  formatValue(s.dailyCapacityTonnes),
                  " t/d"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[10px] text-[#6B7280]", children: [
                  formatValue(s.annualQuantityTonnes),
                  " t/yr"
                ] })
              ] })
            ]
          },
          s.countryId
        )) }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-8 text-center text-xs text-[#9CA3AF]", children: "Supplier import origins data loading or unavailable." })
      ] })
    ] }),
    mainTab === "replacement" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E26] pb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("h3", { className: "text-sm font-bold text-[#F3F4F6] flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.AlertTriangle, { className: "h-4 w-4 text-orange-400" }),
              "Active Crisis Supply Gap"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF] mt-0.5", children: "Current supply gap requirements resolved from the active scenario or custom crisis assumptions." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700", children: activePresetName || "Custom Scenario" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800/50 font-semibold", children: [
              activeInput.disruptionDuration,
              " Days Duration"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-4 sm:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Required Daily Replacement" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-xl font-bold text-orange-400", children: [
              formatValue(activeInput.supplyGap),
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "t/d" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-[10px] text-[#6B7280]", children: "Target crude volume gap" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Cumulative Deficit" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-xl font-bold text-orange-400", children: [
              formatValue(activeInput.supplyGap * activeInput.disruptionDuration),
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "tonnes" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 text-[10px] text-[#6B7280]", children: [
              "Total shortfall over ",
              activeInput.disruptionDuration,
              " days"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Active Disrupted Source" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 font-sans text-sm font-bold text-indigo-400 truncate", children: activePresetName === "Strait of Hormuz Crisis" ? "Strait of Hormuz Corridor" : "None Selected" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-[10px] text-[#6B7280]", children: "Affected chokepoint or origin" })
          ] })
        ] })
      ] }),
      replacementLoading ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        LoadingState,
        {
          message: "Calculating optimal alternative procurement plan...",
          subtext: "Invoking WASM GLPK solver with EIA regional crude price benchmarks and verified shipping corridor capacity."
        }
      ) : replacementError ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        ErrorState,
        {
          title: "Procurement calculation failed",
          message: replacementError,
          onRetry: () => void loadReplacementSupply()
        }
      ) : !replacementResult || activeInput.supplyGap <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-10 text-center space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "mx-auto w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.CheckCircle2, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "max-w-md mx-auto space-y-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h4", { className: "text-sm font-bold text-[#F3F4F6]", children: "No Active Supply Gap Detected" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF]", children: 'There is currently no crude supply gap computed. Adjust the "Reserve Optimizer" daily demand or available supply assumptions to test optimization capabilities.' })
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E26] pb-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#9CA3AF]", children: "Optimizer Status:" }),
              replacementResult.status === "OPTIMAL" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.CheckCircle2, { className: "h-3 w-3" }),
                "OPTIMAL PLAN FOUND"
              ] }) : replacementResult.status === "INFEASIBLE" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-950/60 text-red-400 border border-red-800/50", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.AlertTriangle, { className: "h-3 w-3" }),
                "INFEASIBLE - INSUFFICIENT CAPACITY"
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-950/60 text-slate-400 border border-slate-800/50", children: replacementResult.status })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[11px] font-mono text-[#6B7280]", children: [
              "Calculated via ",
              replacementResult.source || "GLPK WASM Solver"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Requested Supply" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1.5 font-mono text-lg font-bold text-[#EDEDED]", children: [
                formatValue(activeInput.supplyGap * activeInput.disruptionDuration),
                " ",
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "tonnes" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Allocated Alternative" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1.5 font-mono text-lg font-bold text-emerald-400", children: [
                formatValue(replacementResult.procurement?.totalProcured || 0),
                " ",
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: "tonnes" })
              ] })
            ] }),
            replacementResult.procurement && replacementResult.procurement.unmetSupply > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-red-900/40 bg-red-950/10 p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-red-400", children: "Unmet Deficit Gap" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1.5 font-mono text-lg font-bold text-red-400", children: [
                formatValue(replacementResult.procurement.unmetSupply),
                " ",
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-red-400", children: "tonnes" })
              ] })
            ] }),
            replacementResult.procurement && replacementResult.procurement.totalCost > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]", children: "Projected Sourcing Cost" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1.5 font-mono text-lg font-bold text-indigo-400", children: [
                "$",
                formatValue(replacementResult.procurement.totalCost)
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "border-b border-[#1E1E26] pb-3 flex justify-between items-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider", children: "Recommended Sourcing Corridor Allocations" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] text-[#9CA3AF]", children: "Optimized supplier allocations" })
          ] }),
          replacementResult.procurement?.allocations && replacementResult.procurement.allocations.filter((a) => a.quantity > 0).length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "space-y-4", children: replacementResult.procurement.allocations.filter((a) => a.quantity > 0).map((allocation, idx) => {
            const supplierName = replacementResult.procurement?.supplierAllocations?.find(
              (sa) => sa.supplierId === allocation.supplierId
            )?.supplierName || allocation.supplierId;
            const routeName = replacementResult.procurement?.routeAllocations?.find(
              (ra) => ra.routeId === allocation.routeId
            )?.routeName || allocation.routeId;
            return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "div",
              {
                className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#333342] transition shadow-sm",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm font-bold text-[#F3F4F6]", children: supplierName }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-900/30", children: "Corridor Sourced" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-[#9CA3AF] flex items-center gap-1", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-indigo-400 font-semibold", children: routeName }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-wrap items-center gap-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-left md:text-right", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase text-[#6B7280]", children: "Allocated Quantity" }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "font-mono text-sm font-bold text-emerald-400", children: [
                        formatValue(allocation.quantity),
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-normal text-[#9CA3AF]", children: allocation.quantityUnit })
                      ] })
                    ] }),
                    allocation.procurementCost !== void 0 && allocation.procurementCost !== null && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-left md:text-right", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase text-[#6B7280]", children: "EIA Benchmark Cost" }),
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "font-mono text-sm font-bold text-[#EDEDED]", children: [
                          "$",
                          formatValue(allocation.procurementCost / allocation.quantity),
                          " ",
                          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[10px] font-normal text-[#9CA3AF]", children: allocation.procurementCostUnit === "USD_per_barrel" ? "/bbl" : "/t" })
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-left md:text-right", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase text-[#6B7280]", children: "Total Sourcing Cost" }),
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "font-mono text-sm font-bold text-indigo-400", children: [
                          "$",
                          formatValue(allocation.procurementCost)
                        ] })
                      ] })
                    ] }),
                    allocation.transitTimeDays !== void 0 && allocation.transitTimeDays !== null && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-left md:text-right", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase text-[#6B7280]", children: "Maritime Transit" }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "font-mono text-sm font-bold text-amber-400", children: [
                        allocation.transitTimeDays,
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[10px] font-normal text-[#9CA3AF]", children: "days" })
                      ] })
                    ] }),
                    allocation.riskScore !== void 0 && allocation.riskScore !== null && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-left md:text-right", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase text-[#6B7280]", children: "Geopolitical Risk" }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${allocation.riskScore > 75 ? "bg-red-950/60 text-red-400 border border-red-800/40" : allocation.riskScore > 40 ? "bg-yellow-950/60 text-yellow-400 border border-yellow-800/40" : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"}`, children: [
                        allocation.riskScore,
                        " / 100"
                      ] })
                    ] }),
                    allocation.reliabilityScore !== void 0 && allocation.reliabilityScore !== null && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-left md:text-right", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase text-[#6B7280]", children: "Bilateral Reliability" }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "font-mono text-sm font-bold text-sky-400", children: [
                        Math.round(allocation.reliabilityScore * 100),
                        "%"
                      ] })
                    ] })
                  ] })
                ]
              },
              allocation.laneId || idx
            );
          }) }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-8 text-center text-xs text-[#9CA3AF]", children: replacementResult.status === "INFEASIBLE" ? "No allocations could be made due to insufficient shipping lane or route corridor capacity constraints." : "No active recommended sourcing corridor allocations." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "border-b border-[#1E1E26] pb-3 flex justify-between items-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider", children: "Solver Constraint & Feasibility Audit" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] text-[#9CA3AF]", children: "Linear Programming Validation" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-4 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs font-semibold text-[#9CA3AF]", children: "Active Mathematical Constraints Enforced" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-xs rounded bg-[#18181E] px-3 py-2 border border-[#1E1E26]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF]", children: "1. Supply Gap Satisfaction Constraint" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "font-mono font-bold text-emerald-400 flex items-center gap-1", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.ShieldCheck, { className: "h-3.5 w-3.5" }),
                    " Enforced"
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-xs rounded bg-[#18181E] px-3 py-2 border border-[#1E1E26]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF]", children: "2. Exporter Capacity Upper Bound" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "font-mono font-bold text-emerald-400 flex items-center gap-1", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.ShieldCheck, { className: "h-3.5 w-3.5" }),
                    " Enforced"
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-xs rounded bg-[#18181E] px-3 py-2 border border-[#1E1E26]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF]", children: "3. Maritime Shipping Lane Upper Bound" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "font-mono font-bold text-emerald-400 flex items-center gap-1", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.ShieldCheck, { className: "h-3.5 w-3.5" }),
                    " Enforced"
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between text-xs rounded bg-[#18181E] px-3 py-2 border border-[#1E1E26]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#9CA3AF]", children: "4. Non-Negative Allocation Bound ($X_j \\ge 0$)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "font-mono font-bold text-emerald-400 flex items-center gap-1", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.ShieldCheck, { className: "h-3.5 w-3.5" }),
                    " Enforced"
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#22222A] bg-[#18181E] p-4 flex flex-col justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h4", { className: "text-xs font-bold text-[#F3F4F6]", children: "Recommendations Disclaimer" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "text-xs text-[#9CA3AF] leading-relaxed", children: [
                  "These suggestions are for alternative strategic planning recommendations only.",
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: " No actual purchase transaction is executed" }),
                  ", and no external suppliers are contacted. Sourcing metrics are derived from regional EIA price benchmarks, maritime geographic routing distances, and historical bilateral contract reliability indices."
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-4 pt-3 border-t border-[#1E1E26] text-[10px] text-[#6B7280]", children: [
                "Status: ",
                replacementResult.status === "OPTIMAL" ? "Feasible optimization result verified." : "Feasibility checks completed."
              ] })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
};
var ParameterCard = ({ label, value, detail, badge, unit, highlight }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: `rounded-lg border px-3 py-2.5 ${highlight ? "border-orange-500/40 bg-orange-950/10" : "border-[#2A2A2A] bg-[#121212]"}`, children: [
  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#888888]", children: label }),
    badge && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 font-semibold", children: badge })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: `mt-1 font-mono text-sm font-semibold ${highlight ? "text-orange-300" : "text-[#EDEDED]"}`, children: [
    formatValue(value),
    unit ? ` ${unit}` : ""
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[11px] text-[#777777]", children: detail })
] });
var EditableInput = ({ label, value, unit, onChange, detail, badge }) => {
  const [localVal, setLocalVal] = (0, import_react.useState)(value.toString());
  (0, import_react.useEffect)(() => {
    setLocalVal(value.toString());
  }, [value]);
  const commitValue = () => {
    const parsed = Number(localVal);
    const validVal = isNaN(parsed) || localVal.trim() === "" ? 0 : Math.max(0, parsed);
    if (validVal !== value) {
      onChange(validVal);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#333333] bg-[#121212] px-3 py-2.5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#888888] block", children: label }),
      badge && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 font-semibold", children: badge })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "relative mt-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "input",
        {
          type: "number",
          value: localVal,
          min: "0",
          onChange: (e) => {
            setLocalVal(e.target.value);
          },
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              commitValue();
              e.target.blur();
            }
          },
          onBlur: commitValue,
          className: "w-full rounded bg-[#1A1A1A] border border-[#383838] pl-2.5 pr-20 py-1.5 font-mono text-sm font-semibold text-[#EDEDED] focus:border-orange-500 focus:outline-none"
        }
      ),
      unit && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "absolute right-2.5 top-2 text-[11px] font-mono text-orange-400 pointer-events-none font-semibold", children: unit })
    ] }),
    detail && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-[10px] text-[#777777]", children: detail })
  ] });
};

// src/reserves/optimizer.ts
var INPUT_FIELDS = [
  "currentReserve",
  "demand",
  "availableSupply",
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
  const candidate = { ...value };
  if (typeof candidate.availableSupply !== "number" && typeof candidate.supplyGap === "number") {
    candidate.availableSupply = Math.max(0, (candidate.demand ?? 0) - candidate.supplyGap);
  }
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
  candidate.supplyGap = Math.max(0, (candidate.demand ?? 0) - (candidate.availableSupply ?? 0));
  return {
    valid: true,
    issues: [],
    input: candidate
  };
};
var optimizeStrategicReserve2 = (input) => {
  const validation = validateStrategicReserveInput(input);
  if (!validation.valid || !validation.input) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" ")
    );
  }
  const normalized = validation.input;
  const demand = Math.max(0, normalized.demand);
  const availableSupply = Math.max(0, normalized.availableSupply);
  const calculatedSupplyGap = Math.max(0, demand - availableSupply);
  const grossSupplyGap = calculatedSupplyGap;
  const backupSupply = Math.max(0, normalized.alternativeProcurement);
  const procurementCoverage = Math.min(
    grossSupplyGap,
    backupSupply
  );
  const residualSupplyGap = Math.max(
    0,
    grossSupplyGap - backupSupply
  );
  const effectiveGap = residualSupplyGap;
  const disruptionDuration = Math.max(0, normalized.disruptionDuration);
  const requiredReserveDrawdown = residualSupplyGap * disruptionDuration;
  const totalNeed = requiredReserveDrawdown;
  const isBelowSafety = normalized.currentReserve < normalized.minimumReserveThreshold;
  const maximumSafeReserveDrawdown = isBelowSafety ? 0 : Math.max(
    0,
    normalized.currentReserve - normalized.minimumReserveThreshold
  );
  const safeAvailableReserve = maximumSafeReserveDrawdown;
  const recommendedReserveDrawdown = isBelowSafety ? 0 : Math.min(
    requiredReserveDrawdown,
    maximumSafeReserveDrawdown
  );
  const drawdownAmount = recommendedReserveDrawdown;
  const remainingReserve = normalized.currentReserve - recommendedReserveDrawdown;
  const reserveDrawdownRate = disruptionDuration === 0 ? 0 : recommendedReserveDrawdown / disruptionDuration;
  const drawdownRate = reserveDrawdownRate;
  const replenishmentRequirement = recommendedReserveDrawdown;
  const replenishmentDays = normalized.replenishmentRate > 0 && replenishmentRequirement > 0 ? Math.ceil(replenishmentRequirement / normalized.replenishmentRate) : 0;
  const shortfall = Math.max(0, requiredReserveDrawdown - recommendedReserveDrawdown);
  const fullyCovered = shortfall === 0;
  let constraintStatus;
  let feasibility;
  let coverageStatus;
  if (grossSupplyGap === 0 || residualSupplyGap === 0) {
    constraintStatus = "SATISFIED";
    feasibility = "FEASIBLE";
    coverageStatus = "NO_EFFECTIVE_GAP";
  } else if (isBelowSafety) {
    constraintStatus = "BELOW_THRESHOLD";
    feasibility = "INFEASIBLE";
    coverageStatus = "RESERVE_BELOW_THRESHOLD";
  } else if (requiredReserveDrawdown <= maximumSafeReserveDrawdown) {
    constraintStatus = maximumSafeReserveDrawdown === 0 ? "BINDING" : "SATISFIED";
    feasibility = "FEASIBLE";
    coverageStatus = "FULLY_COVERED";
  } else if (maximumSafeReserveDrawdown > 0) {
    constraintStatus = "LIMIT_ENFORCED";
    feasibility = "PARTIALLY_FEASIBLE";
    coverageStatus = "PARTIALLY_COVERED";
  } else {
    constraintStatus = "BINDING";
    feasibility = "INFEASIBLE";
    coverageStatus = "PARTIALLY_COVERED";
  }
  const safetyConstraintGuaranteed = remainingReserve >= Math.min(normalized.currentReserve, normalized.minimumReserveThreshold);
  const isFeasible = feasibility === "FEASIBLE";
  return {
    // Phase 8 Core Calculations
    grossSupplyGap,
    calculatedSupplyGap,
    availableSupply,
    procurementCoverage,
    residualSupplyGap,
    requiredReserveDrawdown,
    maximumSafeReserveDrawdown,
    recommendedReserveDrawdown,
    remainingReserve,
    reserveDrawdownRate,
    replenishmentRequirement,
    replenishmentDays,
    minimumReserveConstraint: normalized.minimumReserveThreshold,
    isFeasible,
    feasibility,
    constraintStatus,
    coverageStatus,
    safetyConstraintGuaranteed,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    // Backward compatibility aliases
    effectiveGap,
    totalNeed,
    safeAvailableReserve,
    drawdownAmount,
    drawdownRate,
    duration: disruptionDuration,
    durationUnit: "days",
    shortfall,
    fullyCovered,
    minimumReserveThreshold: normalized.minimumReserveThreshold
  };
};

// tests/reserves-page.test.ts
var pageSource = (0, import_node_fs.readFileSync)(
  import_node_path.default.join(process.cwd(), "src/pages/ReservesPage.tsx"),
  "utf8"
);
var apiSource = (0, import_node_fs.readFileSync)(
  import_node_path.default.join(process.cwd(), "src/services/api.ts"),
  "utf8"
);
(0, import_node_test.default)("Strategic Reserves page starts in a clean loading state waiting for real database data (no fake numbers)", () => {
  const markup = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(ReservesPage));
  import_strict.default.match(markup, /Reserve Management/);
  import_strict.default.match(markup, /Loading strategic reserve and procurement data\.\.\./);
  import_strict.default.match(markup, /Querying database/);
  import_strict.default.doesNotMatch(markup, /DEMO \/ MOCK DATA/);
  import_strict.default.doesNotMatch(markup, /Round 1 Demo Inputs/);
});
(0, import_node_test.default)('Strategic Reserves page permanently removed "Apply Real Baseline to Optimizer" button and handlers', () => {
  import_strict.default.doesNotMatch(pageSource, /id="apply-real-baseline-btn"/);
  import_strict.default.doesNotMatch(pageSource, /Apply Real Baseline to Optimizer/);
  import_strict.default.doesNotMatch(pageSource, /handleApplyLiveBaseline/);
  import_strict.default.doesNotMatch(pageSource, /availableAlternativeDailyTonnes\s*\|\|\s*25_?000/);
  import_strict.default.doesNotMatch(pageSource, /ROUND_ONE_RESERVE_DEMO_INPUT/);
});
(0, import_node_test.default)("Strategic Reserves page automatically builds real database-backed baseline for optimizer", () => {
  const mockState = {
    facilityName: "India Strategic Petroleum Reserve (ISPRL)",
    country: "India",
    totalCapacity: 533e4,
    capacityUnit: "metric_tonnes",
    capacitySource: "strategic_reserves table",
    isCapacityFromDatabase: true,
    currentReserve: 5e6,
    currentReserveStatus: "POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY",
    currentReserveSource: "Policy operational baseline",
    minimumReserveThreshold: 15e5,
    minimumReservePolicyBasis: "Mandatory 30-day safety reserve",
    currentDemand: 655271.23,
    demandBasis: "FY 2024-25 petroleum consumption",
    demandFinancialYear: "2024-25",
    isDemandFromDatabase: true,
    defaultReplenishmentRate: 2e4,
    replenishmentPolicyBasis: "ISPRL injection capacity",
    unit: "tonnes",
    facilities: [
      { strategicReserveId: "isprl-visakhapatnam", facilityName: "Visakhapatnam", capacity: 133e4, capacityUnit: "metric_tonnes", latitude: 17.68, longitude: 83.21, mappingStatus: "MAPPED", notes: null },
      { strategicReserveId: "isprl-mangalore", facilityName: "Mangalore", capacity: 15e5, capacityUnit: "metric_tonnes", latitude: 12.91, longitude: 74.85, mappingStatus: "MAPPED", notes: null },
      { strategicReserveId: "isprl-padur", facilityName: "Padur", capacity: 25e5, capacityUnit: "metric_tonnes", latitude: 13.23, longitude: 74.78, mappingStatus: "MAPPED", notes: null }
    ],
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  const mockProcurement = {
    availableAlternativeDailyTonnes: 588809.99,
    totalAnnualImportTonnes: 214915646,
    financialYear: "2016-17",
    supplierCount: 41,
    suppliers: [],
    commercialCostStatus: "Commercial lane-cost data unavailable",
    isCommercialCostAvailable: false,
    dataSource: "Phase 2 SQLite supplier_imports table",
    provenance: "Derived from real records"
  };
  const autoInput = buildRealBaselineOptimizationInput(mockState, mockProcurement);
  import_strict.default.equal(autoInput.currentReserve, 5e6);
  import_strict.default.equal(autoInput.demand, 655271);
  import_strict.default.equal(autoInput.availableSupply, 555271);
  import_strict.default.equal(autoInput.supplyGap, 1e5);
  import_strict.default.equal(autoInput.alternativeProcurement, 588810);
  import_strict.default.equal(autoInput.replenishmentRate, 2e4);
  import_strict.default.equal(autoInput.minimumReserveThreshold, 15e5);
  import_strict.default.equal(autoInput.disruptionDuration, 30);
  const result = optimizeStrategicReserve2(autoInput);
  import_strict.default.equal(result.isFeasible, true);
  import_strict.default.ok(result.remainingReserve >= autoInput.minimumReserveThreshold);
});
(0, import_node_test.default)("Strategic Reserves page renders API-backed result fields and failure handling", () => {
  for (const label of [
    "Effective supply gap",
    "Drawdown amount",
    "Drawdown rate",
    "Duration",
    "Remaining reserve",
    "Replenishment requirement",
    "Fully covered",
    "Reserve optimization failed"
  ]) {
    import_strict.default.match(pageSource, new RegExp(label));
  }
  import_strict.default.match(pageSource, /optimizeStrategicReserve/);
  import_strict.default.match(apiSource, /\/api\/reserves\/optimize/);
  import_strict.default.match(apiSource, /StrategicReserveOptimizationResult/);
});
(0, import_node_test.default)("Optimizer cannot be executed with missing or invalid baseline inputs", () => {
  const invalid = validateStrategicReserveInput({
    currentReserve: -100,
    demand: 655271
  });
  import_strict.default.equal(invalid.valid, false);
  import_strict.default.ok(invalid.issues.length > 0);
});
(0, import_node_test.default)("Reserves page defines all 6 crisis scenarios including Custom Crisis", () => {
  const expectedScenarios = [
    "Normal Supply Disruption",
    "Strait of Hormuz Crisis",
    "Strong Backup Supply",
    "Reserve Safety Limit",
    "Reserve Already Below Safe Level",
    "Custom Crisis"
  ];
  for (const scenario of expectedScenarios) {
    import_strict.default.match(pageSource, new RegExp(scenario));
  }
  import_strict.default.match(pageSource, /Choose a Crisis Scenario/);
  import_strict.default.match(pageSource, /Select a predefined crisis or create your own to see how the strategic reserve responds\./);
  import_strict.default.match(pageSource, /Run Custom Scenario/);
});
(0, import_node_test.default)("Scenario Inputs section uses operator-facing language and labels", () => {
  import_strict.default.match(pageSource, /Scenario Inputs/);
  import_strict.default.match(pageSource, /ORBIT uses current reserve and supply information as the starting point\. Crisis assumptions can be adjusted to test different situations\./);
  import_strict.default.doesNotMatch(pageSource, /Real Database Baseline Inputs/);
  const expectedLabels = [
    "Current Reserve",
    "Daily Demand",
    "Available Supply",
    "Calculated Supply Gap",
    "Crisis Duration",
    "Backup Supply",
    "Refill Rate",
    "Safety Reserve"
  ];
  for (const label of expectedLabels) {
    import_strict.default.match(pageSource, new RegExp(label));
  }
});
