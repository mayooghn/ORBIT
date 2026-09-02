import React from 'react';
import { Loader2 } from 'lucide-react';

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
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-[#252525] bg-[#060606] ${className}`}
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-t-2 border-orange-400/40 animate-ping" />
      </div>

      <h4 className="text-sm font-semibold text-[#EDEDED] tracking-wide font-mono">
        {message}
      </h4>
      {subtext && (
        <p className="text-xs text-[#666666] mt-1 max-w-sm">
          {subtext}
        </p>
      )}
    </div>
  );
};
