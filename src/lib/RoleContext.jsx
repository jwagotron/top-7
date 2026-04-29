import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const RoleContext = createContext();

// Emails that can preview-switch between athlete and coach
const PREVIEW_EMAILS = ['dan@stratagemims.com', 'jwagone987@gmail.com'];

export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [previewRole, setPreviewRole] = useState(null); // 'athlete' | 'coach' | null

  const canPreview = user && PREVIEW_EMAILS.includes(user.email);

  const role = useMemo(() => {
    if (!user) return null;
    if (canPreview && previewRole) return previewRole;
    if (user.role === 'admin') return 'admin';
    return user.user_type || null;
  }, [user, canPreview, previewRole]);

  const togglePreviewRole = () => {
    setPreviewRole(r => (r === 'athlete' ? 'coach' : 'athlete'));
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