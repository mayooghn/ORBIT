import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon?: LucideIcon;
  subtext?: string;
  statusColor?: 'cyan' | 'emerald' | 'amber' | 'crimson';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changeType = 'neutral',
  icon: Icon,
  subtext,
  statusColor = 'cyan'
}) => {
  let iconBg = 'bg-[#1A1A1A] text-orange-400 border border-[#333333]';

  if (statusColor === 'emerald') {
    iconBg = 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40';
  } else if (statusColor === 'amber') {
    iconBg = 'bg-amber-950/40 text-amber-400 border border-amber-800/40';
  } else if (statusColor === 'crimson') {
    iconBg = 'bg-red-950/40 text-red-400 border border-red-800/40';
  }

  let changeColor = 'text-[#777777]';
  if (changeType === 'positive') changeColor = 'text-emerald-400';
  if (changeType === 'negative') changeColor = 'text-red-400';
  if (changeType === 'warning') changeColor = 'text-amber-400';

  return (
    <div
      className="relative p-5 rounded-lg border border-[#222222] bg-[#121212] hover:border-[#333333] transition-colors"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-widest text-[#666666] font-semibold">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-[#EDEDED] font-mono">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-medium text-[#777777] font-mono">
            {unit}
          </span>
        )}
      </div>

      {(change || subtext) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-[#1C1C1C]">
          {change && (
            <span className={`font-mono font-medium ${changeColor}`}>
              {change}
            </span>
          )}
          {subtext && (
            <span className="text-[#666666] text-xs truncate">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
