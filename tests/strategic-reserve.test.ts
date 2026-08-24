import assert from 'node:assert/strict';
import test from 'node:test';
import {
  optimizeStrategicReserve,
  validateStrategicReserveInput,
  optimizeStrategicReserveWithProcurement,
} from '../src/reserves';

const input = (overrides: Partial<Parameters<typeof optimizeStrategicReserve>[0]> = {}) => ({
  currentReserve: 100,
  demand: 80,
  supplyGap: 10,
  disruptionDuration: 5,
  alternativeProcurement: 2,
  replenishmentRate: 4,
  minimumReserveThreshold: 20,
  ...overrides,
});

test('fully covers the effective supply gap', () => {
  const result = optimizeStrategicReserve(input());

  assert.equal(result.effectiveGap, 8);
  assert.equal(result.totalNeed, 40);
  assert.equal(result.safeAvailableReserve, 80);
  assert.equal(result.drawdownAmount, 40);
  assert.equal(result.drawdownRate, 8);
  assert.equal(result.remainingReserve, 60);
  assert.equal(result.replenishmentRequirement, 40);
  assert.equal(result.shortfall, 0);
  assert.equal(result.fullyCovered, true);
  assert.equal(result.coverageStatus, 'FULLY_COVERED');
});

test('never draws below the minimum reserve threshold', () => {
  const result = optimizeStrategicReserve(input({
    supplyGap: 20,
    disruptionDuration: 10,
    minimumReserveThreshold: 60,
  }));

  assert.equal(result.safeAvailableReserve, 40);
  assert.equal(result.drawdownAmount, 40);
  assert.equal(result.remainingReserve, 60);
  assert.equal(result.shortfall, 140);
  assert.equal(result.fullyCovered, false);
  assert.equal(result.coverageStatus, 'PARTIALLY_COVERED');
});

test('alternative procurement reduces the effective gap without going negative', () => {
  const result = optimizeStrategicReserve(input({
    supplyGap: 10,
    alternativeProcurement: 25,
  }));

  assert.equal(result.effectiveGap, 0);
  assert.equal(result.totalNeed, 0);
  assert.equal(result.drawdownAmount, 0);
  assert.equal(result.coverageStatus, 'NO_EFFECTIVE_GAP');
});

test('zero disruption duration avoids division by zero', () => {
  const result = optimizeStrategicReserve(input({ disruptionDuration: 0 }));

  assert.equal(result.totalNeed, 0);
  assert.equal(result.drawdownAmount, 0);
  assert.equal(result.drawdownRate, 0);
  assert.equal(result.remainingReserve, 100);
  assert.equal(result.fullyCovered, true);
});

test('scenario 1: zero supply gap requires no reserve release', () => {
  const result = optimizeStrategicReserve(input({ supplyGap: 0 }));

  assert.equal(result.effectiveGap, 0);
  assert.equal(result.grossSupplyGap, 0);
  assert.equal(result.residualSupplyGap, 0);
  assert.equal(result.drawdownAmount, 0);
  assert.equal(result.replenishmentRequirement, 0);
  assert.equal(result.coverageStatus, 'NO_EFFECTIVE_GAP');
  assert.equal(result.feasibility, 'FEASIBLE');
  assert.equal(result.constraintStatus, 'SATISFIED');
});

test('scenario 2: small disruption fully covered by alternative procurement', () => {
  const result = optimizeStrategicReserve(input({
    supplyGap: 10,
    alternativeProcurement: 25,
  }));

  assert.equal(result.grossSupplyGap, 10);
  assert.equal(result.procurementCoverage, 10);
  assert.equal(result.residualSupplyGap, 0);
  assert.equal(result.effectiveGap, 0);
  assert.equal(result.totalNeed, 0);
  assert.equal(result.drawdownAmount, 0);
  assert.equal(result.coverageStatus, 'NO_EFFECTIVE_GAP');
  assert.equal(result.feasibility, 'FEASIBLE');
});

