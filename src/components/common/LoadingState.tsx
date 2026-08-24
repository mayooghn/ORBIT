import React from 'react';
import { Loader2, Activity } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading ORBIT foundation...',
  subtext = 'Verifying application and authentication state',
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 ${className}`}
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-sky-500/20 dark:border-sky-500/30 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-t-2 border-sky-400 animate-ping opacity-25" />
      </div>

      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide font-mono">
        {message}
      </h4>
      {subtext && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {subtext}
        </p>
      )}
    </div>
  );
};
