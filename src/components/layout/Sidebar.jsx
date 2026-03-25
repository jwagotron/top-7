import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Dumbbell, Calendar, BarChart3, 
  Target, MessageSquare, ChevronLeft, ChevronRight, Activity, ShieldCheck,
  History, Wifi, Hammer, Settings, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const athleteItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/workouts', label: 'My Runs', icon: Dumbbell },
  { path: '/activities', label: 'Activity History', icon: History },
  { path: '/plans', label: 'Training Plans', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/shoes', label: 'Shoe Tracker', icon: Activity },
  { path: '/garmin', label: 'Garmin Connect', icon: Wifi },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const coachItems = [
  { path: '/coach', label: 'Coach Panel', icon: ShieldCheck },
  { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
];

const adminItems = [
  { path: '/admin', label: 'Admin Panel', icon: Shield },
];

function NavLink({ path, label, icon: Icon, collapsed, isActive }) {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
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

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const isCoachOrAdmin = user?.role === 'admin' || user?.role === 'coach';

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-[72px]" : "w-[240px]"
    )}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-sidebar-primary-foreground tracking-tight">EnduroFlow</span>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {athleteItems.map(item => (
          <NavLink key={item.path} {...item} collapsed={collapsed} isActive={isActive(item.path)} />
        ))}

        {isCoachOrAdmin && (
          <>
            {!collapsed && <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 px-3 pt-3 pb-1">Coaching</p>}
            {collapsed && <div className="h-px bg-sidebar-border my-2" />}
            {coachItems.map(item => (
              <NavLink key={item.path} {...item} collapsed={collapsed} isActive={isActive(item.path)} />
            ))}
          </>
        )}

        {user?.role === 'admin' && (
          <>
            {!collapsed && <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 px-3 pt-3 pb-1">Admin</p>}
            {adminItems.map(item => (
              <NavLink key={item.path} {...item} collapsed={collapsed} isActive={isActive(item.path)} />
            ))}
          </>
        )}
      </nav>

      <button
        onClick={onToggle}
        className="mx-3 mb-4 p-2.5 rounded-lg hover:bg-sidebar-accent transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}