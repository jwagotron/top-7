import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { DrawerProvider } from '@/lib/DrawerContext';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/RoleContext';
import { DEFAULT_ROUTE, isRouteAllowed } from '@/lib/roleConfig';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect when role changes or route is not allowed for current role
  useEffect(() => {
    if (!role) return;
    const allowed = isRouteAllowed(role, location.pathname);
    const defaultRoute = DEFAULT_ROUTE[role] || '/';

    console.log(`[RoleGuard] role=${role} route=${location.pathname} allowed=${allowed} mode=${role}`);

    if (!allowed) {
      navigate(defaultRoute, { replace: true });
    }
  }, [role, location.pathname]);

  return (
    <DrawerProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>

        {/* Mobile slide-out drawer */}
        <MobileDrawer />

        <main
          className={cn(
            "transition-all duration-300 min-h-screen overflow-x-hidden pb-20 lg:pb-0",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
          )}
        >
          <Outlet />
        </main>

        {/* Bottom tab bar — mobile only */}
        <MobileNav />

        {/* Debug role badge — below header, non-overlapping */}
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-mono font-medium backdrop-blur-sm select-none whitespace-nowrap opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
            {role}
          </span>
        </div>
      </div>
    </DrawerProvider>
  );
}