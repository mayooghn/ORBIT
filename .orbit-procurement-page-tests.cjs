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

// tests/procurement-page.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);
var import_react2 = __toESM(require("react"), 1);
var import_server = require("react-dom/server");
var import_node_test = __toESM(require("node:test"), 1);

// src/pages/ProcurementPage.tsx
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

// src/components/common/StatusBadge.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "span",
    {
      className: `inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border font-semibold ${sizeClasses} ${colorClasses}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
var import_jsx_runtime4 = require("react/jsx-runtime");
var PageHeader = ({
  title,
  subtitle,
  badgeText,
  badgeLevel = "NOT_CONNECTED",
  actions
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h1", { className: "text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDED]", children: title }),
        badgeText && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatusBadge, { level: badgeLevel, label: badgeText, size: "sm" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm sm:text-base text-[#999999] mt-2 max-w-2xl leading-relaxed", children: subtitle })
    ] }),
    actions && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex items-center gap-2.5 flex-shrink-0", children: actions })
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
async function fetchScenarioNodes() {
  const body = await requestJson("/api/scenarios/nodes", {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  if (body.status !== "AVAILABLE" || !Array.isArray(body.nodes) || !body.totals || !body.typeCounts) {
    throw new Error("Scenario node response did not include selectable assets.");
  }
  return body;
}
async function runScenarioProcurement(input, useDemoData = false) {
  const query = useDemoData ? "?dataSource=demo" : "";
  const response = await fetch(`/api/scenarios/procurement${query}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const contentType = response.headers.get("content-type") || "unknown content type";
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Procurement request returned an empty response (HTTP ${response.status}).`);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `Procurement request returned invalid JSON (HTTP ${response.status}, ${contentType}).`
    );
  }
  if (!response.ok && body.status !== "UNAVAILABLE") {
    throw new Error(
      body.error || `Procurement request failed (HTTP ${response.status}).`
    );
  }
  return body;
}

// src/pages/ProcurementPage.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var DEFAULT_AFFECTED_NODE_ID = "chokepoint-strait-of-hormuz";
var NODE_TYPE_LABELS = {
  chokepoint: "Chokepoints",
  port: "Ports",
  refinery: "Refineries",
  shipping_route: "Shipping Routes",
  strategic_reserve: "Strategic Reserves",
  supplier: "Suppliers"
};
var formatNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(void 0, { maximumFractionDigits: 2 }) : "Not returned";
var formatPercent = (value) => typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "Not returned";
var formatNodeType = (nodeType) => NODE_TYPE_LABELS[nodeType].replace(/s$/, "").toLowerCase();
var groupedNodes = (nodes) => {
  const groups = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const group = groups.get(node.nodeType) || [];
    group.push(node);
    groups.set(node.nodeType, group);
  }
  return [...groups.entries()];
};
var ProcurementPage = () => {
  const [scenarioNodes, setScenarioNodes] = (0, import_react.useState)([]);
  const [nodesLoading, setNodesLoading] = (0, import_react.useState)(true);
  const [nodesError, setNodesError] = (0, import_react.useState)("");
  const [affectedNodeId, setAffectedNodeId] = (0, import_react.useState)(DEFAULT_AFFECTED_NODE_ID);
  const [durationDays, setDurationDays] = (0, import_react.useState)(14);
  const [severity, setSeverity] = (0, import_react.useState)("HIGH");
  const [capacityReductionPercent, setCapacityReductionPercent] = (0, import_react.useState)(50);
  const [useDemoData, setUseDemoData] = (0, import_react.useState)(false);
  const [status, setStatus] = (0, import_react.useState)("IDLE");
  const [scenario, setScenario] = (0, import_react.useState)(null);
  const [procurement, setProcurement] = (0, import_react.useState)(null);
  const [source, setSource] = (0, import_react.useState)("");
  const [error, setError] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const loadNodes = async () => {
      setNodesLoading(true);
      setNodesError("");
      try {
        const data = await fetchScenarioNodes();
        if (cancelled) return;
        setScenarioNodes(data.nodes);
        setAffectedNodeId(
          (current) => data.nodes.some((node) => node.nodeId === current) ? current : data.nodes[0]?.nodeId || DEFAULT_AFFECTED_NODE_ID
        );
      } catch (loadError) {
        if (cancelled) return;
        setNodesError(
          loadError instanceof Error ? loadError.message : "Unable to load scenario-capable supply chain assets."
        );
      } finally {
        if (!cancelled) setNodesLoading(false);
      }
    };
    void loadNodes();
    return () => {
      cancelled = true;
    };
  }, []);
  const selectedNode = scenarioNodes.find((node) => node.nodeId === affectedNodeId);
  const scenarioInput = (0, import_react.useMemo)(() => ({
    eventId: `${affectedNodeId}-${durationDays}-day-procurement`,
    durationDays,
    severity,
    affectedNodeId,
    capacityReductionPercent
  }), [affectedNodeId, capacityReductionPercent, durationDays, severity]);
  const generatePlan = async () => {
    setStatus("LOADING");
    setError("");
    try {
      const response = await runScenarioProcurement(
        scenarioInput,
        useDemoData
      );
      if (response.status === "ERROR") {
        throw new Error(response.error || "Procurement optimization failed.");
      }
      setScenario(response.scenario || null);
      setProcurement(response.procurement || null);
      setSource(response.source || "");
      setStatus(response.status);
    } catch (requestError) {
      setScenario(null);
      setProcurement(null);
      setSource("");
      setStatus("IDLE");
      setError(
        requestError instanceof Error ? requestError.message : "Unable to generate a procurement plan."
      );
    }
  };
  const isBusy = status === "LOADING";
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      PageHeader,
      {
        title: "Adaptive Procurement Orchestrator",
        subtitle: "Find the most feasible replacement supply across suppliers and routes.",
        badgeText: useDemoData ? "DEMO MODE" : "LIVE DATA",
        badgeLevel: useDemoData ? "AVAILABLE" : "UNKNOWN"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "grid gap-6 lg:grid-cols-[360px_1fr]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mb-6 flex items-start gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "rounded-xl bg-slate-100 p-2 dark:bg-slate-900", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.ShoppingCart, { size: 20 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-lg font-semibold", children: "Scenario supply gap" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-1 text-sm text-slate-500", children: "Select the disruption to calculate replacement supply." })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "space-y-5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "procurement-affected-node", className: "mb-2 block text-sm font-medium", children: "Current disruption" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "select",
              {
                id: "procurement-affected-node",
                value: affectedNodeId,
                onChange: (event) => setAffectedNodeId(event.target.value),
                disabled: nodesLoading || Boolean(nodesError) || scenarioNodes.length === 0,
                className: "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
                children: groupedNodes(scenarioNodes).map(([nodeType, nodes]) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("optgroup", { label: NODE_TYPE_LABELS[nodeType], children: nodes.map((node) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("option", { value: node.nodeId, children: [
                  node.name,
                  " \xB7 ",
                  formatNodeType(node.nodeType)
                ] }, node.nodeId)) }, nodeType))
              }
            ),
            nodesLoading && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-2 text-xs text-slate-500", children: "Loading scenario assets..." }),
            nodesError && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { role: "alert", className: "mt-2 text-xs text-red-600 dark:text-red-300", children: nodesError }),
            !nodesLoading && !nodesError && scenarioNodes.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-2 text-xs text-slate-500", children: "No supported scenario assets are available." }),
            selectedNode && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "mt-2 text-xs text-slate-500", children: [
              selectedNode.name,
              " \xB7 ",
              selectedNode.operationalState
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "procurement-duration", className: "mb-2 block text-sm font-medium", children: "Disruption duration" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                "input",
                {
                  id: "procurement-duration",
                  type: "range",
                  min: "1",
                  max: "60",
                  value: durationDays,
                  onChange: (event) => setDurationDays(Number(event.target.value)),
                  className: "w-full"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold dark:border-slate-800", children: [
                durationDays,
                "d"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "procurement-severity", className: "mb-2 block text-sm font-medium", children: "Severity" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
              "select",
              {
                id: "procurement-severity",
                value: severity,
                onChange: (event) => setSeverity(event.target.value),
                className: "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "LOW", children: "Low" }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "MEDIUM", children: "Medium" }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "HIGH", children: "High" }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "CRITICAL", children: "Critical" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "procurement-reduction", className: "text-sm font-medium", children: "Capacity reduction" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "text-sm font-semibold", children: [
                capacityReductionPercent,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "input",
              {
                id: "procurement-reduction",
                type: "range",
                min: "0",
                max: "100",
                value: capacityReductionPercent,
                onChange: (event) => setCapacityReductionPercent(Number(event.target.value)),
                className: "w-full"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "input",
              {
                type: "checkbox",
                checked: useDemoData,
                onChange: (event) => setUseDemoData(event.target.checked),
                className: "mt-0.5 accent-sky-600"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "block font-semibold", children: "Demo procurement data" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mt-1 block text-sky-700/80 dark:text-sky-300/80", children: "Deterministic fixture inputs for the hackathon demo; not live ORBIT data." })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
            "button",
            {
              type: "button",
              onClick: generatePlan,
              disabled: isBusy || nodesLoading || Boolean(nodesError) || scenarioNodes.length === 0,
              className: "flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950",
              children: [
                isBusy ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Loader2, { size: 18, className: "animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Truck, { size: 18 }),
                isBusy ? "Generating plan..." : "Generate Procurement Plan"
              ]
            }
          ),
          error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            ErrorState,
            {
              title: "Procurement request failed",
              message: error,
              onRetry: generatePlan,
              className: "p-5"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "space-y-6", children: [
        isBusy && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          LoadingState,
          {
            message: "Optimizing replacement supply...",
            subtext: "Running the deterministic GLPK procurement model and validating constraints.",
            className: "min-h-[420px]"
          }
        ),
        !isBusy && !scenario && !error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "max-w-md px-6 text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.ShoppingCart, { size: 42, className: "mx-auto mb-4 opacity-40" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-lg font-semibold", children: "No procurement plan yet" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-2 text-sm text-slate-500", children: "ORBIT will calculate the scenario supply gap and find the most feasible replacement plan." })
        ] }) }),
        !isBusy && scenario && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SupplyGapSummary, { scenario, selectedNode }),
          status === "UNAVAILABLE" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.CircleHelp, { className: "mt-0.5 shrink-0 text-slate-500", size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-lg font-semibold", children: "Procurement plan unavailable" }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatusBadge, { level: "UNKNOWN", label: "DATA UNAVAILABLE", size: "sm" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: "Verified procurement data is not available for this scenario." }),
              source && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "mt-2 text-xs text-slate-500", children: [
                "Source: ",
                source
              ] })
            ] })
          ] }) }),
          status === "INFEASIBLE" && procurement && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(InfeasibleResult, { result: procurement, scenario, source }),
          status === "OPTIMAL" && procurement && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(OptimalResult, { result: procurement, scenario, source })
        ] })
      ] })
    ] })
  ] });
};
var SupplyGapSummary = ({ scenario, selectedNode }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mb-5 flex items-start gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "rounded-xl bg-slate-100 p-2 dark:bg-slate-900", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.AlertTriangle, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-lg font-semibold", children: "Supply Gap" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-1 text-sm text-slate-500", children: "ORBIT detected a replacement-supply requirement from the current disruption scenario." })
    ] })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "grid gap-4 sm:grid-cols-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      SummaryMetric,
      {
        label: "Current disruption",
        value: selectedNode?.name || scenario.input.affectedNodeId,
        detail: `${scenario.input.durationDays} days \xB7 ${scenario.input.severity}`
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      SummaryMetric,
      {
        label: "Required replacement",
        value: formatNumber(scenario.shortage),
        detail: scenario.shortageUnit
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      SummaryMetric,
      {
        label: "Capacity reduction",
        value: `${scenario.input.capacityReductionPercent}%`,
        detail: `Gross loss: ${formatNumber(scenario.supplyLoss)} ${scenario.supplyLossUnit}`
      }
    )
  ] })
] });
var OptimalResult = ({ result, scenario, source }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "space-y-6", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-xl font-semibold", children: "Procurement Plan" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: "The optimizer found a validated replacement allocation for the scenario gap." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatusBadge, { level: "AVAILABLE", label: "OPTIMAL", size: "sm" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetrics, { result, requiredQuantity: scenario.shortage }),
    source && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "mt-4 text-xs text-slate-500", children: [
      "Source: ",
      source
    ] })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(AllocationTables, { result }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ConstraintValidation, { validation: result.constraintValidation })
] });
var InfeasibleResult = ({ result, scenario, source }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "space-y-6", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "rounded-2xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/60 dark:bg-amber-950/20", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-xl font-semibold", children: "Procurement Plan" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: "Available verified capacity cannot satisfy the full scenario gap." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatusBadge, { level: "CONSTRAINED", label: "INFEASIBLE", size: "sm" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mt-6 grid gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SummaryMetric, { label: "Required quantity", value: formatNumber(scenario.shortage), detail: scenario.shortageUnit }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SummaryMetric, { label: "Maximum feasible", value: formatNumber(result.totalProcured), detail: result.totalProcuredUnit }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SummaryMetric, { label: "Unmet quantity", value: formatNumber(result.unmetSupply), detail: result.unmetSupplyUnit })
    ] }),
    source && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "mt-4 text-xs text-slate-500", children: [
      "Source: ",
      source
    ] })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(AllocationTables, { result }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ConstraintValidation, { validation: result.constraintValidation })
] });
var ResultMetrics = ({ result, requiredQuantity }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.ShoppingCart, label: "Required quantity", value: formatNumber(requiredQuantity), unit: result.totalProcuredUnit }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.CheckCircle2, label: "Total procured", value: formatNumber(result.totalProcured), unit: result.totalProcuredUnit }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.AlertTriangle, label: "Unmet supply", value: formatNumber(result.unmetSupply), unit: result.unmetSupplyUnit }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.Factory, label: "Total cost", value: formatNumber(result.totalCost), unit: result.totalCostUnit }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.Route, label: "Objective value", value: formatNumber(result.objectiveValue), unit: "weighted objective" }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.CheckCircle2, label: "Solver status", value: result.solverStatus, unit: "GLPK" }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ResultMetric, { icon: import_lucide_react3.Clock3, label: "Solve time", value: formatNumber(result.solveTimeMs), unit: "ms" })
] });
var AllocationTables = ({ result }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(AllocationSection, { title: "Supplier allocations", icon: import_lucide_react3.Truck, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { className: "min-w-full text-left text-sm", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { className: "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Supplier" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Quantity" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Cost" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Risk" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Reliability" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: result.supplierAllocations.map((allocation) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SupplierRow, { allocation }, allocation.supplierId)) })
  ] }) }) }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(AllocationSection, { title: "Route allocations", icon: import_lucide_react3.Route, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { className: "min-w-full text-left text-sm", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { className: "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Route" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Quantity" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Capacity" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Transit time" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: result.routeAllocations.map((allocation) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(RouteRow, { allocation }, allocation.routeId)) })
  ] }) }) }),
  result.allocations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(AllocationSection, { title: "Lane allocations", icon: import_lucide_react3.Truck, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { className: "min-w-full text-left text-sm", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { className: "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Supplier \u2192 Route" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Quantity" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Cost" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Transit" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Risk" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { className: "px-3 py-3", children: "Reliability" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: result.allocations.map((allocation) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LaneRow, { allocation }, allocation.laneId)) })
  ] }) }) })
] });
var SupplierRow = ({ allocation }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { className: "border-b border-slate-100 last:border-0 dark:border-slate-900", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3 font-medium", children: allocation.supplierName }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono", children: [
    formatNumber(allocation.quantity),
    " ",
    allocation.unit
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono", children: [
    formatNumber(allocation.totalCost),
    " ",
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-xs text-slate-400", children: allocation.totalCostUnit })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3", children: allocation.riskScore === null ? "Not returned" : allocation.riskScore.toFixed(1) }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3", children: formatPercent(allocation.reliabilityScore) })
] });
var RouteRow = ({ allocation }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { className: "border-b border-slate-100 last:border-0 dark:border-slate-900", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3 font-medium", children: allocation.routeName }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono", children: [
    formatNumber(allocation.quantity),
    " ",
    allocation.unit
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono", children: [
    formatNumber(allocation.capacity),
    " ",
    allocation.unit
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3", children: allocation.transitTimeDays === null ? "Not returned" : `${allocation.transitTimeDays.toFixed(1)} days` })
] });
var LaneRow = ({ allocation }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { className: "border-b border-slate-100 last:border-0 dark:border-slate-900", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono text-xs", children: [
    allocation.supplierId,
    " \u2192 ",
    allocation.routeId
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono", children: [
    formatNumber(allocation.quantity),
    " ",
    allocation.quantityUnit
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { className: "px-3 py-3 font-mono", children: [
    formatNumber(allocation.procurementCost),
    " ",
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-xs text-slate-400", children: allocation.procurementCostUnit })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3", children: allocation.transitTimeDays === void 0 ? "Not returned" : `${allocation.transitTimeDays} days` }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3", children: allocation.riskScore === void 0 ? "Not returned" : allocation.riskScore.toFixed(1) }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { className: "px-3 py-3", children: formatPercent(allocation.reliabilityScore) })
] });
var AllocationSection = ({ title, icon: Icon, children }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mb-4 flex items-center gap-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Icon, { size: 18 }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-lg font-semibold", children: title })
  ] }),
  children
] });
var ConstraintValidation = ({ validation }) => {
  const checks = [
    { label: "Supply requirement", matches: validation.checks.filter((check) => check.constraint === "supply_gap") },
    { label: "Supplier capacity", matches: validation.checks.filter((check) => check.constraint.startsWith("supplier_capacity_")) },
    { label: "Route capacity", matches: validation.checks.filter((check) => check.constraint.startsWith("route_capacity_")) },
    { label: "Compatibility", matches: validation.checks.filter((check) => check.constraint.startsWith("allocation_compatibility_")) }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mb-4 flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.CheckCircle2, { size: 18 }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "text-lg font-semibold", children: "Constraint validation" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "grid gap-3 sm:grid-cols-2", children: checks.map(({ label, matches }) => {
      const passed = matches.length > 0 && matches.every((check) => check.passed);
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-sm", children: label }),
        matches.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.CircleHelp, { size: 17, className: "text-slate-400" }) : passed ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.CheckCircle2, { size: 17, className: "text-emerald-500" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.XCircle, { size: 17, className: "text-red-500" })
      ] }, label);
    }) }),
    !validation.valid && validation.checks.some((check) => !check.passed) && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200", children: validation.checks.filter((check) => !check.passed).map((check) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: check.message }, check.constraint)) })
  ] });
};
var SummaryMetric = ({ label, value, detail }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "text-xs uppercase tracking-wide text-slate-400", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mt-2 break-words text-lg font-semibold", children: value }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mt-1 break-words text-xs text-slate-500", children: detail })
] });
var ResultMetric = ({ icon: Icon, label, value, unit }) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "rounded-xl border border-emerald-200/70 bg-white/70 p-4 dark:border-emerald-900/50 dark:bg-slate-950/40", children: [
  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Icon, { size: 15 }),
    label
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mt-2 break-words text-xl font-bold", children: value }),
  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mt-1 break-words text-xs text-slate-400", children: unit })
] });

// tests/procurement-page.test.ts
var procurementSource = (0, import_node_fs.readFileSync)(
  import_node_path.default.join(process.cwd(), "src/pages/ProcurementPage.tsx"),
  "utf8"
);
(0, import_node_test.default)("Procurement page presents the adaptive replacement-supply workflow", () => {
  const markup = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(ProcurementPage));
  import_strict.default.match(markup, /Adaptive Procurement Orchestrator/);
  import_strict.default.match(markup, /Generate Procurement Plan/);
  import_strict.default.match(markup, /Scenario supply gap/);
  import_strict.default.match(markup, /Demo procurement data/);
});
(0, import_node_test.default)("Procurement page renders all optimizer outcome sections and API data states", () => {
  const requiredLabels = [
    "Supply Gap",
    "Procurement Plan",
    "Supplier allocations",
    "Route allocations",
    "Lane allocations",
    "Constraint validation",
    "INFEASIBLE",
    "Verified procurement data is not available for this scenario."
  ];
  for (const label of requiredLabels) import_strict.default.match(procurementSource, new RegExp(label));
  import_strict.default.match(procurementSource, /runScenarioProcurement\(/);
  import_strict.default.match(procurementSource, /useDemoData/);
  import_strict.default.match(procurementSource, /OPTIMAL/);
  import_strict.default.match(procurementSource, /Maximum feasible/);
  import_strict.default.match(procurementSource, /Unmet quantity/);
});
