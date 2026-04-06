import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { path: '/workouts', label: 'Runs',      icon: Dumbbell },
  { path: '/plans',    label: 'Plans',     icon: Calendar },
  { path: '/settings', label: 'Settings',  icon: Settings },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

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
              'flex-1 flex flex-col items-center justify-center py-3 gap-1.5 text-[10px] font-semibold tracking-wide transition-all duration-200 select-none',
              active
                ? 'text-sidebar-primary'
                : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-9 h-6 rounded-lg transition-all duration-200',
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