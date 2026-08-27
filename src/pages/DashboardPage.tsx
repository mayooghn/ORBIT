import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { MetricCard } from '../components/common/MetricCard';
import { NotConnectedState } from '../components/common/NotConnectedState';
import { StatusBadge } from '../components/common/StatusBadge';
import { getModuleServiceStatus } from '../services/moduleServices';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  Network,
  ShieldCheck
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const risk = getModuleServiceStatus('risk');
  const corridor = getModuleServiceStatus('corridor');
  const reserve = getModuleServiceStatus('reserve');
  const recommendation = getModuleServiceStatus('recommendation');
  const assistant = getModuleServiceStatus('assistant');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="A single operational view of energy supply-chain risk, network context, and connected services."
      />

      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-orange-900/40 bg-orange-950/20 text-xs text-orange-200">
        <ShieldCheck className="w-4 h-4 flex-shrink-0 text-orange-400 mt-0.5" />
        <p>
          Secure access and the protected application shell are available. Some operational data services are not connected in this environment.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Global Supply Risk Index"
          value="—"
          change="Risk engine not connected"
          subtext="No verified risk measurement"
          icon={AlertTriangle}
          statusColor="amber"
        />
        <MetricCard
          title="Active Disruption Events"
          value={0}
          unit="Events"
          change="No verified events available"
          subtext="Risk feed not connected"
          icon={Activity}
          statusColor="amber"
        />
        <MetricCard
          title="Strategic Reserve Cover"
          value="—"
          change="Awaiting reserve telemetry"
          subtext="Reserve service not connected"
          icon={Database}
          statusColor="amber"
        />
        <MetricCard
          title="Action Recommendations"
          value={0}
          unit="Plans"
          change="Recommendation engine not connected"
          subtext="No verified recommendations"
          icon={CheckCircle2}
          statusColor="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-[#222222] bg-[#121212] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-[#EDEDED] font-mono">Network</h3>
            </div>
            <button
              onClick={() => onNavigate('/app/network')}
              type="button"
              className="text-xs font-mono text-orange-400 hover:text-orange-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open module</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <NotConnectedState
            title="Network data unavailable"
            description={corridor.message}
            icon={Network}
            className="border-0 bg-transparent"
          />
        </div>

        <div className="rounded-lg border border-[#222222] bg-[#121212] p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-4">
            <Cpu className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-[#EDEDED] font-mono">System Status</h3>
          </div>
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#666666]">Application foundation</span>
              <StatusBadge level="FOUNDATION" label="READY" size="sm" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#666666]">Firebase Authentication</span>
              <StatusBadge level="FOUNDATION" label="READY" size="sm" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#666666]">Operational data</span>
              <StatusBadge level="NOT_CONNECTED" label="NOT CONNECTED" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-[#222222] bg-[#121212] p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-[#EDEDED] font-mono">Verified Disruptions</h3>
          </div>
          <NotConnectedState title="No verified events available" description={risk.message} icon={AlertTriangle} />
        </div>

        <div className="rounded-lg border border-[#222222] bg-[#121212] p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-4">
            <CheckCircle2 className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-[#EDEDED] font-mono">Recommendations</h3>
          </div>
          <NotConnectedState title="No recommendations available" description={recommendation.message} icon={CheckCircle2} />
        </div>
      </div>

      <div className="rounded-lg border border-[#222222] bg-[#121212] p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-4">
          <Bot className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-[#EDEDED] font-mono">Module Availability</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Network', corridor.message, '/app/network'],
            ['Risk Intelligence', risk.message, '/app/risk'],
            ['Reserve Management', reserve.message, '/app/reserves'],
            ['Geopolitical Risk Agent', assistant.message, '/app/assistant']
          ].map(([label, message, path]) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(path)}
              className="text-left p-3 rounded border border-[#222222] bg-[#0F0F0F] hover:border-[#333333] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#EDEDED] font-mono">{label}</span>
                <span className="text-[9px] text-orange-400 font-mono">NOT CONNECTED</span>
              </div>
              <p className="text-[11px] text-[#777777] mt-2 leading-relaxed">{message}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
