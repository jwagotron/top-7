import React, { useState, useEffect, useRef } from 'react';
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

  // On role change → always redirect to that role's default home
  const prevRoleRef = useRef(role);
  useEffect(() => {
    // Don't redirect while role is still loading (null)
    if (!role) return;
    const defaultRoute = DEFAULT_ROUTE[role] || '/';
    if (prevRoleRef.current !== role && prevRoleRef.current !== null) {
      prevRoleRef.current = role;
      navigate(defaultRoute, { replace: true });
      return;
    }
    prevRoleRef.current = role;
    // Guard: redirect if current route not allowed for this role
    if (!isRouteAllowed(role, location.pathname)) {
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


      </div>
    </DrawerProvider>
  );
}