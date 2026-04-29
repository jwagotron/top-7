import React, { createContext, useContext, useState, useEffect } from 'react';

const UserImpersonationContext = createContext();

export function UserImpersonationProvider({ children }) {
  const [impersonatedUser, setImpersonatedUser] = useState(() => {
    const stored = localStorage.getItem('impersonated_user');
    return stored ? JSON.parse(stored) : null;
  });

  const setImpersonate = (user) => {
    if (user) {
      localStorage.setItem('impersonated_user', JSON.stringify(user));
      setImpersonatedUser(user);
    } else {
      localStorage.removeItem('impersonated_user');
      setImpersonatedUser(null);
    }
  };

  return (
    <UserImpersonationContext.Provider value={{ impersonatedUser, setImpersonate }}>
      {children}
    </UserImpersonationContext.Provider>
  );
}

export function useUserImpersonation() {
  return useContext(UserImpersonationContext);
}