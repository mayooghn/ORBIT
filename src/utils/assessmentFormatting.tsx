import React from 'react';
import type { MeasurementSummary, MonitoredEventRecord } from '../services/api';

export const EXAMPLE_PROMPTS = [
  'What happens if the Strait of Hormuz is disrupted?',
  'Assess the supply-chain risk of a disruption in Saudi Arabian crude exports.',
  'What is the impact of a maritime blockade in the Bab el-Mandeb Strait?',
  'Evaluate energy supply vulnerability from a disruption at the Port of Ras Tanura.',
];

export const INITIAL_ASSISTANT_REQUEST = '';

export const EXTERNAL_MONITORING_FRESHNESS_MS = 30 * 60 * 1000;

export type ExternalMonitoringStatus = {
  state: 'ACTIVE' | 'STANDBY' | 'WAITING';
  message: string;
  latestEventAt?: string;
};

export const getExternalMonitoringStatus = (
  events: readonly MonitoredEventRecord[],
  now = Date.now(),
): ExternalMonitoringStatus => {
  const externalEvents = events.filter((record) => record.article?.sourceType === 'external_webhook');
  const latestExternalEvent = externalEvents.reduce<MonitoredEventRecord | undefined>((latest, record) => {
    if (!latest) return record;
    const latestDetectedAt = Date.parse(latest.detectedAt || '');
    const detectedAt = Date.parse(record.detectedAt || '');
    return Number.isFinite(detectedAt) && (!Number.isFinite(latestDetectedAt) || detectedAt > latestDetectedAt) ? record : latest;
  }, undefined);
  const hasRecentExternalEvent = externalEvents.some((record) => {
    if (record.article?.sourceType !== 'external_webhook') return false;
    const detectedAt = Date.parse(record.detectedAt || '');
    const age = now - detectedAt;
    return Number.isFinite(detectedAt) && age >= 0 && age <= EXTERNAL_MONITORING_FRESHNESS_MS;
  });

  if (hasRecentExternalEvent) return { state: 'ACTIVE', message: 'External ingestion pipeline is receiving events.' };
  if (externalEvents.length > 0) {
    const latestEventAt = latestExternalEvent?.detectedAt;
    return {
      state: 'STANDBY',
      message: 'No new external events recently.',
      ...(latestEventAt && Number.isFinite(Date.parse(latestEventAt)) ? { latestEventAt } : {}),
    };
  }
  return { state: 'WAITING', message: 'Waiting for the first event from the external ingestion pipeline.' };
};

export const formatExternalMonitoringEventTime = (timestamp?: string): string => {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const monitoringRecordKey = (record: MonitoredEventRecord): string =>
  record.article?.id || record.detectedAt || `${record.article?.title || 'event'}-${record.article?.publishedAt || ''}`;

export const valueOrUnavailable = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value : 'Not available';

export const humanizeLabel = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return 'Not available';
  let label = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return label
    .replace(/\bhormuz\b/gi, 'Hormuz')
    .replace(/\bindia\b/gi, 'India')
    .replace(/\bsaudi arabia\b/gi, 'Saudi Arabia')
    .replace(/\bmiddle east\b/gi, 'Middle East');
};

const nodeTypePrefixes: Array<[string, string]> = [
  ['shipping-route', 'Shipping route'],
  ['shipping_route', 'Shipping route'],
  ['chokepoint', 'Chokepoint'],
  ['refinery', 'Refinery'],
  ['supplier', 'Supplier'],
  ['pipeline', 'Pipeline'],
  ['terminal', 'Terminal'],
  ['storage', 'Storage'],
  ['reserve', 'Strategic reserve'],
  ['port', 'Port'],
];

