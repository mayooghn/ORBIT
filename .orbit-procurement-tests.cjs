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

// tests/procurement.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_test = __toESM(require("node:test"), 1);

// src/procurement/glpk-solver-adapter.ts
var loadGlpk = async () => {
  const imported = await import("glpk.js/node");
  const candidate = imported.default;
  if (typeof candidate === "function") {
    return candidate;
  }
  if (candidate && typeof candidate === "object" && "default" in candidate && typeof candidate.default === "function") {
    return candidate.default;
  }
  throw new Error("GLPK module did not expose a callable factory.");
};
var toGlpkBounds = (glpk, constraint) => {
  if (constraint.lowerBound !== null && constraint.upperBound !== null && constraint.lowerBound === constraint.upperBound) {
    return {
      type: glpk.GLP_FX,
      lb: constraint.lowerBound,
      ub: constraint.upperBound
    };
  }
  if (constraint.upperBound !== null) {
    return {
      type: glpk.GLP_UP,
      lb: constraint.lowerBound ?? 0,
      ub: constraint.upperBound
    };
  }
  return {
    type: glpk.GLP_LO,
    lb: constraint.lowerBound ?? 0,
    ub: 0
  };
};
var toGlpkModel = (glpk, model) => ({
  name: model.name,
  objective: {
    direction: model.direction === "MINIMIZE" ? glpk.GLP_MIN : glpk.GLP_MAX,
    name: "objective",
    vars: Object.entries(model.objectiveCoefficients).map(
      ([name, coef]) => ({ name, coef })
    )
  },
  subjectTo: model.subjectTo.map((constraint) => ({
    name: constraint.name,
    vars: Object.entries(constraint.coefficients).map(
      ([name, coef]) => ({ name, coef })
    ),
    bnds: toGlpkBounds(glpk, constraint)
  })),
  bounds: model.variables.map((variable) => ({
    name: variable.name,
    type: variable.upperBound === null ? glpk.GLP_LO : glpk.GLP_DB,
    lb: variable.lowerBound,
    ub: variable.upperBound ?? 0
  }))
});
var mapStatus = (glpk, status) => {
  if (status === glpk.GLP_OPT) return "OPTIMAL";
  if (status === glpk.GLP_FEAS) return "FEASIBLE";
  if (status === glpk.GLP_INFEAS || status === glpk.GLP_NOFEAS) {
    return "INFEASIBLE";
  }
  if (status === glpk.GLP_UNDEF) return "INFEASIBLE";
  if (status === glpk.GLP_UNBND) return "UNBOUNDED";
  return "ERROR";
};
var GlpkSolverAdapter = class {
  async solve(model) {
    const startedAt = Date.now();
    if (model.variables.length === 0) {
      const demandConstraint = model.subjectTo.find(
        (constraint) => constraint.name === "supply_gap"
      );
      const demand = demandConstraint?.lowerBound ?? 0;
      const feasible = demand === 0;
      return {
        status: feasible ? "OPTIMAL" : "INFEASIBLE",
        objectiveValue: 0,
        variables: {},
        solveTimeMs: Date.now() - startedAt,
        rawStatus: null,
        ...feasible ? {} : { error: "No compatible supplier-route lane can satisfy the supply gap." }
      };
    }
    try {
      const glpk = await (await loadGlpk())();
      const result = glpk.solve(toGlpkModel(glpk, model), {
        msglev: glpk.GLP_MSG_OFF,
        presol: true
      });
      const status = mapStatus(glpk, result.result.status);
      return {
        status,
        objectiveValue: Number.isFinite(result.result.z) ? result.result.z : 0,
        variables: result.result.vars,
        solveTimeMs: Date.now() - startedAt,
        rawStatus: result.result.status,
        ...status === "ERROR" ? { error: `GLPK returned status ${result.result.status}.` } : {}
      };
    } catch (error) {
      return {
        status: "ERROR",
        objectiveValue: 0,
        variables: {},
        solveTimeMs: Date.now() - startedAt,
        rawStatus: null,
        error: error instanceof Error ? error.message : "The GLPK solver failed."
      };
    }
  }
};

