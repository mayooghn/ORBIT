export const GEOPOLITICAL_EVENT_CATEGORIES = [
  'conflict',
  'sanctions',
  'political_instability',
  'trade_restriction',
  'maritime_disruption',
  'diplomatic_escalation',
  'infrastructure_disruption',
  'other',
] as const;

export type GeopoliticalEventCategory = (typeof GEOPOLITICAL_EVENT_CATEGORIES)[number];

export const GEOPOLITICAL_EVENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export type GeopoliticalEventSeverity = (typeof GEOPOLITICAL_EVENT_SEVERITIES)[number];

export interface GeopoliticalEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  source: string;
  sourceUrl?: string;
  location?: string;
  countriesInvolved: string[];
  category: GeopoliticalEventCategory;
  severity: GeopoliticalEventSeverity;
}

export class GeopoliticalEventValidationError extends Error {
  constructor(message: string) {
    super(`Invalid geopolitical event: ${message}`);
    this.name = 'GeopoliticalEventValidationError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GeopoliticalEventValidationError(`${field} is required.`);
  }
  return value.trim();
};

const optionalText = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return requiredText(value, field);
};

const validateTimestamp = (value: unknown): string => {
  const timestamp = requiredText(value, 'timestamp');
  if (!timestamp.includes('T') || !Number.isFinite(Date.parse(timestamp))) {
    throw new GeopoliticalEventValidationError('timestamp must be a valid date-time string.');
  }
  return timestamp;
};

const validateSourceUrl = (value: unknown): string | undefined => {
  const sourceUrl = optionalText(value, 'sourceUrl');
  if (sourceUrl === undefined) return undefined;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw new GeopoliticalEventValidationError('sourceUrl must be a valid HTTP(S) URL.');
  }
  return sourceUrl;
};

const validateCountries = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new GeopoliticalEventValidationError('countriesInvolved must contain at least one country.');
  }
  const countries = value.map((country, index) => requiredText(country, `countriesInvolved[${index}]`));
  const seen = new Set<string>();
  for (const country of countries) {
    const key = country.toLocaleLowerCase();
    if (seen.has(key)) throw new GeopoliticalEventValidationError(`countriesInvolved contains a duplicate country: ${country}.`);
    seen.add(key);
  }
  return countries;
};

const validateEnum = <T extends string>(value: unknown, field: string, values: readonly T[]): T => {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new GeopoliticalEventValidationError(`${field} must be one of: ${values.join(', ')}.`);
  }
  return value as T;
};

export const validateGeopoliticalEvent = (value: unknown): GeopoliticalEvent => {
  if (!isRecord(value)) throw new GeopoliticalEventValidationError('event must be an object.');
  return {
    id: requiredText(value.id, 'id'),
    title: requiredText(value.title, 'title'),
    description: requiredText(value.description, 'description'),
    timestamp: validateTimestamp(value.timestamp),
    source: requiredText(value.source, 'source'),
    sourceUrl: validateSourceUrl(value.sourceUrl),
    location: optionalText(value.location, 'location'),
    countriesInvolved: validateCountries(value.countriesInvolved),
    category: validateEnum(value.category, 'category', GEOPOLITICAL_EVENT_CATEGORIES),
    severity: validateEnum(value.severity, 'severity', GEOPOLITICAL_EVENT_SEVERITIES),
  };
};

export const isGeopoliticalEvent = (value: unknown): value is GeopoliticalEvent => {
  try {
    validateGeopoliticalEvent(value);
    return true;
  } catch {
    return false;
  }
};
