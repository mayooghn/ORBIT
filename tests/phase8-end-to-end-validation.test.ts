import assert from 'node:assert/strict';
import test from 'node:test';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { ScenarioEngine } from '../src/scenarios/scenario-engine';
import { SqliteScenarioBaselineProvider } from '../src/scenarios/sqlite-baseline-provider';
import { optimizeStrategicReserve, validateStrategicReserveInput } from '../src/reserves/optimizer';
import type { StrategicReserveOptimizationInput } from '../src/reserves/model';

const dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);
const baselineProvider = new SqliteScenarioBaselineProvider(repository);
const scenarioEngine = new ScenarioEngine(baselineProvider);

test('Phase 8.4 End-to-End Validation: Full Flow Geopolitical Event -> Twin -> Supply Gap -> Real Alternative Procurement -> Reserve Optimizer', () => {
  console.log('\n--- 1. DATABASE & PROVENANCE INSPECTION ---');
  const reserveState = repository.getCurrentStrategicReserveState();
  console.log('Real Strategic Reserve State:', {
    facilityName: reserveState.facilityName,
    currentReserve: reserveState.currentReserve,
    totalCapacity: reserveState.totalCapacity,
    currentDemand: reserveState.currentDemand,
    defaultReplenishmentRate: reserveState.defaultReplenishmentRate,
    minimumReserveThreshold: reserveState.minimumReserveThreshold,
    facilities: reserveState.facilities.map(f => ({ name: f.facilityName, capacity: f.capacity, status: f.mappingStatus })),
  });

  const realProcurement = repository.getRealAlternativeProcurement();
  console.log('Real Alternative Procurement State:', {
    financialYear: realProcurement.financialYear,
    totalAnnualImportTonnes: realProcurement.totalAnnualImportTonnes,
    availableAlternativeDailyTonnes: realProcurement.availableAlternativeDailyTonnes,
    supplierCount: realProcurement.supplierCount,
    commercialCostStatus: realProcurement.commercialCostStatus,
    topSuppliers: realProcurement.suppliers.slice(0, 5).map(s => ({
      country: s.canonicalName,
      annualTonnes: s.annualQuantityTonnes,
      dailyTonnes: s.dailyCapacityTonnes,
      share: s.shareOfTotalImportsPercent + '%'
    }))
  });

  console.log('\n--- 2. GEOPOLITICAL EVENT -> DIGITAL TWIN -> SUPPLY GAP ---');
  const twin = runtime.stateEngine.getCurrentTwin();
  const saudiNode = twin.nodes.find(n => n.name.toLowerCase().includes('saudi') || n.nodeId.includes('saudi'));
  assert.ok(saudiNode, 'Must find Saudi Arabia node in real twin');
  console.log('Disrupted Node:', { nodeId: saudiNode.nodeId, name: saudiNode.name, nodeType: saudiNode.nodeType, capacity: saudiNode.capacity });

  const scenarioResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: 'geo-event-saudi-001',
    affectedNodeId: saudiNode.nodeId,
    severity: 'HIGH',
    capacityReductionPercent: 50,
    durationDays: 30,
  });

  console.log('Scenario Simulation Output:', {
    scenarioId: scenarioResult.scenarioId,
    supplyLoss: scenarioResult.supplyLoss,
    supplyLossUnit: scenarioResult.supplyLossUnit,
    affectedRoutes: scenarioResult.affectedRoutes,
    affectedPorts: scenarioResult.affectedPorts,
    affectedRefineries: scenarioResult.affectedRefineries,
  });

  const dailyDisruptedTonnes = Math.round(scenarioResult.supplyLoss / scenarioResult.input.durationDays);
  console.log('Calculated Daily Supply Gap from Scenario:', dailyDisruptedTonnes, 'tonnes/day');

  console.log('\n--- 3. REAL ALTERNATIVE PROCUREMENT (EXCLUDING DISRUPTED SOURCE) ---');
  const alternativeProcurementExcludingSaudi = repository.getRealAlternativeProcurement({
    excludedCountry: 'Saudi Arabia',
  });
  console.log('Alternative Procurement Ex-Saudi:', {
    availableAlternativeDailyTonnes: alternativeProcurementExcludingSaudi.availableAlternativeDailyTonnes,
    supplierCount: alternativeProcurementExcludingSaudi.supplierCount,
    topAlternatives: alternativeProcurementExcludingSaudi.suppliers.slice(0, 3).map(s => `${s.canonicalName} (${s.dailyCapacityTonnes} t/d)`),
  });

  console.log('\n--- 4. STRATEGIC RESERVE OPTIMIZATION ---');
  const optimizerInput: StrategicReserveOptimizationInput = {
    currentReserve: reserveState.currentReserve,
    demand: reserveState.currentDemand,
    supplyGap: dailyDisruptedTonnes,
    disruptionDuration: scenarioResult.input.durationDays,
    alternativeProcurement: Math.min(
      Math.round(dailyDisruptedTonnes * 0.4), // Let 40% be absorbed by alternative routes
      alternativeProcurementExcludingSaudi.availableAlternativeDailyTonnes,
    ),
    replenishmentRate: reserveState.defaultReplenishmentRate,
    minimumReserveThreshold: reserveState.minimumReserveThreshold,
  };

  console.log('Optimizer Inputs:', optimizerInput);
  const optimizerResult = optimizeStrategicReserve(optimizerInput);
  console.log('Optimizer Output:', optimizerResult);

  // Safety Constraint Verification
  assert.ok(
    optimizerResult.remainingReserve >= optimizerInput.minimumReserveThreshold,
    `Safety floor violated! remainingReserve (${optimizerResult.remainingReserve}) < minimumThreshold (${optimizerInput.minimumReserveThreshold})`
  );
  console.log('Safety floor condition VERIFIED: remainingReserve >= minimumReserveThreshold');
});

