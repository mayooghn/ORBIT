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

// tests/strategic-reserve.test.ts
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_node_test = __toESM(require("node:test"), 1);

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
var optimizeStrategicReserve = (input2) => {
  const validation = validateStrategicReserveInput(input2);
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
var optimizeStrategicReserveWithProcurement = (input2) => {
  const alternativeProcurement = typeof input2.alternativeProcurement === "number" ? input2.alternativeProcurement : input2.procurementResult?.totalProcured ?? 0;
  return optimizeStrategicReserve({
    currentReserve: input2.currentReserve,
    demand: input2.demand,
    supplyGap: input2.supplyGap,
    disruptionDuration: input2.disruptionDuration,
    alternativeProcurement,
    replenishmentRate: input2.replenishmentRate,
    minimumReserveThreshold: input2.minimumReserveThreshold,
    notes: input2.notes
  });
};

// tests/strategic-reserve.test.ts
var input = (overrides = {}) => {
  const demand = overrides.demand ?? 80;
  let availableSupply = overrides.availableSupply;
  if (typeof availableSupply !== "number") {
    if (typeof overrides.supplyGap === "number") {
      availableSupply = Math.max(0, demand - overrides.supplyGap);
    } else {
      availableSupply = 70;
    }
  }
  return {
    currentReserve: 100,
    demand,
    availableSupply,
    disruptionDuration: 5,
    alternativeProcurement: 2,
    replenishmentRate: 4,
    minimumReserveThreshold: 20,
    ...overrides
  };
};
(0, import_node_test.default)("calculates supply gap dynamically from daily demand and available supply", () => {
  const result = optimizeStrategicReserve(input({
    demand: 655271,
    availableSupply: 555271
  }));
  import_strict.default.equal(result.calculatedSupplyGap, 1e5);
  import_strict.default.equal(result.grossSupplyGap, 1e5);
  import_strict.default.equal(result.availableSupply, 555271);
});
(0, import_node_test.default)("handles available supply exceeding daily demand with zero supply gap", () => {
  const result = optimizeStrategicReserve(input({
    demand: 5e5,
    availableSupply: 6e5
  }));
  import_strict.default.equal(result.calculatedSupplyGap, 0);
  import_strict.default.equal(result.grossSupplyGap, 0);
  import_strict.default.equal(result.effectiveGap, 0);
  import_strict.default.equal(result.drawdownAmount, 0);
  import_strict.default.equal(result.coverageStatus, "NO_EFFECTIVE_GAP");
});
(0, import_node_test.default)("backward compatibility: derives available supply when only supply gap is provided", () => {
  const legacyInput = {
    currentReserve: 100,
    demand: 80,
    supplyGap: 10,
    disruptionDuration: 5,
    alternativeProcurement: 2,
    replenishmentRate: 4,
    minimumReserveThreshold: 20
  };
  const result = optimizeStrategicReserve(legacyInput);
  import_strict.default.equal(result.availableSupply, 70);
  import_strict.default.equal(result.calculatedSupplyGap, 10);
});
(0, import_node_test.default)("fully covers the effective supply gap", () => {
  const result = optimizeStrategicReserve(input());
  import_strict.default.equal(result.effectiveGap, 8);
  import_strict.default.equal(result.totalNeed, 40);
  import_strict.default.equal(result.safeAvailableReserve, 80);
  import_strict.default.equal(result.drawdownAmount, 40);
  import_strict.default.equal(result.drawdownRate, 8);
  import_strict.default.equal(result.remainingReserve, 60);
  import_strict.default.equal(result.replenishmentRequirement, 40);
  import_strict.default.equal(result.shortfall, 0);
  import_strict.default.equal(result.fullyCovered, true);
  import_strict.default.equal(result.coverageStatus, "FULLY_COVERED");
});
(0, import_node_test.default)("never draws below the minimum reserve threshold", () => {
  const result = optimizeStrategicReserve(input({
    supplyGap: 20,
    disruptionDuration: 10,
    minimumReserveThreshold: 60
  }));
  import_strict.default.equal(result.safeAvailableReserve, 40);
  import_strict.default.equal(result.drawdownAmount, 40);
  import_strict.default.equal(result.remainingReserve, 60);
  import_strict.default.equal(result.shortfall, 140);
  import_strict.default.equal(result.fullyCovered, false);
  import_strict.default.equal(result.coverageStatus, "PARTIALLY_COVERED");
});
(0, import_node_test.default)("alternative procurement reduces the effective gap without going negative", () => {
  const result = optimizeStrategicReserve(input({
    supplyGap: 10,
    alternativeProcurement: 25
  }));
  import_strict.default.equal(result.effectiveGap, 0);
  import_strict.default.equal(result.totalNeed, 0);
  import_strict.default.equal(result.drawdownAmount, 0);
  import_strict.default.equal(result.coverageStatus, "NO_EFFECTIVE_GAP");
});
(0, import_node_test.default)("zero disruption duration avoids division by zero", () => {
  const result = optimizeStrategicReserve(input({ disruptionDuration: 0 }));
  import_strict.default.equal(result.totalNeed, 0);
  import_strict.default.equal(result.drawdownAmount, 0);
  import_strict.default.equal(result.drawdownRate, 0);
  import_strict.default.equal(result.remainingReserve, 100);
  import_strict.default.equal(result.fullyCovered, true);
});
(0, import_node_test.default)("scenario 1: zero supply gap requires no reserve release", () => {
  const result = optimizeStrategicReserve(input({ supplyGap: 0 }));
  import_strict.default.equal(result.effectiveGap, 0);
  import_strict.default.equal(result.grossSupplyGap, 0);
  import_strict.default.equal(result.residualSupplyGap, 0);
  import_strict.default.equal(result.drawdownAmount, 0);
  import_strict.default.equal(result.replenishmentRequirement, 0);
  import_strict.default.equal(result.coverageStatus, "NO_EFFECTIVE_GAP");
  import_strict.default.equal(result.feasibility, "FEASIBLE");
  import_strict.default.equal(result.constraintStatus, "SATISFIED");
});
(0, import_node_test.default)("scenario 2: small disruption fully covered by alternative procurement", () => {
  const result = optimizeStrategicReserve(input({
    supplyGap: 10,
    alternativeProcurement: 25
  }));
  import_strict.default.equal(result.grossSupplyGap, 10);
  import_strict.default.equal(result.procurementCoverage, 10);
  import_strict.default.equal(result.residualSupplyGap, 0);
  import_strict.default.equal(result.effectiveGap, 0);
  import_strict.default.equal(result.totalNeed, 0);
  import_strict.default.equal(result.drawdownAmount, 0);
  import_strict.default.equal(result.coverageStatus, "NO_EFFECTIVE_GAP");
  import_strict.default.equal(result.feasibility, "FEASIBLE");
});
(0, import_node_test.default)("scenario 3: small disruption fully covered by reserve release", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100,
    supplyGap: 10,
    alternativeProcurement: 2,
    disruptionDuration: 5,
    minimumReserveThreshold: 20
  }));
  import_strict.default.equal(result.effectiveGap, 8);
  import_strict.default.equal(result.residualSupplyGap, 8);
  import_strict.default.equal(result.totalNeed, 40);
  import_strict.default.equal(result.requiredReserveDrawdown, 40);
  import_strict.default.equal(result.safeAvailableReserve, 80);
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 80);
  import_strict.default.equal(result.drawdownAmount, 40);
  import_strict.default.equal(result.recommendedReserveDrawdown, 40);
  import_strict.default.equal(result.remainingReserve, 60);
  import_strict.default.equal(result.shortfall, 0);
  import_strict.default.equal(result.fullyCovered, true);
  import_strict.default.equal(result.isFeasible, true);
  import_strict.default.equal(result.feasibility, "FEASIBLE");
  import_strict.default.equal(result.coverageStatus, "FULLY_COVERED");
  import_strict.default.equal(result.safetyConstraintGuaranteed, true);
});
(0, import_node_test.default)("scenario 4: large disruption reaches minimum threshold exactly", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100,
    supplyGap: 10,
    alternativeProcurement: 2,
    disruptionDuration: 10,
    minimumReserveThreshold: 20
  }));
  import_strict.default.equal(result.residualSupplyGap, 8);
  import_strict.default.equal(result.requiredReserveDrawdown, 80);
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 80);
  import_strict.default.equal(result.recommendedReserveDrawdown, 80);
  import_strict.default.equal(result.remainingReserve, 20);
  import_strict.default.equal(result.shortfall, 0);
  import_strict.default.equal(result.fullyCovered, true);
  import_strict.default.equal(result.feasibility, "FEASIBLE");
  import_strict.default.equal(result.safetyConstraintGuaranteed, true);
});
(0, import_node_test.default)("scenario 5: extreme disruption strictly capped at minimum reserve safety threshold", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100,
    supplyGap: 20,
    alternativeProcurement: 0,
    disruptionDuration: 10,
    minimumReserveThreshold: 60
  }));
  import_strict.default.equal(result.requiredReserveDrawdown, 200);
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 40);
  import_strict.default.equal(result.recommendedReserveDrawdown, 40);
  import_strict.default.equal(result.remainingReserve, 60);
  import_strict.default.equal(result.shortfall, 160);
  import_strict.default.equal(result.fullyCovered, false);
  import_strict.default.equal(result.feasibility, "PARTIALLY_FEASIBLE");
  import_strict.default.equal(result.constraintStatus, "LIMIT_ENFORCED");
  import_strict.default.equal(result.coverageStatus, "PARTIALLY_COVERED");
  import_strict.default.equal(result.safetyConstraintGuaranteed, true);
});
(0, import_node_test.default)("scenario 6: reserve equal to minimum threshold permits zero drawdown", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 50,
    minimumReserveThreshold: 50,
    supplyGap: 10,
    disruptionDuration: 5
  }));
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 0);
  import_strict.default.equal(result.recommendedReserveDrawdown, 0);
  import_strict.default.equal(result.remainingReserve, 50);
  import_strict.default.equal(result.constraintStatus, "BINDING");
  import_strict.default.equal(result.feasibility, "INFEASIBLE");
  import_strict.default.equal(result.safetyConstraintGuaranteed, true);
});
(0, import_node_test.default)("scenario 7: reserve already below threshold cannot be drawn down", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 10,
    minimumReserveThreshold: 20,
    supplyGap: 5,
    alternativeProcurement: 0,
    disruptionDuration: 4
  }));
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 0);
  import_strict.default.equal(result.recommendedReserveDrawdown, 0);
  import_strict.default.equal(result.remainingReserve, 10);
  import_strict.default.equal(result.shortfall, 20);
  import_strict.default.equal(result.constraintStatus, "BELOW_THRESHOLD");
  import_strict.default.equal(result.feasibility, "INFEASIBLE");
  import_strict.default.equal(result.coverageStatus, "RESERVE_BELOW_THRESHOLD");
  import_strict.default.equal(result.safetyConstraintGuaranteed, true);
});
(0, import_node_test.default)("scenario 8: zero disruption duration avoids division by zero", () => {
  const result = optimizeStrategicReserve(input({ disruptionDuration: 0 }));
  import_strict.default.equal(result.requiredReserveDrawdown, 0);
  import_strict.default.equal(result.recommendedReserveDrawdown, 0);
  import_strict.default.equal(result.reserveDrawdownRate, 0);
  import_strict.default.equal(result.drawdownRate, 0);
  import_strict.default.equal(result.remainingReserve, 100);
  import_strict.default.equal(result.fullyCovered, true);
});
(0, import_node_test.default)("scenario 9: single-day disruption computes accurate daily rate", () => {
  const result = optimizeStrategicReserve(input({
    disruptionDuration: 1,
    supplyGap: 15,
    alternativeProcurement: 5
  }));
  import_strict.default.equal(result.residualSupplyGap, 10);
  import_strict.default.equal(result.requiredReserveDrawdown, 10);
  import_strict.default.equal(result.recommendedReserveDrawdown, 10);
  import_strict.default.equal(result.reserveDrawdownRate, 10);
});
(0, import_node_test.default)("scenario 10: multi-month long disruption duration", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 5e6,
    demand: 655271,
    minimumReserveThreshold: 15e5,
    supplyGap: 1e5,
    alternativeProcurement: 25e3,
    disruptionDuration: 90
  }));
  import_strict.default.equal(result.residualSupplyGap, 75e3);
  import_strict.default.equal(result.requiredReserveDrawdown, 675e4);
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 35e5);
  import_strict.default.equal(result.recommendedReserveDrawdown, 35e5);
  import_strict.default.equal(result.remainingReserve, 15e5);
  import_strict.default.equal(result.shortfall, 325e4);
  import_strict.default.equal(result.safetyConstraintGuaranteed, true);
});
(0, import_node_test.default)("scenario 11: zero replenishment rate yields zero replenishment days", () => {
  const result = optimizeStrategicReserve(input({ replenishmentRate: 0 }));
  import_strict.default.equal(result.replenishmentDays, 0);
});
(0, import_node_test.default)("scenario 12: high replenishment rate calculates integer days accurately", () => {
  const result = optimizeStrategicReserve(input({
    replenishmentRate: 10,
    disruptionDuration: 5,
    supplyGap: 10,
    alternativeProcurement: 2
  }));
  import_strict.default.equal(result.drawdownAmount, 40);
  import_strict.default.equal(result.replenishmentDays, 4);
});
(0, import_node_test.default)("scenario 13: fractional decimal values handled gracefully", () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100.5,
    minimumReserveThreshold: 20.25,
    supplyGap: 12.75,
    alternativeProcurement: 2.25,
    disruptionDuration: 3,
    replenishmentRate: 7.5
  }));
  import_strict.default.equal(result.residualSupplyGap, 10.5);
  import_strict.default.equal(result.requiredReserveDrawdown, 31.5);
  import_strict.default.equal(result.maximumSafeReserveDrawdown, 80.25);
  import_strict.default.equal(result.recommendedReserveDrawdown, 31.5);
  import_strict.default.equal(result.remainingReserve, 69);
  import_strict.default.equal(result.replenishmentDays, 5);
});
(0, import_node_test.default)("scenario 14: randomized fuzz invariant test confirms safety floor guarantee", () => {
  for (let i = 0; i < 50; i++) {
    const current = Math.floor(Math.random() * 1e3);
    const minThreshold = Math.floor(Math.random() * 500);
    const gap = Math.floor(Math.random() * 200);
    const alt = Math.floor(Math.random() * 100);
    const duration = Math.floor(Math.random() * 30);
    const rate = Math.floor(Math.random() * 50);
    const result = optimizeStrategicReserve(input({
      currentReserve: current,
      minimumReserveThreshold: minThreshold,
      supplyGap: gap,
      alternativeProcurement: alt,
      disruptionDuration: duration,
      replenishmentRate: rate
    }));
    if (current >= minThreshold) {
      import_strict.default.ok(
        result.remainingReserve >= minThreshold,
        `Invariant violated: remaining ${result.remainingReserve} < min ${minThreshold}`
      );
    } else {
      import_strict.default.equal(result.recommendedReserveDrawdown, 0);
      import_strict.default.equal(result.remainingReserve, current);
    }
  }
});
(0, import_node_test.default)("scenario 15: invalid negative and NaN inputs are rejected with descriptive issues", () => {
  const validation = validateStrategicReserveInput(
    input({ replenishmentRate: -1 })
  );
  import_strict.default.equal(validation.valid, false);
  import_strict.default.ok(validation.issues.some((issue) => issue.path === "replenishmentRate"));
  import_strict.default.throws(
    () => optimizeStrategicReserve(input({ currentReserve: -1 })),
    /currentReserve/
  );
  import_strict.default.throws(
    () => optimizeStrategicReserve(input({ demand: Number.NaN })),
    /demand/
  );
});
(0, import_node_test.default)("scenario 16: procurement helper integration works seamlessly", () => {
  const result = optimizeStrategicReserveWithProcurement({
    currentReserve: 100,
    demand: 80,
    supplyGap: 20,
    disruptionDuration: 5,
    replenishmentRate: 4,
    minimumReserveThreshold: 20,
    procurementResult: { totalProcured: 10 }
  });
  import_strict.default.equal(result.procurementCoverage, 10);
  import_strict.default.equal(result.residualSupplyGap, 10);
  import_strict.default.equal(result.recommendedReserveDrawdown, 50);
  import_strict.default.equal(result.remainingReserve, 50);
  import_strict.default.equal(result.fullyCovered, true);
});
