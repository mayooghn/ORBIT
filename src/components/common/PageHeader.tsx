import React from 'react';
import { StatusBadge } from './StatusBadge';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeLevel?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  badgeLevel = 'NOT_CONNECTED',
  actions
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDED]">
            {title}
          </h1>
          {badgeText && (
            <StatusBadge level={badgeLevel} label={badgeText} size="sm" />
          )}
        </div>
        <p className="text-sm sm:text-base text-[#999999] mt-2 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
