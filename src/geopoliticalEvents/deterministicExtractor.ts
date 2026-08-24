import { createHash } from 'node:crypto';
import type { DigitalTwinGraph, DigitalTwinNode, DigitalTwinNodeType } from '../digitalTwin/model';
import { canonicalArticleUrlForDedup } from '../services/dataIngestion/googleNews';
import {
  validateGeopoliticalEvent,
  type GeopoliticalEvent,
  type GeopoliticalEventCategory,
  type GeopoliticalEventSeverity,
} from './model';

export type DeterministicConfidenceLevel = 'HIGH' | 'UNCERTAIN';
export type DeterministicExtractionRoute = 'DETERMINISTIC' | 'GROQ_FALLBACK';

export interface DeterministicArticleInput {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  content?: unknown;
  source?: unknown;
  url?: unknown;
  sourceUrl?: unknown;
  publishedAt?: unknown;
}

export type DeterministicMatchedEntityType = DigitalTwinNodeType | 'country' | 'region';

export interface DeterministicMatchedEntity {
  entityId?: string;
  entityType: DeterministicMatchedEntityType;
  name: string;
  evidence: string;
}

export interface DeterministicExtractionResult {
  event?: GeopoliticalEvent;
  confidence: number;
  confidenceLevel: DeterministicConfidenceLevel;
  matchedEntities: DeterministicMatchedEntity[];
  extractionReasons: string[];
  route: DeterministicExtractionRoute;
}

interface CountryCandidate {
  canonicalName: string;
  aliases: string[];
  nodeId?: string;
}

interface NodeMatch {
  node: DigitalTwinNode;
  alias: string;
}

interface RegionMatch {
  name: string;
  evidence: string;
}

interface EventRule {
  id: string;
  category: GeopoliticalEventCategory;
  patterns: readonly RegExp[];
  reason: string;
}

const HIGH_CONFIDENCE_THRESHOLD = 0.85;

const ENERGY_PATTERN = /\b(?:energy|crude|oil|petroleum|refiner(?:y|ies)|pipeline(?:s)?|tanker(?:s)?|lng|lpg|natural gas|fuel|power plant|strategic reserve|oil terminal)\b/i;
const ASSET_PATTERN = /\b(?:refiner(?:y|ies)|pipeline(?:s)?|terminal(?:s)?|tanker(?:s)?|shipping|maritime|chokepoint(?:s)?|strait(?:s)?|route(?:s)?|port(?:s)?|facility|facilities)\b/i;
const ENERGY_EXPORT_PATTERN = /\b(?:crude|oil|petroleum)\s+exports?\b|\bexports?\s+of\s+(?:crude|oil|petroleum)\b/i;

const EVENT_RULES: readonly EventRule[] = [
  {
    id: 'maritime-disruption',
    category: 'maritime_disruption',
    patterns: [
      /\btanker\s+(?:attack(?:ed)?|strike|fire)\b/i,
      /\bshipping\s+(?:disruption|blocked|blockade|rerouted|halted)\b/i,
      /\b(?:chokepoint|strait)\s+(?:closed|closure|blocked|blockade|disruption)\b/i,
      /\b(?:blockade|maritime\s+disruption)\b/i,
      /\b(?:blocks?|blocked|halts?|halted)\s+(?:oil\s+)?shipments?\b/i,
      /\brerouted\s+shipping\b/i,
    ],
    reason: 'a maritime disruption pattern links a shipping-related asset or action to the article.',
  },
  {
    id: 'conflict',
    category: 'conflict',
    patterns: [
      /\bairstrike\b/i,
      /\bmissile\s+strike\b/i,
      /\bbombing\b/i,
      /\barmed\s+conflict\b/i,
      /\bmilitary\s+strike\b/i,
      /\bwar\b/i,
      /\battack(?:ed)?\b/i,
    ],
    reason: 'an explicit attack, strike, war, or armed-conflict pattern was identified.',
  },
  {
    id: 'infrastructure-disruption',
    category: 'infrastructure_disruption',
    patterns: [
      /\brefiner(?:y|ies)\s+(?:outage|shutdown|fire|damaged?|offline|shuts?\s+down)\b/i,
      /\bpipeline(?:s)?\s+(?:outage|shutdown|fire|damaged?|offline|shuts?\s+down)\b/i,
      /\bterminal(?:s)?\s+(?:outage|shutdown|fire|damaged?|offline|shuts?\s+down)\b/i,
      /\bfacilit(?:y|ies)\s+(?:damaged?|outage|shutdown|offline)\b/i,
      /\b(?:outage|shutdown|fire|damaged?|offline)\s+(?:at|hits?|affects?)\s+(?:the\s+)?(?:refiner(?:y|ies)|pipeline(?:s)?|terminal(?:s)?|facility|facilities)\b/i,
    ],
    reason: 'an explicit refinery, pipeline, terminal, or facility disruption pattern was identified.',
  },
  {
    id: 'sanctions-or-trade-restriction',
    category: 'trade_restriction',
    patterns: [
      /\b(?:sanction(?:s|ed)?|embargo)\b/i,
      /\b(?:export|import|shipping)\s+(?:ban|restriction|restrictions?)\b/i,
      /\brestrict(?:s|ed|ing)?\b[\s\S]{0,80}\b(?:oil|crude|petroleum)?\s*exports?\b/i,
      /\b(?:export|import)\s+restriction\b/i,
      /\b(?:blocks?|blocked|halts?|halted)\s+(?:crude|oil|petroleum)\s+exports?\b/i,
    ],
    reason: 'an explicit sanctions, embargo, ban, or trade-restriction pattern was identified.',
  },
];

