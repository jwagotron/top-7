import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { DrawerProvider } from '@/lib/DrawerContext';
import { cn } from '@/lib/utils';

export default function AppLayout({ children, persistent = false }) {
  const [collapsed, setCollapsed] = useState(false);

  if (persistent) {
    // Persistent tab shell: fixed viewport, each tab scrolls independently
    return (
      <DrawerProvider>
        <div className="fixed inset-0 bg-background overflow-hidden">
          <div className="hidden lg:block">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          </div>
          <MobileDrawer />
          <main
            className={cn(
              "absolute inset-0 transition-all duration-300 overflow-hidden",
              /* mobile: reserve space for bottom nav (~56px) + safe area */
              "bottom-14 lg:bottom-0",
              collapsed ? "lg:left-[72px]" : "lg:left-[240px]"
            )}
          >
            {children}
          </main>
          <MobileNav />
        </div>
      </DrawerProvider>
    );
  }

  // Normal (non-persistent) layout: full page scroll
  return (
    <DrawerProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="hidden lg:block">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
        <MobileDrawer />
        <main
          className={cn(
            "transition-all duration-300 min-h-screen overflow-x-hidden pb-20 lg:pb-0",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
          )}
        >
          {children ?? <Outlet />}
        </main>
        <MobileNav />
      </div>
    </DrawerProvider>
  );
}