// src/procurement/input-validator.ts
var DEFAULT_OBJECTIVE_WEIGHTS = {
  cost: 1,
  risk: 1,
  transitTime: 1,
  reliabilityPenalty: 1
};
var isRecord = (value) => typeof value === "object" && value !== null;
var isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
var nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var addIssue = (issues, path, message) => {
  issues.push({ path, message });
};
var validateProcurementRequest = (input) => {
  const issues = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [{ path: "request", message: "A procurement request is required." }]
    };
  }
  const request = input;
  const supplyGap = request.supplyGap;
  if (!isRecord(supplyGap)) {
    addIssue(issues, "supplyGap", "Supply gap is required.");
  } else {
    if (!isFiniteNumber(supplyGap.quantity) || supplyGap.quantity < 0) {
      addIssue(issues, "supplyGap.quantity", "Supply gap quantity must be a finite non-negative number.");
    }
    if (!nonEmptyString(supplyGap.unit)) {
      addIssue(issues, "supplyGap.unit", "Supply gap unit is required.");
    }
  }
  if (!Array.isArray(request.suppliers) || request.suppliers.length === 0) {
    addIssue(issues, "suppliers", "At least one supplier is required.");
  }
  if (!Array.isArray(request.routes) || request.routes.length === 0) {
    addIssue(issues, "routes", "At least one route is required.");
  }
  if (!Array.isArray(request.lanes)) {
    addIssue(issues, "lanes", "Supplier-route lanes must be an array.");
  }
  const supplierIds = /* @__PURE__ */ new Set();
  const routeIds = /* @__PURE__ */ new Set();
  const laneIds = /* @__PURE__ */ new Set();
  const supplierUnit = isRecord(supplyGap) && typeof supplyGap.unit === "string" ? supplyGap.unit : null;
  if (Array.isArray(request.suppliers)) {
    request.suppliers.forEach((supplier, index) => {
      const path = `suppliers[${index}]`;
      if (!isRecord(supplier)) {
        addIssue(issues, path, "Supplier must be an object.");
        return;
      }
      if (!nonEmptyString(supplier.supplierId)) addIssue(issues, `${path}.supplierId`, "Supplier ID is required.");
      if (!nonEmptyString(supplier.name)) addIssue(issues, `${path}.name`, "Supplier name is required.");
      if (!isFiniteNumber(supplier.capacity) || supplier.capacity < 0) addIssue(issues, `${path}.capacity`, "Supplier capacity must be finite and non-negative.");
      if (!nonEmptyString(supplier.capacityUnit)) addIssue(issues, `${path}.capacityUnit`, "Supplier capacity unit is required.");
      if (nonEmptyString(supplier.supplierId)) {
        if (supplierIds.has(supplier.supplierId)) addIssue(issues, `${path}.supplierId`, "Supplier IDs must be unique.");
        supplierIds.add(supplier.supplierId);
      }
      if (supplierUnit && nonEmptyString(supplier.capacityUnit) && supplier.capacityUnit !== supplierUnit) {
        addIssue(issues, `${path}.capacityUnit`, `Supplier capacity unit must match supply gap unit (${supplierUnit}).`);
      }
    });
  }
  if (Array.isArray(request.routes)) {
    request.routes.forEach((route, index) => {
      const path = `routes[${index}]`;
      if (!isRecord(route)) {
        addIssue(issues, path, "Route must be an object.");
        return;
      }
      if (!nonEmptyString(route.routeId)) addIssue(issues, `${path}.routeId`, "Route ID is required.");
      if (!nonEmptyString(route.name)) addIssue(issues, `${path}.name`, "Route name is required.");
      if (!isFiniteNumber(route.capacity) || route.capacity < 0) addIssue(issues, `${path}.capacity`, "Route capacity must be finite and non-negative.");
      if (!nonEmptyString(route.capacityUnit)) addIssue(issues, `${path}.capacityUnit`, "Route capacity unit is required.");
      if (nonEmptyString(route.routeId)) {
        if (routeIds.has(route.routeId)) addIssue(issues, `${path}.routeId`, "Route IDs must be unique.");
        routeIds.add(route.routeId);
      }
      if (supplierUnit && nonEmptyString(route.capacityUnit) && route.capacityUnit !== supplierUnit) {
        addIssue(issues, `${path}.capacityUnit`, `Route capacity unit must match supply gap unit (${supplierUnit}).`);
      }
    });
  }
  let costUnit = null;
  if (Array.isArray(request.lanes)) {
    request.lanes.forEach((lane, index) => {
      const path = `lanes[${index}]`;
      if (!isRecord(lane)) {
        addIssue(issues, path, "Lane must be an object.");
        return;
      }
      if (!nonEmptyString(lane.laneId)) addIssue(issues, `${path}.laneId`, "Lane ID is required.");
      if (!nonEmptyString(lane.supplierId) || !supplierIds.has(lane.supplierId)) addIssue(issues, `${path}.supplierId`, "Lane must reference a known supplier.");
      if (!nonEmptyString(lane.routeId) || !routeIds.has(lane.routeId)) addIssue(issues, `${path}.routeId`, "Lane must reference a known route.");
      if (typeof lane.compatible !== "boolean") addIssue(issues, `${path}.compatible`, "Lane compatibility must be boolean.");
      if (!isFiniteNumber(lane.procurementCostPerUnit) || lane.procurementCostPerUnit < 0) addIssue(issues, `${path}.procurementCostPerUnit`, "Procurement cost must be finite and non-negative.");
      if (!nonEmptyString(lane.procurementCostUnit)) addIssue(issues, `${path}.procurementCostUnit`, "Procurement cost unit is required.");
      if (!isFiniteNumber(lane.transitTimeDays) || lane.transitTimeDays < 0) addIssue(issues, `${path}.transitTimeDays`, "Transit time must be finite and non-negative.");
      if (!isFiniteNumber(lane.riskScore) || lane.riskScore < 0 || lane.riskScore > 100) addIssue(issues, `${path}.riskScore`, "Risk score must be between 0 and 100.");
      if (!isFiniteNumber(lane.reliabilityScore) || lane.reliabilityScore < 0 || lane.reliabilityScore > 1) addIssue(issues, `${path}.reliabilityScore`, "Reliability score must be between 0 and 1.");
      if (nonEmptyString(lane.laneId)) {
        if (laneIds.has(lane.laneId)) addIssue(issues, `${path}.laneId`, "Lane IDs must be unique.");
        laneIds.add(lane.laneId);
      }
      if (nonEmptyString(lane.procurementCostUnit)) {
        if (costUnit === null) costUnit = lane.procurementCostUnit;
        else if (costUnit !== lane.procurementCostUnit) addIssue(issues, `${path}.procurementCostUnit`, `Procurement cost unit must match ${costUnit}.`);
      }
    });
  }
  const providedWeights = request.objectiveWeights;
  const weights = {
    ...DEFAULT_OBJECTIVE_WEIGHTS,
    ...isRecord(providedWeights) ? providedWeights : {}
  };
  for (const key of Object.keys(DEFAULT_OBJECTIVE_WEIGHTS)) {
    if (!isFiniteNumber(weights[key]) || weights[key] < 0) {
      addIssue(issues, `objectiveWeights.${key}`, "Objective weights must be finite and non-negative.");
    }
  }
  if (issues.length > 0) return { valid: false, issues };
  return {
    valid: true,
    issues: [],
    request: {
      ...request,
      objectiveWeights: weights
    }
  };
};

