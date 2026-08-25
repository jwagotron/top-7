import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

const VALID_ROLES = ['athlete', 'coach', 'admin'];
const LOCAL_ROLE_KEY = 'app_local_role';
const ROLE_CHANGE_EVENT = 'app:role-changed';

export function getLocalRole() {
  return localStorage.getItem(LOCAL_ROLE_KEY) || null;
}

// Sets role in localStorage AND dispatches an event so RoleProvider state updates reactively
export function setLocalRole(role) {
  if (VALID_ROLES.includes(role)) {
    localStorage.setItem(LOCAL_ROLE_KEY, role);
  } else {
    localStorage.removeItem(LOCAL_ROLE_KEY);
  }
  window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
}

const RoleContext = createContext();

const DEFAULT_ROUTE = { athlete: '/', coach: '/coach', admin: '/admin' };

export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [previewRole, setPreviewRole] = useState(null); // 'athlete' | 'coach' | null
  // Reactive localStorage role — updates whenever setLocalRole() is called
  const [localRole, setLocalRoleState] = useState(() => getLocalRole());

  useEffect(() => {
    const sync = () => setLocalRoleState(getLocalRole());
    window.addEventListener(ROLE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ROLE_CHANGE_EVENT, sync);
  }, []);

  // Previewing another role is an admin capability, not an email allowlist.
  const canPreview = user?.role === 'admin';

  const role = useMemo(() => {
    if (!user) return localRole; // local/test fallback — reactive
    if (canPreview && previewRole) return previewRole;
    if (user.role === 'admin') return 'admin';
    // Only accept known valid roles — reject 'No role', 'not set', empty string, etc.
    const t = user.user_type;
    if (VALID_ROLES.includes(t)) return t;
    // Authenticated but no valid user_type — fall back to localStorage
    return localRole;
  }, [user, canPreview, previewRole, localRole]);



  const togglePreviewRole = (navigate) => {
    if (!canPreview) return;
    setPreviewRole(current => {
      // Admin is the default state (null). Cycle through the two product views,
      // then return cleanly to the real Admin role.
      const next = current === null ? 'athlete' : current === 'athlete' ? 'coach' : null;
      const routeRole = next || 'admin';
      if (navigate) navigate(DEFAULT_ROUTE[routeRole] || '/');
      return next;
    });
  };

  return (
    <RoleContext.Provider value={{ role, canPreview, previewRole, togglePreviewRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}