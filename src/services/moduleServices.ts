export type ModuleServiceKey =
  | 'risk'
  | 'corridor'
  | 'reserve'
  | 'recommendation'
  | 'scenario'
  | 'impact'
  | 'procurement'
  | 'assistant';

export interface ModuleServiceStatus {
  status: 'NOT_CONNECTED';
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
