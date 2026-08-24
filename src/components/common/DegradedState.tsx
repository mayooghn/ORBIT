import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DegradedStateProps {
  message?: string;
  className?: string;
}

export const DegradedState: React.FC<DegradedStateProps> = ({
  message = 'Operational data is currently unavailable.',
  className = ''
}) => {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-xs font-medium ${className}`}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
      <span>{message}</span>
    </div>
  );
};
