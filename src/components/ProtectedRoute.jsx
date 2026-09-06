import { Link, Outlet } from 'react-router-dom';
import SignInDiagnostics from '@/components/SignInDiagnostics';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center flex-col gap-3 app-safe-inset">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    <p className="text-xs text-muted-foreground">Checking session…</p>
  </div>
);

const SessionRestoreFailed = ({ onRetry, error, retrying }) => (
  <div className="fixed inset-0 flex items-center justify-center flex-col gap-4 p-6 app-safe-viewport-lg">
    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-orange-600" />
    </div>
    <h2 className="text-lg font-semibold text-center">Session restore failed</h2>
    <p className="text-sm text-muted-foreground text-center max-w-xs">
      {error?.message || 'Your session could not be verified. Retry or sign in again.'}
    </p>
    <Button onClick={onRetry} disabled={retrying} variant="default" className="gap-2">
      <RefreshCw className="w-4 h-4" />
      Retry
    </Button>
    <Link to="/login" className="text-primary text-sm underline">Back to sign in</Link>
    <SignInDiagnostics code={error?.code} />
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authError, hasToken, checkAppState } = useAuth();
  const { role } = useRole();
  const [retrying, setRetrying] = useState(false);

  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[route] ProtectedRoute state:', {
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
    if (hasToken || ['session_restore_failed','callback_missing'].includes(authError.type)) {
      const handleRetry = () => {
        setRetrying(true);
        checkAppState().finally(() => setRetrying(false));
      };
      return <SessionRestoreFailed onRetry={handleRetry} error={authError} retrying={retrying} />;
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
    return <SessionRestoreFailed onRetry={handleRetry} error={authError} retrying={retrying} />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}