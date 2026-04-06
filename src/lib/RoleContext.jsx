import React, { createContext, useContext, useState, useEffect } from 'react';

const ROLE_KEY = 'top7_user_role';
const VALID_ROLES = ['athlete', 'coach', 'admin'];

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    return VALID_ROLES.includes(saved) ? saved : null;
  });

  const setRole = (newRole) => {
    if (!VALID_ROLES.includes(newRole)) return;
    localStorage.setItem(ROLE_KEY, newRole);
    setRoleState(newRole);
  };

  const clearRole = () => {
    localStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}