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

// Emails that can preview-switch between athlete and coach
const PREVIEW_EMAILS = ['dan@stratagemims.com', 'jwagone987@gmail.com'];

const DEFAULT_ROUTE = { athlete: '/', coach: '/coach' };

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

  const canPreview = user && PREVIEW_EMAILS.includes(user.email);

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
    setPreviewRole(r => {
      const next = r === 'athlete' ? 'coach' : 'athlete';
      // Navigate to the default route for the new role
      if (navigate) navigate(DEFAULT_ROUTE[next] || '/');
      return next;
    });
  };

  // Initialize preview role on first canPreview render
  React.useEffect(() => {
    if (canPreview && !previewRole) setPreviewRole('athlete');
  }, [canPreview]);

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