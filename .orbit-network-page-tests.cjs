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

// tests/network-page.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);
var import_react2 = __toESM(require("react"), 1);
var import_server = require("react-dom/server");
var import_node_test = __toESM(require("node:test"), 1);

// src/pages/NetworkPage.tsx
var import_react = require("react");
var import_lucide_react4 = require("lucide-react");

// src/components/common/EmptyState.tsx
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");

// src/components/common/ErrorState.tsx
var import_lucide_react2 = require("lucide-react");
var import_jsx_runtime2 = require("react/jsx-runtime");

// src/components/common/LoadingState.tsx
var import_lucide_react3 = require("lucide-react");
var import_jsx_runtime3 = require("react/jsx-runtime");

// src/components/common/StatusBadge.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");

// src/components/common/PageHeader.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");

// src/pages/NetworkPage.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var NODE_TYPE_LABELS = {
  supplier: "Supplier",
  port: "Port",
  refinery: "Refinery",
  strategic_reserve: "Strategic Reserve",
  shipping_route: "Shipping Route",
  chokepoint: "Chokepoint"
};
var searchDigitalTwinNodes = (nodes, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const node of nodes) {
    const nameLower = node.name.toLowerCase();
    const idLower = node.nodeId.toLowerCase();
    const typeLabel = NODE_TYPE_LABELS[node.nodeType].toLowerCase();
    const sourceCountry = String(node.metadata.sourceCountryName || "").toLowerCase();
    const countryId = String(node.metadata.countryId || "").toLowerCase();
    const state = String(node.metadata.state || "").toLowerCase();
    let score = 0;
    if (nameLower === q || idLower === q) {
      score = 100;
    } else if (nameLower.startsWith(q)) {
      score = 80;
    } else if (nameLower.includes(q)) {
      score = 60;
    } else if (sourceCountry.includes(q) || countryId.includes(q) || state.includes(q) || idLower.includes(q)) {
      score = 40;
    } else if (typeLabel.includes(q)) {
      score = 20;
    }
    if (score > 0) {
      scored.push({ node, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name)).map((item) => item.node);
};
var formatMeasurement = (value, unit) => `${value.toLocaleString()} ${unit.replaceAll("_", " ")}`;
var MeasurementGroup = ({
  label,
  summary
}) => {
  const values = [...summary.nodeTotals, ...summary.edgeTotals];
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-[#666666] font-mono", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "mt-1", children: values.length ? values.map((value) => formatMeasurement(value.value, value.unit)).join(" \xB7 ") : "Not supplied" })
  ] });
};

// tests/network-page.test.ts
var networkSource = (0, import_node_fs.readFileSync)(import_node_path.default.join(process.cwd(), "src/pages/NetworkPage.tsx"), "utf8");
(0, import_node_test.default)("Network page uses business-friendly supply chain terminology", () => {
  import_strict.default.match(networkSource, /Supply Chain Network/);
  import_strict.default.match(networkSource, /Supply Chain Assets/);
  import_strict.default.match(networkSource, /Connections/);
  import_strict.default.match(networkSource, /Affected Assets/);
  import_strict.default.match(networkSource, /Affected Connections/);
  import_strict.default.match(networkSource, /Asset Types/);
  import_strict.default.doesNotMatch(networkSource, /Network Topology/);
  import_strict.default.doesNotMatch(networkSource, /label="Affected Nodes"/);
  import_strict.default.doesNotMatch(networkSource, /label="Affected Edges"/);
});
(0, import_node_test.default)("Network impact flow displays verified values, zero, and unavailable data distinctly", () => {
  const verified = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(MeasurementGroup, {
    label: "Affected Flow",
    summary: { nodeTotals: [{ value: 2445e3, unit: "barrels_per_day" }], edgeTotals: [] }
  }));
  const zero = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(MeasurementGroup, {
    label: "Affected Flow",
    summary: { nodeTotals: [{ value: 0, unit: "barrels_per_day" }], edgeTotals: [] }
  }));
  const unavailable = (0, import_server.renderToStaticMarkup)(import_react2.default.createElement(MeasurementGroup, {
    label: "Affected Flow",
    summary: { nodeTotals: [], edgeTotals: [] }
  }));
  import_strict.default.match(verified, /(2,445,000|24,45,000) barrels per day/);
  import_strict.default.match(zero, /0 barrels per day/);
  import_strict.default.match(unavailable, /Not supplied/);
});
(0, import_node_test.default)("Digital Twin search filters nodes by canonical name, alias, and asset type", () => {
  const mockNodes = [
    {
      nodeId: "port-ras-tanura",
      name: "Ras Tanura",
      nodeType: "port",
      operationalState: "operational",
      stateSource: "BASELINE",
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { latitude: 26.64, longitude: 50.16 }
    },
    {
      nodeId: "supplier-saudi-arabia",
      name: "Saudi Arabia",
      nodeType: "supplier",
      operationalState: "operational",
      stateSource: "BASELINE",
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { sourceCountryName: "Saudi Arabia", countryId: "SA" }
    },
    {
      nodeId: "refinery-mangalore",
      name: "Mangalore Refinery",
      nodeType: "refinery",
      operationalState: "reduced",
      stateSource: "BASELINE",
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { state: "Karnataka" }
    },
    {
      nodeId: "chokepoint-hormuz",
      name: "Strait of Hormuz",
      nodeType: "chokepoint",
      operationalState: "disrupted",
      stateSource: "BASELINE",
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { latitude: 26.56, longitude: 56.25 }
    },
    {
      nodeId: "shipping-route-hormuz-india",
      name: "Shipping Route: Hormuz to India",
      nodeType: "shipping_route",
      operationalState: "operational",
      stateSource: "BASELINE",
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: {}
    }
  ];
  const nameMatches = searchDigitalTwinNodes(mockNodes, "Ras Tanura");
  import_strict.default.equal(nameMatches.length, 1);
  import_strict.default.equal(nameMatches[0].nodeId, "port-ras-tanura");
  const countryMatches = searchDigitalTwinNodes(mockNodes, "Saudi");
  import_strict.default.equal(countryMatches.length, 1);
  import_strict.default.equal(countryMatches[0].nodeId, "supplier-saudi-arabia");
  const stateMatches = searchDigitalTwinNodes(mockNodes, "Karnataka");
  import_strict.default.equal(stateMatches.length, 1);
  import_strict.default.equal(stateMatches[0].nodeId, "refinery-mangalore");
  const typeMatches = searchDigitalTwinNodes(mockNodes, "chokepoint");
  import_strict.default.equal(typeMatches.length, 1);
  import_strict.default.equal(typeMatches[0].nodeId, "chokepoint-hormuz");
  const emptyMatches = searchDigitalTwinNodes(mockNodes, "NonExistentAsset");
  import_strict.default.equal(emptyMatches.length, 0);
  const blankMatches = searchDigitalTwinNodes(mockNodes, "   ");
  import_strict.default.equal(blankMatches.length, 0);
});
