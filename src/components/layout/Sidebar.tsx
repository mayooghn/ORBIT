import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NAVIGATION_ROUTES } from '../../config/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  Network,
  GitBranch,
  TrendingUp,
  Database,
  CheckCircle2,
  Bot,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    title: string;
    path: string;
    icon: React.ElementType;
    phaseNumber: number;
  }[];
}

const routeById = new Map(NAVIGATION_ROUTES.map((route) => [route.id, route]));
const navigationItem = (id: string, icon: React.ElementType) => {
  const route = routeById.get(id);
  if (!route) throw new Error(`Navigation route is not configured: ${id}`);
  return { id: route.id, title: route.title, path: route.path, icon, phaseNumber: route.phaseNumber };
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Core Engine',
    items: [
      navigationItem('dashboard', LayoutDashboard),
      navigationItem('network', Network)
    ]
  },
  {
    title: 'Logistics',
    items: [
      navigationItem('reserves', Database)
    ]
  },
  {
    title: 'Intelligence',
    items: [
      navigationItem('assistant', Bot)
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, collapsed, onToggleCollapse }) => {
  const { user } = useAuth();

  return (
    <aside
      className={`relative flex flex-col h-full border-r border-[#1a1a1a] bg-[#000000] text-[#E5E7EB] transition-all duration-200 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-[#666666] font-semibold">
                {section.title}
              </div>
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    title={item.title}
                    className={`orbit-nav-item w-full flex items-center px-3 py-2.5 text-sm rounded-lg cursor-pointer text-left ${
                      isActive
                        ? 'is-active bg-[rgba(249,115,22,0.06)] text-white border border-[rgba(249,115,22,0.15)] font-medium'
                        : 'text-[#999999] hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`orbit-nav-icon w-4 h-4 flex-shrink-0 mr-3 ${
                        isActive ? 'text-orange-400' : 'text-[#666666]'
                      }`}
                    />
                      {!collapsed && (
                        <div className="flex-1 truncate">
                          <span className="truncate">{item.title}</span>
                        </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-[#1a1a1a] bg-[#000000]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-400 flex items-center justify-center text-xs font-bold text-white shadow-xs">
              {(user?.displayName || user?.email || 'O').charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium text-[#EDEDED] truncate">
                {user?.displayName || user?.email || 'Authenticated user'}
              </div>
              <div className="text-[10px] text-[#666666] truncate font-mono">
                Authenticated operator · Session active
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-2 border-t border-[#1a1a1a] flex justify-end bg-[#000000]">
        <button
          id="sidebar-collapse-button"
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-[#666666] hover:text-[#EDEDED] hover:bg-[#0a0a0a] transition-colors w-full flex items-center justify-center cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#666666]">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
