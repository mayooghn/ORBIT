import type { HealthApiResponse, MonitoringStatusResponse } from './api';
import type { OrbitAssessment } from '../types/orbitAssessment';

export type ModuleServiceKey =
  | 'risk'
  | 'corridor'
  | 'reserve'
  | 'recommendation'
  | 'scenario'
  | 'impact'
  | 'procurement'
  | 'assistant';

/** Phase 4: module statuses are derived from live ORBIT data; 'NOT_CONNECTED' remains the offline fallback. */
export type ModuleServiceConnectionStatus = 'READY' | 'NOT_CONNECTED' | 'UNKNOWN';

export interface ModuleServiceStatus {
  status: ModuleServiceConnectionStatus;
  message: string;
}

const statuses: Record<ModuleServiceKey, ModuleServiceStatus> = {
  risk: {
    status: 'NOT_CONNECTED',
    message: 'Verified risk events are unavailable because the risk data source is not connected.'
  },
  corridor: {
    status: 'NOT_CONNECTED',
    message: 'Network topology and corridor telemetry are not connected.'
  },
  reserve: {
    status: 'NOT_CONNECTED',
    message: 'Reserve telemetry is not connected.'
  },
  recommendation: {
    status: 'NOT_CONNECTED',
    message: 'The recommendation engine is not connected.'
  },
  scenario: {
    status: 'NOT_CONNECTED',
    message: 'The simulation engine is not connected.'
  },
  impact: {
    status: 'NOT_CONNECTED',
    message: 'The impact inference model is not connected.'
  },
  procurement: {
    status: 'NOT_CONNECTED',
    message: 'The procurement optimization engine is not connected.'
  },
  assistant: {
    status: 'NOT_CONNECTED',
    message: 'The geopolitical risk analysis service is not connected.'
  }
};

export function getModuleServiceStatus(key: ModuleServiceKey): ModuleServiceStatus {
  return statuses[key];
}

export interface ModuleServiceInputs {
  /** Health response from GET /api/health (null when unreachable). */
  health?: HealthApiResponse | null;
  /** Monitoring status object from GET /api/geopolitical-risk/monitor/status. */
  monitoring?: MonitoringStatusResponse['monitoring'] | null;
  /** True when GET /api/reserves/state returned a real reserve state. */
  reserveStateAvailable?: boolean;
  /** Latest unified assessment, when one exists. */
  latestAssessment?: OrbitAssessment | null;
}

/** Monitoring service states that indicate a live, operational feed. */
const OPERATIONAL_MONITORING_STATES: ReadonlySet<string> = new Set(['RUNNING', 'READY', 'IDLE']);

/**
 * Derives honest module statuses from data the dashboard already fetched.
 * READY is only reported when a real readiness signal exists (an operational
 * monitoring state, an explicit health capability, or module data actually
 * retrieved) — never merely because an API call was attempted.
 */
export function deriveModuleServiceStatuses(
  inputs: ModuleServiceInputs,
): Record<ModuleServiceKey, ModuleServiceStatus> {
  const health = inputs.health ?? null;
  const backendAvailable = health?.status === 'AVAILABLE';
  const monitoring = inputs.monitoring ?? null;
  const monitoringState = monitoring?.state ?? null;
  const reserve = inputs.reserveStateAvailable ?? false;
  const assessment = inputs.latestAssessment ?? null;

  const connected = (message: string): ModuleServiceStatus => ({ status: 'READY', message });
  const offline = (message: string): ModuleServiceStatus => ({ status: 'NOT_CONNECTED', message });
  const unknown = (message: string): ModuleServiceStatus => ({ status: 'UNKNOWN', message });

  // Geopolitical Risk — READY only when the monitoring service reports an operational state.
  let risk: ModuleServiceStatus;
  if (!backendAvailable) {
    risk = offline('Geopolitical monitoring is unreachable: the ORBIT backend is offline.');
  } else if (!monitoring) {
    risk = offline('Geopolitical monitoring status is unavailable.');
  } else if (monitoringState && OPERATIONAL_MONITORING_STATES.has(monitoringState)) {
    risk = connected(`Geopolitical monitoring is ${monitoringState.toLowerCase()} and connected.`);
  } else if (monitoringState === 'DISABLED') {
    risk = offline('Geopolitical monitoring is disabled on the server.');
  } else if (monitoringState === 'ERROR') {
    risk = offline('Geopolitical monitoring reported an error state.');
  } else {
    risk = unknown('Geopolitical monitoring state is unknown.');
  }

  // Digital Twin Network — the health endpoint reports twin readiness explicitly.
  const twinCapability = health?.capabilities?.digitalTwin;
  let corridor: ModuleServiceStatus;
  if (twinCapability === 'READY') {
    corridor = connected('Digital Twin network topology is ready.');
  } else if (twinCapability === 'NOT_CONNECTED') {
    corridor = offline('Digital Twin network topology is not connected.');
  } else if (!backendAvailable) {
    corridor = offline('Digital Twin network topology is unreachable.');
  } else {
    corridor = unknown('Digital Twin readiness is unknown.');
  }

  // Strategic Reserve — real reserve state retrieved from /api/reserves/state.
  const reserveStatus = reserve
    ? connected('Strategic reserve state is connected.')
    : offline('Reserve telemetry is not connected.');

  // Assessment-backed modules — READY only when the latest assessment actually carries the result.
  const assessmentBacked = (
    readyMessage: string,
    pendingMessage: string,
    offlineMessage: string,
    hasResult: boolean,
  ): ModuleServiceStatus => (hasResult ? connected(readyMessage) : backendAvailable ? unknown(pendingMessage) : offline(offlineMessage));

  return {
    risk,
    corridor,
    reserve: reserveStatus,
    recommendation: assessmentBacked(
      'Rule-based recommendations are available from the latest assessment.',
      'No assessment recommendation available yet.',
      'The recommendation engine is not connected.',
      Boolean(assessment?.recommendation),
    ),
    scenario: assessmentBacked(
      'Scenario results are available from the latest assessment.',
      'No scenario result available yet.',
      'The simulation engine is not connected.',
      Boolean(assessment?.scenario),
    ),
    impact: assessmentBacked(
      'Digital Twin impact results are available from the latest assessment.',
      'No Digital Twin impact result available yet.',
      'The impact inference model is not connected.',
      Boolean(assessment?.geopolitical?.digitalTwinImpact),
    ),
    procurement: assessmentBacked(
      'Procurement optimization results are available from the latest assessment.',
      'No procurement result available yet.',
      'The procurement optimization engine is not connected.',
      Boolean(assessment?.procurement),
    ),
    assistant: backendAvailable
      ? unknown('Geopolitical risk analysis service is reachable; readiness is unknown until an assessment runs.')
      : offline('The geopolitical risk analysis service is not connected.'),
  };
}