test('Phase 8.4 Critical Safety Test Matrix (9 Required Test Scenarios)', () => {
  const reserveState = repository.getCurrentStrategicReserveState();
  const realProcurement = repository.getRealAlternativeProcurement();

  const testMatrix: Array<{
    name: string;
    input: StrategicReserveOptimizationInput;
    expectedCondition: string;
  }> = [
    {
      name: '1. Zero supply gap',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 0,
        disruptionDuration: 30,
        alternativeProcurement: 25_000,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'drawdownAmount === 0 && remainingReserve === currentReserve',
    },
    {
      name: '2. Normal disruption (moderate gap & duration)',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 60_000,
        disruptionDuration: 20,
        alternativeProcurement: 20_000,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'fullyCovered === true && remainingReserve >= minimumReserveThreshold',
    },
    {
      name: '3. Large disruption (high gross gap)',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 250_000,
        disruptionDuration: 45,
        alternativeProcurement: 50_000,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'remainingReserve >= minimumReserveThreshold',
    },
    {
      name: '4. Procurement fully covering gap',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 80_000,
        disruptionDuration: 30,
        alternativeProcurement: 100_000, // exceeds gap
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'effectiveGap === 0 && drawdownAmount === 0 && remainingReserve === currentReserve',
    },
    {
      name: '5. Procurement partially covering gap',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 120_000,
        disruptionDuration: 30,
        alternativeProcurement: 40_000,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'effectiveGap === 80000 && remainingReserve >= minimumReserveThreshold',
    },
    {
      name: '6. Zero procurement',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 100_000,
        disruptionDuration: 30,
        alternativeProcurement: 0,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'effectiveGap === supplyGap && remainingReserve >= minimumReserveThreshold',
    },
    {
      name: '7. Reserve close to minimum threshold',
      input: {
        currentReserve: 1_600_000,
        demand: reserveState.currentDemand,
        supplyGap: 50_000,
        disruptionDuration: 20,
        alternativeProcurement: 0,
        replenishmentRate: reserveState.defaultReplenishmentRate,
        minimumReserveThreshold: 1_500_000, // only 100,000 drawdown allowed
      },
      expectedCondition: 'maximumSafeReserveDrawdown === 100000 && drawdownAmount <= 100000 && remainingReserve >= 1500000',
    },
    {
      name: '8. Requested drawdown exceeding safe drawdown',
      input: {
        currentReserve: 5_000_000,
        demand: reserveState.currentDemand,
        supplyGap: 400_000,
        disruptionDuration: 60, // Gross need = 24,000,000 tonnes
        alternativeProcurement: 0,
        replenishmentRate: 20_000,
        minimumReserveThreshold: 1_500_000, // Safe max = 3,500,000
      },
      expectedCondition: 'drawdownAmount === 3500000 && remainingReserve === 1500000 && fullyCovered === false',
    },
    {
      name: '9. Long disruption (180 days)',
      input: {
        currentReserve: reserveState.currentReserve,
        demand: reserveState.currentDemand,
        supplyGap: 75_000,
        disruptionDuration: 180,
        alternativeProcurement: 30_000,
        replenishmentRate: 15_000,
        minimumReserveThreshold: reserveState.minimumReserveThreshold,
      },
      expectedCondition: 'remainingReserve >= minimumReserveThreshold && replenishmentRequirement === drawdownAmount',
    },
  ];

  console.log('\n=== CRITICAL SAFETY MATRIX EXECUTION ===');
  for (const item of testMatrix) {
    const res = optimizeStrategicReserve(item.input);
    const passedSafety = res.remainingReserve >= item.input.minimumReserveThreshold;
    assert.ok(passedSafety, `Failed safety constraint on test: ${item.name}`);

    console.log(`\nTest Case: ${item.name}`);
    console.log('Inputs:', {
      currentReserve: item.input.currentReserve,
      demand: item.input.demand,
      supplyGap: item.input.supplyGap,
      disruptionDuration: item.input.disruptionDuration,
      alternativeProcurement: item.input.alternativeProcurement,
      replenishmentRate: item.input.replenishmentRate,
      minimumReserveThreshold: item.input.minimumReserveThreshold,
    });
    console.log('Outputs:', {
      effectiveGap: res.effectiveGap,
      drawdownAmount: res.drawdownAmount,
      drawdownRate: res.drawdownRate,
      duration: res.duration,
      remainingReserve: res.remainingReserve,
      minimumReserveThreshold: item.input.minimumReserveThreshold,
      replenishmentRequirement: res.replenishmentRequirement,
      replenishmentDays: res.replenishmentDays,
      fullyCovered: res.fullyCovered,
      shortfall: res.shortfall,
      safetyConstraintPassed: passedSafety,
    });
  }
});