// src/procurement/optimization-model.ts
var variableNameForIndex = (index) => `procurement_${index}`;
var buildConstraint = (name, coefficients, upperBound, lowerBound) => ({
  name,
  coefficients,
  upperBound,
  lowerBound
});
var buildProcurementOptimizationModel = (request) => {
  const compatibleLanes = request.lanes.filter((lane) => lane.compatible).sort((left, right) => left.laneId.localeCompare(right.laneId));
  const laneVariableNames = {};
  const objectiveCoefficients = {};
  const variables = compatibleLanes.map((lane, index) => {
    const variableName = variableNameForIndex(index);
    laneVariableNames[lane.laneId] = variableName;
    objectiveCoefficients[variableName] = request.objectiveWeights.cost * lane.procurementCostPerUnit + request.objectiveWeights.risk * lane.riskScore + request.objectiveWeights.transitTime * lane.transitTimeDays + request.objectiveWeights.reliabilityPenalty * (1 - lane.reliabilityScore);
    return {
      name: variableName,
      lowerBound: 0,
      upperBound: null
    };
  });
  const subjectTo = [
    buildConstraint(
      "supply_gap",
      Object.fromEntries(
        compatibleLanes.map((lane) => [
          laneVariableNames[lane.laneId],
          1
        ])
      ),
      request.supplyGap.quantity,
      request.supplyGap.quantity
    )
  ];
  for (const supplier of request.suppliers) {
    subjectTo.push(
      buildConstraint(
        `supplier_capacity_${supplier.supplierId}`,
        Object.fromEntries(
          compatibleLanes.filter((lane) => lane.supplierId === supplier.supplierId).map((lane) => [laneVariableNames[lane.laneId], 1])
        ),
        supplier.capacity,
        null
      )
    );
  }
  for (const route of request.routes) {
    subjectTo.push(
      buildConstraint(
        `route_capacity_${route.routeId}`,
        Object.fromEntries(
          compatibleLanes.filter((lane) => lane.routeId === route.routeId).map((lane) => [laneVariableNames[lane.laneId], 1])
        ),
        route.capacity,
        null
      )
    );
  }
  return {
    linearModel: {
      name: "orbit_procurement_optimization",
      direction: "MINIMIZE",
      variables,
      objectiveCoefficients,
      subjectTo
    },
    laneVariableNames
  };
};

