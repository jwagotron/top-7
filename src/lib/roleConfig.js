import {
  LayoutDashboard, Dumbbell, Calendar, BarChart3,
  Target, MessageSquare, ShieldCheck, History,
  Wifi, Hammer, Settings, Shield, Activity, Users,
  HelpCircle, LogOut
} from 'lucide-react';

// Nav items per role
export const NAV_ITEMS = {
  athlete: [
    { path: '/',           label: 'Dashboard',        icon: LayoutDashboard },
    { path: '/my-plan',    label: 'My Plan',           icon: Calendar },
    { path: '/workouts',   label: 'My Runs',           icon: Dumbbell },
    { path: '/analytics',  label: 'Analytics',         icon: BarChart3 },
    { path: '/goals',      label: 'Goals',             icon: Target },
    { path: '/shoes',      label: 'Shoe Tracker',      icon: Activity },
    { path: '/garmin',     label: 'Garmin Connect',    icon: Wifi },
    { path: '/settings',   label: 'Settings',          icon: Settings },
  ],
  coach: [
    { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
    { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
    { path: '/plans',           label: 'Training Plans',  icon: Calendar },
    { path: '/athlete-profile', label: 'My Profile',      icon: Users },
    { path: '/settings',        label: 'Settings',        icon: Settings },
  ],
  admin: [
    { path: '/admin',           label: 'Admin Panel',     icon: Shield },
    { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
    { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
    { path: '/plans',           label: 'Training Plans',  icon: Calendar },
    { path: '/settings',        label: 'Settings',        icon: Settings },
  ],
};

// Bottom mobile nav tabs per role (primary actions only)
export const MOBILE_NAV_TABS = {
  athlete: [
    { path: '/',         label: 'Dashboard', icon: LayoutDashboard },
    { path: '/my-plan',  label: 'My Plan',   icon: Calendar },
    { path: '/workouts', label: 'Runs',      icon: Dumbbell },
    { path: '/settings', label: 'Settings',  icon: Settings },
  ],
  coach: [
    { path: '/coach',           label: 'Coach',   icon: ShieldCheck },
    { path: '/workout-builder', label: 'Builder', icon: Hammer },
    { path: '/plans',           label: 'Plans',   icon: Calendar },
    { path: '/settings',        label: 'Settings',icon: Settings },
  ],
  admin: [
    { path: '/admin',           label: 'Admin',   icon: Shield },
    { path: '/coach',           label: 'Coach',   icon: ShieldCheck },
    { path: '/plans',           label: 'Plans',   icon: Calendar },
    { path: '/settings',        label: 'Settings',icon: Settings },
  ],
};

// Complete sidebar menu structure with all sections
export const SIDEBAR_MENU = {
  athlete: [
    {
      section: 'PRIMARY',
      items: [
        { path: '/',           label: 'Dashboard',        icon: LayoutDashboard },
        { path: '/my-plan',    label: 'My Plan',          icon: Calendar },
        { path: '/workouts',   label: 'My Runs',          icon: Dumbbell },
      ],
    },
    {
      section: 'TOOLS',
      items: [
        { path: '/analytics',  label: 'Analytics',        icon: BarChart3 },
        { path: '/goals',      label: 'Goals',            icon: Target },
        { path: '/shoes',      label: 'Shoe Tracker',     icon: Activity },
        { path: '/garmin',     label: 'Garmin Connect',   icon: Wifi },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/settings',   label: 'Settings',         icon: Settings },
        { path: '#help',       label: 'Help & Support',   icon: HelpCircle, action: 'help' },
        { path: '#logout',     label: 'Log Out',          icon: LogOut, action: 'logout' },
      ],
    },
  ],
  coach: [
    {
      section: 'PRIMARY',
      items: [
        { path: '/coach',           label: 'Coach Panel',      icon: ShieldCheck },
        { path: '/workout-builder', label: 'Workout Builder',  icon: Hammer },
        { path: '/plans',           label: 'Training Plans',   icon: Calendar },
      ],
    },
    {
      section: 'TOOLS',
      items: [
        { path: '/athlete-profile', label: 'My Profile',       icon: Users },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/settings',   label: 'Settings',             icon: Settings },
        { path: '#help',       label: 'Help & Support',       icon: HelpCircle, action: 'help' },
        { path: '#logout',     label: 'Log Out',              icon: LogOut, action: 'logout' },
      ],
    },
  ],
  admin: [
    {
      section: 'PRIMARY',
      items: [
        { path: '/admin',           label: 'Admin Panel',      icon: Shield },
        { path: '/coach',           label: 'Coach Panel',      icon: ShieldCheck },
        { path: '/workout-builder', label: 'Workout Builder',  icon: Hammer },
        { path: '/plans',           label: 'Training Plans',   icon: Calendar },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/settings',   label: 'Settings',             icon: Settings },
        { path: '#help',       label: 'Help & Support',       icon: HelpCircle, action: 'help' },
        { path: '#logout',     label: 'Log Out',              icon: LogOut, action: 'logout' },
      ],
    },
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
  athlete: ['/', '/workouts', '/my-plan', '/activities', '/plans', '/analytics', '/goals', '/shoes', '/garmin', '/settings', '/athlete-profile'],
  coach:   ['/coach', '/workout-builder', '/plans', '/settings', '/athlete-profile'],
  admin:   ['/admin', '/coach', '/workout-builder', '/plans', '/settings', '/athlete-profile', '/activities'],
};

export function isRouteAllowed(role, pathname) {
  const allowed = ALLOWED_ROUTES[role] || [];
  return allowed.some(r => r === '/' ? pathname === '/' : pathname.startsWith(r));
}