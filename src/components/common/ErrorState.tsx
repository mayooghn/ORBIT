import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to retrieve intelligence telemetry',
  message = 'A temporary connection timeout occurred while synchronizing with the telemetry gateway.',
  onRetry,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>

      <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
        {title}
      </h4>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
};
