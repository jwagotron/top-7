import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/RoleContext';
import { useAuth } from '@/lib/AuthContext';
import { Shield } from 'lucide-react';
import { MOBILE_NAV_TABS } from '@/lib/roleConfig';

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useRole();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const baseTabs = MOBILE_NAV_TABS[role] || MOBILE_NAV_TABS.athlete;
  // Always show Admin tab for real admins regardless of preview role
  const adminTab = { path: '/admin', label: 'Admin', icon: Shield };
  const tabs = isAdmin && !baseTabs.find(t => t.path === '/admin')
    ? [adminTab, ...baseTabs]
    : baseTabs;

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1.5 text-[10px] font-semibold tracking-wide transition-all duration-150 select-none active:opacity-70',
              active
                ? 'text-sidebar-primary'
                : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-9 h-6 rounded-lg transition-all duration-150 active:scale-90',
              active ? 'bg-sidebar-primary/15 shadow-[0_0_8px_0_hsl(var(--sidebar-primary)/0.3)]' : ''
            )}>
              <Icon className={cn('transition-all duration-200', active ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}