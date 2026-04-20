import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/lib/ThemeContext';
import { RoleProvider, useRole } from '@/lib/RoleContext';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import JoinTeam from '@/pages/JoinTeam';
import ErrorBoundary from '@/lib/ErrorBoundary';

import Dashboard from '@/pages/Dashboard';
const Workouts        = lazy(() => import('@/pages/Workouts'));
const TrainingPlans  = lazy(() => import('@/pages/TrainingPlans'));
const Analytics      = lazy(() => import('@/pages/Analytics'));
const Goals          = lazy(() => import('@/pages/Goals'));
const CoachPanel     = lazy(() => import('@/pages/CoachPanel'));
const Activities     = lazy(() => import('@/pages/Activities'));
const GarminConnect  = lazy(() => import('@/pages/GarminConnect'));
const WorkoutBuilder = lazy(() => import('@/pages/WorkoutBuilder'));
const AthleteProfile = lazy(() => import('@/pages/AthleteProfile'));
const AccountSettings = lazy(() => import('@/pages/AccountSettings'));
import AdminPanel from '@/pages/AdminPanel';
const ShoeTracker    = lazy(() => import('@/pages/ShoeTracker'));
const MyPlan         = lazy(() => import('@/pages/MyPlan'));

const pageVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -12 },
};

// Routes that should stay mounted for native-like tab switching
const PERSISTENT_PATHS = ['/', '/analytics', '/coach', '/settings', '/workouts', '/my-plan', '/goals', '/shoes', '/garmin'];

function PersistentTab({ path, element, currentPath }) {
  const isActive = path === '/' ? currentPath === '/' : currentPath.startsWith(path);
  const [mounted, setMounted] = React.useState(isActive);
  const ref = React.useRef(null);

  React.useEffect(() => { if (isActive) setMounted(true); }, [isActive]);

  // Scroll to top whenever this tab becomes active
  React.useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [isActive]);

  if (!mounted) return null;
  return (
    <div
      ref={ref}
      style={{
        display: isActive ? undefined : 'none',
        position: 'absolute',
        inset: 0,
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
            className="min-h-screen"
          >
            <Suspense fallback={
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            }>
              <Routes location={location}>
                <Route path="/join" element={<JoinTeam />} />
                <Route element={<AppLayout />}>
                  <Route path="/plans"           element={<TrainingPlans />} />
                  <Route path="/activities"      element={<Activities />} />
                  <Route path="/workout-builder" element={<WorkoutBuilder />} />
                  <Route path="/athlete-profile" element={<AthleteProfile />} />
                  <Route path="/admin"           element={<AdminPanel />} />
                </Route>
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, isAuthenticated } = useAuth();
  const { role } = useRole();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  // Show onboarding wizard if authenticated but user_type not set (and not admin)
  if (isAuthenticated && user && user.role !== 'admin' && !user.user_type) {
    return <OnboardingWizard />;
  }

  // Not authenticated or no role — show routes (join page is public)
  return <AnimatedRoutes />;
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>
            <QueryClientProvider client={queryClientInstance}>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </QueryClientProvider>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;