test('scenario 3: small disruption fully covered by reserve release', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100,
    supplyGap: 10,
    alternativeProcurement: 2,
    disruptionDuration: 5,
    minimumReserveThreshold: 20,
  }));

  assert.equal(result.effectiveGap, 8);
  assert.equal(result.residualSupplyGap, 8);
  assert.equal(result.totalNeed, 40);
  assert.equal(result.requiredReserveDrawdown, 40);
  assert.equal(result.safeAvailableReserve, 80);
  assert.equal(result.maximumSafeReserveDrawdown, 80);
  assert.equal(result.drawdownAmount, 40);
  assert.equal(result.recommendedReserveDrawdown, 40);
  assert.equal(result.remainingReserve, 60);
  assert.equal(result.shortfall, 0);
  assert.equal(result.fullyCovered, true);
  assert.equal(result.isFeasible, true);
  assert.equal(result.feasibility, 'FEASIBLE');
  assert.equal(result.coverageStatus, 'FULLY_COVERED');
  assert.equal(result.safetyConstraintGuaranteed, true);
});

test('scenario 4: large disruption reaches minimum threshold exactly', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100,
    supplyGap: 10,
    alternativeProcurement: 2,
    disruptionDuration: 10,
    minimumReserveThreshold: 20,
  }));

  assert.equal(result.residualSupplyGap, 8);
  assert.equal(result.requiredReserveDrawdown, 80);
  assert.equal(result.maximumSafeReserveDrawdown, 80);
  assert.equal(result.recommendedReserveDrawdown, 80);
  assert.equal(result.remainingReserve, 20);
  assert.equal(result.shortfall, 0);
  assert.equal(result.fullyCovered, true);
  assert.equal(result.feasibility, 'FEASIBLE');
  assert.equal(result.safetyConstraintGuaranteed, true);
});

test('scenario 5: extreme disruption strictly capped at minimum reserve safety threshold', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100,
    supplyGap: 20,
    alternativeProcurement: 0,
    disruptionDuration: 10,
    minimumReserveThreshold: 60,
  }));

  assert.equal(result.requiredReserveDrawdown, 200);
  assert.equal(result.maximumSafeReserveDrawdown, 40);
  assert.equal(result.recommendedReserveDrawdown, 40);
  assert.equal(result.remainingReserve, 60);
  assert.equal(result.shortfall, 160);
  assert.equal(result.fullyCovered, false);
  assert.equal(result.feasibility, 'PARTIALLY_FEASIBLE');
  assert.equal(result.constraintStatus, 'LIMIT_ENFORCED');
  assert.equal(result.coverageStatus, 'PARTIALLY_COVERED');
  assert.equal(result.safetyConstraintGuaranteed, true);
});

test('scenario 6: reserve equal to minimum threshold permits zero drawdown', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 50,
    minimumReserveThreshold: 50,
    supplyGap: 10,
    disruptionDuration: 5,
  }));

  assert.equal(result.maximumSafeReserveDrawdown, 0);
  assert.equal(result.recommendedReserveDrawdown, 0);
  assert.equal(result.remainingReserve, 50);
  assert.equal(result.constraintStatus, 'BINDING');
  assert.equal(result.feasibility, 'INFEASIBLE');
  assert.equal(result.safetyConstraintGuaranteed, true);
});

test('scenario 7: reserve already below threshold cannot be drawn down', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 10,
    minimumReserveThreshold: 20,
    supplyGap: 5,
    alternativeProcurement: 0,
    disruptionDuration: 4,
  }));

  assert.equal(result.maximumSafeReserveDrawdown, 0);
  assert.equal(result.recommendedReserveDrawdown, 0);
  assert.equal(result.remainingReserve, 10);
  assert.equal(result.shortfall, 20);
  assert.equal(result.constraintStatus, 'BELOW_THRESHOLD');
  assert.equal(result.feasibility, 'INFEASIBLE');
  assert.equal(result.coverageStatus, 'RESERVE_BELOW_THRESHOLD');
  assert.equal(result.safetyConstraintGuaranteed, true);
});

test('scenario 8: zero disruption duration avoids division by zero', () => {
  const result = optimizeStrategicReserve(input({ disruptionDuration: 0 }));

  assert.equal(result.requiredReserveDrawdown, 0);
  assert.equal(result.recommendedReserveDrawdown, 0);
  assert.equal(result.reserveDrawdownRate, 0);
  assert.equal(result.drawdownRate, 0);
  assert.equal(result.remainingReserve, 100);
  assert.equal(result.fullyCovered, true);
});