// src/procurement/feasibility-validator.ts
var PROCUREMENT_VALIDATION_TOLERANCE = 1e-7;
var check = (constraint, passed, actual, limit, message) => ({
  constraint,
  passed,
  actual,
  limit,
  message
});
var withinTolerance = (left, right) => Math.abs(left - right) <= PROCUREMENT_VALIDATION_TOLERANCE * Math.max(1, Math.abs(right));
var validateProcurementAllocations = (request, allocations) => {
  const checks = [];
  const suppliers = new Map(request.suppliers.map((supplier) => [supplier.supplierId, supplier]));
  const routes = new Map(request.routes.map((route) => [route.routeId, route]));
  const lanes = new Map(request.lanes.map((lane) => [lane.laneId, lane]));
  const supplierTotals = /* @__PURE__ */ new Map();
  const routeTotals = /* @__PURE__ */ new Map();
  let total = 0;
  for (const allocation of allocations) {
    const lane = lanes.get(allocation.laneId);
    const validQuantity = Number.isFinite(allocation.quantity) && allocation.quantity >= -PROCUREMENT_VALIDATION_TOLERANCE;
    checks.push(check(
      `allocation_non_negative_${allocation.laneId}`,
      validQuantity,
      allocation.quantity,
      0,
      validQuantity ? "Allocation quantity is non-negative." : "Allocation quantity is negative or non-finite."
    ));
    const knownLane = lane !== void 0 && lane.supplierId === allocation.supplierId && lane.routeId === allocation.routeId;
    checks.push(check(
      `allocation_lane_${allocation.laneId}`,
      knownLane,
      null,
      null,
      knownLane ? "Allocation references a known lane." : "Allocation references an unknown or mismatched lane."
    ));
    const compatible = lane?.compatible === true;
    checks.push(check(
      `allocation_compatibility_${allocation.laneId}`,
      !lane || compatible || Math.abs(allocation.quantity) <= PROCUREMENT_VALIDATION_TOLERANCE,
      allocation.quantity,
      0,
      !lane || compatible || Math.abs(allocation.quantity) <= PROCUREMENT_VALIDATION_TOLERANCE ? "Incompatible lanes have zero allocation." : "An incompatible lane received procurement quantity."
    ));
    if (validQuantity && knownLane && lane) {
      const quantity = Math.max(0, allocation.quantity);
      total += quantity;
      supplierTotals.set(allocation.supplierId, (supplierTotals.get(allocation.supplierId) ?? 0) + quantity);
      routeTotals.set(allocation.routeId, (routeTotals.get(allocation.routeId) ?? 0) + quantity);
    }
  }
  checks.push(check(
    "supply_gap",
    withinTolerance(total, request.supplyGap.quantity),
    total,
    request.supplyGap.quantity,
    withinTolerance(total, request.supplyGap.quantity) ? "Total procurement exactly satisfies the supply gap." : "Total procurement does not satisfy the supply gap."
  ));
  for (const supplier of request.suppliers) {
    const quantity = supplierTotals.get(supplier.supplierId) ?? 0;
    checks.push(check(
      `supplier_capacity_${supplier.supplierId}`,
      quantity <= supplier.capacity + PROCUREMENT_VALIDATION_TOLERANCE,
      quantity,
      supplier.capacity,
      quantity <= supplier.capacity + PROCUREMENT_VALIDATION_TOLERANCE ? "Supplier capacity is respected." : "Supplier capacity is exceeded."
    ));
  }
  for (const route of request.routes) {
    const quantity = routeTotals.get(route.routeId) ?? 0;
    checks.push(check(
      `route_capacity_${route.routeId}`,
      quantity <= route.capacity + PROCUREMENT_VALIDATION_TOLERANCE,
      quantity,
      route.capacity,
      quantity <= route.capacity + PROCUREMENT_VALIDATION_TOLERANCE ? "Route capacity is respected." : "Route capacity is exceeded."
    ));
  }
  return {
    valid: checks.every((constraint) => constraint.passed),
    tolerance: PROCUREMENT_VALIDATION_TOLERANCE,
    checks
  };
};

