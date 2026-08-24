import { openPhase2Database } from '../src/dataLayer/database';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import { ScenarioEngine } from '../src/scenarios/scenario-engine';
import { ScenarioComparisonService } from '../src/scenarios/scenario-comparison';
import { SqliteScenarioBaselineProvider } from '../src/scenarios/sqlite-baseline-provider';
import type { ScenarioInput } from '../src/scenarios/model';

const database = openPhase2Database({
  dbPath: './Data/orbit.db',
});

try {
  const repository = new Phase2Repository(database);

  const runtime = createDigitalTwinRuntime(repository);

  const baselineProvider = new SqliteScenarioBaselineProvider(repository);

  const scenarioEngine = new ScenarioEngine(baselineProvider);

  const runtimeNodes = runtime.stateEngine.getCurrentTwin().nodes;

  const createScenarioInput = (durationDays: number): ScenarioInput => ({
      eventId: `hormuz-${durationDays}-days`,
      durationDays,
      severity: 'HIGH',
      affectedNodeId: 'chokepoint-strait-of-hormuz',
      capacityReductionPercent: 50,
    });

  const runScenario = (durationDays: number) => {
    const input = createScenarioInput(durationDays);

    return scenarioEngine.run(runtime.stateEngine, input);
  };

  console.log('');
  console.log('========================================');
  console.log('ORBIT PHASE 5 SCENARIO ENGINE');
  console.log('========================================');
  console.log('');

  const results = [7, 14, 30].map(runScenario);

  for (const result of results) {
    console.log(`Scenario: Hormuz ${result.input.durationDays} days`);
    console.log(`Capacity reduction: ${result.input.capacityReductionPercent}%`);
    console.log(`Gross supply loss: ${result.supplyLoss.toFixed(2)}`);
    console.log(`Gross supply loss unit: ${result.supplyLossUnit}`);
    console.log(`Affected routes: ${result.affectedRoutes.length}`);
    console.log(`Affected ports: ${result.affectedPorts.length}`);
    console.log(`Affected refineries: ${result.affectedRefineries.length}`);
    console.log(`Alternative capacity: ${result.alternativeCapacity}`);
    console.log(`Alternative capacity unit: ${result.alternativeCapacityUnit}`);
    console.log(`Alternative capacity status: ${result.alternativeCapacityStatus}`);
    console.log(`Alternative capacity source: ${result.alternativeCapacitySource}`);
    console.log(`Residual shortage: ${result.shortage.toFixed(2)}`);
    console.log(`Residual shortage unit: ${result.shortageUnit}`);
    console.log(`Recovery days: ${result.recoveryDays}`);
    console.log(`Recovery timeline points: ${result.recoveryTimeline.length}`);
    console.log('');

    console.log('----------------------------------------');
  }

  const sevenDay = results[0];
  const fourteenDay = results[1];
  const thirtyDay = results[2];

  const supportedPortNode = runtimeNodes.find(
    (node) =>
      node.nodeType === 'port' &&
      node.nodeId !== 'chokepoint-strait-of-hormuz' &&
      (node.currentFlow?.value || 0) > 0,
  );

  if (!supportedPortNode) {
    throw new Error('FAIL: Expected a source-backed port for coverage.');
  }

  const supportedPortResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: `supported-port-${supportedPortNode.nodeId}`,
    durationDays: 7,
    severity: 'HIGH',
    affectedNodeId: supportedPortNode.nodeId,
    capacityReductionPercent: 50,
  });

  if (
    !(supportedPortResult.supplyLoss > 0) ||
    supportedPortResult.supplyLossUnit !== 'source_tanker_units_per_activity_day-days'
  ) {
    throw new Error(
      'FAIL: Source-backed port baseline must produce a unit-preserving scenario result.',
    );
  }

  const supportedSupplierNode = runtimeNodes.find(
    (node) => node.nodeType === 'supplier' && node.currentFlow?.unit === 'barrels_per_day',
  );
  if (!supportedSupplierNode) {
    throw new Error('FAIL: Expected a source-backed supplier for coverage.');
  }
  const supportedSupplierResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: `supported-supplier-${supportedSupplierNode.nodeId}`,
    durationDays: 7,
    severity: 'HIGH',
    affectedNodeId: supportedSupplierNode.nodeId,
    capacityReductionPercent: 50,
  });
  if (
    !(supportedSupplierResult.supplyLoss > 0) ||
    supportedSupplierResult.supplyLossUnit !== 'barrels_per_day-days'
  ) {
    throw new Error(
      'FAIL: Source-backed supplier baseline must produce a unit-preserving scenario result.',
    );
  }

  const unsupportedNode = runtimeNodes.find((node) => node.nodeType === 'refinery');
  if (!unsupportedNode) {
    throw new Error('FAIL: Expected a refinery without a unit-safe daily baseline.');
  }
  const unsupportedResult = scenarioEngine.run(runtime.stateEngine, {
    eventId: `unsupported-${unsupportedNode.nodeId}`,
    durationDays: 7,
    severity: 'HIGH',
    affectedNodeId: unsupportedNode.nodeId,
    capacityReductionPercent: 50,
  });

  if (
    unsupportedResult.supplyLoss !== 0 ||
    unsupportedResult.supplyLossUnit !== 'unavailable' ||
    unsupportedResult.shortage !== 0 ||
    unsupportedResult.shortageUnit !== 'unavailable'
  ) {
    throw new Error(
      'FAIL: Unsupported assets must remain explicitly unavailable without fabricated results.',
    );
  }

  const comparisonInputs = [7, 14, 30].map(createScenarioInput);
  const comparisonService = new ScenarioComparisonService(
    scenarioEngine,
    () => '2026-08-23T12:00:00.000Z',
  );
  const comparison = comparisonService.compare(
    runtime.stateEngine,
    comparisonInputs,
  );

  console.log('');
  console.log('SCENARIO COMPARISON');
  console.log('Scenario | Supply Loss | Alternative Capacity | Shortage | Recovery');
  for (const result of comparison.scenarios) {
    console.log(
      `${result.input.durationDays} days | ${result.supplyLoss.toFixed(2)} | ${result.alternativeCapacity.toFixed(2)} (${result.alternativeCapacityUnit}) | ${result.shortage.toFixed(2)} | ${result.recoveryDays} days`,
    );
  }
  console.log(
    `Highest supply loss: ${comparison.summary.highestSupplyLoss.toFixed(2)} (${comparison.summary.scenarioWithHighestSupplyLoss.durationDays} days)`,
  );
  console.log(
    `Highest shortage: ${comparison.summary.highestShortage.toFixed(2)} (${comparison.summary.scenarioWithHighestShortage.durationDays} days)`,
  );
  console.log(
    `Longest recovery: ${comparison.summary.longestRecovery} days (${comparison.summary.scenarioWithLongestRecovery.durationDays}-day scenario)`,
  );
  console.log('');

  const repeatedComparison = comparisonService.compare(
    runtime.stateEngine,
    comparisonInputs,
  );

  if (comparison.comparisonId !== repeatedComparison.comparisonId) {
    throw new Error('FAIL: Scenario comparison ID must be deterministic.');
  }

  if (comparison.calculatedAt !== repeatedComparison.calculatedAt) {
    throw new Error('FAIL: Scenario comparison timestamp must use the supplied clock.');
  }

  if (
    JSON.stringify(comparison.summary) !==
    JSON.stringify(repeatedComparison.summary)
  ) {
    throw new Error('FAIL: Scenario comparison summary must be deterministic.');
  }

  if (comparison.scenarios.length !== 3) {
    throw new Error('FAIL: Scenario comparison must contain all three scenarios.');
  }

  if (comparison.scenarios.map((scenario) => scenario.input.durationDays).join(',') !== '7,14,30') {
    throw new Error('FAIL: Scenario comparison must preserve input order.');
  }

  if (
    !(comparison.scenarios[0].supplyLoss < comparison.scenarios[1].supplyLoss) ||
    !(comparison.scenarios[1].supplyLoss < comparison.scenarios[2].supplyLoss)
  ) {
    throw new Error('FAIL: Comparison supply loss ordering is incorrect.');
  }

  if (
    !(comparison.scenarios[0].shortage < comparison.scenarios[1].shortage) ||
    !(comparison.scenarios[1].shortage < comparison.scenarios[2].shortage)
  ) {
    throw new Error('FAIL: Comparison shortage ordering is incorrect.');
  }

  if (
    !(comparison.scenarios[0].recoveryDays < comparison.scenarios[1].recoveryDays) ||
    !(comparison.scenarios[1].recoveryDays < comparison.scenarios[2].recoveryDays)
  ) {
    throw new Error('FAIL: Comparison recovery ordering is incorrect.');
  }

  if (
    comparison.scenarios.some(
      (scenario) =>
        scenario.affectedRoutes.length === 0 ||
        scenario.affectedPorts.length === 0 ||
        scenario.affectedRefineries.length === 0,
    )
  ) {
    throw new Error(
      'FAIL: Comparison scenarios must preserve affected infrastructure results.',
    );
  }

  if (
    comparison.summary.highestSupplyLoss !== thirtyDay.supplyLoss ||
    comparison.summary.scenarioWithHighestSupplyLoss.durationDays !== 30
  ) {
    throw new Error('FAIL: Highest supply loss scenario was identified incorrectly.');
  }

  if (
    comparison.summary.highestShortage !== thirtyDay.shortage ||
    comparison.summary.scenarioWithHighestShortage.durationDays !== 30
  ) {
    throw new Error('FAIL: Highest shortage scenario was identified incorrectly.');
  }

  if (
    comparison.summary.longestRecovery !== thirtyDay.recoveryDays ||
    comparison.summary.scenarioWithLongestRecovery.durationDays !== 30
  ) {
    throw new Error('FAIL: Longest recovery scenario was identified incorrectly.');
  }

  for (const scenario of comparison.scenarios) {
    if (scenario.alternativeCapacityStatus !== 'UNAVAILABLE') {
      throw new Error(
        'FAIL: Comparison must preserve unavailable alternative-capacity status.',
      );
    }
  }

  let emptyComparisonRejected = false;
  try {
    comparisonService.compare(runtime.stateEngine, []);
  } catch (error) {
    emptyComparisonRejected =
      error instanceof Error &&
      error.message ===
        'Scenario comparison requires at least one scenario.';
  }

  if (!emptyComparisonRejected) {
    throw new Error('FAIL: Empty scenario comparison must be rejected.');
  }

  let invalidInputError = '';
  try {
    comparisonService.compare(runtime.stateEngine, [
      createScenarioInput(7),
      {
        ...createScenarioInput(14),
        durationDays: 0,
      },
    ]);
  } catch (error) {
    invalidInputError = error instanceof Error ? error.message : String(error);
  }

  if (invalidInputError !== 'Scenario durationDays must be greater than zero.') {
    throw new Error(
      'FAIL: Invalid scenario input must propagate the existing ScenarioEngine validation error.',
    );
  }

  const verifiedAlternativeScenarioEngine = new ScenarioEngine({
    getBaseline: (input) => baselineProvider.getBaseline(input),
    getAlternativeCapacity: (_input, context) => {
      if (!context.grossSupplyLoss) {
        return null;
      }

      return {
        value: context.grossSupplyLoss.dailySupply / 4,
        unit: context.grossSupplyLoss.unit,
        source: 'test: verified unit-compatible alternative capacity',
        status: 'VERIFIED' as const,
      };
    },
  });

  const verifiedAlternativeResult = verifiedAlternativeScenarioEngine.run(
    runtime.stateEngine,
    {
      eventId: 'hormuz-14-days-verified-alternative',
      durationDays: 14,
      severity: 'HIGH',
      affectedNodeId: 'chokepoint-strait-of-hormuz',
      capacityReductionPercent: 50,
    },
  );

  const expectedAlternativeCapacity = fourteenDay.supplyLoss / 4;

  if (verifiedAlternativeResult.alternativeCapacity !== expectedAlternativeCapacity) {
    throw new Error(
      'FAIL: Verified alternative capacity must be exposed in the scenario result.',
    );
  }

  if (
    verifiedAlternativeResult.shortage !==
    fourteenDay.supplyLoss - expectedAlternativeCapacity
  ) {
    throw new Error(
      'FAIL: Residual shortage must subtract verified alternative capacity from gross supply loss.',
    );
  }

  for (const result of results) {
    if (!(result.supplyLoss > 0)) {
      throw new Error('FAIL: Hormuz scenario gross supply loss must be positive.');
    }

    if (result.alternativeCapacity < 0) {
      throw new Error('FAIL: Alternative capacity must never be negative.');
    }

    if (result.shortage < 0) {
      throw new Error('FAIL: Residual shortage must never be negative.');
    }

    if (result.shortage > result.supplyLoss) {
      throw new Error('FAIL: Residual shortage cannot exceed gross supply loss.');
    }

    if (result.alternativeCapacityStatus !== 'UNAVAILABLE') {
      throw new Error(
        'FAIL: Hormuz alternative capacity must be explicitly unavailable when no verified value exists.',
      );
    }

    if (result.alternativeCapacityUnit !== 'unavailable') {
      throw new Error(
        'FAIL: Unavailable alternative capacity must use the unavailable unit marker.',
      );
    }

    if (!result.alternativeCapacitySource.includes('unavailable')) {
      throw new Error(
        'FAIL: Alternative capacity provenance must explain that the value is unavailable.',
      );
    }
  }

  if (!(sevenDay.supplyLoss < fourteenDay.supplyLoss)) {
    throw new Error(
      'FAIL: 14-day supply loss must be greater than 7-day supply loss.',
    );
  }

  if (!(fourteenDay.supplyLoss < thirtyDay.supplyLoss)) {
    throw new Error(
      'FAIL: 30-day supply loss must be greater than 14-day supply loss.',
    );
  }

  if (!(sevenDay.shortage < fourteenDay.shortage)) {
    throw new Error(
      'FAIL: 14-day residual shortage must be greater than 7-day residual shortage.',
    );
  }

  if (!(fourteenDay.shortage < thirtyDay.shortage)) {
    throw new Error(
      'FAIL: 30-day residual shortage must be greater than 14-day residual shortage.',
    );
  }

  if (sevenDay.affectedRoutes.length === 0) {
    throw new Error(
      'FAIL: Hormuz scenario affected zero shipping routes.',
    );
  }

  if (sevenDay.affectedPorts.length === 0) {
    throw new Error(
      'FAIL: Hormuz scenario affected zero ports.',
    );
  }

  if (sevenDay.affectedRefineries.length === 0) {
    throw new Error(
      'FAIL: Hormuz scenario affected zero refineries.',
    );
  }

  if (sevenDay.recoveryDays !== 14) {
    throw new Error(
      `FAIL: Expected 7-day HIGH scenario recovery horizon to be 14 days, got ${sevenDay.recoveryDays}.`,
    );
  }

  if (fourteenDay.recoveryDays !== 28) {
    throw new Error(
      `FAIL: Expected 14-day HIGH scenario recovery horizon to be 28 days, got ${fourteenDay.recoveryDays}.`,
    );
  }

  if (thirtyDay.recoveryDays !== 60) {
    throw new Error(
      `FAIL: Expected 30-day HIGH scenario recovery horizon to be 60 days, got ${thirtyDay.recoveryDays}.`,
    );
  }

  if (sevenDay.recoveryTimeline.length !== 15) {
    throw new Error(
      `FAIL: Expected 7-day scenario to have 15 recovery timeline points, got ${sevenDay.recoveryTimeline.length}.`,
    );
  }

  if (fourteenDay.recoveryTimeline.length !== 29) {
    throw new Error(
      `FAIL: Expected 14-day scenario to have 29 recovery timeline points, got ${fourteenDay.recoveryTimeline.length}.`,
    );
  }

  if (thirtyDay.recoveryTimeline.length !== 61) {
    throw new Error(
      `FAIL: Expected 30-day scenario to have 61 recovery timeline points, got ${thirtyDay.recoveryTimeline.length}.`,
    );
  }

  if (
    !fourteenDay.recoveryTimeline.some(
      (point) =>
        point.day > fourteenDay.input.durationDays &&
        point.day < fourteenDay.recoveryDays &&
        point.remainingCapacityPercent > 50 &&
        point.remainingCapacityPercent < 100,
    )
  ) {
    throw new Error(
      'FAIL: 14-day scenario must include an intermediate recovery value.',
    );
  }

  console.log('');
  console.log('========================================');
  console.log('PHASE 5 ACCEPTANCE TEST: PASSED');
  console.log('========================================');
  console.log('');
} finally {
  database.close();
}
