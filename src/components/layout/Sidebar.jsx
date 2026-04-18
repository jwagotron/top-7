import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/RoleContext';
import { useAuth } from '@/lib/AuthContext';
import { SIDEBAR_MENU } from '@/lib/roleConfig';

function NavLink({ path, label, icon: Icon, collapsed, isActive }) {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.97] active:opacity-80",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}

function MenuSection({ section, collapsed, isActive, onAction }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Section Header */}
      {!collapsed && (
        <h3 className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40">
          {section.section}
        </h3>
      )}
      
      {/* Section Items Container */}
      <div className="px-2 space-y-1">
        {section.items.map(item => (
          item.action ? (
            <button
              key={item.path}
              onClick={() => onAction(item.action)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.97] active:opacity-80",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium text-left">{item.label}</span>}
            </button>
          ) : (
            <NavLink
              key={item.path}
              {...item}
              collapsed={collapsed}
              isActive={isActive(item.path)}
            />
          )
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { role } = useRole();
  const { logout } = useAuth();
  
  const sidebarMenu = SIDEBAR_MENU[role] || SIDEBAR_MENU.athlete;

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleAction = (action) => {
    if (action === 'logout') {
      logout();
    } else if (action === 'help') {
      window.open('mailto:support@example.com', '_blank');
    }
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-[72px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
          <img
            src="https://media.base44.com/images/public/69c32a03dfe10b4cd6245abe/cbf2fa9c6_image.png"
            alt="Top 7"
            className="w-full h-full object-cover"
          />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-sidebar-primary-foreground tracking-tight">Top 7</span>
        )}
      </div>

      {/* Role label */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-sidebar-border/50">
          <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold capitalize">
            {role} mode
          </span>
        </div>
      )}

      {/* Menu Sections */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {sidebarMenu.map((section, idx) => (
          <MenuSection
            key={idx}
            section={section}
            collapsed={collapsed}
            isActive={isActive}
            onAction={handleAction}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="mx-3 mb-4 p-2.5 rounded-lg hover:bg-sidebar-accent transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}