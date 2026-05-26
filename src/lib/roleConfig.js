import {
  LayoutDashboard, BarChart3,
  Target, ShieldCheck,
  Wifi, Hammer, Settings, Shield, Activity,
  HelpCircle, LogOut, Users, UserCircle, ClipboardList
} from 'lucide-react';

export const NAV_ITEMS = {
  athlete: [
    { path: '/',           label: 'Dashboard',      icon: LayoutDashboard },
    { path: '/analytics',  label: 'Analytics',       icon: BarChart3 },
    { path: '/goals',      label: 'Goals',           icon: Target },
    { path: '/shoes',      label: 'Shoe Tracker',    icon: Activity },
    { path: '/garmin',     label: 'Garmin Connect',  icon: Wifi },
    { path: '/settings',   label: 'Settings',        icon: Settings },
  ],
  coach: [
    { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
    { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
    { path: '/settings',        label: 'Settings',        icon: Settings },
  ],
  admin: [
    { path: '/admin',           label: 'Admin Panel',     icon: Shield },
    { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
    { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
    { path: '/settings',        label: 'Settings',        icon: Settings },
  ],
};

export const MOBILE_NAV_TABS = {
  athlete: [
    { path: '/',           label: 'Dashboard',  icon: LayoutDashboard },
    { path: '/my-plan',    label: 'My Plan',    icon: ClipboardList },
    { path: '/analytics',  label: 'Analytics',  icon: BarChart3 },
    { path: '/settings',   label: 'Settings',   icon: Settings },
  ],
  coach: [
    { path: '/coach',           label: 'Coach',    icon: ShieldCheck },
    { path: '/workout-builder', label: 'Builder',  icon: Hammer },
    { path: '/settings',        label: 'Settings', icon: Settings },
  ],
  admin: [
    { path: '/admin',           label: 'Admin',    icon: Shield },
    { path: '/coach',           label: 'Coach',    icon: ShieldCheck },
    { path: '/settings',        label: 'Settings', icon: Settings },
  ],
};

export const SIDEBAR_MENU = {
  athlete: [
    {
      section: 'NAVIGATION',
      items: [
        { path: '/',           label: 'Dashboard',      icon: LayoutDashboard },
        { path: '/my-plan',    label: 'My Plan',        icon: ClipboardList },
        { path: '/analytics',  label: 'Analytics',      icon: BarChart3 },
        { path: '/goals',      label: 'Goals',          icon: Target },
        { path: '/shoes',          label: 'Shoe Tracker',   icon: Activity },
        { path: '/garmin',         label: 'Garmin Connect', icon: Wifi },
        { path: '/settings',       label: 'Settings',       icon: Settings },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'My Profile',     icon: UserCircle },
        { path: '#help',    label: 'Help & Support', icon: HelpCircle, action: 'help' },
        { path: '#logout',  label: 'Log Out',         icon: LogOut, action: 'logout' },
      ],
    },
  ],
  coach: [
    {
      section: 'NAVIGATION',
      items: [
        { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
        { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
        { path: '/settings',        label: 'Settings',        icon: Settings },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'My Profile',     icon: UserCircle },
        { path: '#help',    label: 'Help & Support', icon: HelpCircle, action: 'help' },
        { path: '#logout',  label: 'Log Out',         icon: LogOut, action: 'logout' },
      ],
    },
  ],
  admin: [
    {
      section: 'NAVIGATION',
      items: [
        { path: '/admin',           label: 'Admin Panel',     icon: Shield },
        { path: '/coach',           label: 'Coach Panel',     icon: ShieldCheck },
        { path: '/workout-builder', label: 'Workout Builder', icon: Hammer },
        { path: '/settings',        label: 'Settings',        icon: Settings },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'My Profile',     icon: UserCircle },
        { path: '#help',    label: 'Help & Support', icon: HelpCircle, action: 'help' },
        { path: '#logout',  label: 'Log Out',         icon: LogOut, action: 'logout' },
      ],
    },
  ],
};

export const DEFAULT_ROUTE = {
  athlete: '/',
  coach: '/coach',
  admin: '/admin',
};

export const ALLOWED_ROUTES = {
  athlete: ['/', '/workouts', '/my-plan', '/activities', '/plans', '/analytics', '/goals', '/shoes', '/garmin', '/settings', '/athlete-profile', '/profile'],
  coach:   ['/coach', '/workout-builder', '/plans', '/settings', '/profile', '/athlete-profile', '/messages'],
  admin:   ['/', '/admin', '/coach', '/workout-builder', '/plans', '/settings', '/athlete-profile', '/activities', '/workouts', '/analytics', '/goals', '/shoes', '/garmin', '/my-plan', '/profile'],
};

export function isRouteAllowed(role, pathname) {
  const allowed = ALLOWED_ROUTES[role] || [];
  return allowed.some(r => r === '/' ? pathname === '/' : pathname.startsWith(r));
}