test('scenario 9: single-day disruption computes accurate daily rate', () => {
  const result = optimizeStrategicReserve(input({
    disruptionDuration: 1,
    supplyGap: 15,
    alternativeProcurement: 5,
  }));

  assert.equal(result.residualSupplyGap, 10);
  assert.equal(result.requiredReserveDrawdown, 10);
  assert.equal(result.recommendedReserveDrawdown, 10);
  assert.equal(result.reserveDrawdownRate, 10);
});

test('scenario 10: multi-month long disruption duration', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 5_000_000,
    minimumReserveThreshold: 1_500_000,
    supplyGap: 100_000,
    alternativeProcurement: 25_000,
    disruptionDuration: 90,
  }));

  // residual gap = 75,000 * 90 = 6,750,000. Max safe = 3,500,000. Capped at 3,500,000!
  assert.equal(result.residualSupplyGap, 75_000);
  assert.equal(result.requiredReserveDrawdown, 6_750_000);
  assert.equal(result.maximumSafeReserveDrawdown, 3_500_000);
  assert.equal(result.recommendedReserveDrawdown, 3_500_000);
  assert.equal(result.remainingReserve, 1_500_000);
  assert.equal(result.shortfall, 3_250_000);
  assert.equal(result.safetyConstraintGuaranteed, true);
});

test('scenario 11: zero replenishment rate yields zero replenishment days', () => {
  const result = optimizeStrategicReserve(input({ replenishmentRate: 0 }));
  assert.equal(result.replenishmentDays, 0);
});

test('scenario 12: high replenishment rate calculates integer days accurately', () => {
  const result = optimizeStrategicReserve(input({
    replenishmentRate: 10,
    disruptionDuration: 5,
    supplyGap: 10,
    alternativeProcurement: 2,
  }));

  // drawdown = 40. replenishmentRate = 10 -> 4 days
  assert.equal(result.drawdownAmount, 40);
  assert.equal(result.replenishmentDays, 4);
});

test('scenario 13: fractional decimal values handled gracefully', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 100.5,
    minimumReserveThreshold: 20.25,
    supplyGap: 12.75,
    alternativeProcurement: 2.25,
    disruptionDuration: 3,
    replenishmentRate: 7.5,
  }));

  assert.equal(result.residualSupplyGap, 10.5);
  assert.equal(result.requiredReserveDrawdown, 31.5);
  assert.equal(result.maximumSafeReserveDrawdown, 80.25);
  assert.equal(result.recommendedReserveDrawdown, 31.5);
  assert.equal(result.remainingReserve, 69);
  assert.equal(result.replenishmentDays, 5); // Math.ceil(31.5 / 7.5) = Math.ceil(4.2) = 5
});

test('scenario 14: randomized fuzz invariant test confirms safety floor guarantee', () => {
  for (let i = 0; i < 50; i++) {
    const current = Math.floor(Math.random() * 1000);
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
      replenishmentRate: rate,
    }));

    if (current >= minThreshold) {
      assert.ok(
        result.remainingReserve >= minThreshold,
        `Invariant violated: remaining ${result.remainingReserve} < min ${minThreshold}`,
      );
    } else {
      assert.equal(result.recommendedReserveDrawdown, 0);
      assert.equal(result.remainingReserve, current);
    }
  }
});

test('scenario 15: invalid negative and NaN inputs are rejected with descriptive issues', () => {
  const validation = validateStrategicReserveInput(
    input({ replenishmentRate: -1 }),
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.path === 'replenishmentRate'));
  assert.throws(
    () => optimizeStrategicReserve(input({ currentReserve: -1 })),
    /currentReserve/,
  );
  assert.throws(
    () => optimizeStrategicReserve(input({ demand: Number.NaN })),
    /demand/,
  );
});

test('scenario 16: procurement helper integration works seamlessly', () => {
  const result = optimizeStrategicReserveWithProcurement({
    currentReserve: 100,
    demand: 80,
    supplyGap: 20,
    disruptionDuration: 5,
    replenishmentRate: 4,
    minimumReserveThreshold: 20,
    procurementResult: { totalProcured: 10 },
  });

  assert.equal(result.procurementCoverage, 10);
  assert.equal(result.residualSupplyGap, 10);
  assert.equal(result.recommendedReserveDrawdown, 50);
  assert.equal(result.remainingReserve, 50);
  assert.equal(result.fullyCovered, true);
});

