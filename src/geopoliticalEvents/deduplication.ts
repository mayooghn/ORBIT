const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'is', 'near', 'of', 'off', 'on', 'or', 'the', 'to', 'with',
  'after', 'amid', 'around', 'coast', 'latest', 'new', 'news', 'report', 'reported', 'reports', 'says', 'said', 'today', 'update', 'updates',
]);

const SYNONYMS: Record<string, string> = {
  attacked: 'attack',
  attacks: 'attack',
  attacking: 'attack',
  blocked: 'blockade',
  blocking: 'blockade',
  closes: 'closure',
  closed: 'closure',
  closing: 'closure',
  disruptions: 'disruption',
  disrupted: 'disruption',
  disrupting: 'disruption',
  hijacked: 'hijack',
  hijacking: 'hijack',
  hijacks: 'hijack',
  imports: 'import',
  imported: 'import',
  importing: 'import',
  pipelines: 'pipeline',
  pirates: 'pirate',
  piracy: 'pirate',
  refineries: 'refinery',
  seized: 'seize',
  seizes: 'seize',
  seizing: 'seize',
  sanctions: 'sanction',
  sanctioned: 'sanction',
  tankers: 'tanker',
  exports: 'export',
  exported: 'export',
  exporting: 'export',
};

const ACTION_TERMS = new Set([
  'attack', 'blockade', 'closure', 'conflict', 'disruption', 'fire', 'halt', 'hijack', 'import', 'missile', 'outage', 'pirate', 'reroute', 'sanction', 'seize', 'shutdown', 'strike', 'war',
]);

const normalizeWord = (word: string): string => {
  const mapped = SYNONYMS[word] || word;
  if (mapped.length > 4 && mapped.endsWith('ies')) return `${mapped.slice(0, -3)}y`;
  if (mapped.length > 4 && mapped.endsWith('s') && !mapped.endsWith('ss')) return mapped.slice(0, -1);
  return mapped;
};

const stripSourceSuffix = (title: string, source?: string): string => {
  const normalizedSource = source?.trim();
  if (!normalizedSource) return title;
  const escapedSource = normalizedSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return title.replace(new RegExp(`\\s+-\\s+${escapedSource}\\s*$`, 'i'), '');
};

export const normalizedDedupTokens = (value: string, source?: string): string[] => {
  const normalized = stripSourceSuffix(value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), source)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const tokens = normalized
    .split(/\s+/)
    .map(normalizeWord)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  return [...new Set(tokens)].sort();
};

export interface DeduplicationArticleInput {
  title: string;
  description?: string;
  source?: string;
  publishedAt?: string;
  url?: string;
}

export interface DeduplicationEventInput extends DeduplicationArticleInput {
  category?: string;
  location?: string;
  countriesInvolved?: readonly string[];
  timestamp?: string;
}

export const buildArticleFingerprint = (article: DeduplicationArticleInput): string =>
  normalizedDedupTokens(`${article.title} ${article.description || ''}`, article.source).join('|');

export const buildEventFingerprint = (event: DeduplicationEventInput): string => {
  const category = event.category?.trim().toLowerCase() || '';
  const location = normalizedDedupTokens(event.location || '').join('|');
  const countries = (event.countriesInvolved || []).flatMap((country) => normalizedDedupTokens(country)).sort().join('|');
  const concepts = normalizedDedupTokens(`${event.title} ${event.description || ''}`, event.source).join('|');
  return `category:${category};location:${location};countries:${countries};concepts:${concepts}`;
};

const asSet = (tokens: readonly string[]): Set<string> => new Set(tokens);

const jaccardSimilarity = (left: readonly string[], right: readonly string[]): number => {
  const leftSet = asSet(left);
  const rightSet = asSet(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
};

export const areEventDatesWithinWindow = (left?: string, right?: string, windowMs = 72 * 60 * 60 * 1000): boolean => {
  if (!left || !right) return true;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return Number.isNaN(leftMs) || Number.isNaN(rightMs) || Math.abs(leftMs - rightMs) <= windowMs;
};

const overlappingAnchors = (left: readonly string[], right: readonly string[]): string[] => {
  const rightSet = asSet(right);
  return left.filter((token) => rightSet.has(token));
};

export const areLikelySameEvent = (left: DeduplicationEventInput, right: DeduplicationEventInput): boolean => {
  if (!areEventDatesWithinWindow(left.publishedAt || left.timestamp, right.publishedAt || right.timestamp)) return false;

  const categoryMismatch = Boolean(left.category && right.category && left.category !== right.category);

  const leftLocation = normalizedDedupTokens(left.location || '');
  const rightLocation = normalizedDedupTokens(right.location || '');
  if (leftLocation.length && rightLocation.length && !overlappingAnchors(leftLocation, rightLocation).length) return false;

  const leftCountries = normalizedDedupTokens((left.countriesInvolved || []).join(' '));
  const rightCountries = normalizedDedupTokens((right.countriesInvolved || []).join(' '));
  if (leftCountries.length && rightCountries.length && !overlappingAnchors(leftCountries, rightCountries).length) return false;

  const leftTitleTokens = normalizedDedupTokens(left.title, left.source);
  const rightTitleTokens = normalizedDedupTokens(right.title, right.source);
  const sharedTitleTokens = overlappingAnchors(leftTitleTokens, rightTitleTokens);
  const titleSimilarity = jaccardSimilarity(leftTitleTokens, rightTitleTokens);
  const actionOverlap = sharedTitleTokens.some((token) => ACTION_TERMS.has(token));
  if (sharedTitleTokens.length >= 3 && actionOverlap && titleSimilarity >= 0.78) return true;

  const leftTokens = normalizedDedupTokens(`${left.title} ${left.description || ''}`, left.source);
  const rightTokens = normalizedDedupTokens(`${right.title} ${right.description || ''}`, right.source);
  const sharedTokens = overlappingAnchors(leftTokens, rightTokens);
  if (categoryMismatch) return false;
  return sharedTokens.length >= 4
    && sharedTokens.some((token) => ACTION_TERMS.has(token))
    && jaccardSimilarity(leftTokens, rightTokens) >= 0.84;
};
