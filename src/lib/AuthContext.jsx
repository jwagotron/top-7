import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

// Read the token fresh from localStorage each time — appParams is frozen at module init.
// The SDK's getAccessToken() reads from the same key: "base44_access_token".
const getLiveToken = () => {
  try {
    // Check URL params first (OAuth callback returns token in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('access_token');
    if (urlToken) return urlToken;
    // Then check all possible localStorage keys the SDK might use
    return localStorage.getItem('base44_access_token')
        || localStorage.getItem('token')
        || appParams.token
        || null;
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
  const [authErrorMessage, setAuthErrorMessage] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAuthErrorMessage(null);

      const liveToken = getLiveToken();
      setHasToken(!!liveToken);
      console.log('[auth] checkAppState — starting | appParams.token:', !!appParams.token, '| liveToken:', !!liveToken);

      // If we have a token, force the SDK's axios client to use it BEFORE any request.
      // The SDK sets the Authorization header at createClient() time from appParams.token,
      // which may be stale/null on Android WebView cold starts. setToken() updates the
      // axios.defaults.headers.common["Authorization"] directly, ensuring me() goes out
      // authenticated.
      if (liveToken) {
        try {
          base44.auth.setToken(liveToken);
          console.log('[auth] ✅ forced SDK setToken with live token');
        } catch (e) {
          console.warn('[auth] setToken failed:', e.message);
        }
      }

      try {
        const res = await fetch(`/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, {
          headers: { 'X-App-Id': appParams.appId, ...(liveToken ? { Authorization: `Bearer ${liveToken}` } : {}) }
        });
        if (res.ok) {
          const publicSettings = await res.json();
          setAppPublicSettings(publicSettings);
          console.log('[auth] public settings loaded');
        } else if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          const reason = data?.extra_data?.reason;
          console.log('[auth] 403 from public-settings, reason:', reason, '— continuing to checkUserAuth()');
          // DO NOT early-return on 403 — the public-settings endpoint may reject
          // a stale token while base44.auth.me() still has a valid session.
          if (reason === 'user_not_registered' && !liveToken) {
            setAuthError({ type: 'user_not_registered', message: data.message || 'Access denied' });
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            return;
          }
        }

        // Re-read token after the fetch — in case the SDK wrote it during the await
        const tokenForAuth = getLiveToken();
        setHasToken(!!tokenForAuth);
        console.log('[auth] tokenForAuth after public-settings:', !!tokenForAuth);
        if (tokenForAuth) {
          // Force SDK to use the live token again (in case it was updated during the await)
          try { base44.auth.setToken(tokenForAuth); } catch (_) {}
          await checkUserAuth();
        } else {
          console.log('[auth] no token found — marking unauthenticated');
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('[auth] checkAppState error:', appError.message);
        const fallbackToken = getLiveToken();
        setHasToken(!!fallbackToken);
        if (fallbackToken) {
          try { base44.auth.setToken(fallbackToken); } catch (_) {}
          await checkUserAuth();
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
          setAuthErrorMessage(appError.message);
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      }
    } catch (error) {
      console.error('[auth] checkAppState unexpected error:', error.message);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setAuthErrorMessage(error.message);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async (attempt = 1) => {
    try {
      if (attempt === 1) {
        setIsLoadingAuth(true);
        setAuthErrorMessage(null);
      }

      const liveToken = getLiveToken();
      setHasToken(!!liveToken);
      console.log(`[auth] checkUserAuth — attempt ${attempt} | liveToken: ${!!liveToken} | calling base44.auth.me()`);

      // Force the SDK's axios client to use the live token on every attempt.
      // This is the critical fix: the SDK may have been initialized with a stale
      // token, and setToken() is the only way to update the axios Authorization header.
      if (liveToken) {
        try { base44.auth.setToken(liveToken); } catch (_) {}
      }

      const currentUser = await base44.auth.me();
      console.log('[auth] ✅ session restored — email:', currentUser?.email, '| user_type:', currentUser?.user_type, '| role:', currentUser?.role, attempt > 1 ? '(retry succeeded)' : '');
      try { localStorage.removeItem('base44_session_active'); } catch (_) {}
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.warn(`[auth] ❌ checkUserAuth attempt ${attempt} failed:`, error.message, 'status:', error.status, 'code:', error.code);
      setAuthErrorMessage(`Attempt ${attempt}: ${error.message || 'Unknown error'} (status: ${error.status || 'none'})`);

      const isNetworkError = !error.status || error.status >= 500 || error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch');
      if (attempt < 3 && isNetworkError) {
        console.log(`[auth] retrying auth check in ${attempt * 800}ms… (attempt ${attempt + 1}/3)`);
        setTimeout(() => checkUserAuth(attempt + 1), attempt * 800);
        return;
      }

      console.log('[auth] auth check exhausted after', attempt, 'attempts — marking unauthenticated');
      // If the token is expired/invalid (401/403), purge it from localStorage
      if (error.status === 401 || error.status === 403) {
        console.log('[auth] stale/invalid token — clearing from storage');
        try { localStorage.removeItem('base44_access_token'); } catch (_) {}
        try { localStorage.removeItem('token'); } catch (_) {}
        setHasToken(false);
      }
      // Clear stale session marker on final failure
      try { localStorage.removeItem('base44_session_active'); } catch (_) {}
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };

  const refetchUser = useCallback(async () => {
    console.log('[auth] refetchUser — fetching latest');
    const liveToken = getLiveToken();
    if (liveToken) {
      try { base44.auth.setToken(liveToken); } catch (_) {}
    }
    const currentUser = await base44.auth.me();
    console.log('[auth] refetchUser — user:', currentUser?.email);
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = (shouldRedirect = true) => {
    console.log('[auth] logout — clearing session');
    setUser(null);
    setIsAuthenticated(false);
    setHasToken(false);
    try { localStorage.removeItem('base44_access_token'); } catch (_) {}
    try { localStorage.removeItem('token'); } catch (_) {}
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

  const persistSession = () => {
    try {
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
      authErrorMessage,
      hasToken,
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};