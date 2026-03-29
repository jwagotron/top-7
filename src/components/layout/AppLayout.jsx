import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile only */}
      <MobileNav />
    </div>
  );
}