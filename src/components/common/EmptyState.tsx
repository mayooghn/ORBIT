import React from 'react';
import { LucideIcon, ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No verified data available',
  description = 'This module has no connected operational data source yet.',
  icon: Icon = ShieldCheck,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center rounded-xl border border-[#1a1a1a] bg-[#060606] ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#0f0f0f] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#555555]" />
      </div>

      <h4 className="text-base font-semibold text-[#EDEDED]">
        {title}
      </h4>
      <p className="text-xs text-[#666666] mt-1 max-w-md">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
