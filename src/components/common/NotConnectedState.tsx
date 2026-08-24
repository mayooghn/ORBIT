import React from 'react';
import { LucideIcon, Unplug } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface NotConnectedStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}

export const NotConnectedState: React.FC<NotConnectedStateProps> = ({
  title,
  description,
  icon: Icon = Unplug,
  className = ''
}) => (
  <div className={`flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-[#333333] bg-[#0F0F0F] ${className}`}>
    <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center mb-3 text-orange-400 border border-[#333333]">
      <Icon className="w-6 h-6" />
    </div>
    <StatusBadge level="NOT_CONNECTED" label="NOT CONNECTED" size="sm" />
    <h4 className="text-base font-semibold text-[#EDEDED] mt-3">{title}</h4>
    <p className="text-xs text-[#888888] mt-1 max-w-md">{description}</p>
  </div>
);
