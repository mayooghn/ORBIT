import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, LogOut } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const userLabel = user.displayName || user.email || 'Authenticated user';

  return (
    <div className="relative" ref={menuRef}>
      <button
        id="user-menu-button"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg border border-[#252525] hover:border-[#333333] bg-[#080808] transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-orange-600 to-amber-400 text-white flex items-center justify-center text-xs font-bold font-mono">
          {userLabel.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold text-[#EDEDED] line-clamp-1 max-w-[150px]">
            {userLabel}
          </span>
          <span className="text-[10px] text-[#666666] font-mono tracking-tight">Active session</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#252525] bg-[#0a0a0a] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2.5 border-b border-[#1a1a1a] mb-1">
            <p className="text-xs font-bold text-[#EDEDED] line-clamp-1">{userLabel}</p>
            <p className="text-[11px] text-[#666666] font-mono truncate mt-0.5">
              {user.email || 'Email unavailable'}
            </p>
          </div>

          <button
            id="signout-button"
            type="button"
            onClick={async () => {
              setIsOpen(false);
              await signOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