// src/procurement/orchestrator.ts
var emptyValidation = () => ({
  valid: false,
  tolerance: PROCUREMENT_VALIDATION_TOLERANCE,
  checks: []
});
var zeroAllocations = (request) => request.lanes.map((lane) => ({
  laneId: lane.laneId,
  supplierId: lane.supplierId,
  routeId: lane.routeId,
  quantity: 0,
  quantityUnit: request.supplyGap.unit,
  procurementCost: 0,
  procurementCostUnit: lane.procurementCostUnit,
  transitTimeDays: lane.transitTimeDays,
  riskScore: lane.riskScore,
  reliabilityScore: lane.reliabilityScore,
  objectiveContribution: 0
}));
var buildSupplierAllocations = (request, allocations) => request.suppliers.map((supplier) => {
  const supplierAllocations = allocations.filter(
    (allocation) => allocation.supplierId === supplier.supplierId
  );
  const quantity = supplierAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0
  );
  const totalCost = supplierAllocations.reduce(
    (sum, allocation) => sum + allocation.procurementCost,
    0
  );
  return {
    supplierId: supplier.supplierId,
    supplierName: supplier.name,
    quantity,
    capacity: supplier.capacity,
    unit: request.supplyGap.unit,
    totalCost,
    totalCostUnit: supplierAllocations[0]?.procurementCostUnit ?? "unavailable",
    riskScore: quantity > 0 ? supplierAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity * (allocation.riskScore ?? 0),
      0
    ) / quantity : null,
    reliabilityScore: quantity > 0 ? supplierAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity * (allocation.reliabilityScore ?? 0),
      0
    ) / quantity : null
  };
});
var buildRouteAllocations = (request, allocations) => request.routes.map((route) => {
  const routeAllocations = allocations.filter(
    (allocation) => allocation.routeId === route.routeId
  );
  const quantity = routeAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0
  );
  return {
    routeId: route.routeId,
    routeName: route.name,
    quantity,
    capacity: route.capacity,
    unit: request.supplyGap.unit,
    transitTimeDays: quantity > 0 ? routeAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity * (allocation.transitTimeDays ?? 0),
      0
    ) / quantity : null
  };
});
var buildResult = (request, status, solverStatus, allocations, solveTimeMs, objectiveValue, constraintValidation, error) => {
  const totalProcured = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const totalCost = allocations.reduce((sum, allocation) => sum + allocation.procurementCost, 0);
  const costUnit = request.lanes.find((lane) => lane.procurementCostUnit.trim())?.procurementCostUnit ?? "unavailable";
  return {
    status,
    solverStatus,
    allocations,
    supplierAllocations: buildSupplierAllocations(request, allocations),
    routeAllocations: buildRouteAllocations(request, allocations),
    totalProcured,
    totalProcuredUnit: request.supplyGap.unit,
    totalCost,
    totalCostUnit: costUnit,
    objectiveValue,
    unmetSupply: Math.max(0, request.supplyGap.quantity - totalProcured),
    unmetSupplyUnit: request.supplyGap.unit,
    constraintValidation,
    solveTimeMs,
    ...error ? { error } : {}
  };
};
var invalidRequestResult = (validationIssues) => ({
  status: "ERROR",
  solverStatus: "NOT_RUN",
  allocations: [],
  supplierAllocations: [],
  routeAllocations: [],
  totalProcured: 0,
  totalProcuredUnit: "unavailable",
  totalCost: 0,
  totalCostUnit: "unavailable",
  objectiveValue: 0,
  unmetSupply: 0,
  unmetSupplyUnit: "unavailable",
  constraintValidation: emptyValidation(),
  solveTimeMs: 0,
  error: validationIssues.join(" ")
});
var buildAllocations = (request, laneVariableNames, variables) => request.lanes.map((lane) => {
  const quantity = Math.abs(variables[laneVariableNames[lane.laneId]] ?? 0) <= PROCUREMENT_VALIDATION_TOLERANCE ? 0 : Math.max(0, variables[laneVariableNames[lane.laneId]] ?? 0);
  const objectiveContribution = quantity * (request.objectiveWeights.cost * lane.procurementCostPerUnit + request.objectiveWeights.risk * lane.riskScore + request.objectiveWeights.transitTime * lane.transitTimeDays + request.objectiveWeights.reliabilityPenalty * (1 - lane.reliabilityScore));
  return {
    laneId: lane.laneId,
    supplierId: lane.supplierId,
    routeId: lane.routeId,
    quantity,
    quantityUnit: request.supplyGap.unit,
    procurementCost: quantity * lane.procurementCostPerUnit,
    procurementCostUnit: lane.procurementCostUnit,
    transitTimeDays: lane.transitTimeDays,
    riskScore: lane.riskScore,
    reliabilityScore: lane.reliabilityScore,
    objectiveContribution
  };
});
var ProcurementOrchestrator = class {
  constructor(solverAdapter = new GlpkSolverAdapter()) {
    this.solverAdapter = solverAdapter;
  }
  async optimize(input) {
    const validation = validateProcurementRequest(input);
    if (!validation.valid || !validation.request) {
      return invalidRequestResult(validation.issues.map((issue) => `${issue.path}: ${issue.message}`));
    }
    const request = validation.request;
    const model = buildProcurementOptimizationModel(request);
    const solverResult = await this.solverAdapter.solve(model.linearModel);
    if (solverResult.status === "INFEASIBLE") {
      const allocations2 = zeroAllocations(request);
      const constraintValidation2 = validateProcurementAllocations(request, allocations2);
      return buildResult(
        request,
        "INFEASIBLE",
        "INFEASIBLE",
        allocations2,
        solverResult.solveTimeMs,
        0,
        constraintValidation2,
        "No feasible procurement allocation satisfies the supply-gap and capacity constraints."
      );
    }
    if (solverResult.status !== "OPTIMAL" && solverResult.status !== "FEASIBLE") {
      return buildResult(
        request,
        "ERROR",
        solverResult.status,
        zeroAllocations(request),
        solverResult.solveTimeMs,
        0,
        emptyValidation(),
        solverResult.error ?? "The procurement solver did not return a usable solution."
      );
    }
    const allocations = buildAllocations(
      request,
      model.laneVariableNames,
      solverResult.variables
    );
    const constraintValidation = validateProcurementAllocations(request, allocations);
    if (!constraintValidation.valid) {
      return buildResult(
        request,
        "ERROR",
        solverResult.status,
        allocations,
        solverResult.solveTimeMs,
        solverResult.objectiveValue,
        constraintValidation,
        "Independent feasibility validation rejected the solver output."
      );
    }
    return buildResult(
      request,
      solverResult.status === "OPTIMAL" ? "OPTIMAL" : "ERROR",
      solverResult.status,
      allocations,
      solverResult.solveTimeMs,
      solverResult.objectiveValue,
      constraintValidation,
      solverResult.status === "FEASIBLE" ? "The solver returned a feasible but non-optimal solution." : void 0
    );
  }
};
var optimizeProcurement = async (request, solverAdapter) => new ProcurementOrchestrator(solverAdapter).optimize(request);

