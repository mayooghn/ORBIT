import React, { useEffect, useState } from 'react';
import { UserMenu } from './UserMenu';
import { checkBackendHealth, HealthApiResponse } from '../../services/api';
import { Menu } from 'lucide-react';

interface TopBarProps {
  onToggleSidebar?: () => void;
  onNavigate?: (path: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onNavigate }) => {
  const [health, setHealth] = useState<HealthApiResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    void checkBackendHealth().then((response) => {
      if (isMounted) setHealth(response);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const serverLabel = health === null
    ? 'CHECKING SERVER'
    : health.status === 'AVAILABLE'
      ? 'SERVER AVAILABLE'
      : 'SERVER UNAVAILABLE';

  const serverColor = health?.status === 'AVAILABLE'
    ? 'bg-emerald-500'
    : health?.status === 'UNAVAILABLE'
      ? 'bg-red-500'
      : 'bg-amber-500';

  return (
    <header className="min-h-16 border-b border-[#222222] bg-[#0D0D0D] text-[#E5E7EB] sticky top-0 z-40 px-4 sm:px-8 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            id="mobile-sidebar-toggle"
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md border border-[#333333] hover:bg-[#1A1A1A] text-[#999999] hover:text-white lg:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

          <button
            type="button"
            onClick={() => onNavigate?.('/app/dashboard')}
            className="flex items-center rounded-md text-left transition-colors hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 cursor-pointer"
            aria-label="Open ORBIT command overview"
          >
          <div className="w-8 h-8 bg-orange-500 rounded-sm flex items-center justify-center mr-3 shadow-xs">
            <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-xl text-[#EDEDED]">ORBIT</span>
            </div>
            <p className="hidden md:block text-xs text-[#666666] tracking-wide">
              Energy supply-chain intelligence
            </p>
          </div>
          </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1 space-x-2">
          <div className={`w-2 h-2 rounded-full ${serverColor} flex-shrink-0`} />
          <span className="text-xs font-mono text-[#999999] uppercase tracking-wider whitespace-nowrap">
            {serverLabel}
          </span>
        </div>

        <div className="h-5 w-px bg-[#222222]" />
        <UserMenu />
      </div>
    </header>
  );
};
