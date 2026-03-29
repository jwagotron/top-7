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

  const handleTab = (path) => {
    if (isActive(path)) {
      // Already on this tab root — reset to root path
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ path, label, icon: Icon }) => (
        <button
          key={path}
          onClick={() => handleTab(path)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors select-none',
            isActive(path)
              ? 'text-sidebar-primary'
              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
          )}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}