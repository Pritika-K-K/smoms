import React from 'react';
import { LucideIcon, X } from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

interface SidebarProps {
  navItems: SidebarNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  title: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeTab,
  onTabChange,
  title,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation Menu</p>
          <h2 className="text-sm font-bold text-slate-800 mt-0.5">{title}</h2>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 md:py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-500">SMOMS v1.0</p>
        <p>Smart Operations Portal</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col min-h-[calc(100vh-4rem)] flex-shrink-0">
        {content}
      </aside>

      {/* Mobile Off-Canvas Drawer Backdrop & Container */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Slide-over */}
          <div className="relative flex-1 max-w-xs w-full bg-white h-full shadow-2xl z-10 flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
