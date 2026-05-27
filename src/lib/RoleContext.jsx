import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const VALID_ROLES = ['athlete', 'coach', 'admin'];
const LOCAL_ROLE_KEY = 'app_local_role';

export function getLocalRole() {
  return localStorage.getItem(LOCAL_ROLE_KEY) || null;
}
export function setLocalRole(role) {
  if (VALID_ROLES.includes(role)) localStorage.setItem(LOCAL_ROLE_KEY, role);
  else localStorage.removeItem(LOCAL_ROLE_KEY);
}

const RoleContext = createContext();

// Emails that can preview-switch between athlete and coach
const PREVIEW_EMAILS = ['dan@stratagemims.com', 'jwagone987@gmail.com'];

const DEFAULT_ROUTE = { athlete: '/', coach: '/coach' };

export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [previewRole, setPreviewRole] = useState(null); // 'athlete' | 'coach' | null

  const canPreview = user && PREVIEW_EMAILS.includes(user.email);

  const role = useMemo(() => {
    if (!user) return getLocalRole(); // local/test fallback
    if (canPreview && previewRole) return previewRole;
    if (user.role === 'admin') return 'admin';
    // Only accept known valid roles — reject 'No role', 'not set', etc.
    const t = user.user_type;
    if (VALID_ROLES.includes(t)) return t;
    // Fall back to localStorage for local/Playwright testing
    return getLocalRole();
  }, [user, canPreview, previewRole]);

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