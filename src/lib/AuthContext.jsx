import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

// Read the token fresh from localStorage each time — appParams is frozen at module init
const getLiveToken = () => {
  try {
    return localStorage.getItem('base44_access_token') || localStorage.getItem('token') || appParams.token || null;
  } catch (_) {
    return appParams.token || null;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      console.log('[auth] checkAppState — starting, hasToken:', !!appParams.token);

      try {
        const res = await fetch(`/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, {
          headers: { 'X-App-Id': appParams.appId, ...(appParams.token ? { Authorization: `Bearer ${appParams.token}` } : {}) }
        });
        if (res.ok) {
          const publicSettings = await res.json();
          setAppPublicSettings(publicSettings);
          console.log('[auth] public settings loaded');
        } else if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          const reason = data?.extra_data?.reason;
          if (reason) {
            console.log('[auth] 403 from public-settings, reason:', reason);
            setAuthError({
              type: reason === 'auth_required' ? 'auth_required'
                  : reason === 'user_not_registered' ? 'user_not_registered'
                  : reason,
              message: data.message || 'Access denied'
            });
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            return;
          }
        }

        const liveToken = getLiveToken();
        console.log('[auth] liveToken check:', !!liveToken, '(appParams.token:', !!appParams.token, ')');
        if (liveToken) {
          await checkUserAuth();
        } else {
          console.log('[auth] no token found anywhere — marking unauthenticated');
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('[auth] checkAppState error:', appError.message);
        setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('[auth] checkAppState unexpected error:', error.message);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async (attempt = 1) => {
    try {
      if (attempt === 1) setIsLoadingAuth(true);
      console.log(`[auth] checkUserAuth — attempt ${attempt}, calling base44.auth.me()`);
      const currentUser = await base44.auth.me();
      console.log('[auth] session restored — user:', currentUser?.email, 'user_type:', currentUser?.user_type, 'role:', currentUser?.role, attempt > 1 ? '(retry succeeded)' : '');
      // Clean up the ephemeral session marker now that we're safely authenticated
      try { localStorage.removeItem('base44_session_active'); } catch (_) {}
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.warn(`[auth] checkUserAuth attempt ${attempt} failed:`, error.message, 'status:', error.status);
      // Retry once on network/timing errors — common on Android cold starts
      // where WebView network may not be ready on first attempt
      if (attempt < 2 && (!error.status || error.status >= 500 || error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log('[auth] retrying auth check in 800ms…');
        setTimeout(() => checkUserAuth(attempt + 1), 800);
        return;
      }
      console.log('[auth] auth check exhausted — marking unauthenticated');
      // If the token is expired/invalid (401/403), purge it from localStorage
      // so the next app load doesn't pick it up and loop again
      if (error.status === 401 || error.status === 403) {
        console.log('[auth] stale/invalid token — clearing from storage');
        try { localStorage.removeItem('base44_access_token'); } catch (_) {}
        try { localStorage.removeItem('token'); } catch (_) {}
      }
      // Clear stale session marker on final failure
      try { localStorage.removeItem('base44_session_active'); } catch (_) {}
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };

  // Refetch the current user from DB and update state
  const refetchUser = useCallback(async () => {
    console.log('[auth] refetchUser — fetching latest');
    const currentUser = await base44.auth.me();
    console.log('[auth] refetchUser — user:', currentUser?.email);
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = (shouldRedirect = true) => {
    console.log('[auth] logout — clearing session');
    setUser(null);
    setIsAuthenticated(false);
    // Clear the cached token from localStorage so stale tokens don't persist
    try { localStorage.removeItem('base44_access_token'); } catch (_) {}
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    console.log('[auth] navigateToLogin');
    base44.auth.redirectToLogin(window.location.href);
  };

  // Persist session explicitly — call after login before hard redirect
  const persistSession = () => {
    try {
      // The SDK stores the token internally; we also persist a flag
      // so app-params.js can pick up on it even in edge cases
      localStorage.setItem('base44_session_active', '1');
      console.log('[auth] persistSession — session marker saved');
    } catch (_) {
      console.warn('[auth] persistSession — localStorage unavailable');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      refetchUser,
      persistSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};