const KNOWN_REGIONS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'Strait of Hormuz', pattern: /\bstrait\s+of\s+hormuz\b/i },
  { name: 'Strait of Malacca', pattern: /\bstrait\s+of\s+malacca\b/i },
  { name: 'Persian Gulf', pattern: /\bpersian\s+gulf\b/i },
  { name: 'Red Sea', pattern: /\bred\s+sea\b/i },
  { name: 'Suez', pattern: /\bsuez\b/i },
];

const COUNTRY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  Iran: ['Iranian'],
  Iraq: ['Iraqi'],
  Oman: ['Omani'],
  Qatar: ['Qatari'],
  Russia: ['Russian'],
  'Saudi Arabia': ['Saudi', 'Saudi Arabian'],
  'United Arab Emirates': ['UAE', 'U.A.E.', 'Emirati'],
  'United States': ['US', 'U.S.', 'USA', 'U.S.A.', 'American'],
  Venezuela: ['Venezuelan'],
  Nigeria: ['Nigerian'],
  Yemen: ['Yemeni'],
};

const normalizeText = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const phraseMatches = (phrase: string, text: string): boolean => {
  const normalizedPhrase = normalizeText(phrase);
  const normalizedText = normalizeText(text);
  if (!normalizedPhrase || !normalizedText) return false;
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
};

const textValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const articleText = (article: DeterministicArticleInput): string => [
  textValue(article.title),
  textValue(article.description),
  textValue(article.content),
].filter(Boolean).join(' ');

const validHttpUrl = (value: string): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

const normalizedTimestamp = (value: string): string | undefined => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};

const stableEventId = (article: DeterministicArticleInput, title: string, source: string, timestamp: string): string => {
  const url = textValue(article.url) || textValue(article.sourceUrl);
  const identity = `${canonicalArticleUrlForDedup(url)}\n${normalizeText(title)}\n${source}\n${timestamp}`;
  return `event-${createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 24)}`;
};

const sourceCountryNames = (node: DigitalTwinNode): string[] => {
  const values = [
    node.name,
    typeof node.metadata.sourceCountryName === 'string' ? node.metadata.sourceCountryName : '',
    typeof node.metadata.country === 'string' ? node.metadata.country : '',
  ];
  return values.filter(Boolean);
};

const aliasesForCountry = (canonicalName: string, sourceNames: readonly string[]): string[] => [
  canonicalName,
  ...sourceNames,
  ...(COUNTRY_ALIASES[canonicalName] || []),
];

const buildCountryCandidates = (graph: DigitalTwinGraph): CountryCandidate[] => {
  const candidates = new Map<string, CountryCandidate>();

  for (const node of graph.nodes) {
    const sourceNames = sourceCountryNames(node);
    const canonicalName = node.nodeType === 'supplier'
      ? node.name
      : typeof node.metadata.country === 'string' ? node.metadata.country : '';
    if (!canonicalName) continue;

    const key = normalizeText(canonicalName);
    const existing = candidates.get(key);
    if (existing) {
      existing.aliases = [...new Set([...existing.aliases, ...aliasesForCountry(canonicalName, sourceNames)])];
      existing.nodeId ||= node.nodeId;
      continue;
    }

    candidates.set(key, {
      canonicalName,
      aliases: aliasesForCountry(canonicalName, sourceNames),
      nodeId: node.nodeType === 'supplier' ? node.nodeId : undefined,
    });
  }

  return [...candidates.values()].sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
};

