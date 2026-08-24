import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPath,
  onNavigate,
  children
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-[#E5E7EB] selection:bg-orange-500/30">
      {/* Top Header */}
      <TopBar onToggleSidebar={() => setMobileOpen(!mobileOpen)} onNavigate={onNavigate} />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar
            currentPath={currentPath}
            onNavigate={onNavigate}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* Mobile / Tablet Drawer Sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0D0D0D] border-r border-[#222222] z-50">
              <Sidebar
                currentPath={currentPath}
                onNavigate={(path) => {
                  onNavigate(path);
                  setMobileOpen(false);
                }}
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content View Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>

          {/* Foundation Status Footer */}
          <footer className="mt-auto min-h-10 border-t border-[#222222] bg-[#0F0F0F] flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 sm:px-8 py-2 text-xs text-[#555555] font-mono">
            <div className="flex items-center space-x-6">
              <span>ORBIT SYSTEM</span>
              <span className="hidden sm:inline">OPERATIONAL DATA :: NOT CONNECTED</span>
              <span className="hidden md:inline">LOCAL SERVER :: PORT 3000</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-orange-500/80"></span>
              <span className="text-[#777777]">SYSTEM READY</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
