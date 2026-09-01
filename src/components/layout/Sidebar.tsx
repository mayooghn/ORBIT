import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NAVIGATION_ROUTES } from '../../config/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  Network,
  GitBranch,
  TrendingUp,
  ShoppingCart,
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
      navigationItem('procurement', ShoppingCart),
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
      className={`relative flex flex-col h-full border-r border-[#222222] bg-[#0D0D0D] text-[#E5E7EB] transition-all duration-200 z-30 ${
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
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#1A1A1A] text-white border border-[#333333] font-medium'
                        : 'text-[#999999] hover:text-white hover:bg-[#151515] border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 mr-3 transition-opacity ${
                        isActive ? 'text-orange-400 opacity-100' : 'opacity-60 group-hover:opacity-80'
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
        <div className="p-4 border-t border-[#222222] bg-[#0F0F0F]">
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

      <div className="p-2 border-t border-[#222222] flex justify-end bg-[#0D0D0D]">
        <button
          id="sidebar-collapse-button"
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-[#666666] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors w-full flex items-center justify-center cursor-pointer"
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
