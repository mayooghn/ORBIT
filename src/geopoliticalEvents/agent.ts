import type { DigitalTwinRuntime } from '../digitalTwin/runtime';
import { classifyGeopoliticalEvent, type GeopoliticalEventClassification } from './classification';
import { integrateGeopoliticalRiskWithDigitalTwin, type GeopoliticalRiskDigitalTwinIntegration } from './digitalTwinIntegration';
import { GeopoliticalEventIngestionStore } from './ingestion';
import { analyzeGeopoliticalSupplyChainRelevance, type GeopoliticalSupplyChainRelevance } from './relevance';
import { assessGeopoliticalRisk, type GeopoliticalRiskAssessment } from './risk';
import { createGroqAgentProvider, type GroqExplanationInput, type GroqServiceContract } from './groq';
import type { GeopoliticalEvent } from './model';
import { extractDeterministicGeopoliticalEvent } from './deterministicExtractor';

export interface GeopoliticalRiskAgentResponse {
  request: string;
  event: GeopoliticalEvent;
  classification: GeopoliticalEventClassification;
  relevance: GeopoliticalSupplyChainRelevance;
  risk: GeopoliticalRiskAssessment;
  digitalTwinImpact: GeopoliticalRiskDigitalTwinIntegration;
  explanation: string;
}

export interface GeopoliticalRiskAgentAnalysisOptions {
  /** Background monitoring only needs structured extraction; manual analysis keeps the LLM explanation. */
  explanation?: 'llm' | 'deterministic';
}

export interface GeopoliticalRiskAgent {
  analyze(request: string, options?: GeopoliticalRiskAgentAnalysisOptions): Promise<GeopoliticalRiskAgentResponse>;
}

const clone = <T>(value: T): T => structuredClone(value);

const isEnergySupplyChainRelevant = (
  classification: GeopoliticalEventClassification,
  relevance: GeopoliticalSupplyChainRelevance,
  risk: GeopoliticalRiskAssessment,
): boolean => classification.energyRelevant && relevance.relevant && risk.energyRelevant;

const deterministicExplanation = (
  classification: GeopoliticalEventClassification,
  relevance: GeopoliticalSupplyChainRelevance,
  risk: GeopoliticalRiskAssessment,
): string => {
  const reason = !classification.energyRelevant
    ? 'classification marked the event as not energy relevant'
    : !relevance.relevant
      ? 'no existing Digital Twin entity matched the event'
      : 'the deterministic risk gate marked the event as not energy relevant';
  return `No Groq explanation was required: ${reason}. ORBIT retained the deterministic risk at ${risk.riskLevel} (${risk.riskScore}) with no Digital Twin impact.`;
};

const deterministicRelevantExplanation = (
  risk: GeopoliticalRiskAssessment,
  digitalTwinImpact: GeopoliticalRiskDigitalTwinIntegration,
): string => {
  const impact = digitalTwinImpact.affectedNodeIds.length || digitalTwinImpact.affectedEdgeIds.length
    ? `Digital Twin impact covers ${digitalTwinImpact.affectedNodeIds.length} node(s) and ${digitalTwinImpact.affectedEdgeIds.length} edge(s).`
    : 'No downstream Digital Twin nodes or edges were affected.';
  return `ORBIT retained the deterministic risk at ${risk.riskLevel} (${risk.riskScore}) after applying the validated event and network rules. ${impact}`;
};

interface DeterministicEventAnalysis {
  event: GeopoliticalEvent;
  classification: GeopoliticalEventClassification;
  relevance: GeopoliticalSupplyChainRelevance;
  risk: GeopoliticalRiskAssessment;
  digitalTwinImpact: GeopoliticalRiskDigitalTwinIntegration;
}

const analyzeEventDeterministically = (
  eventValue: unknown,
  runtime: DigitalTwinRuntime,
): DeterministicEventAnalysis => {
  const event = new GeopoliticalEventIngestionStore().ingest(eventValue);
  const classification = classifyGeopoliticalEvent(event);
  const relevance = analyzeGeopoliticalSupplyChainRelevance(event, runtime.stateEngine.getCurrentTwin(), classification);
  const risk = assessGeopoliticalRisk(event, classification, relevance);
  const digitalTwinImpact = integrateGeopoliticalRiskWithDigitalTwin(classification, relevance, risk, runtime);

  return {
    event: clone(event),
    classification: clone(classification),
    relevance: clone(relevance),
    risk: clone(risk),
    digitalTwinImpact: clone(digitalTwinImpact),
  };
};

