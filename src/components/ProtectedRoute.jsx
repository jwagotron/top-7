import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center flex-col gap-3">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    <p className="text-xs text-muted-foreground">Checking session…</p>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authError, user } = useAuth();
  const { role } = useRole();

  // Comprehensive diagnostic logging for Android debugging
  console.log('[route] ProtectedRoute state:', {
    isLoadingAuth,
    isAuthenticated,
    authErrorType: authError?.type,
    userEmail: user?.email,
    userRole: user?.role,
    userType: user?.user_type,
    computedRole: role,
    hasToken: !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token')),
    sessionActive: !!localStorage.getItem('base44_session_active'),
  });

  if (isLoadingAuth) {
    console.log('[route] ProtectedRoute — waiting for auth restoration (spinner)');
    return fallback;
  }

  if (authError) {
    console.log('[route] ProtectedRoute — authError:', authError.type, authError.message);
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For auth_required or unknown errors, redirect to login
    console.log('[route] ProtectedRoute — redirecting to login due to authError');
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    console.log('[route] ProtectedRoute — not authenticated (no valid session), redirecting to login');
    return unauthenticatedElement;
  }

  // Authenticated — determine where to go
  console.log('[route] ProtectedRoute — ✅ authenticated, role:', role, '→ rendering app');
  return <Outlet />;
}