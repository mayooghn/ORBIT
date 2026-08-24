import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { Phase2Repository } from '../src/dataLayer/repository';
import { optimizeStrategicReserve, validateStrategicReserveInput } from '../src/reserves/optimizer';
import type { StrategicReserveOptimizationInput } from '../src/reserves/model';

const getRepo = () => new Phase2Repository(openPhase2Database({ dbPath: defaultPhase2DbPath() }));

test('Phase 8.3: Real Alternative Procurement queries real SQLite supplier imports without mock data', () => {
  const repository = getRepo();
  const procurement = repository.getRealAlternativeProcurement();

  assert.ok(procurement, 'Real alternative procurement state must be returned');
  assert.ok(procurement.supplierCount > 0, `Supplier count must be > 0 (found ${procurement.supplierCount})`);
  assert.ok(procurement.totalAnnualImportTonnes > 100_000_000, `Total annual imports must be > 100 MMT (found ${procurement.totalAnnualImportTonnes})`);
  assert.ok(procurement.availableAlternativeDailyTonnes > 0, 'Daily capacity must be positive');

  // Verify daily capacity formula: annual tonnes / 365
  const expectedDaily = Math.round((procurement.totalAnnualImportTonnes / 365) * 100) / 100;
  assert.equal(procurement.availableAlternativeDailyTonnes, expectedDaily);

  // Verify commercial cost availability flag and explicit status string
  assert.equal(procurement.isCommercialCostAvailable, false, 'Commercial cost must be false since no cost data exists');
  assert.equal(
    procurement.commercialCostStatus,
    'Commercial lane-cost data unavailable',
    'Must display exact sentinel text when commercial cost data is unavailable',
  );

  // Check top suppliers are real countries
  const topSupplierNames = procurement.suppliers.map((s) => s.canonicalName);
  assert.ok(topSupplierNames.some((n) => n.includes('Saudi Arabia')), 'Must include Saudi Arabia');
  assert.ok(topSupplierNames.some((n) => n.includes('Iraq')), 'Must include Iraq');
  assert.ok(topSupplierNames.some((n) => n.includes('Iran')), 'Must include Iran');
});

test('Phase 8.3: Country exclusion in real alternative procurement works accurately', () => {
  const repository = getRepo();
  const allProcurement = repository.getRealAlternativeProcurement();
  const saudiExcluded = repository.getRealAlternativeProcurement({ excludedCountry: 'Saudi Arabia' });

  assert.ok(
    saudiExcluded.totalAnnualImportTonnes < allProcurement.totalAnnualImportTonnes,
    'Excluding Saudi Arabia must reduce available alternative import tonnage',
  );
  assert.ok(
    !saudiExcluded.suppliers.some((s) => s.canonicalName.includes('Saudi Arabia')),
    'Excluded supplier must not appear in suppliers list',
  );
});

test('Phase 8.3: Deterministic reserve optimizer incorporates real alternative procurement as operational constraint', () => {
  const repository = getRepo();
  const reserveState = repository.getCurrentStrategicReserveState();
  const procurement = repository.getRealAlternativeProcurement();

  // Test 1: Full coverage by real alternative procurement (effective gap = 0)
  const fullCoverageInput: StrategicReserveOptimizationInput = {
    currentReserve: reserveState.currentReserve,
    demand: reserveState.currentDemand,
    supplyGap: 100_000,
    disruptionDuration: 30,
    alternativeProcurement: 150_000, // Exceeds gap of 100,000
    replenishmentRate: reserveState.defaultReplenishmentRate,
    minimumReserveThreshold: reserveState.minimumReserveThreshold,
  };

  const fullResult = optimizeStrategicReserve(fullCoverageInput);
  assert.equal(fullResult.effectiveGap, 0, 'Effective gap must be 0 when alternatives exceed supply gap');
  assert.equal(fullResult.drawdownAmount, 0, 'Drawdown amount must be 0 when alternatives fully cover gap');
  assert.equal(fullResult.drawdownRate, 0, 'Drawdown rate must be 0');
  assert.equal(fullResult.fullyCovered, true, 'Fully covered must be true');
  assert.equal(fullResult.remainingReserve, reserveState.currentReserve, 'Reserve should remain untouched');
  assert.equal(fullResult.replenishmentRequirement, 0, 'No replenishment needed');

  // Test 2: Partial coverage by real alternative procurement
  const partialCoverageInput: StrategicReserveOptimizationInput = {
    currentReserve: reserveState.currentReserve,
    demand: reserveState.currentDemand,
    supplyGap: 200_000,
    disruptionDuration: 30,
    alternativeProcurement: procurement.suppliers[0].dailyCapacityTonnes, // Use top supplier capacity (~108,000 t/d)
    replenishmentRate: reserveState.defaultReplenishmentRate,
    minimumReserveThreshold: reserveState.minimumReserveThreshold,
  };

  const partialResult = optimizeStrategicReserve(partialCoverageInput);
  assert.equal(
    partialResult.effectiveGap,
    Math.max(0, 200_000 - procurement.suppliers[0].dailyCapacityTonnes),
    'Effective gap must be gross gap minus alternative procurement',
  );
  assert.ok(partialResult.drawdownAmount > 0, 'Drawdown must occur for residual gap');
  assert.ok(
    partialResult.remainingReserve >= partialCoverageInput.minimumReserveThreshold,
    'Remaining reserve must strictly enforce safety floor',
  );
});

