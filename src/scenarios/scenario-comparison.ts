import { DigitalTwinStateEngine } from '../digitalTwin/state';
import type {
  ScenarioComparison,
  ScenarioComparisonSummary,
  ScenarioInput,
  ScenarioResult,
} from './model';
import { ScenarioEngine } from './scenario-engine';

export type ScenarioComparisonClock = () => string;

const stableInputKey = (input: ScenarioInput): string =>
  JSON.stringify([
    input.eventId,
    input.durationDays,
    input.severity,
    input.affectedNodeId,
    input.capacityReductionPercent,
  ]);

const copyInput = (input: ScenarioInput): ScenarioInput => ({ ...input });

const buildComparisonId = (inputs: readonly ScenarioInput[]): string =>
  `comparison-${inputs.map(stableInputKey).join('|')}`;

const buildSummary = (
  scenarios: readonly ScenarioResult[],
): ScenarioComparisonSummary => {
  const highestSupplyLossScenario = scenarios.reduce(
    (highest, scenario) =>
      scenario.supplyLoss > highest.supplyLoss ? scenario : highest,
  );
  const highestShortageScenario = scenarios.reduce(
    (highest, scenario) =>
      scenario.shortage > highest.shortage ? scenario : highest,
  );
  const longestRecoveryScenario = scenarios.reduce(
    (longest, scenario) =>
      scenario.recoveryDays > longest.recoveryDays ? scenario : longest,
  );

  return {
    highestSupplyLoss: highestSupplyLossScenario.supplyLoss,
    highestShortage: highestShortageScenario.shortage,
    longestRecovery: longestRecoveryScenario.recoveryDays,
    scenarioWithHighestSupplyLoss: copyInput(
      highestSupplyLossScenario.input,
    ),
    scenarioWithHighestShortage: copyInput(
      highestShortageScenario.input,
    ),
    scenarioWithLongestRecovery: copyInput(
      longestRecoveryScenario.input,
    ),
  };
};

export class ScenarioComparisonService {
  constructor(
    private readonly scenarioEngine: ScenarioEngine,
    private readonly clock: ScenarioComparisonClock = () =>
      new Date().toISOString(),
  ) {}

  compare(
    stateEngine: DigitalTwinStateEngine,
    inputs: readonly ScenarioInput[],
  ): ScenarioComparison {
    if (inputs.length === 0) {
      throw new Error(
        'Scenario comparison requires at least one scenario.',
      );
    }

    const scenarios = inputs.map((input) =>
      this.scenarioEngine.run(stateEngine, input),
    );

    return {
      comparisonId: buildComparisonId(inputs),
      scenarios,
      summary: buildSummary(scenarios),
      calculatedAt: this.clock(),
    };
  }
}

export const compareScenarios = (
  scenarioEngine: ScenarioEngine,
  stateEngine: DigitalTwinStateEngine,
  inputs: readonly ScenarioInput[],
  clock?: ScenarioComparisonClock,
): ScenarioComparison =>
  new ScenarioComparisonService(scenarioEngine, clock).compare(
    stateEngine,
    inputs,
  );
