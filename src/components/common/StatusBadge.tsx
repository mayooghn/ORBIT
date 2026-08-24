import React from 'react';
import { SeverityLevel } from '../../types';

interface StatusBadgeProps {
  level?: SeverityLevel | string;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  level = 'NORMAL', 
  label, 
  size = 'md',
  pulse = false 
}) => {
  const displayLabel = label || level;

  let colorClasses = 'bg-[#1A1A1A] text-[#999999] border-[#333333]';
  let dotColor = 'bg-[#666666]';

  switch (level) {
    case 'CRITICAL':
    case 'BLOCKED':
    case 'OFFLINE':
      colorClasses = 'bg-red-950/60 text-red-400 border-red-900/60';
      dotColor = 'bg-red-500';
      break;
    case 'ELEVATED':
    case 'CONSTRAINED':
    case 'DEGRADED':
    case 'P0_IMMEDIATE':
      colorClasses = 'bg-orange-950/60 text-orange-400 border-orange-900/60';
      dotColor = 'bg-orange-500';
      break;
    case 'MODERATE':
    case 'MONITORING':
    case 'P1_HIGH':
      colorClasses = 'bg-amber-950/60 text-amber-400 border-amber-900/60';
      dotColor = 'bg-amber-500';
      break;
    case 'AVAILABLE':
    case 'FOUNDATION':
    case 'NORMAL':
    case 'RESOLVED':
    case 'APPROVED':
      colorClasses = 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60';
      dotColor = 'bg-emerald-500';
      break;
    case 'NOT_CONNECTED':
      colorClasses = 'bg-orange-950/60 text-orange-400 border-orange-900/60';
      dotColor = 'bg-orange-400';
      break;
    case 'UNKNOWN':
      colorClasses = 'bg-blue-950/60 text-blue-400 border-blue-900/60';
      dotColor = 'bg-blue-400';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border font-semibold ${sizeClasses} ${colorClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? 'animate-ping' : ''}`}
      />
      {displayLabel}
    </span>
  );
};
