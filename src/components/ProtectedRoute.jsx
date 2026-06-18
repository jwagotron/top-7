import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    console.log('[route] ProtectedRoute — waiting for auth (spinner)');
    return fallback;
  }

  if (authError) {
    console.log('[route] ProtectedRoute — authError:', authError.type);
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    console.log('[route] ProtectedRoute — not authenticated, redirecting to login');
    return unauthenticatedElement;
  }

  console.log('[route] ProtectedRoute — authenticated, rendering app');
  return <Outlet />;
}