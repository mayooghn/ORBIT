import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { NotConnectedState } from '../components/common/NotConnectedState';
import { getModuleServiceStatus } from '../services/moduleServices';

export const RiskPage: React.FC = () => {
  const service = getModuleServiceStatus('risk');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Intelligence"
        subtitle="Reserved shell for verified disruption intelligence across energy transport corridors."
        badgeText="NOT CONNECTED"
        badgeLevel={service.status}
      />
      <NotConnectedState
        title="Risk intelligence is unavailable"
        description={service.message}
        icon={AlertTriangle}
      />
    </div>
  );
};
