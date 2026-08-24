import {
  validateGeopoliticalEvent,
  type GeopoliticalEvent,
  type GeopoliticalEventCategory,
  type GeopoliticalEventSeverity,
} from './model';

export interface GeopoliticalEventClassification {
  eventId: string;
  category: GeopoliticalEventCategory;
  severity: GeopoliticalEventSeverity;
  energyRelevant: boolean;
  countriesInvolved: string[];
  location?: string;
  region?: string;
  classificationReasons: string[];
}

const COUNTRY_REGIONS: Readonly<Record<string, string>> = {
  bangladesh: 'South Asia',
  bahrain: 'Middle East',
  china: 'East Asia',
  egypt: 'Middle East',
  france: 'Europe',
  germany: 'Europe',
  india: 'South Asia',
  indonesia: 'Southeast Asia',
  iran: 'Middle East',
  iraq: 'Middle East',
  israel: 'Middle East',
  japan: 'East Asia',
  jordan: 'Middle East',
  kuwait: 'Middle East',
  malaysia: 'Southeast Asia',
  oman: 'Middle East',
  pakistan: 'South Asia',
  qatar: 'Middle East',
  russia: 'Eastern Europe / North Asia',
  saudiarabia: 'Middle East',
  singapore: 'Southeast Asia',
  srilanka: 'South Asia',
  southkorea: 'East Asia',
  turkey: 'Middle East / Europe',
  unitedarabemirates: 'Middle East',
  uae: 'Middle East',
  ukraine: 'Eastern Europe',
  unitedkingdom: 'Europe',
  unitedstates: 'North America',
  vietnam: 'Southeast Asia',
  yemen: 'Middle East',
};

const LOCATION_REGIONS: readonly [RegExp, string][] = [
  [/strait of hormuz|persian gulf|gulf of oman|gulf region/i, 'Middle East'],
  [/arabian sea|indian ocean|bay of bengal|gulf of kutch/i, 'Indian Ocean'],
  [/strait of malacca|south china sea/i, 'Southeast Asia'],
  [/red sea|suez/i, 'Middle East / North Africa'],
  [/europe|black sea/i, 'Europe'],
  [/north america|caribbean/i, 'North America'],
  [/africa|west africa|east africa/i, 'Africa'],
];

const ENERGY_TERMS = /\b(?:energy|crude|oil|petroleum|refinery|pipeline|tanker|lng|lpg|natural gas|fuel|power plant|strategic reserve|oil terminal)\b/i;
const ENERGY_LOCATIONS = /strait of hormuz|persian gulf|gulf of oman|arabian sea|indian ocean|gulf of kutch|strait of malacca|red sea|suez/i;

const compactCountry = (country: string): string => country.toLowerCase().replace(/[^a-z]/g, '');

const classifyRegion = (event: GeopoliticalEvent): { region?: string; reason?: string } => {
  const location = event.location || '';
  const locationRule = LOCATION_REGIONS.find(([pattern]) => pattern.test(location));
  if (locationRule) {
    return { region: locationRule[1], reason: `geographic rule: location "${event.location}" maps to ${locationRule[1]}.` };
  }

  const regions = [...new Set(event.countriesInvolved.map((country) => COUNTRY_REGIONS[compactCountry(country)]).filter(Boolean))];
  if (regions.length === 0) return {};
  return {
    region: regions.join(' / '),
    reason: `geographic rule: involved countries map to ${regions.join(' / ')}.`,
  };
};

const classifyEnergyRelevance = (event: GeopoliticalEvent): { energyRelevant: boolean; reason: string } => {
  const searchableText = [event.title, event.description, event.location || ''].join(' ');
  if (event.category === 'maritime_disruption') {
    return { energyRelevant: true, reason: 'energy rule: maritime disruption is relevant to energy shipping continuity.' };
  }
  if (ENERGY_TERMS.test(searchableText)) {
    return { energyRelevant: true, reason: 'energy rule: energy-sector terminology appears in the event fields.' };
  }
  if (ENERGY_LOCATIONS.test(searchableText)) {
    return { energyRelevant: true, reason: 'energy rule: the event location is an established energy transit region.' };
  }
  return { energyRelevant: false, reason: 'energy rule: no energy-sector terminology or energy transit region was identified.' };
};

export const classifyGeopoliticalEvent = (value: unknown): GeopoliticalEventClassification => {
  const event = validateGeopoliticalEvent(value);
  const geographic = classifyRegion(event);
  const energy = classifyEnergyRelevance(event);
  const classificationReasons = [
    `category rule: using the validated structured category "${event.category}".`,
    `severity rule: using the validated structured severity "${event.severity}".`,
    ...(geographic.reason ? [geographic.reason] : ['geographic rule: no recognized region was available from the location or countries.']),
    energy.reason,
  ];

  return {
    eventId: event.id,
    category: event.category,
    severity: event.severity,
    energyRelevant: energy.energyRelevant,
    countriesInvolved: [...event.countriesInvolved],
    location: event.location,
    region: geographic.region,
    classificationReasons,
  };
};

export class GeopoliticalEventClassifier {
  classify(value: unknown): GeopoliticalEventClassification {
    return classifyGeopoliticalEvent(value);
  }
}