test('Phase 8.3: Safety floor constraint is invariant regardless of procurement values', () => {
  const repository = getRepo();
  const reserveState = repository.getCurrentStrategicReserveState();

  // Test extreme deficit with 0 alternative procurement
  const extremeInput: StrategicReserveOptimizationInput = {
    currentReserve: 5_000_000,
    demand: reserveState.currentDemand,
    supplyGap: 500_000,
    disruptionDuration: 60, // Gross need = 30,000,000
    alternativeProcurement: 0,
    replenishmentRate: 20_000,
    minimumReserveThreshold: 1_500_000,
  };

  const extremeResult = optimizeStrategicReserve(extremeInput);
  assert.equal(
    extremeResult.maximumSafeReserveDrawdown,
    3_500_000,
    'Max safe drawdown = currentReserve (5.0M) - minimumReserveThreshold (1.5M) = 3.5M',
  );
  assert.equal(
    extremeResult.drawdownAmount,
    3_500_000,
    'Drawdown must be capped at 3.5M to protect the safety floor',
  );
  assert.equal(
    extremeResult.remainingReserve,
    1_500_000,
    'Remaining reserve must never drop below 1.5M',
  );
  assert.equal(extremeResult.fullyCovered, false, 'Extreme deficit is not fully covered');
  assert.equal(
    extremeResult.shortfall,
    (500_000 * 60) - 3_500_000,
    'Shortfall is correctly computed as unmet gap',
  );
});

test('Phase 8.3: Validation and type contract enforcement', () => {
  const valid = validateStrategicReserveInput({
    currentReserve: 5000000,
    demand: 4500000,
    supplyGap: 100000,
    disruptionDuration: 30,
    alternativeProcurement: 25000,
    replenishmentRate: 20000,
    minimumReserveThreshold: 1500000,
  });

  assert.equal(valid.valid, true);
  assert.ok(valid.input);

  const invalid = validateStrategicReserveInput({
    currentReserve: -10,
    demand: 0,
    supplyGap: 100,
    disruptionDuration: -5,
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues && invalid.issues.length > 0);
});

test('Phase 8.3: No demo-scenario-provider or fabricated cost files imported in reserves module', () => {
  const optimizerCode = readFileSync(path.join(process.cwd(), 'src/reserves/optimizer.ts'), 'utf8');
  const modelCode = readFileSync(path.join(process.cwd(), 'src/reserves/model.ts'), 'utf8');
  const repoCode = readFileSync(path.join(process.cwd(), 'src/dataLayer/repository.ts'), 'utf8');

  assert.ok(!optimizerCode.includes('demo-scenario-provider'), 'optimizer.ts must not reference demo-scenario-provider');
  assert.ok(!modelCode.includes('demo-scenario-provider'), 'model.ts must not reference demo-scenario-provider');
  assert.ok(!repoCode.includes('demo-scenario-provider'), 'repository.ts must not reference demo-scenario-provider');
});
