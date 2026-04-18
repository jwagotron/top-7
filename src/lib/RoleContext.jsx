import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';

const RoleContext = createContext();

/**
 * RoleProvider — derives the user's role from their permanent DB user_type.
 * Admins (user.role === 'admin') always get 'admin'.
 * No localStorage, no manual switching.
 */
export function RoleProvider({ children }) {
  const { user } = useAuth();

  const role = useMemo(() => {
    if (!user) return null;
    if (user.role === 'admin') return 'admin';
    return user.user_type || null; // 'athlete' | 'coach' | null (not set yet)
  }, [user]);

  return (
    <RoleContext.Provider value={{ role }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}