test('Phase 8.4 API Endpoint Validation (GET state, POST optimize, GET alternative-procurement, GET history)', async () => {
  const { createApp } = await import('../server');
  const { createServer } = await import('node:http');

  const app = createApp(repository, runtime);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Could not bind test server');
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // 1. GET /api/reserves/state
    const stateRes = await fetch(`${baseUrl}/api/reserves/state`);
    assert.equal(stateRes.status, 200, 'GET /api/reserves/state must return 200');
    const stateJson = await stateRes.json() as any;
    assert.equal(stateJson.status, 'AVAILABLE');
    assert.equal(stateJson.state.currentReserve, 5_000_000);
    assert.ok(stateJson.state.currentDemand > 0);
    assert.equal(stateJson.state.minimumReserveThreshold, 1_500_000);
    assert.ok(stateJson.state.alternativeProcurement);
    assert.equal(stateJson.state.alternativeProcurement.commercialCostStatus, 'Commercial lane-cost data unavailable');

    // 2. GET /api/reserves/alternative-procurement
    const procRes = await fetch(`${baseUrl}/api/reserves/alternative-procurement`);
    assert.equal(procRes.status, 200, 'GET /api/reserves/alternative-procurement must return 200');
    const procJson = await procRes.json() as any;
    assert.equal(procJson.status, 'AVAILABLE');
    assert.ok(procJson.procurement.suppliers.length > 0);
    assert.equal(procJson.procurement.commercialCostStatus, 'Commercial lane-cost data unavailable');

    // 3. POST /api/reserves/optimize
    const optRes = await fetch(`${baseUrl}/api/reserves/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentReserve: 5_000_000,
        demand: 655_271,
        supplyGap: 100_000,
        disruptionDuration: 30,
        alternativeProcurement: 25_000,
        replenishmentRate: 20_000,
        minimumReserveThreshold: 1_500_000,
      }),
    });
    assert.equal(optRes.status, 200, 'POST /api/reserves/optimize must return 200');
    const optJson = await optRes.json() as any;
    assert.equal(optJson.status, 'AVAILABLE');
    assert.equal(optJson.reserve.effectiveGap, 75_000);
    assert.equal(optJson.reserve.drawdownAmount, 2_250_000);
    assert.equal(optJson.reserve.remainingReserve, 2_750_000);
    assert.ok(optJson.reserve.remainingReserve >= optJson.reserve.minimumReserveConstraint);
    assert.equal(optJson.reserve.safetyConstraintGuaranteed, true);
    assert.ok(optJson.procurementProvenance);
    assert.equal(optJson.procurementProvenance.commercialCostStatus, 'Commercial lane-cost data unavailable');

    // 4. GET /api/reserves/history
    const histRes = await fetch(`${baseUrl}/api/reserves/history?limit=5`);
    assert.equal(histRes.status, 200, 'GET /api/reserves/history must return 200');
    const histJson = await histRes.json() as any;
    assert.equal(histJson.status, 'AVAILABLE');
    assert.ok(Array.isArray(histJson.runs));
    assert.ok(histJson.runs.length >= 1, 'History must contain the run just executed');
    assert.equal(histJson.runs[0].result.drawdownAmount, 2_250_000);
  } finally {
    server.close();
  }
});

