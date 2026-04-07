import {
  LayoutDashboard, Dumbbell, Calendar, BarChart3,
  Target, MessageSquare, ShieldCheck, History,
  Wifi, Hammer, Settings, Shield, Activity, Users
} from 'lucide-react';

// Nav items per role
export const NAV_ITEMS = {
  athlete: [
    { path: '/',           label: 'Dashboard',        icon: LayoutDashboard },
    { path: '/workouts',   label: 'My Runs',           icon: Dumbbell },
    { path: '/activities', label: 'Activity History',  icon: History },
    { path: '/plans',      label: 'Training Plans',    icon: Calendar },
    { path: '/analytics',  label: 'Analytics',         icon: BarChart3 },
    { path: '/goals',      label: 'Goals',             icon: Target },
    { path: '/messages',   label: 'Messages',          icon: MessageSquare },
    { path: '/shoes',      label: 'Shoe Tracker',      icon: Activity },
    { path: '/garmin',     label: 'Garmin Connect',    icon: Wifi },
    { path: '/settings',   label: 'Settings',          icon: Settings },
  ],
  coach: [
    { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
    { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
    { path: '/plans',           label: 'Training Plans',  icon: Calendar },
    { path: '/messages',        label: 'Messages',        icon: MessageSquare },
    { path: '/athlete-profile', label: 'My Profile',      icon: Users },
    { path: '/settings',        label: 'Settings',        icon: Settings },
  ],
  admin: [
    { path: '/admin',           label: 'Admin Panel',     icon: Shield },
    { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
    { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
    { path: '/plans',           label: 'Training Plans',  icon: Calendar },
    { path: '/messages',        label: 'Messages',        icon: MessageSquare },
    { path: '/settings',        label: 'Settings',        icon: Settings },
  ],
};

// Bottom mobile nav tabs per role
export const MOBILE_NAV_TABS = {
  athlete: [
    { path: '/',         label: 'Dashboard', icon: LayoutDashboard },
    { path: '/workouts', label: 'Runs',      icon: Dumbbell },
    { path: '/plans',    label: 'Plans',     icon: Calendar },
    { path: '/settings', label: 'Settings',  icon: Settings },
  ],
  coach: [
    { path: '/coach',           label: 'Coach',   icon: ShieldCheck },
    { path: '/workout-builder', label: 'Builder', icon: Hammer },
    { path: '/plans',           label: 'Plans',   icon: Calendar },
    { path: '/messages',        label: 'Messages',icon: MessageSquare },
    { path: '/settings',        label: 'Settings',icon: Settings },
  ],
  admin: [
    { path: '/admin',           label: 'Admin',   icon: Shield },
    { path: '/coach',           label: 'Coach',   icon: ShieldCheck },
    { path: '/plans',           label: 'Plans',   icon: Calendar },
    { path: '/messages',        label: 'Messages',icon: MessageSquare },
    { path: '/settings',        label: 'Settings',icon: Settings },
  ],
};

// Default landing route per role
export const DEFAULT_ROUTE = {
  athlete: '/',
  coach: '/coach',
  admin: '/admin',
};

// Routes accessible per role (everything not in this list is blocked)
export const ALLOWED_ROUTES = {
  athlete: ['/', '/workouts', '/activities', '/plans', '/analytics', '/goals', '/messages', '/shoes', '/garmin', '/settings', '/athlete-profile'],
  coach:   ['/coach', '/workout-builder', '/plans', '/messages', '/settings', '/athlete-profile'],
  admin:   ['/admin', '/coach', '/workout-builder', '/plans', '/messages', '/settings', '/athlete-profile', '/activities'],
};

export function isRouteAllowed(role, pathname) {
  const allowed = ALLOWED_ROUTES[role] || [];
  return allowed.some(r => r === '/' ? pathname === '/' : pathname.startsWith(r));
}