const nodeAliases = (node: DigitalTwinNode): string[] => {
  const aliases = [node.name];
  const commaSeparatedParts = node.name.split(',').map((part) => part.trim()).filter((part) => part.length >= 4);
  aliases.push(...commaSeparatedParts);
  if (node.nodeType === 'supplier' && typeof node.metadata.sourceCountryName === 'string') aliases.push(node.metadata.sourceCountryName);
  return [...new Set(aliases)];
};

const findNodeMatches = (graph: DigitalTwinGraph, text: string): NodeMatch[] => graph.nodes
  .flatMap((node) => {
    const alias = nodeAliases(node).find((candidate) => phraseMatches(candidate, text));
    return alias ? [{ node, alias }] : [];
  })
  .sort((left, right) => left.node.nodeId.localeCompare(right.node.nodeId));

const findRegionMatches = (text: string): RegionMatch[] => KNOWN_REGIONS
  .filter((region) => region.pattern.test(text))
  .map((region) => ({ name: region.name, evidence: `known geographic signal matched "${region.name}".` }));

const findCountries = (graph: DigitalTwinGraph, text: string): CountryCandidate[] => buildCountryCandidates(graph)
  .filter((candidate) => candidate.aliases.some((alias) => phraseMatches(alias, text)));

const matchingRule = (text: string): EventRule | undefined => {
  const maritime = EVENT_RULES[0];
  const conflict = EVENT_RULES[1];
  const infrastructure = EVENT_RULES[2];
  const trade = EVENT_RULES[3];
  const maritimeContext = /\b(?:tanker|shipping|maritime|chokepoint|strait|blockade|shipments?)\b/i.test(text);
  if (maritimeContext && maritime.patterns.some((pattern) => pattern.test(text))) return maritime;
  if (conflict.patterns.some((pattern) => pattern.test(text)) && /\b(?:attack|strike|war|conflict|missile|bombing|military)\b/i.test(text)) return conflict;
  if (infrastructure.patterns.some((pattern) => pattern.test(text))) return infrastructure;
  if (trade.patterns.some((pattern) => pattern.test(text))) return trade;
  return undefined;
};

const severityFor = (rule: EventRule, text: string): GeopoliticalEventSeverity => {
  if (/\b(?:war|armed\s+conflict|airstrike|missile\s+strike|bombing|blockade|chokepoint\s+(?:closed|closure))\b/i.test(text)) return 'critical';
  if (/\b(?:attack(?:ed)?|strike|fire|damaged?|shutdown|outage|export\s+ban|embargo|major\s+closure|sanction(?:s|ed)?)\b/i.test(text)) return 'high';
  if (rule.category === 'trade_restriction') return 'medium';
  return 'medium';
};

const matchedEntityKey = (entity: DeterministicMatchedEntity): string => `${entity.entityType}:${entity.entityId || normalizeText(entity.name)}`;

