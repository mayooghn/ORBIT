import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { ReservesPage, buildRealBaselineOptimizationInput } from '../src/pages/ReservesPage';
import { optimizeStrategicReserve, validateStrategicReserveInput } from '../src/reserves/optimizer';
import type { StrategicReserveState, RealAlternativeProcurementState } from '../src/reserves/model';

const pageSource = readFileSync(
  path.join(process.cwd(), 'src/pages/ReservesPage.tsx'),
  'utf8',
);
const apiSource = readFileSync(
  path.join(process.cwd(), 'src/services/api.ts'),
  'utf8',
);

test('Strategic Reserves page starts in a clean loading state waiting for real database data (no fake numbers)', () => {
  const markup = renderToStaticMarkup(React.createElement(ReservesPage));

  assert.match(markup, /Reserve Management/);
  assert.match(markup, /Loading strategic reserve and procurement data\.\.\./);
  assert.match(markup, /Querying database/);

  // Must not render demo/mock badges or fake numbers on initial mount
  assert.doesNotMatch(markup, /DEMO \/ MOCK DATA/);
  assert.doesNotMatch(markup, /Round 1 Demo Inputs/);
});

test('Strategic Reserves page permanently removed "Apply Real Baseline to Optimizer" button and handlers', () => {
  // Verifies the manual button is completely removed
  assert.doesNotMatch(pageSource, /id="apply-real-baseline-btn"/);
  assert.doesNotMatch(pageSource, /Apply Real Baseline to Optimizer/);
  assert.doesNotMatch(pageSource, /handleApplyLiveBaseline/);

  // Verifies no silent fallbacks to 25,000 t/d or 4,500,000 demand
  assert.doesNotMatch(pageSource, /availableAlternativeDailyTonnes\s*\|\|\s*25_?000/);
  assert.doesNotMatch(pageSource, /ROUND_ONE_RESERVE_DEMO_INPUT/);
});

test('Strategic Reserves page automatically builds real database-backed baseline for optimizer', () => {
  const mockState: StrategicReserveState = {
    facilityName: 'India Strategic Petroleum Reserve (ISPRL)',
    country: 'India',
    totalCapacity: 5_330_000,
    capacityUnit: 'metric_tonnes',
    capacitySource: 'strategic_reserves table',
    isCapacityFromDatabase: true,
    currentReserve: 5_000_000,
    currentReserveStatus: 'POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY',
    currentReserveSource: 'Policy operational baseline',
    minimumReserveThreshold: 1_500_000,
    minimumReservePolicyBasis: 'Mandatory 30-day safety reserve',
    currentDemand: 655_271.23,
    demandBasis: 'FY 2024-25 petroleum consumption',
    demandFinancialYear: '2024-25',
    isDemandFromDatabase: true,
    defaultReplenishmentRate: 20_000,
    replenishmentPolicyBasis: 'ISPRL injection capacity',
    unit: 'tonnes',
    facilities: [
      { strategicReserveId: 'isprl-visakhapatnam', facilityName: 'Visakhapatnam', capacity: 1_330_000, capacityUnit: 'metric_tonnes', latitude: 17.68, longitude: 83.21, mappingStatus: 'MAPPED', notes: null },
      { strategicReserveId: 'isprl-mangalore', facilityName: 'Mangalore', capacity: 1_500_000, capacityUnit: 'metric_tonnes', latitude: 12.91, longitude: 74.85, mappingStatus: 'MAPPED', notes: null },
      { strategicReserveId: 'isprl-padur', facilityName: 'Padur', capacity: 2_500_000, capacityUnit: 'metric_tonnes', latitude: 13.23, longitude: 74.78, mappingStatus: 'MAPPED', notes: null },
    ],
    lastUpdated: new Date().toISOString(),
  };

  const mockProcurement: RealAlternativeProcurementState = {
    availableAlternativeDailyTonnes: 588_809.99,
    totalAnnualImportTonnes: 214_915_646,
    financialYear: '2016-17',
    supplierCount: 41,
    suppliers: [],
    commercialCostStatus: 'Commercial lane-cost data unavailable',
    isCommercialCostAvailable: false,
    dataSource: 'Phase 2 SQLite supplier_imports table',
    provenance: 'Derived from real records',
  };

  const autoInput = buildRealBaselineOptimizationInput(mockState, mockProcurement);

  assert.equal(autoInput.currentReserve, 5_000_000);
  assert.equal(autoInput.demand, 655_271);
  assert.equal(autoInput.availableSupply, 555_271);
  assert.equal(autoInput.supplyGap, 100_000);
  assert.equal(autoInput.alternativeProcurement, 588_810);
  assert.equal(autoInput.replenishmentRate, 20_000);
  assert.equal(autoInput.minimumReserveThreshold, 1_500_000);

  // Scenario disruption parameters are present and distinct
  assert.equal(autoInput.disruptionDuration, 30);

  // Optimization runs deterministically on auto-loaded real inputs
  const result = optimizeStrategicReserve(autoInput);
  assert.equal(result.isFeasible, true);
  assert.ok(result.remainingReserve >= autoInput.minimumReserveThreshold);
});

test('Strategic Reserves page renders API-backed result fields and failure handling', () => {
  for (const label of [
    'Effective supply gap',
    'Drawdown amount',
    'Drawdown rate',
    'Duration',
    'Remaining reserve',
    'Replenishment requirement',
    'Fully covered',
    'Reserve optimization failed',
  ]) {
    assert.match(pageSource, new RegExp(label));
  }

  assert.match(pageSource, /optimizeStrategicReserve/);
  assert.match(apiSource, /\/api\/reserves\/optimize/);
  assert.match(apiSource, /StrategicReserveOptimizationResult/);
});

test('Optimizer cannot be executed with missing or invalid baseline inputs', () => {
  const invalid = validateStrategicReserveInput({
    currentReserve: -100,
    demand: 655271,
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.length > 0);
});

test('Reserves page defines all 6 crisis scenarios including Custom Crisis', () => {
  const expectedScenarios = [
    'Normal Supply Disruption',
    'Strait of Hormuz Crisis',
    'Strong Backup Supply',
    'Reserve Safety Limit',
    'Reserve Already Below Safe Level',
    'Custom Crisis',
  ];

  for (const scenario of expectedScenarios) {
    assert.match(pageSource, new RegExp(scenario));
  }

  assert.match(pageSource, /Choose a Crisis Scenario/);
  assert.match(pageSource, /Select a predefined crisis or create your own to see how the strategic reserve responds\./);
  assert.match(pageSource, /Run Custom Scenario/);
});

test('Scenario Inputs section uses operator-facing language and labels', () => {
  assert.match(pageSource, /Scenario Inputs/);
  assert.match(pageSource, /ORBIT uses current reserve and supply information as the starting point\. Crisis assumptions can be adjusted to test different situations\./);
  assert.doesNotMatch(pageSource, /Real Database Baseline Inputs/);

  const expectedLabels = [
    'Current Reserve',
    'Daily Demand',
    'Available Supply',
    'Calculated Supply Gap',
    'Crisis Duration',
    'Backup Supply',
    'Refill Rate',
    'Safety Reserve',
  ];

  for (const label of expectedLabels) {
    assert.match(pageSource, new RegExp(label));
  }
});

