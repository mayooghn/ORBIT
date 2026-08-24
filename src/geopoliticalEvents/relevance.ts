import { classifyGeopoliticalEvent, type GeopoliticalEventClassification } from './classification';
import { validateGeopoliticalEvent, type GeopoliticalEvent } from './model';
import type { DigitalTwinGraph, DigitalTwinNode, DigitalTwinNodeType } from '../digitalTwin/model';

export interface GeopoliticalSupplyChainRelevance {
  eventId: string;
  relevant: boolean;
  matchedNodeIds: string[];
  matchedNodeTypes: DigitalTwinNodeType[];
  matchedLocations: string[];
  matchedCountries: string[];
  relevanceReasons: string[];
}

interface NodeMatch {
  node: DigitalTwinNode;
  nameMatched: boolean;
  locationMatched: boolean;
  countryMatches: string[];
};

const normalize = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const phraseMatches = (phrase: string, text: string): boolean => {
  const normalizedPhrase = normalize(phrase);
  const normalizedText = normalize(text);
  return normalizedPhrase.length >= 3 && normalizedText.includes(normalizedPhrase);
};

const metadataText = (node: DigitalTwinNode): string => Object.values(node.metadata)
  .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  .join(' ');

const explicitCountryText = (node: DigitalTwinNode): string => [
  node.name,
  typeof node.metadata.country === 'string' ? node.metadata.country : '',
  typeof node.metadata.sourceCountryName === 'string' ? node.metadata.sourceCountryName : '',
].join(' ');

const nodeText = (node: DigitalTwinNode): string => [node.name, node.description || '', metadataText(node)].join(' ');

const findNodeMatch = (event: GeopoliticalEvent, node: DigitalTwinNode): NodeMatch | undefined => {
  const eventText = [event.title, event.description, event.location || ''].join(' ');
  const nameMatched = phraseMatches(node.name, eventText);
  const locationMatched = event.location !== undefined && phraseMatches(event.location, nodeText(node));
  const countryMatches = event.countriesInvolved.filter((country) => phraseMatches(country, explicitCountryText(node)));

  if (!nameMatched && !locationMatched && countryMatches.length === 0) return undefined;
  return { node, nameMatched, locationMatched, countryMatches };
};

const assertGraph = (graph: DigitalTwinGraph): void => {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error('A Digital Twin graph snapshot is required.');
  }
};

const classifyInput = (event: GeopoliticalEvent, classification?: GeopoliticalEventClassification): GeopoliticalEventClassification => {
  if (!classification) return classifyGeopoliticalEvent(event);
  if (classification.eventId !== event.id) throw new Error('Classification eventId does not match the event id.');
  return classification;
};

export const analyzeGeopoliticalSupplyChainRelevance = (
  value: unknown,
  graph: DigitalTwinGraph,
  classification?: GeopoliticalEventClassification,
): GeopoliticalSupplyChainRelevance => {
  const event = validateGeopoliticalEvent(value);
  assertGraph(graph);
  const classified = classifyInput(event, classification);
  const matches = graph.nodes.map((node) => findNodeMatch(event, node)).filter((match): match is NodeMatch => match !== undefined);
  const orderedMatches = [...matches].sort((left, right) => left.node.nodeId.localeCompare(right.node.nodeId));
  const matchedNodeIds = orderedMatches.map((match) => match.node.nodeId);
  const matchedNodeTypes = [...new Set(orderedMatches.map((match) => match.node.nodeType))].sort();
  const matchedLocations = event.location && orderedMatches.some((match) => match.locationMatched) ? [event.location] : [];
  const matchedCountries = [...new Set(orderedMatches.flatMap((match) => match.countryMatches))].sort((left, right) => left.localeCompare(right));
  const relevanceReasons: string[] = [
    `classification rule: evaluated event ${classified.eventId} as ${classified.category} with ${classified.severity} severity.`,
  ];

  for (const match of orderedMatches) {
    const reasons: string[] = [];
    if (match.nameMatched) reasons.push(`entity name match for ${match.node.nodeType} "${match.node.name}"`);
    if (match.locationMatched && event.location) reasons.push(`location "${event.location}" matches the entity name or metadata`);
    if (match.countryMatches.length > 0) reasons.push(`country match for ${match.countryMatches.join(', ')}`);
    if (match.node.connectedNodeIds.length > 0) reasons.push(`existing graph relationships connect this entity to ${match.node.connectedNodeIds.length} node(s)`);
    relevanceReasons.push(`match rule: ${reasons.join('; ')}.`);
  }

  if (matchedNodeIds.length === 0) relevanceReasons.push('no-match rule: no existing Digital Twin node name, location metadata, or explicit country field matched.');
  return {
    eventId: event.id,
    relevant: matchedNodeIds.length > 0,
    matchedNodeIds,
    matchedNodeTypes,
    matchedLocations,
    matchedCountries,
    relevanceReasons,
  };
};

export class GeopoliticalSupplyChainRelevanceAnalyzer {
  constructor(private readonly graph: DigitalTwinGraph) {}

  analyze(value: unknown, classification?: GeopoliticalEventClassification): GeopoliticalSupplyChainRelevance {
    return analyzeGeopoliticalSupplyChainRelevance(value, this.graph, classification);
  }
}
