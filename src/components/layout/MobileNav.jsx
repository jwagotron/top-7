import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Dumbbell, Calendar, Settings,
  MoreHorizontal, History, BarChart3, Target, MessageSquare,
  Activity, Wifi, Hammer, ShieldCheck, Shield, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const mainTabs = [
  { path: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { path: '/workouts', label: 'Runs',      icon: Dumbbell },
  { path: '/plans',    label: 'Plans',     icon: Calendar },
  { path: '/settings', label: 'Settings',  icon: Settings },
];

const moreItems = [
  { path: '/activities',      label: 'Activity History', icon: History },
  { path: '/analytics',       label: 'Analytics',        icon: BarChart3 },
  { path: '/goals',           label: 'Goals',            icon: Target },
  { path: '/messages',        label: 'Messages',         icon: MessageSquare },
  { path: '/shoes',           label: 'Shoe Tracker',     icon: Activity },
  { path: '/garmin',          label: 'Garmin Connect',   icon: Wifi },
];

const coachMoreItems = [
  { path: '/coach',           label: 'Coach Panel',      icon: ShieldCheck },
  { path: '/workout-builder', label: 'Workout Builder',  icon: Hammer },
];

const adminMoreItems = [
  { path: '/admin',           label: 'Admin Panel',      icon: Shield },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const isMoreActive = [...moreItems, ...coachMoreItems, ...adminMoreItems].some(
    item => isActive(item.path)
  );

  const handleTab = (path) => {
    if (isActive(path)) {
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  };

  const handleMoreItem = (path) => {
    setShowMore(false);
    navigate(path);
  };

  const isCoachOrAdmin = user?.role === 'admin' || user?.role === 'coach';

  const allMoreItems = [
    ...moreItems,
    ...(isCoachOrAdmin ? coachMoreItems : []),
    ...(user?.role === 'admin' ? adminMoreItems : []),
  ];

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={cn(
          'lg:hidden fixed left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border transition-transform duration-300 rounded-t-2xl',
          showMore ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          bottom: `calc(env(safe-area-inset-bottom) + 56px)`,
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
          <span className="text-sm font-semibold text-sidebar-foreground">More</span>
          <button onClick={() => setShowMore(false)} className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-px p-3" style={{ paddingBottom: '8px' }}>
          {allMoreItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => handleMoreItem(path)}
              className={cn(
                'flex flex-col items-center justify-center py-3 px-2 rounded-xl gap-1.5 text-[11px] font-medium transition-colors',
                isActive(path)
                  ? 'bg-sidebar-primary/20 text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mainTabs.map(({ path, label, icon: Icon }) => (
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

        {/* More tab */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors select-none',
            (showMore || isMoreActive)
              ? 'text-sidebar-primary'
              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          More
        </button>
      </nav>
    </>
  );
}