const uniqueEntities = (entities: DeterministicMatchedEntity[]): DeterministicMatchedEntity[] => {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = matchedEntityKey(entity);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const confidenceFor = ({
  rule,
  countries,
  nodeMatches,
  regionMatches,
  energySignal,
  assetSignal,
}: {
  rule?: EventRule;
  countries: readonly CountryCandidate[];
  nodeMatches: readonly NodeMatch[];
  regionMatches: readonly RegionMatch[];
  energySignal: boolean;
  assetSignal: boolean;
}): number => {
  let score = 0;
  if (rule) score += 0.35;
  if (countries.length > 0) score += 0.2;
  // A country plus an explicit energy asset is usable evidence even when the
  // Digital Twin does not contain that country's specific refinery/pipeline.
  // The country is still source-backed; no missing infrastructure is invented.
  if (nodeMatches.length > 0 || (countries.length > 0 && assetSignal)) score += 0.2;
  if (regionMatches.length > 0) score += 0.1;
  if (assetSignal) score += 0.15;
  if (energySignal) score += 0.1;
  return Math.min(0.99, Number(score.toFixed(2)));
};

const categoryForTradeRule = (text: string): GeopoliticalEventCategory =>
  /\b(?:sanction(?:s|ed)?|embargo)\b/i.test(text) ? 'sanctions' : 'trade_restriction';

const locationFor = (
  nodeMatches: readonly NodeMatch[],
  regionMatches: readonly RegionMatch[],
  countries: readonly CountryCandidate[],
): string | undefined => nodeMatches[0]?.node.name || regionMatches[0]?.name || countries[0]?.canonicalName;

const extractionResult = (
  event: GeopoliticalEvent | undefined,
  confidence: number,
  matchedEntities: DeterministicMatchedEntity[],
  extractionReasons: string[],
): DeterministicExtractionResult => ({
  ...(event ? { event } : {}),
  confidence,
  confidenceLevel: event && confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'HIGH' : 'UNCERTAIN',
  matchedEntities: uniqueEntities(matchedEntities),
  extractionReasons,
  route: event && confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'DETERMINISTIC' : 'GROQ_FALLBACK',
});

export const extractDeterministicGeopoliticalEvent = (
  article: DeterministicArticleInput,
  graph: DigitalTwinGraph,
): DeterministicExtractionResult => {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error('A Digital Twin graph snapshot is required for deterministic extraction.');
  }

  const title = textValue(article.title);
  const description = textValue(article.description) || textValue(article.content);
  const source = textValue(article.source);
  const text = articleText(article);
  const timestamp = normalizedTimestamp(textValue(article.publishedAt));
  const sourceUrl = validHttpUrl(textValue(article.url) || textValue(article.sourceUrl));
  const nodeMatches = findNodeMatches(graph, text);
  const regionMatches = findRegionMatches(text);
  const countries = findCountries(graph, text);
  const rule = matchingRule(text);
  const energySignal = ENERGY_PATTERN.test(text) || ENERGY_EXPORT_PATTERN.test(text);
  const assetSignal = ASSET_PATTERN.test(text) || ENERGY_EXPORT_PATTERN.test(text);
  const confidence = confidenceFor({ rule, countries, nodeMatches, regionMatches, energySignal, assetSignal });
  const matchedEntities: DeterministicMatchedEntity[] = [
    ...nodeMatches.map(({ node, alias }) => ({
      entityId: node.nodeId,
      entityType: node.nodeType,
      name: node.name,
      evidence: `Digital Twin ${node.nodeType} matched by "${alias}".`,
    })),
    ...countries.map((country) => ({
      ...(country.nodeId ? { entityId: country.nodeId } : {}),
      entityType: 'country' as const,
      name: country.canonicalName,
      evidence: `source-backed country matched from an existing Digital Twin country reference.`,
    })),
    ...regionMatches.map((region) => ({
      entityType: 'region' as const,
      name: region.name,
      evidence: region.evidence,
    })),
  ];
  const reasons: string[] = [];

  if (rule) reasons.push(rule.reason);
  else reasons.push('no supported explicit geopolitical action pattern was identified.');
  if (countries.length) reasons.push(`identified country evidence: ${countries.map((country) => country.canonicalName).join(', ')}.`);
  else reasons.push('no country was explicitly matched against the existing Digital Twin country references.');
  if (nodeMatches.length) reasons.push(`matched ${nodeMatches.length} existing Digital Twin node(s).`);
  if (regionMatches.length) reasons.push(`matched known geographic signal(s): ${regionMatches.map((region) => region.name).join(', ')}.`);
  if (assetSignal) reasons.push('an explicit energy asset or shipping signal was identified.');
  if (!timestamp) reasons.push('the article has no usable publication timestamp; the current time was not fabricated.');
  if (!source) reasons.push('the article source is missing.');
  if (!title) reasons.push('the article title is missing.');
  if (rule && !countries.length) reasons.push('the canonical event contract requires a country, so this result remains uncertain.');
  if (rule && !nodeMatches.length && !regionMatches.length) reasons.push('the affected entity was not reliably matched to the existing Digital Twin.');

  const requiredFieldsAvailable = Boolean(title && source && timestamp && countries.length > 0);
  const entityEvidenceAvailable = nodeMatches.length > 0 || regionMatches.length > 0 || (countries.length > 0 && assetSignal);
  const supportedEvent = Boolean(rule && energySignal && entityEvidenceAvailable && requiredFieldsAvailable);

  if (!supportedEvent) return extractionResult(undefined, confidence, matchedEntities, reasons);

  const category = rule.category === 'trade_restriction' ? categoryForTradeRule(text) : rule.category;
  const event: GeopoliticalEvent = {
    id: stableEventId(article, title, source, timestamp),
    title,
    description: description || title,
    timestamp,
    source,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(locationFor(nodeMatches, regionMatches, countries) ? { location: locationFor(nodeMatches, regionMatches, countries) } : {}),
    countriesInvolved: countries.map((country) => country.canonicalName).sort((left, right) => left.localeCompare(right)),
    category,
    severity: severityFor({ ...rule, category }, text),
  };
  const validatedEvent = validateGeopoliticalEvent(event);
  reasons.push(`deterministic confidence score is ${confidence.toFixed(2)}; high-confidence threshold is ${HIGH_CONFIDENCE_THRESHOLD.toFixed(2)}.`);
  return extractionResult(validatedEvent, confidence, matchedEntities, reasons);
};

export const extractDeterministicEvent = extractDeterministicGeopoliticalEvent;

export { HIGH_CONFIDENCE_THRESHOLD };
