import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
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

function AnimatedRoutes() {
  const location = useLocation();
  return (
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
            {/* Public route — no layout needed */}
            <Route path="/join" element={<JoinTeam />} />
            <Route element={<AppLayout />}>
              <Route path="/"                element={<Dashboard />} />
              <Route path="/workouts"        element={<Workouts />} />
              <Route path="/plans"           element={<TrainingPlans />} />
              <Route path="/analytics"       element={<Analytics />} />
              <Route path="/goals"           element={<Goals />} />
              <Route path="/coach"           element={<CoachPanel />} />
              <Route path="/activities"      element={<Activities />} />
              <Route path="/garmin"          element={<GarminConnect />} />
              <Route path="/workout-builder" element={<WorkoutBuilder />} />
              <Route path="/athlete-profile" element={<AthleteProfile />} />
              <Route path="/settings"        element={<AccountSettings />} />
              <Route path="/admin"           element={<AdminPanel />} />
              <Route path="/shoes"           element={<ShoeTracker />} />
              <Route path="/my-plan"         element={<MyPlan />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
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

  // Show onboarding wizard if authenticated but setup not completed (and not admin)
  if (isAuthenticated && user && user.role !== 'admin' && !user.onboarding_completed) {
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