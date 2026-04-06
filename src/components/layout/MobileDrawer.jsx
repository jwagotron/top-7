import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Dumbbell, Calendar, Settings,
  History, BarChart3, Target, MessageSquare,
  Activity, Wifi, Hammer, ShieldCheck, Shield,
  X, LogOut, HelpCircle, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useDrawer } from '@/lib/DrawerContext';
import { base44 } from '@/api/base44Client';

const mainNav = [
  { path: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { path: '/workouts', label: 'Runs',      icon: Dumbbell },
  { path: '/plans',    label: 'Plans',     icon: Calendar },
  { path: '/settings', label: 'Settings',  icon: Settings },
];

const toolsNav = [
  { path: '/activities',      label: 'Activity History', icon: History },
  { path: '/analytics',       label: 'Analytics',        icon: BarChart3 },
  { path: '/goals',           label: 'Goals',            icon: Target },
  { path: '/messages',        label: 'Messages',         icon: MessageSquare },
  { path: '/shoes',           label: 'Shoe Tracker',     icon: Activity },
  { path: '/garmin',          label: 'Garmin Connect',   icon: Wifi },
];

const coachNav = [
  { path: '/coach',           label: 'Coach Panel',      icon: ShieldCheck },
  { path: '/workout-builder', label: 'Workout Builder',  icon: Hammer },
];

const adminNav = [
  { path: '/admin',           label: 'Admin Panel',      icon: Shield },
];

function DrawerLink({ path, label, icon: Icon, onClick }) {
  const location = useLocation();
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {label}
    </Link>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 px-3 pt-4 pb-1">
      {children}
    </p>
  );
}

export default function MobileDrawer() {
  const { open, close } = useDrawer();
  const { user } = useAuth();
  const isCoachOrAdmin = user?.role === 'admin' || user?.role === 'coach';

  const handleLogout = () => {
    close();
    base44.auth.logout();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'lg:hidden fixed left-0 top-0 h-full z-50 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out shadow-2xl',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: 'min(80vw, 300px)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-sidebar-border shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '4rem' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
              <img
                src="https://media.base44.com/images/public/69c32a03dfe10b4cd6245abe/cbf2fa9c6_image.png"
                alt="Top 7"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-base text-sidebar-primary-foreground tracking-tight">Top 7</span>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-3 px-3">

          {/* User profile */}
          {user && (
            <Link
              to="/athlete-profile"
              onClick={close}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sidebar-accent transition-colors mb-2"
            >
              <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-sidebar-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.full_name || 'Athlete'}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
              </div>
            </Link>
          )}

          <div className="h-px bg-sidebar-border my-2" />

          {/* Main nav */}
          <SectionLabel>Navigation</SectionLabel>
          <div className="space-y-0.5">
            {mainNav.map(item => (
              <DrawerLink key={item.path} {...item} onClick={close} />
            ))}
          </div>

          {/* Tools */}
          <SectionLabel>Tools</SectionLabel>
          <div className="space-y-0.5">
            {toolsNav.map(item => (
              <DrawerLink key={item.path} {...item} onClick={close} />
            ))}
          </div>

          {/* Coach */}
          {isCoachOrAdmin && (
            <>
              <SectionLabel>Coaching</SectionLabel>
              <div className="space-y-0.5">
                {coachNav.map(item => (
                  <DrawerLink key={item.path} {...item} onClick={close} />
                ))}
              </div>
            </>
          )}

          {/* Admin */}
          {user?.role === 'admin' && (
            <>
              <SectionLabel>Admin</SectionLabel>
              <div className="space-y-0.5">
                {adminNav.map(item => (
                  <DrawerLink key={item.path} {...item} onClick={close} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-3 py-3 border-t border-sidebar-border space-y-0.5 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <a
            href="mailto:support@top7.app"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            onClick={close}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            Help & Support
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}