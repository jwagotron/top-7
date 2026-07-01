import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center flex-col gap-3">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    <p className="text-xs text-muted-foreground">Checking session…</p>
  </div>
);

const SessionRestoreFailed = ({ onRetry }) => (
  <div className="fixed inset-0 flex items-center justify-center flex-col gap-4 p-6">
    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-orange-600" />
    </div>
    <h2 className="text-lg font-semibold text-center">Session restore failed</h2>
    <p className="text-sm text-muted-foreground text-center max-w-xs">
      Your token was found but the session couldn't be restored. This is often a temporary network issue.
    </p>
    <Button onClick={onRetry} variant="default" className="gap-2">
      <RefreshCw className="w-4 h-4" />
      Retry
    </Button>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authError, hasToken, checkAppState } = useAuth();
  const { role } = useRole();
  const [retrying, setRetrying] = useState(false);

  console.log('[route] ProtectedRoute state:', {
    isLoadingAuth,
    isAuthenticated,
    hasToken,
    authErrorType: authError?.type,
    computedRole: role,
  });

  // Still loading — show spinner (covers both "no token, checking" and "has token, restoring session")
  if (isLoadingAuth) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For unknown errors, if we have a token, show retry instead of bouncing to login
    if (hasToken && authError.type !== 'user_not_registered') {
      const handleRetry = () => {
        setRetrying(true);
        checkAppState().finally(() => setRetrying(false));
      };
      return <SessionRestoreFailed onRetry={handleRetry} />;
    }
    return unauthenticatedElement;
  }

  // Token exists but session restore failed (not authenticated, not loading, but token present)
  // Show retry screen instead of redirecting to /login — the token may be valid,
  // just a transient network failure on Android WebView
  if (!isAuthenticated && hasToken) {
    const handleRetry = () => {
      setRetrying(true);
      checkAppState().finally(() => setRetrying(false));
    };
    return <SessionRestoreFailed onRetry={handleRetry} />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}