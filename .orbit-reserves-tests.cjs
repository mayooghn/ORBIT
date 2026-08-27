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
      className: "relative p-5 rounded-lg border border-[#222222] bg-[#121212] hover:border-[#333333] transition-colors",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs uppercase tracking-widest text-[#666666] font-semibold", children: title }),
          Icon && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: `p-2 rounded ${iconBg}`, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { className: "w-4 h-4" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-3 flex items-baseline gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-3xl font-bold tracking-tight text-[#EDEDED] font-mono", children: value }),
          unit && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs font-medium text-[#777777] font-mono", children: unit })
        ] }),
        (change || subtext) && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-[#1C1C1C]", children: [
          change && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `font-mono font-medium ${changeColor}`, children: change }),
          subtext && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[#666666] text-xs truncate", children: subtext })
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

// src/pages/ReservesPage.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var formatValue = (value) => value.toLocaleString(void 0, { maximumFractionDigits: 2 });
var PRESET_SCENARIOS = [
  {
    name: "Standard Stress Test",
    description: "Standard 30-day disruption (100,000 t/d gap) evaluating reserve response under baseline conditions.",
    input: {
      currentReserve: 5e6,
      demand: 655271,
      supplyGap: 1e5,
      disruptionDuration: 30,
      alternativeProcurement: 5e4,
      replenishmentRate: 2e4,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Strait of Hormuz Disruption",
    description: "Severe 60-day disruption scenario with 350k t/d deficit and constrained alternatives.",
    input: {
      currentReserve: 5e6,
      demand: 655271,
      supplyGap: 35e4,
      disruptionDuration: 60,
      alternativeProcurement: 1e5,
      replenishmentRate: 25e3,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Procurement-Protected Event",
    description: "Disruption scenario where emergency bilateral procurement contracts absorb the supply shock.",
    input: {
      currentReserve: 5e6,
      demand: 655271,
      supplyGap: 8e4,
      disruptionDuration: 14,
      alternativeProcurement: 15e4,
      replenishmentRate: 2e4,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Critical Safety Cap Binding",
    description: "Extreme scenario where reserve drawdown is strictly capped at the statutory safety floor.",
    input: {
      currentReserve: 2e6,
      demand: 655271,
      supplyGap: 2e5,
      disruptionDuration: 45,
      alternativeProcurement: 2e4,
      replenishmentRate: 15e3,
      minimumReserveThreshold: 15e5
    }
  },
  {
    name: "Exhausted Reserve Safety Trigger",
    description: "Emergency test scenario where current reserve starts below the mandatory safety floor.",
    input: {
      currentReserve: 12e5,
      demand: 655271,
      supplyGap: 15e4,
      disruptionDuration: 30,
      alternativeProcurement: 3e4,
      replenishmentRate: 1e4,
      minimumReserveThreshold: 15e5
    }
  }
];
var ResultMetric = ({ label, value, detail, highlight }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: `rounded-lg border p-4 ${highlight ? "border-orange-500/40 bg-orange-950/10" : "border-[#222222] bg-[#121212]"}`, children: [
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs font-semibold uppercase tracking-widest text-[#666666]", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: `mt-2 font-mono text-2xl font-bold ${highlight ? "text-orange-400" : "text-[#EDEDED]"}`, children: value }),
  detail && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-xs text-[#777777]", children: detail })
] });
var buildRealBaselineOptimizationInput = (state, procurement, scenarioParams) => {
  const altProc = procurement?.availableAlternativeDailyTonnes ? Math.round(procurement.availableAlternativeDailyTonnes) : state.alternativeProcurement?.availableAlternativeDailyTonnes ? Math.round(state.alternativeProcurement.availableAlternativeDailyTonnes) : 0;
  return {
    currentReserve: state.currentReserve,
    demand: Math.round(state.currentDemand),
    supplyGap: scenarioParams?.supplyGap ?? 1e5,
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
    setActiveInput(presetInput);
    void runOptimization(presetInput);
  };
  const handleResetToRealBaseline = () => {
    if (!liveState) return;
    const baseline = buildRealBaselineOptimizationInput(liveState, realProcurement);
    setInputMode("REAL_BASELINE");
    setActivePresetName(null);
    setActiveInput(baseline);
    void runOptimization(baseline);
  };
  const handleApplyRealAlternative = (dailyTonnes) => {
    if (!activeInput) return;
    const updated = { ...activeInput, alternativeProcurement: Math.round(dailyTonnes) };
    setActiveInput(updated);
    setInputMode("CUSTOM");
    void runOptimization(updated);
  };
  const handleInputChange = (field, value) => {
    if (!activeInput) return;
    setInputMode("CUSTOM");
    setActivePresetName(null);
    const updated = { ...activeInput, [field]: value };
    setActiveInput(updated);
  };
  if (initialDataLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        PageHeader,
        {
          title: "Strategic Reserves",
          subtitle: "Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions.",
          badgeText: "LOADING REAL DATA",
          badgeLevel: "ELEVATED"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        LoadingState,
        {
          message: "Loading real strategic reserve and procurement data...",
          subtext: "Querying SQLite database for ISPRL storage facilities, MoPNG daily petroleum consumption, and bilateral supplier import records."
        }
      )
    ] });
  }
  if (dataError || !liveState || !activeInput) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        PageHeader,
        {
          title: "Strategic Reserves",
          subtitle: "Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions.",
          badgeText: "DATA UNAVAILABLE",
          badgeLevel: "CRITICAL"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        ErrorState,
        {
          title: "Strategic reserve data unavailable",
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
        title: "Strategic Reserves",
        subtitle: "Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions.",
        badgeText: result ? result.isFeasible ? "OPTIMIZATION READY" : "SAFETY CONSTRAINT ENFORCED" : "OPTIMIZATION READY",
        badgeLevel: result ? result.isFeasible ? "AVAILABLE" : "ELEVATED" : "AVAILABLE",
        actions: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => setIsCustomMode(!isCustomMode),
              className: "inline-flex items-center gap-2 rounded-lg border border-[#333333] bg-[#161616] px-3.5 py-2 text-sm font-medium text-[#D1D5DB] transition hover:border-[#555555] hover:text-white",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Sliders, { className: "h-4 w-4" }),
                isCustomMode ? "Show Presets" : "Custom Parameters"
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => void runOptimization(),
              disabled: optimizing,
              className: "inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Calculator, { className: "h-4 w-4" }),
                optimizing ? "Calculating..." : "Run Reserve Optimization"
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Database, { className: "h-5 w-5 text-cyan-400" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-lg font-semibold text-[#EDEDED]", children: "National Strategic Reserve State (Database Sourced)" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusBadge, { level: "AVAILABLE", label: "REAL DATA", size: "sm" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 text-xs text-[#888888]", children: [
          "Real Phase 1 ISPRL underground storage facilities (",
          formatValue(liveState.totalCapacity),
          " tonnes capacity) and real consumption demand derived from MoPNG dataset (",
          formatValue(liveState.currentDemand),
          " tonnes/day)."
        ] })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Total Nameplate Capacity" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-cyan-400", children: [
            formatValue(liveState.totalCapacity),
            " tonnes"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: "5.33 MMT across 3 Phase-1 facilities" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Real Daily Demand" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-emerald-400", children: [
            formatValue(liveState.currentDemand),
            " tonnes/day"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: [
            "FY ",
            liveState.demandFinancialYear || "2024-25",
            " petroleum consumption"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Estimated Current Reserve" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-[#EDEDED]", children: [
            formatValue(liveState.currentReserve),
            " tonnes"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Statutory Minimum Floor" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-[#EDEDED]", children: [
            formatValue(liveState.minimumReserveThreshold),
            " tonnes"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: "Mandatory 30-day safety reserve" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("section", { className: "rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-5", children: realProcurement ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Globe, { className: "h-5 w-5 text-indigo-400" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-lg font-semibold text-[#EDEDED]", children: "Backup Oil Supply" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusBadge, { level: "AVAILABLE", label: "REAL DATA", size: "sm" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "button",
          {
            type: "button",
            id: "apply-real-supply-btn",
            onClick: () => handleApplyRealAlternative(realProcurement.availableAlternativeDailyTonnes),
            className: "inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Ship, { className: "h-3.5 w-3.5" }),
              " Apply Alternative Supply (",
              formatValue(realProcurement.availableAlternativeDailyTonnes),
              " t/d)"
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-4 grid gap-3 sm:grid-cols-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Available Daily Alternatives" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-indigo-400", children: [
            formatValue(realProcurement.availableAlternativeDailyTonnes),
            " t/d"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: "Annual volume \xF7 365 days" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Annual Real Imports" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-[#EDEDED]", children: [
            formatValue(realProcurement.totalAnnualImportTonnes),
            " tonnes"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: [
            "FY ",
            realProcurement.financialYear,
            " crude imports"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#121212] p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: "Active Supplier Sources" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 font-mono text-lg font-bold text-emerald-400", children: [
            realProcurement.supplierCount,
            " countries"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: "Real bilateral import origins" })
        ] })
      ] }),
      realProcurement.suppliers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#CCCCCC]", children: "Real Supplier Import Volumes (Top Origins)" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] text-[#777777]", children: "Click a supplier to use their capacity in optimizer" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4", children: realProcurement.suppliers.slice(0, 8).map((s) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => handleApplyRealAlternative(s.dailyCapacityTonnes),
            className: "flex flex-col text-left rounded-lg border border-[#242424] bg-[#141414] p-2.5 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition group",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between w-full", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#EDEDED] group-hover:text-indigo-300", children: s.canonicalName }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[10px] font-mono text-indigo-400", children: [
                  s.shareOfTotalImportsPercent,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 flex items-center justify-between w-full text-[11px] text-[#888888]", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
                  formatValue(s.dailyCapacityTonnes),
                  " t/d"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-[10px] text-[#666666]", children: [
                  formatValue(s.annualQuantityTonnes),
                  " t/yr"
                ] })
              ] })
            ]
          },
          s.countryId
        )) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-4 text-center text-sm text-[#888888]", children: "Alternative procurement data unavailable" }) }),
    !isCustomMode && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#222222] bg-[#0E0E0E] p-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Layers, { className: "h-4 w-4 text-orange-400" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-sm font-semibold text-[#EDEDED]", children: "Disruption Scenario Presets (Stress Tests)" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs text-[#777777]", children: "Select an illustrative scenario to evaluate reserve release behavior" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5", children: PRESET_SCENARIOS.map((preset) => {
        const isSelected = inputMode === "PRESET" && activePresetName === preset.name;
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => handleSelectPreset(preset.input, preset.name),
            className: `flex flex-col justify-start text-left p-3 rounded-lg border transition-all ${isSelected ? "border-orange-500/60 bg-orange-500/10 shadow-sm" : "border-[#222222] bg-[#141414] hover:border-[#383838] hover:bg-[#181818]"}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `text-xs font-semibold ${isSelected ? "text-orange-400" : "text-[#EDEDED]"}`, children: preset.name }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "mt-1 text-[11px] leading-relaxed text-[#888888]", children: preset.description })
            ]
          },
          preset.name
        );
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "section",
      {
        id: "optimizer-inputs-section",
        className: `rounded-xl border p-5 transition-colors ${inputMode === "REAL_BASELINE" ? "border-cyan-500/40 bg-cyan-950/15" : inputMode === "PRESET" ? "border-purple-500/30 bg-purple-950/10" : "border-blue-500/30 bg-blue-950/10"}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Database, { className: `h-5 w-5 ${inputMode === "REAL_BASELINE" ? "text-cyan-400" : "text-orange-400"}` }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-lg font-semibold text-[#EDEDED]", children: inputMode === "REAL_BASELINE" ? "Real Database Baseline Inputs" : inputMode === "PRESET" ? `Disruption Preset: ${activePresetName || "Scenario"}` : "Custom Interactive Parameters" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  StatusBadge,
                  {
                    level: inputMode === "REAL_BASELINE" ? "AVAILABLE" : "ELEVATED",
                    label: inputMode === "REAL_BASELINE" ? "REAL BASELINE" : inputMode === "CUSTOM" ? "USER CUSTOM" : "SCENARIO PRESET",
                    size: "sm"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-2 max-w-2xl text-sm leading-relaxed text-[#999999]", children: inputMode === "REAL_BASELINE" ? `Using verified SQLite database baselines (FY ${liveState.demandFinancialYear || "2024-25"} daily consumption demand of ${formatValue(activeInput.demand)} t/d, ${formatValue(activeInput.alternativeProcurement)} t/d bilateral alternative imports from ${realProcurement?.supplierCount || 41} origins, 5.00 MMT policy reserve baseline). Supply gap (${formatValue(activeInput.supplyGap)} t/d) and duration (${activeInput.disruptionDuration}d) represent the hypothetical scenario under evaluation.` : inputMode === "PRESET" ? "Illustrative stress-test scenario inputs sent to the deterministic Phase 8 reserve optimizer." : "User-customized configuration evaluated by the deterministic Phase 8 reserve optimizer." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `text-xs font-mono uppercase tracking-wider ${inputMode === "REAL_BASELINE" ? "text-cyan-300" : "text-orange-300"}`, children: inputMode === "REAL_BASELINE" ? "Real Database Sourced" : "Scenario Evaluation" }),
              inputMode !== "REAL_BASELINE" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  id: "reset-baseline-btn",
                  onClick: handleResetToRealBaseline,
                  className: "text-xs text-cyan-400 hover:text-cyan-300 underline",
                  children: "Reset to Real Baseline"
                }
              )
            ] })
          ] }),
          isCustomMode ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Current reserve",
                value: activeInput.currentReserve,
                onChange: (val) => handleInputChange("currentReserve", val),
                detail: "Real baseline (5.00 MMT policy baseline)"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Demand",
                value: activeInput.demand,
                onChange: (val) => handleInputChange("demand", val),
                detail: `Real baseline (FY ${liveState.demandFinancialYear || "2024-25"} MoPNG data)`
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Supply gap",
                value: activeInput.supplyGap,
                onChange: (val) => handleInputChange("supplyGap", val),
                detail: "Scenario Input (Gross disruption deficit)",
                badge: "SCENARIO INPUT"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Disruption duration",
                value: activeInput.disruptionDuration,
                onChange: (val) => handleInputChange("disruptionDuration", val),
                detail: "Scenario Input (Disruption days)",
                badge: "SCENARIO INPUT"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Alternative procurement",
                value: activeInput.alternativeProcurement,
                onChange: (val) => handleInputChange("alternativeProcurement", val),
                detail: `Real baseline (${realProcurement?.supplierCount || 41} supplier origins)`
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Replenishment rate",
                value: activeInput.replenishmentRate,
                onChange: (val) => handleInputChange("replenishmentRate", val),
                detail: "Real baseline (ISPRL cavern injection rate)"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              EditableInput,
              {
                label: "Minimum reserve threshold",
                value: activeInput.minimumReserveThreshold,
                onChange: (val) => handleInputChange("minimumReserveThreshold", val),
                detail: "Real baseline (Mandatory 30-day statutory floor)"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex flex-col justify-end p-2", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "button",
              {
                type: "button",
                onClick: () => void runOptimization(),
                className: "w-full flex items-center justify-center gap-2 rounded-lg bg-orange-500/20 border border-orange-500/40 px-3 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/30 transition",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.RefreshCw, { className: "h-3.5 w-3.5" }),
                  " Re-calculate With Values"
                ]
              }
            ) })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Current reserve",
                value: activeInput.currentReserve,
                detail: "5.00 MMT policy baseline (5.33 MMT cavern capacity)",
                provenance: "REAL BASELINE"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Demand",
                value: activeInput.demand,
                detail: `Real FY ${liveState.demandFinancialYear || "2024-25"} consumption demand`,
                provenance: "REAL BASELINE"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Supply gap",
                value: activeInput.supplyGap,
                detail: "Hypothetical disruption deficit under evaluation",
                provenance: "SCENARIO INPUT",
                highlight: true
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Disruption duration",
                value: activeInput.disruptionDuration,
                detail: "Hypothetical disruption duration (days)",
                provenance: "SCENARIO INPUT",
                unit: "days",
                highlight: true
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Alternative procurement",
                value: activeInput.alternativeProcurement,
                detail: `Real SQLite imports (${realProcurement?.supplierCount || 41} supplier origins)`,
                provenance: "REAL BASELINE"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Replenishment rate",
                value: activeInput.replenishmentRate,
                detail: "Operational cavern pipeline injection rate",
                provenance: "REAL BASELINE"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              ParameterCard,
              {
                label: "Minimum reserve threshold",
                value: activeInput.minimumReserveThreshold,
                detail: "Mandatory 30-day statutory safety floor",
                provenance: "REAL BASELINE"
              }
            )
          ] })
        ]
      }
    ),
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
    !optimizing && !optimizerError && result && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "space-y-5 rounded-xl border border-[#222222] bg-[#0F0F0F] p-5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.ShieldCheck, { className: "h-5 w-5 text-emerald-400" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "text-lg font-semibold text-[#EDEDED]", children: "Reserve Optimization Result" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-sm text-[#888888]", children: "Actual response from the deterministic Phase 8 calculation." })
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
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-mono px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#2D2D2D] text-[#AAAAAA]", children: result.constraintStatus })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
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
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
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
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#242424] bg-[#141414] p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2 mb-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Lock, { className: "h-4 w-4 text-emerald-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-xs font-semibold uppercase tracking-wider text-[#CCCCCC]", children: "Deterministic Safety Constraint Verification" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 text-xs md:grid-cols-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded border border-[#2A2A2A] bg-[#0C0C0C] p-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#888888]", children: "1. Gross Disruption vs Alternatives" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 font-mono text-sm font-semibold text-[#EDEDED]", children: [
                formatValue(result.grossSupplyGap),
                " Gross - ",
                formatValue(result.procurementCoverage),
                " Alt = ",
                formatValue(result.residualSupplyGap),
                "/day"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 text-[11px] text-[#777777]", children: [
                "Total cumulative need: ",
                formatValue(result.requiredReserveDrawdown),
                " units across ",
                result.duration,
                " days."
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded border border-[#2A2A2A] bg-[#0C0C0C] p-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#888888]", children: "2. Safe Drawdown Capacity" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 font-mono text-sm font-semibold text-emerald-400", children: [
                "Max Safe Release: ",
                formatValue(result.maximumSafeReserveDrawdown),
                " units"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1 text-[11px] text-[#777777]", children: [
                "Calculated as Current (",
                formatValue(activeInput.currentReserve),
                ") - Floor (",
                formatValue(result.minimumReserveConstraint),
                ")."
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded border border-[#2A2A2A] bg-[#0C0C0C] p-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[#888888]", children: "3. Safety Floor Guarantee" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-emerald-400", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.CheckCircle2, { className: "h-4 w-4 text-emerald-400" }),
                "Remaining: ",
                formatValue(result.remainingReserve),
                " \u2265 ",
                formatValue(result.minimumReserveConstraint)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-[11px] text-[#777777]", children: "Strict guarantee: Drawdown never breaches statutory safety reserve." })
            ] })
          ] }),
          isSafetyCapActive && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-3 flex items-start gap-2.5 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300", children: [
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
          isBelowThreshold && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-3 flex items-start gap-2.5 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.AlertTriangle, { className: "h-4 w-4 shrink-0 text-rose-400 mt-0.5" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "font-semibold", children: "Infeasible Reserve Drawdown: " }),
              "Current reserve (",
              formatValue(activeInput.currentReserve),
              ") is already below the minimum safety threshold (",
              formatValue(result.minimumReserveConstraint),
              "). Drawdown is locked at 0."
            ] })
          ] }),
          result.procurementProvenance && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-3 rounded border border-indigo-500/30 bg-indigo-950/20 p-3 text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Globe, { className: "h-4 w-4 text-indigo-400" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "font-semibold text-indigo-200", children: "Procurement Provenance & Cost Constraints" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "rounded bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 text-[10px] font-mono text-amber-300", children: result.procurementProvenance.commercialCostStatus })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "mt-1.5 text-[11px] text-[#A0A0A0]", children: [
              result.procurementProvenance.notes,
              " (Source: ",
              result.procurementProvenance.source,
              ", FY ",
              result.procurementProvenance.financialYear,
              ", ",
              result.procurementProvenance.activeSuppliersCount,
              " verified suppliers)."
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#222222] bg-[#0F0F0F] p-5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.Database, { className: "h-4 w-4 text-cyan-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-sm font-semibold text-[#EDEDED]", children: "India Strategic Petroleum Reserves (ISPRL) Facilities" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs text-[#777777]", children: "Phase 1 Strategic Storage Sites" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 sm:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#141414] p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#EDEDED]", children: "Visakhapatnam, Andhra Pradesh" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] font-mono text-cyan-400", children: "1.33 MMT" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-xs text-[#777777]", children: "Underground rock cavern serving eastern refineries." }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-2.5 flex items-center justify-between text-[11px] text-[#888888]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "Capacity: ~9.77M bbl" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-emerald-400 font-medium", children: "Operational" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#141414] p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#EDEDED]", children: "Mangalore, Karnataka" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] font-mono text-cyan-400", children: "1.50 MMT" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-xs text-[#777777]", children: "Underground rock cavern with 2 separate compartments." }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-2.5 flex items-center justify-between text-[11px] text-[#888888]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "Capacity: ~11.0M bbl" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-emerald-400 font-medium", children: "Operational" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#222222] bg-[#141414] p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-semibold text-[#EDEDED]", children: "Padur, Karnataka" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[11px] font-mono text-cyan-400", children: "2.50 MMT" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1 text-xs text-[#777777]", children: "Largest Phase-1 underground storage facility (4 compartments)." }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-2.5 flex items-center justify-between text-[11px] text-[#888888]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "Capacity: ~18.37M bbl" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-emerald-400 font-medium", children: "Operational" })
            ] })
          ] })
        ] })
      ] }),
      historyRuns.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "rounded-xl border border-[#222222] bg-[#0F0F0F] p-5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react3.History, { className: "h-4 w-4 text-orange-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-sm font-semibold text-[#EDEDED]", children: "Recent Optimization History" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-xs text-[#777777]", children: [
            historyRuns.length,
            " recorded runs in SQLite database"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("thead", { className: "border-b border-[#222222] text-[#777777]", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Timestamp" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Supply Gap" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Duration" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Procurement" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Drawdown Amount" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Remaining" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { className: "pb-2 font-medium", children: "Status" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("tbody", { className: "divide-y divide-[#1A1A1A]", children: historyRuns.map((run) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("tr", { className: "hover:bg-[#141414]", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "py-2.5 font-mono text-[#888888]", children: new Date(run.requestedAt).toLocaleTimeString() }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "py-2.5 font-mono text-[#CCCCCC]", children: formatValue(run.input.supplyGap) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("td", { className: "py-2.5 text-[#AAAAAA]", children: [
              run.input.disruptionDuration,
              "d"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "py-2.5 font-mono text-[#AAAAAA]", children: formatValue(run.input.alternativeProcurement) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "py-2.5 font-mono text-emerald-400 font-medium", children: formatValue(run.result.drawdownAmount) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "py-2.5 font-mono text-[#CCCCCC]", children: formatValue(run.result.remainingReserve) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "py-2.5", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `px-2 py-0.5 rounded text-[10px] font-semibold ${run.result.fullyCovered ? "bg-emerald-950/40 border border-emerald-800 text-emerald-400" : "bg-amber-950/40 border border-amber-800 text-amber-400"}`, children: run.result.coverageStatus }) })
          ] }, run.optimizationId)) })
        ] }) })
      ] })
    ] })
  ] });
};
var ParameterCard = ({ label, value, detail, provenance, unit, highlight }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: `rounded-lg border px-3 py-2.5 ${highlight ? "border-orange-500/40 bg-orange-950/10" : "border-[#2A2A2A] bg-[#121212]"}`, children: [
  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#666666]", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `text-[9px] font-mono px-1.5 py-0.5 rounded ${provenance === "REAL BASELINE" ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/60" : "bg-orange-950/60 text-orange-300 border border-orange-800/60"}`, children: provenance })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: `mt-1 font-mono text-sm font-semibold ${highlight ? "text-orange-300" : "text-[#EDEDED]"}`, children: [
    formatValue(value),
    unit ? ` ${unit}` : ""
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[11px] text-[#777777]", children: detail })
] });
var EditableInput = ({ label, value, onChange, detail, badge }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-lg border border-[#333333] bg-[#121212] px-3 py-2.5", children: [
  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-[#888888] block", children: label }),
    badge && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60", children: badge })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    "input",
    {
      type: "number",
      value,
      min: "0",
      onChange: (e) => onChange(Number(e.target.value) || 0),
      className: "mt-1 w-full rounded bg-[#1A1A1A] border border-[#383838] px-2 py-1 font-mono text-sm font-semibold text-[#EDEDED] focus:border-orange-500 focus:outline-none"
    }
  ),
  detail && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-0.5 text-[10px] text-[#777777]", children: detail })
] });

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
var optimizeStrategicReserve2 = (input) => {
  const validation = validateStrategicReserveInput(input);
  if (!validation.valid || !validation.input) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" ")
    );
  }
  const normalized = validation.input;
  const grossSupplyGap = normalized.supplyGap;
  const procurementCoverage = Math.min(
    grossSupplyGap,
    Math.max(0, normalized.alternativeProcurement)
  );
  const residualSupplyGap = Math.max(
    0,
    grossSupplyGap - normalized.alternativeProcurement
  );
  const effectiveGap = residualSupplyGap;
  const requiredReserveDrawdown = residualSupplyGap * normalized.disruptionDuration;
  const totalNeed = requiredReserveDrawdown;
  const maximumSafeReserveDrawdown = Math.max(
    0,
    normalized.currentReserve - normalized.minimumReserveThreshold
  );
  const safeAvailableReserve = maximumSafeReserveDrawdown;
  const recommendedReserveDrawdown = Math.min(
    requiredReserveDrawdown,
    maximumSafeReserveDrawdown
  );
  const drawdownAmount = recommendedReserveDrawdown;
  const remainingReserve = normalized.currentReserve - recommendedReserveDrawdown;
  const reserveDrawdownRate = normalized.disruptionDuration === 0 ? 0 : recommendedReserveDrawdown / normalized.disruptionDuration;
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
  } else if (normalized.currentReserve < normalized.minimumReserveThreshold) {
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
    duration: normalized.disruptionDuration,
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
  import_strict.default.match(markup, /Strategic Reserves/);
  import_strict.default.match(markup, /LOADING REAL DATA/);
  import_strict.default.match(markup, /Loading real strategic reserve and procurement data\.\.\./);
  import_strict.default.match(markup, /Querying SQLite database/);
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
  import_strict.default.equal(autoInput.alternativeProcurement, 588810);
  import_strict.default.equal(autoInput.replenishmentRate, 2e4);
  import_strict.default.equal(autoInput.minimumReserveThreshold, 15e5);
  import_strict.default.equal(autoInput.supplyGap, 1e5);
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
