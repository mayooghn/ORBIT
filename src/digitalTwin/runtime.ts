import type { Phase2Repository } from '../dataLayer/repository';
import { buildDigitalTwinFromPhase2 } from './fromPhase2';
import { DigitalTwinImpactAnalyzer } from './impact';
import { DigitalTwinStateEngine } from './state';

export interface DigitalTwinRuntime {
  stateEngine: DigitalTwinStateEngine;
  impactAnalyzer: DigitalTwinImpactAnalyzer;
}

export const createDigitalTwinRuntime = (repository: Phase2Repository): DigitalTwinRuntime => {
  const graph = buildDigitalTwinFromPhase2(repository).snapshot();
  const stateEngine = new DigitalTwinStateEngine(graph);
  return { stateEngine, impactAnalyzer: new DigitalTwinImpactAnalyzer(stateEngine) };
};