// tests/procurement.test.ts
var baseRequest = () => ({
  supplyGap: { quantity: 100, unit: "tonnes" },
  suppliers: [
    { supplierId: "supplier-a", name: "Supplier A", capacity: 100, capacityUnit: "tonnes" },
    { supplierId: "supplier-b", name: "Supplier B", capacity: 100, capacityUnit: "tonnes" }
  ],
  routes: [
    { routeId: "route-1", name: "Route 1", capacity: 100, capacityUnit: "tonnes" },
    { routeId: "route-2", name: "Route 2", capacity: 100, capacityUnit: "tonnes" }
  ],
  lanes: [
    { laneId: "lane-a-1", supplierId: "supplier-a", routeId: "route-1", compatible: true, procurementCostPerUnit: 10, procurementCostUnit: "USD_per_tonne", transitTimeDays: 5, riskScore: 10, reliabilityScore: 0.9 },
    { laneId: "lane-a-2", supplierId: "supplier-a", routeId: "route-2", compatible: true, procurementCostPerUnit: 12, procurementCostUnit: "USD_per_tonne", transitTimeDays: 7, riskScore: 20, reliabilityScore: 0.8 },
    { laneId: "lane-b-1", supplierId: "supplier-b", routeId: "route-1", compatible: true, procurementCostPerUnit: 8, procurementCostUnit: "USD_per_tonne", transitTimeDays: 8, riskScore: 30, reliabilityScore: 0.7 },
    { laneId: "lane-b-2", supplierId: "supplier-b", routeId: "route-2", compatible: true, procurementCostPerUnit: 9, procurementCostUnit: "USD_per_tonne", transitTimeDays: 6, riskScore: 15, reliabilityScore: 0.85 }
  ]
});
(0, import_node_test.default)("single supplier and route optimization satisfies the gap", async () => {
  const request = baseRequest();
  request.suppliers = [request.suppliers[0]];
  request.routes = [request.routes[0]];
  request.lanes = [request.lanes[0]];
  request.supplyGap.quantity = 60;
  const result = await optimizeProcurement(request);
  import_strict.default.equal(result.status, "OPTIMAL");
  import_strict.default.equal(result.solverStatus, "OPTIMAL");
  import_strict.default.equal(result.supplierAllocations[0]?.quantity, 60);
  import_strict.default.equal(result.routeAllocations[0]?.quantity, 60);
  import_strict.default.equal(result.unmetSupply, 0);
  import_strict.default.equal(result.constraintValidation.valid, true);
});
(0, import_node_test.default)("multiple suppliers use the least weighted lane combination", async () => {
  const result = await optimizeProcurement({
    ...baseRequest(),
    objectiveWeights: {
      cost: 1,
      risk: 0,
      transitTime: 0,
      reliabilityPenalty: 0
    }
  });
  import_strict.default.equal(result.status, "OPTIMAL");
  import_strict.default.equal(result.totalProcured, 100);
  import_strict.default.equal(result.allocations.find((allocation) => allocation.laneId === "lane-b-1")?.quantity, 100);
  import_strict.default.equal(result.allocations.find((allocation) => allocation.laneId === "lane-a-1")?.quantity, 0);
  import_strict.default.equal(result.totalCost, 800);
});
(0, import_node_test.default)("supplier capacity constraint splits allocation", async () => {
  const request = baseRequest();
  request.suppliers[0].capacity = 60;
  request.suppliers[1].capacity = 40;
  request.routes[1].capacity = 100;
  const result = await optimizeProcurement(request);
  import_strict.default.equal(result.status, "OPTIMAL");
  import_strict.default.equal(result.supplierAllocations.find((allocation) => allocation.supplierId === "supplier-b")?.quantity, 40);
  import_strict.default.equal(result.supplierAllocations.find((allocation) => allocation.supplierId === "supplier-a")?.quantity, 60);
  import_strict.default.equal(result.constraintValidation.valid, true);
});
(0, import_node_test.default)("route capacity constraint splits allocation", async () => {
  const request = baseRequest();
  request.routes[0].capacity = 70;
  request.routes[1].capacity = 30;
  const result = await optimizeProcurement(request);
  import_strict.default.equal(result.status, "OPTIMAL");
  import_strict.default.equal(result.routeAllocations.find((allocation) => allocation.routeId === "route-2")?.quantity, 30);
  import_strict.default.equal(result.routeAllocations.find((allocation) => allocation.routeId === "route-1")?.quantity, 70);
  import_strict.default.equal(result.constraintValidation.valid, true);
});
(0, import_node_test.default)("incompatible supplier-route pairs receive zero quantity", async () => {
  const request = baseRequest();
  request.lanes[3].compatible = false;
  request.lanes[0].procurementCostPerUnit = 20;
  const result = await optimizeProcurement(request);
  import_strict.default.equal(result.status, "OPTIMAL");
  import_strict.default.equal(result.allocations.find((allocation) => allocation.laneId === "lane-b-2")?.quantity, 0);
  import_strict.default.equal(result.unmetSupply, 0);
  import_strict.default.equal(result.constraintValidation.valid, true);
});
(0, import_node_test.default)("no compatible supplier-route lanes returns INFEASIBLE", async () => {
  const request = baseRequest();
  request.lanes = request.lanes.map((lane) => ({ ...lane, compatible: false }));
  const result = await optimizeProcurement(request);
  import_strict.default.equal(result.status, "INFEASIBLE");
  import_strict.default.equal(result.solverStatus, "INFEASIBLE");
  import_strict.default.equal(result.unmetSupply, 100);
});
(0, import_node_test.default)("insufficient total capacity returns INFEASIBLE", async () => {
  const request = baseRequest();
  request.suppliers.forEach((supplier) => {
    supplier.capacity = 20;
  });
  const result = await optimizeProcurement(request);
  import_strict.default.equal(result.status, "INFEASIBLE");
  import_strict.default.equal(result.solverStatus, "INFEASIBLE");
  import_strict.default.ok(result.error);
  import_strict.default.ok(result.unmetSupply > 0);
});
(0, import_node_test.default)("invalid input returns ERROR without invoking the solver", async () => {
  const result = await optimizeProcurement({
    ...baseRequest(),
    supplyGap: { quantity: -1, unit: "tonnes" }
  });
  import_strict.default.equal(result.status, "ERROR");
  import_strict.default.equal(result.solverStatus, "NOT_RUN");
  import_strict.default.match(result.error ?? "", /supplyGap\.quantity/);
});
(0, import_node_test.default)("independent post-solve validation rejects an invalid solver output", async () => {
  const invalidAdapter = {
    async solve(model) {
      const firstVariable = model.variables[0]?.name ?? "missing";
      return {
        status: "OPTIMAL",
        objectiveValue: 0,
        variables: { [firstVariable]: 999 },
        solveTimeMs: 1,
        rawStatus: 5
      };
    }
  };
  const result = await optimizeProcurement(baseRequest(), invalidAdapter);
  import_strict.default.equal(result.status, "ERROR");
  import_strict.default.match(result.error ?? "", /Independent feasibility validation/);
  import_strict.default.equal(result.constraintValidation.valid, false);
  import_strict.default.ok(result.constraintValidation.checks.some((check2) => !check2.passed));
});
(0, import_node_test.default)("independent validator detects incompatible allocation directly", () => {
  const request = baseRequest();
  const invalidAllocations = [{
    laneId: "lane-b-2",
    supplierId: "supplier-b",
    routeId: "route-2",
    quantity: 100,
    quantityUnit: "tonnes",
    procurementCost: 900,
    procurementCostUnit: "USD_per_tonne",
    objectiveContribution: 0
  }];
  request.lanes[3].compatible = false;
  const validation = validateProcurementAllocations(
    {
      ...request,
      objectiveWeights: { cost: 1, risk: 1, transitTime: 1, reliabilityPenalty: 1 }
    },
    invalidAllocations
  );
  import_strict.default.equal(validation.valid, false);
  import_strict.default.ok(validation.checks.some((check2) => check2.constraint.includes("compatibility") && !check2.passed));
});
