import assert from 'node:assert/strict';
import test from 'node:test';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { optimizeStrategicReserve } from '../src/reserves/optimizer';
import type { StrategicReserveOptimizationInput } from '../src/reserves/model';

test('Phase 8.2 Real Data Integration: Database seeding and capacity calculation', () => {
  const dbPath = defaultPhase2DbPath();
  const importResult = importPhase2Data({ dbPath, processedDir: './Data/processed' });

  assert.ok(importResult.counts.strategic_reserves >= 3, 'Expected at least 3 strategic reserve facilities imported');

  const db = openPhase2Database({ dbPath });
  const repo = new Phase2Repository(db);

  const state = repo.getCurrentStrategicReserveState();

  // Part 1: Strategic Reserve Data
  assert.equal(state.country, 'India');
  assert.equal(state.totalCapacity, 5_330_000, 'Total Phase 1 capacity must be 5.33 MMT (5,330,000 tonnes)');
  assert.equal(state.facilities.length, 3, 'Must contain exactly 3 Phase 1 ISPRL facilities');

  const visakhapatnam = state.facilities.find((f) => f.strategicReserveId === 'isprl-visakhapatnam');
  const mangalore = state.facilities.find((f) => f.strategicReserveId === 'isprl-mangalore');
  const padur = state.facilities.find((f) => f.strategicReserveId === 'isprl-padur');

  assert.ok(visakhapatnam, 'Visakhapatnam facility must exist');
  assert.equal(visakhapatnam.capacity, 1_330_000, 'Visakhapatnam capacity must be 1.33 MMT');

  assert.ok(mangalore, 'Mangalore facility must exist');
  assert.equal(mangalore.capacity, 1_500_000, 'Mangalore capacity must be 1.50 MMT');

  assert.ok(padur, 'Padur facility must exist');
  assert.equal(padur.capacity, 2_500_000, 'Padur capacity must be 2.50 MMT');

  // Inventory vs Capacity distinction
  assert.equal(state.currentReserve, 5_000_000);
  assert.equal(state.currentReserveStatus, 'POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY');
  assert.match(state.currentReserveSource, /Policy operational baseline/);
  assert.equal(state.isCapacityFromDatabase, true);

  // Part 2: Real Demand from petroleum_consumption
  assert.equal(state.isDemandFromDatabase, true);
  assert.equal(state.demandFinancialYear, '2024-25');
  // In FY24-25: 239,174 TMT -> 239,174,000 tonnes / 365 = 655,271.23 tonnes/day
  assert.ok(Math.abs(state.currentDemand - 655_271.23) < 0.1, `Current demand (${state.currentDemand}) must match FY24-25 daily rate (655,271.23)`);
  assert.match(state.demandBasis, /FY 2024-25/);

  db.close();
});

test('Phase 8.2 Reserve Optimizer: Operates with database-derived values and enforces constraints', () => {
  const dbPath = defaultPhase2DbPath();
  const db = openPhase2Database({ dbPath });
  const repo = new Phase2Repository(db);
  const state = repo.getCurrentStrategicReserveState();

  const input: StrategicReserveOptimizationInput = {
    currentReserve: state.currentReserve, // 5,000,000
    demand: state.currentDemand, // ~655,271
    supplyGap: 100_000,
    disruptionDuration: 30,
    alternativeProcurement: 25_000,
    replenishmentRate: state.defaultReplenishmentRate, // 20,000
    minimumReserveThreshold: state.minimumReserveThreshold, // 1,500,000
  };

  const result = optimizeStrategicReserve(input);

  assert.equal(result.isFeasible, true);
  assert.equal(result.effectiveGap, 75_000); // 100,000 - 25,000
  assert.equal(result.drawdownAmount, 2_250_000); // 75,000 * 30
  assert.equal(result.drawdownRate, 75_000);
  assert.equal(result.remainingReserve, 2_750_000); // 5,000,000 - 2,250_000
  assert.ok(result.remainingReserve >= input.minimumReserveThreshold);
  assert.equal(result.replenishmentRequirement, 2_250_000);
  assert.equal(result.replenishmentDays, 113); // ceil(2,250,000 / 20,000)
  assert.equal(result.fullyCovered, true);

  db.close();
});
