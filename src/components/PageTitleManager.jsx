import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_NAME } from '@/lib/branding';

const MARKETING_TITLE = `${APP_NAME} | Running Training for Athletes & Coaches`;

function titleForPath(pathname, isAuthenticated) {
  if (pathname === '/') return isAuthenticated ? `Dashboard | ${APP_NAME}` : MARKETING_TITLE;
  if (pathname === '/welcome') return MARKETING_TITLE;

  if (pathname === '/login') return `Log In | ${APP_NAME}`;
  if (pathname === '/register') return `Create Account | ${APP_NAME}`;
  if (pathname === '/forgot-password') return `Forgot Password | ${APP_NAME}`;
  if (pathname === '/reset-password') return `Reset Password | ${APP_NAME}`;
  if (pathname === '/join' || pathname.startsWith('/join/')) return `Join a Team | ${APP_NAME}`;

  if (pathname === '/privacy') return `Privacy Policy | ${APP_NAME}`;
  if (pathname === '/terms') return `Terms of Service | ${APP_NAME}`;
  if (pathname === '/support') return `Support | ${APP_NAME}`;
  if (pathname === '/delete-account') return `Delete Account | ${APP_NAME}`;

  if (pathname === '/coach') return `Coach Dashboard | ${APP_NAME}`;
  if (pathname === '/workout-builder') return `Workout Builder | ${APP_NAME}`;
  if (pathname === '/plans') return `Training Plans | ${APP_NAME}`;
  if (pathname === '/activities') return `Activities | ${APP_NAME}`;
  if (pathname === '/workouts') return `Training | ${APP_NAME}`;
  if (pathname === '/my-plan') return `My Plan | ${APP_NAME}`;
  if (pathname === '/analytics') return `Analytics | ${APP_NAME}`;
  if (pathname === '/goals') return `Goals | ${APP_NAME}`;
  if (pathname === '/shoes') return `Shoe Tracker | ${APP_NAME}`;
  if (pathname === '/garmin') return `Garmin Connect | ${APP_NAME}`;
  if (pathname === '/messages') return `Messages | ${APP_NAME}`;
  if (pathname.startsWith('/messages/')) return `Message | ${APP_NAME}`;
  if (pathname.startsWith('/athletes/') || pathname === '/athlete-profile') return `Athlete Profile | ${APP_NAME}`;
  if (pathname === '/settings') return `Settings | ${APP_NAME}`;
  if (pathname === '/profile') return `My Profile | ${APP_NAME}`;
  if (pathname === '/admin') return `Admin | ${APP_NAME}`;

  return APP_NAME;
}

export default function PageTitleManager({ isAuthenticated = false }) {
  const location = useLocation();

  useEffect(() => {
    document.title = titleForPath(location.pathname, isAuthenticated);
  }, [location.pathname, isAuthenticated]);

  return null;
}
