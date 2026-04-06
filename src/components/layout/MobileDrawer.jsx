import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Dumbbell, Calendar, Settings,
  History, BarChart3, Target, MessageSquare,
  Activity, Wifi, Hammer, ShieldCheck, Shield,
  X, LogOut, HelpCircle, ChevronRight
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
        'group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]',
        isActive
          ? 'bg-sidebar-primary/90 text-white shadow-lg shadow-sidebar-primary/20'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200',
        isActive
          ? 'bg-white/20'
          : 'bg-sidebar-accent/60 group-hover:bg-sidebar-accent'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 leading-none">{label}</span>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
    </Link>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-5 pb-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/30">
        {children}
      </span>
      <div className="flex-1 h-px bg-sidebar-border/50" />
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
          'lg:hidden fixed inset-0 z-50 transition-all duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: open ? 'blur(2px)' : 'none' }}
        onClick={close}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'lg:hidden fixed left-0 top-0 h-full z-[60] bg-sidebar flex flex-col',
          'transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
          'shadow-[4px_0_40px_rgba(0,0,0,0.4)]',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: 'min(82vw, 310px)' }}
      >
        {/* Branding header */}
        <div
          className="flex items-center justify-between px-5 shrink-0 border-b border-sidebar-border/60"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '4rem' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-md">
              <img
                src="https://media.base44.com/images/public/69c32a03dfe10b4cd6245abe/cbf2fa9c6_image.png"
                alt="Top 7"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-[15px] text-sidebar-foreground tracking-tight">Top 7</span>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">

          {/* User card */}
          {user && (
            <Link
              to="/athlete-profile"
              onClick={close}
              className="group flex items-center gap-3.5 mx-0 mt-4 mb-1 px-3 py-3.5 rounded-2xl bg-sidebar-accent/40 hover:bg-sidebar-accent transition-all duration-200 active:scale-[0.98]"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sidebar-primary/60 to-sidebar-primary flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-md">
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {user.full_name || 'Athlete'}
                </p>
                <p className="text-xs text-sidebar-foreground/45 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors shrink-0" />
            </Link>
          )}

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

          {/* Spacer before footer items in scroll area */}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div
          className="px-3 pt-2 border-t border-sidebar-border/60 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <a
            href="mailto:support@top7.app"
            onClick={close}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent/60 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            Help & Support
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}