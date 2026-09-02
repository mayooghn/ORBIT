import React, { useEffect, useState } from 'react';
import { UserMenu } from './UserMenu';
import { checkBackendHealth, HealthApiResponse } from '../../services/api';
import { Menu } from 'lucide-react';
import { OrbitLogo } from '../common/OrbitLogo';

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
    <header className="min-h-16 border-b border-[#1a1a1a] bg-[#000000] text-[#E5E7EB] sticky top-0 z-40 px-4 sm:px-8 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            id="mobile-sidebar-toggle"
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md border border-[#252525] hover:bg-[#0a0a0a] text-[#999999] hover:text-white lg:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

          <button
            type="button"
            onClick={() => onNavigate?.('/app/dashboard')}
            className="flex items-center gap-3 rounded-md text-left transition-colors hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 cursor-pointer"
            aria-label="Open ORBIT command overview"
          >
          <OrbitLogo size="md" showWordmark={true} variant="dark" />
          <p className="hidden md:block text-xs text-[#666666] tracking-wide">
            Energy supply-chain intelligence
          </p>
          </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center bg-[#080808] border border-[#252525] rounded px-2.5 py-1 space-x-2 transition-colors hover:border-[#333333]">
          <div className={`w-2 h-2 rounded-full ${serverColor} flex-shrink-0 ${health?.status === 'AVAILABLE' ? 'orbit-status-pulse' : ''}`} />
          <span className="text-xs font-mono text-[#999999] uppercase tracking-wider whitespace-nowrap">
            {serverLabel}
          </span>
        </div>

        <div className="h-5 w-px bg-[#1a1a1a]" />
        <UserMenu />
      </div>
    </header>
  );
};
