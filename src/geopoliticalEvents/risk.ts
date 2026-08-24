import { classifyGeopoliticalEvent, type GeopoliticalEventClassification } from './classification';
import { validateGeopoliticalEvent, type GeopoliticalEvent, type GeopoliticalEventSeverity } from './model';
import type { GeopoliticalSupplyChainRelevance } from './relevance';
import { DIGITAL_TWIN_NODE_TYPES, type DigitalTwinNodeType } from '../digitalTwin/model';

export type GeopoliticalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GeopoliticalRiskFactor {
  name: string;
  points: number;
  explanation: string;
}

export interface GeopoliticalRiskAssessment {
  eventId: string;
  riskLevel: GeopoliticalRiskLevel;
  riskScore: number;
  factors: GeopoliticalRiskFactor[];
  reasoning: string[];
  matchedNodeIds: string[];
  energyRelevant: boolean;
}

const SEVERITY_POINTS: Readonly<Record<GeopoliticalEventSeverity, number>> = {
  low: 5,
  medium: 20,
  high: 40,
  critical: 55,
};

const NODE_TYPE_POINTS: Readonly<Partial<Record<DigitalTwinNodeType, number>>> = {
  chokepoint: 10,
  strategic_reserve: 5,
  refinery: 5,
  port: 3,
  supplier: 3,
};

const NODE_TYPE_LABELS: Readonly<Record<DigitalTwinNodeType, string>> = {
  supplier: 'supplier',
  port: 'port',
  refinery: 'refinery',
  strategic_reserve: 'strategic reserve',
  shipping_route: 'shipping route',
  chokepoint: 'chokepoint',
};

const riskLevelForScore = (score: number): GeopoliticalRiskLevel => {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validateClassification = (event: GeopoliticalEvent, value: unknown): GeopoliticalEventClassification => {
  if (!isRecord(value)) throw new Error('A valid geopolitical event classification is required.');
  const canonical = classifyGeopoliticalEvent(event);
  if (
    value.eventId !== canonical.eventId ||
    value.category !== canonical.category ||
    value.severity !== canonical.severity ||
    value.energyRelevant !== canonical.energyRelevant
  ) {
    throw new Error('Geopolitical event classification does not match the event.');
  }
  return value as unknown as GeopoliticalEventClassification;
};

const validateRelevance = (event: GeopoliticalEvent, value: unknown): GeopoliticalSupplyChainRelevance => {
  if (!isRecord(value) || value.eventId !== event.id || typeof value.relevant !== 'boolean') {
    throw new Error('A valid supply-chain relevance result for the event is required.');
  }
  if (!Array.isArray(value.matchedNodeIds) || !value.matchedNodeIds.every((nodeId) => typeof nodeId === 'string')) {
    throw new Error('Supply-chain relevance matchedNodeIds must be an array of strings.');
  }
  if (!Array.isArray(value.matchedNodeTypes) || !value.matchedNodeTypes.every((nodeType) => DIGITAL_TWIN_NODE_TYPES.includes(nodeType as DigitalTwinNodeType))) {
    throw new Error('Supply-chain relevance matchedNodeTypes contains an invalid node type.');
  }
  return value as unknown as GeopoliticalSupplyChainRelevance;
};

const addFactor = (factors: GeopoliticalRiskFactor[], name: string, points: number, explanation: string): void => {
  if (points > 0) factors.push({ name, points, explanation });
};

export const assessGeopoliticalRisk = (
  eventValue: unknown,
  classificationValue: unknown,
  relevanceValue: unknown,
): GeopoliticalRiskAssessment => {
  const event = validateGeopoliticalEvent(eventValue);
  const classification = validateClassification(event, classificationValue);
  const relevance = validateRelevance(event, relevanceValue);
  const matchedNodeIds = [...relevance.matchedNodeIds];
  const factors: GeopoliticalRiskFactor[] = [];

  if (!classification.energyRelevant || !relevance.relevant) {
    const reason = !classification.energyRelevant
      ? 'The classified event is not energy relevant, so no ORBIT energy-supply-chain risk points are applied.'
      : 'The event is energy relevant but has no matched Digital Twin entity, so no exposed-network risk points are applied.';
    factors.push({ name: 'supply-chain relevance gate', points: 0, explanation: reason });
    return {
      eventId: event.id,
      riskLevel: 'low',
      riskScore: 0,
      factors,
      reasoning: [reason],
      matchedNodeIds,
      energyRelevant: classification.energyRelevant,
    };
  }

  addFactor(factors, 'event severity', SEVERITY_POINTS[classification.severity], `Severity ${classification.severity} contributes ${SEVERITY_POINTS[classification.severity]} points.`);
  addFactor(factors, 'energy relevance', 10, 'The classified event is relevant to the energy supply chain and contributes 10 points.');
  addFactor(factors, 'Digital Twin relevance', 5, 'At least one existing Digital Twin entity is matched and contributes 5 points.');

  const matchedTypes = [...new Set(relevance.matchedNodeTypes)];
  for (const nodeType of DIGITAL_TWIN_NODE_TYPES) {
    if (!matchedTypes.includes(nodeType)) continue;
    const points = NODE_TYPE_POINTS[nodeType] || 0;
    addFactor(factors, `${NODE_TYPE_LABELS[nodeType]} exposure`, points, `A matched ${NODE_TYPE_LABELS[nodeType]} contributes ${points} points.`);
  }

  const breadthPoints = Math.min(4, Math.max(0, matchedNodeIds.length - 1));
  addFactor(factors, 'matched asset breadth', breadthPoints, `${matchedNodeIds.length} matched Digital Twin node(s) contribute ${breadthPoints} breadth point(s), capped at 4.`);

  const rawScore = factors.reduce((total, factor) => total + factor.points, 0);
  const riskScore = Math.min(100, rawScore);
  const reasoning = [
    ...factors.map((factor) => factor.explanation),
    `The deterministic raw score is ${rawScore}; the reported score is capped at ${riskScore} on a 0-100 scale.`,
    `Risk level ${riskLevelForScore(riskScore)} is assigned using thresholds: low 0-24, medium 25-49, high 50-79, critical 80-100.`,
  ];

  return {
    eventId: event.id,
    riskLevel: riskLevelForScore(riskScore),
    riskScore,
    factors,
    reasoning,
    matchedNodeIds,
    energyRelevant: classification.energyRelevant,
  };
};

export class GeopoliticalRiskAssessor {
  assess(event: unknown, classification: unknown, relevance: unknown): GeopoliticalRiskAssessment {
    return assessGeopoliticalRisk(event, classification, relevance);
  }
}
