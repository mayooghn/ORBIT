import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { NotConnectedState } from '../components/common/NotConnectedState';
import { getModuleServiceStatus } from '../services/moduleServices';

export const RecommendationsPage: React.FC = () => {
  const service = getModuleServiceStatus('recommendation');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Recommendations"
        subtitle="Review auditable mitigation recommendations when the service is connected."
        badgeText="NOT CONNECTED"
        badgeLevel={service.status}
      />
      <NotConnectedState
        title="Recommendations are unavailable"
        description={service.message}
        icon={CheckCircle2}
      />
    </div>
  );
};
