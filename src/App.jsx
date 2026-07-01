import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/lib/ThemeContext';
import { RoleProvider, useRole } from '@/lib/RoleContext';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import JoinTeam from '@/pages/JoinTeam';
import ErrorBoundary from '@/lib/ErrorBoundary';
import { base44 } from '@/api/base44Client';
import { UserImpersonationProvider } from '@/lib/UserImpersonationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import Dashboard from '@/pages/Dashboard';

// Wrap lazy imports with chunk-reload recovery: if a dynamic import fails
// (stale chunk after app update), reload once to fetch fresh chunks.
const lazyWithReload = (importFn) => {
  return lazy(() =>
    importFn().catch((err) => {
      console.error('[lazy] chunk load failed, reloading:', err.message);
      // Only reload once per session to avoid infinite loops
      if (!sessionStorage.getItem('base44_chunk_reloaded')) {
        sessionStorage.setItem('base44_chunk_reloaded', '1');
        window.location.reload();
      }
      throw err;
    })
  );
};

const Workouts        = lazyWithReload(() => import('@/pages/Workouts'));
const TrainingPlans  = lazyWithReload(() => import('@/pages/TrainingPlans'));
const Analytics      = lazyWithReload(() => import('@/pages/Analytics'));
const Goals          = lazyWithReload(() => import('@/pages/Goals'));
const CoachPanel     = lazyWithReload(() => import('@/pages/CoachPanel'));
const Activities     = lazyWithReload(() => import('@/pages/Activities'));
const GarminConnect  = lazyWithReload(() => import('@/pages/GarminConnect'));
const WorkoutBuilder = lazyWithReload(() => import('@/pages/WorkoutBuilder'));
const AthleteProfile = lazyWithReload(() => import('@/pages/AthleteProfile'));
const AccountSettings = lazyWithReload(() => import('@/pages/AccountSettings'));
import AdminPanel from '@/pages/AdminPanel';
import UserProfile from '@/pages/UserProfile';
const ShoeTracker    = lazy(() => import('@/pages/ShoeTracker'));
const MyPlan         = lazy(() => import('@/pages/MyPlan'));
const Messages       = lazy(() => import('@/pages/Messages'));

const pageVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -12 },
};

// Routes that should stay mounted for native-like tab switching
const PERSISTENT_PATHS = ['/', '/analytics', '/coach', '/settings', '/workouts', '/my-plan', '/goals', '/shoes', '/garmin', '/admin', '/workout-builder', '/profile', '/messages', '/athlete-profile'];

function PersistentTab({ path, element, currentPath }) {
  const isActive = path === '/' ? currentPath === '/' : currentPath.startsWith(path);
  const ref = React.useRef(null);

  // Scroll to top whenever this tab becomes active
  React.useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [isActive]);

  return (
    <div
      ref={ref}
      style={{
        display: isActive ? undefined : 'none',
        position: 'absolute',
        inset: 0,
        zIndex: isActive ? 1 : 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {element}
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const isPersistent = PERSISTENT_PATHS.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  return (
    <>
      {/* Persistent tabs — stay mounted once visited */}
      <AppLayout persistent>
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        }>
          <PersistentTab path="/"           element={<Dashboard />}      currentPath={location.pathname} />
          <PersistentTab path="/workouts"   element={<Workouts />}        currentPath={location.pathname} />
          <PersistentTab path="/my-plan"    element={<MyPlan />}          currentPath={location.pathname} />
          <PersistentTab path="/analytics"  element={<Analytics />}       currentPath={location.pathname} />
          <PersistentTab path="/coach"      element={<CoachPanel />}      currentPath={location.pathname} />
          <PersistentTab path="/settings"   element={<AccountSettings />} currentPath={location.pathname} />
          <PersistentTab path="/goals"      element={<Goals />}           currentPath={location.pathname} />
          <PersistentTab path="/shoes"      element={<ShoeTracker />}     currentPath={location.pathname} />
          <PersistentTab path="/garmin"     element={<GarminConnect />}   currentPath={location.pathname} />
          <PersistentTab path="/admin"         element={<AdminPanel />}       currentPath={location.pathname} />
          <PersistentTab path="/workout-builder" element={<WorkoutBuilder />}    currentPath={location.pathname} />
          <PersistentTab path="/profile"        element={<UserProfile />}         currentPath={location.pathname} />
          <PersistentTab path="/messages"       element={<Messages />}            currentPath={location.pathname} />
          <PersistentTab path="/athlete-profile" element={<AthleteProfile />}       currentPath={location.pathname} />
        </Suspense>
      </AppLayout>

      {/* Non-persistent routes rendered normally */}
      {!isPersistent && (
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="min-h-screen relative"
            style={{ zIndex: 10 }}
          >
            <Suspense fallback={
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            }>
              <Routes location={location}>
                <Route element={<AppLayout />}>
                  <Route path="/plans"           element={<TrainingPlans />} />
                  <Route path="/activities"      element={<Activities />} />
                </Route>
                {/* Redirect unknown routes to home instead of flashing 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user } = useAuth();
  const { role } = useRole();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  // Log the routing decision for Android debugging
  console.log('[app] AuthenticatedApp — user:', user?.email, 'user_type:', user?.user_type, 'computed role:', role, 'redirect:', role ? (role === 'coach' ? '/coach' : '/') : 'onboarding');

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/join" element={<JoinTeam />} />

      {/* All app routes — gated by ProtectedRoute */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {role ? (
          <Route path="*" element={<AnimatedRoutes />} />
        ) : (
          <Route path="*" element={<OnboardingWizard />} />
        )}
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserImpersonationProvider>
          <AuthProvider>
            <RoleProvider>
              <QueryClientProvider client={queryClientInstance}>
                <Router>
                  <AuthenticatedApp />
                  <Toaster />
                </Router>
              </QueryClientProvider>
            </RoleProvider>
          </AuthProvider>
        </UserImpersonationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;