import assert from 'node:assert/strict';
import test from 'node:test';
import {
  optimizeStrategicReserve,
  validateStrategicReserveInput,
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

test('zero supply gap requires no reserve release', () => {
  const result = optimizeStrategicReserve(input({ supplyGap: 0 }));

  assert.equal(result.effectiveGap, 0);
  assert.equal(result.drawdownAmount, 0);
  assert.equal(result.replenishmentRequirement, 0);
  assert.equal(result.coverageStatus, 'NO_EFFECTIVE_GAP');
});

test('reserve already below threshold cannot be drawn down', () => {
  const result = optimizeStrategicReserve(input({
    currentReserve: 10,
    minimumReserveThreshold: 20,
    supplyGap: 5,
    disruptionDuration: 4,
  }));

  assert.equal(result.safeAvailableReserve, 0);
  assert.equal(result.drawdownAmount, 0);
  assert.equal(result.remainingReserve, 10);
  assert.equal(result.shortfall, 12);
  assert.equal(result.coverageStatus, 'RESERVE_BELOW_THRESHOLD');
});

test('invalid negative inputs are rejected', () => {
  const validation = validateStrategicReserveInput(
    input({ replenishmentRate: -1 }),
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.path === 'replenishmentRate'));
  assert.throws(
    () => optimizeStrategicReserve(input({ currentReserve: -1 })),
    /currentReserve/,
  );
});