export const friendlyNodeLabel = (nodeId: string, nodeType?: string, nodeName?: string): string => {
  if (
    nodeName &&
    nodeName.trim() &&
    !nodeName.startsWith('refinery-') &&
    !nodeName.startsWith('port-') &&
    !nodeName.startsWith('supplier-') &&
    !nodeName.startsWith('shipping_route-') &&
    !nodeName.startsWith('chokepoint-')
  ) {
    return nodeName.trim();
  }
  const normalizedId = nodeId.trim().toLowerCase();
  const prefix = nodeTypePrefixes.find(([candidate]) => normalizedId.startsWith(`${candidate}-`));
  const typeLabel = nodeType ? humanizeLabel(nodeType) : prefix?.[1];

  const suffix = prefix ? nodeId.slice(prefix[0].length + 1).replace(/[_-]+/g, ' ').trim() : '';
  const compactSuffix = suffix.replace(/\s/g, '');
  const opaqueSuffix = compactSuffix.length >= 16 && /^[a-z0-9]+$/i.test(compactSuffix) && /\d/.test(compactSuffix);

  if (suffix && !opaqueSuffix) {
    const formattedSuffix = humanizeLabel(suffix);
    if (typeLabel && !formattedSuffix.toLowerCase().includes(typeLabel.toLowerCase())) {
      return `${typeLabel}: ${formattedSuffix}`;
    }
    return formattedSuffix;
  }
  return typeLabel || 'Supply Chain Asset';
};

export const humanizeTechnicalText = (value: unknown, preserveMarkdown = false): string => {
  let text = valueOrUnavailable(value)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\bevt-[a-z0-9-]+\b/gi, 'the event')
    .replace(/\b(?:rel|edge)-[a-z0-9-]+\b/gi, 'connected relationship')
    .replace(/,?\s*(?:calculated from|driven by)\s+.*?(?:event severity|energy relevance|digital twin relevance|supplier exposure|severity|points for)[^.\n]*/gi, '')
    .replace(/\s*\(\d+\s+points for [^)]+\)/gi, '');
  const technicalIdentifierPattern = /\b(?:shipping[-_]route|chokepoint|supplier|port|refinery|pipeline|terminal|storage|reserve|node|edge)[-_][a-z0-9_-]+\b/gi;
  text = text.replace(technicalIdentifierPattern, (identifier) => friendlyNodeLabel(identifier));
  text = text.replace(/\s+\./g, '.').replace(/\.{2,}/g, '.').replace(/\s{2,}/g, ' ');
  return (preserveMarkdown ? text : text.replace(/\*\*/g, '')).replace(/[^\S\r\n]+/g, ' ').trim();
};

export const renderSafeAssessmentMarkdown = (value: unknown): React.ReactNode => {
  const lines = humanizeTechnicalText(value, true).split(/\r?\n/);
  return lines.flatMap((line, lineIndex) => {
    const inlineParts = line.split(/(\*\*[^*]+?\*\*)/g).map((part, partIndex) => {
      const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
      if (boldMatch) return <strong key={`${lineIndex}-bold-${partIndex}`} className="font-semibold text-slate-100">{boldMatch[1]}</strong>;
      return <React.Fragment key={`${lineIndex}-text-${partIndex}`}>{part.replace(/\*\*/g, '')}</React.Fragment>;
    });
    return lineIndex < lines.length - 1 ? [...inlineParts, <br key={`${lineIndex}-break`} />] : inlineParts;
  });
};

export const compactAssessmentText = (value: unknown): string => {
  return humanizeTechnicalText(value, true);
};

export const formatMeasurementParts = (summary?: MeasurementSummary): { value: string; unit: string } => {
  const values = [...(summary?.nodeTotals || []), ...(summary?.edgeTotals || [])]
    .filter((measurement) => typeof measurement.value === 'number' && typeof measurement.unit === 'string' && measurement.unit.trim());
  if (!values.length) return { value: 'Not available', unit: '' };
  const first = values[0];
  const valStr = first.value != null ? first.value.toLocaleString() : '0';
  const unitStr = first.unit ? first.unit.replaceAll('_', ' ') : '';
  return { value: valStr, unit: unitStr };
};

export const normalizedRiskLevel = (level?: string): 'low' | 'medium' | 'high' | 'critical' | 'unknown' => {
  const normalized = level?.toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical') {
    return normalized;
  }
  return 'unknown';
};

export const riskBadgeConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'LOW RISK' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'MODERATE' },
  high: { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-400', label: 'HIGH RISK' },
  critical: { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', label: 'CRITICAL' },
  unknown: { bg: 'bg-slate-800/40', border: 'border-slate-700/40', text: 'text-slate-400', label: 'UNKNOWN' },
};

export const getPageNumbers = (current: number, total: number): Array<number | '...'> => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
};
