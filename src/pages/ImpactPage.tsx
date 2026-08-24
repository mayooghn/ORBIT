import React from 'react';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { NotConnectedState } from '../components/common/NotConnectedState';
import { getModuleServiceStatus } from '../services/moduleServices';

export const ImpactPage: React.FC = () => {
  const service = getModuleServiceStatus('impact');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Impact"
        subtitle="Review modeled infrastructure impact when the impact service is connected."
        badgeText="NOT CONNECTED"
        badgeLevel={service.status}
      />
      <NotConnectedState
        title="Impact inference is unavailable"
        description={service.message}
        icon={TrendingUp}
      />
    </div>
  );
};
