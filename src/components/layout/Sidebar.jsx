import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Repeat2, Shield } from 'lucide-react';
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

function MenuSection({ section, collapsed, isActive, onAction, isLast }) {
  return (
    <div className="flex flex-col">
      {/* Section Container with background */}
      <div className="px-3 py-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/40">
        {/* Section Header */}
        {!collapsed && (
          <h3 className="px-2 pb-3 text-[10px] uppercase tracking-widest font-bold text-sidebar-foreground/60">
            {section.section}
          </h3>
        )}
        
        {/* Section Items */}
        <div className={cn("space-y-1", !collapsed && "pl-1")}>
          {section.items.map(item => (
            item.action ? (
              <button
                key={item.path}
                onClick={() => onAction(item.action)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 active:scale-[0.97] active:opacity-80",
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

      {/* Divider between sections */}
      {!isLast && !collapsed && (
        <div className="my-4 mx-3 border-t border-sidebar-border/50" />
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { role, canPreview, previewRole, togglePreviewRole } = useRole();
  const { logout, user } = useAuth();
  
  const sidebarMenu = SIDEBAR_MENU[role] || SIDEBAR_MENU.athlete;
  const isAdmin = user?.role === 'admin';

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

      {/* Role label + preview toggle */}
      <div className={cn("border-b border-sidebar-border/50", collapsed ? "px-2 py-2" : "px-4 py-2")}>
        {!collapsed && (
          <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold capitalize block mb-1">
            {user?.role === 'admin' ? 'admin' : (user?.user_type || role || 'athlete')} mode
          </span>
        )}
        {canPreview && (
          <button
            onClick={togglePreviewRole}
            title={`Switch to ${previewRole === 'athlete' ? 'coach' : 'athlete'} view`}
            className={cn(
              "flex items-center gap-2 rounded-lg transition-colors",
              "bg-sidebar-primary/20 hover:bg-sidebar-primary/30 text-sidebar-primary",
              collapsed ? "w-full justify-center p-2" : "px-2.5 py-1.5 w-full"
            )}
          >
            <Repeat2 className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && (
              <span className="text-[11px] font-semibold">
                Switch to {previewRole === 'athlete' ? 'Coach' : 'Athlete'}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Menu Sections — Rendered Explicitly */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* NAVIGATION Section */}
        <MenuSection
          section={sidebarMenu[0]}
          collapsed={collapsed}
          isActive={isActive}
          onAction={handleAction}
          isLast={false}
        />

        {/* ACCOUNT Section */}
        <MenuSection
          section={sidebarMenu[1]}
          collapsed={collapsed}
          isActive={isActive}
          onAction={handleAction}
          isLast={true}
        />
      </nav>

      {/* Admin Panel Button — only visible to real admins */}
      {isAdmin && (
        <div className="px-3 pb-2">
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 border",
              isActive('/admin')
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive border-sidebar-border/40"
            )}
          >
            <Shield className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Admin Panel</span>}
          </Link>
        </div>
      )}

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