/**
 * Runs a validated structured event through the same deterministic ORBIT
 * analysis path used after the user-facing agent extracts an event.
 * Monitoring uses this to keep news extraction separate from risk analysis.
 */
export const analyzeGeopoliticalEventDeterministically = (
  request: string,
  eventValue: unknown,
  runtime: DigitalTwinRuntime,
): GeopoliticalRiskAgentResponse => {
  const normalizedRequest = typeof request === 'string' ? request.trim() : '';
  if (!normalizedRequest) throw new Error('request is required.');

  const analysis = analyzeEventDeterministically(eventValue, runtime);
  const { classification, relevance, risk, digitalTwinImpact } = analysis;
  const explanation = !isEnergySupplyChainRelevant(classification, relevance, risk)
    ? deterministicExplanation(classification, relevance, risk)
    : deterministicRelevantExplanation(risk, digitalTwinImpact);

  return {
    request: normalizedRequest,
    ...analysis,
    explanation,
  };
};

export class GeopoliticalRiskIntelligenceAgent implements GeopoliticalRiskAgent {
  constructor(
    private readonly runtime: DigitalTwinRuntime,
    private readonly llm: GroqServiceContract,
  ) {}

  async analyze(request: string, options: GeopoliticalRiskAgentAnalysisOptions = {}): Promise<GeopoliticalRiskAgentResponse> {
    const normalizedRequest = typeof request === 'string' ? request.trim() : '';
    if (!normalizedRequest) throw new Error('request is required.');

    let extractedEvent: unknown = undefined;
    try {
      extractedEvent = await this.llm.extractEvent(normalizedRequest);
    } catch (extractError) {
      console.warn('[ORBIT Agent] LLM event extraction failed or timed out, falling back to deterministic extraction:', extractError);
      const graph = this.runtime.stateEngine.getCurrentTwin();
      const deterministic = extractDeterministicGeopoliticalEvent(
        {
          title: normalizedRequest,
          description: normalizedRequest,
          source: 'ORBIT Risk Intelligence Agent',
          publishedAt: new Date().toISOString(),
        },
        graph,
      );
      if (deterministic.event) {
        return analyzeGeopoliticalEventDeterministically(normalizedRequest, deterministic.event, this.runtime);
      }
      throw extractError;
    }

    const analysis = analyzeEventDeterministically(extractedEvent, this.runtime);
    const { event, classification, relevance, risk, digitalTwinImpact } = analysis;

    const deterministicResults: GroqExplanationInput = {
      request: normalizedRequest,
      event: clone(event),
      classification: clone(classification),
      relevance: clone(relevance),
      risk: clone(risk),
      digitalTwinImpact: clone(digitalTwinImpact),
    };

    let explanation: string;
    if (!isEnergySupplyChainRelevant(classification, relevance, risk)) {
      explanation = deterministicExplanation(classification, relevance, risk);
    } else if (options.explanation === 'deterministic') {
      explanation = deterministicRelevantExplanation(risk, digitalTwinImpact);
    } else {
      try {
        explanation = await this.llm.explain(clone(deterministicResults));
      } catch (explainError) {
        console.warn('[ORBIT Agent] LLM explanation failed, using deterministic explanation fallback:', explainError);
        explanation = deterministicRelevantExplanation(risk, digitalTwinImpact);
      }
    }

    if (typeof explanation !== 'string' || !explanation.trim()) {
      explanation = deterministicRelevantExplanation(risk, digitalTwinImpact);
    }

    return {
      request: normalizedRequest,
      ...analysis,
      explanation: explanation.trim(),
    };
  }
}

export const createGeopoliticalRiskIntelligenceAgent = (
  runtime: DigitalTwinRuntime,
  llm: GroqServiceContract = createGroqAgentProvider(),
): GeopoliticalRiskIntelligenceAgent => new GeopoliticalRiskIntelligenceAgent(runtime, llm);
