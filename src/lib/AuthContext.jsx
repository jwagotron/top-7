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

const OAUTH_RETURNED_AT_KEY = 'top7_oauth_returned_at';
const OAUTH_RETURN_GRACE_MS = 20000;

const isFreshOAuthReturn = () => {
  try {
    const returnedAt = Number(localStorage.getItem(OAUTH_RETURNED_AT_KEY) || 0);
    return returnedAt > 0 && Date.now() - returnedAt < OAUTH_RETURN_GRACE_MS;
  } catch (_) {
    return false;
  }
};

const clearOAuthReturnMarker = () => {
  try { localStorage.removeItem(OAUTH_RETURNED_AT_KEY); } catch (_) {}
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
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    // Base44's web and store wrappers return OAuth sessions through the SDK's
    // standard URL/localStorage token flow. Keep session restoration in one
    // place instead of competing with a second native deep-link listener.
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      setAuthErrorMessage(null);
      setIsLoadingAuth(true);

      // Public settings are not used by the current app. They previously sat in
      // front of auth restoration and could delay a brand-new OAuth session.
      // Keep them out of the authentication critical path entirely.
      setIsLoadingPublicSettings(false);

      const liveToken = getLiveToken();
      setHasToken(!!liveToken);
      if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] checkAppState — starting | appParams.token:', !!appParams.token, '| liveToken:', !!liveToken, '| freshOAuth:', isFreshOAuthReturn());

      if (liveToken) {
        try { base44.auth.setToken(liveToken); } catch (e) {
          console.warn('[auth] setToken failed:', e.message);
        }
        await checkUserAuth();
        return;
      }

      // If the native wrapper returned a cookie-backed session without exposing
      // a local token, give the SDK one authenticated me() attempt before showing
      // the signed-out experience.
      let sessionMarker = null;
      try { sessionMarker = localStorage.getItem('base44_session_active'); } catch (_) {}
      if (sessionMarker) {
        await checkUserAuth();
        return;
      }

      setIsLoadingAuth(false);
      setIsAuthenticated(false);
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
      if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log(`[auth] checkUserAuth — attempt ${attempt} | liveToken: ${!!liveToken} | calling base44.auth.me()`);

      // Force the SDK's axios client to use the live token on every attempt.
      // This is the critical fix: the SDK may have been initialized with a stale
      // token, and setToken() is the only way to update the axios Authorization header.
      if (liveToken) {
        try { base44.auth.setToken(liveToken); } catch (_) {}
      }

      // Even without a local token, the SDK may have one from its own init-time
      // localStorage read. We call me() regardless — if it fails with 401, we
      // know there's genuinely no session.
      const currentUser = await base44.auth.me();
      if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] ✅ session restored — email:', currentUser?.email, '| user_type:', currentUser?.user_type, '| role:', currentUser?.role, attempt > 1 ? '(retry succeeded)' : '');

      // me() succeeded — persist the token if the SDK has one internally but we
      // didn't find it in localStorage (ensures it survives future page reloads)
      if (!liveToken) {
        try {
          const sdkToken = localStorage.getItem('base44_access_token') || localStorage.getItem('token');
          if (sdkToken) {
            setHasToken(true);
            if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] recovered token from SDK internal storage after me() success');
          }
        } catch (_) {}
      }

      try { localStorage.removeItem('base44_session_active'); } catch (_) {}
      clearOAuthReturnMarker();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.warn(`[auth] ❌ checkUserAuth attempt ${attempt} failed:`, error.message, 'status:', error.status, 'code:', error.code);
      setAuthErrorMessage(`Attempt ${attempt}: ${error.message || 'Unknown error'} (status: ${error.status || 'none'})`);

      // Detect user_not_registered before any retry. That is a valid identity
      // without app membership, not a transient session restoration failure.
      const errData = error?.response?.data || error?.data || error?.response?.body;
      const reason = errData?.extra_data?.reason || errData?.reason;
      if (error.status === 403 && reason === 'user_not_registered') {
        if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] user_not_registered — showing UserNotRegisteredError (not bouncing to login)');
        setAuthError({ type: 'user_not_registered', message: errData?.message || error.message || 'Access denied' });
        try { localStorage.removeItem('base44_session_active'); } catch (_) {}
        clearOAuthReturnMarker();
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      const freshOAuth = isFreshOAuthReturn();
      const isAuthStatus = error.status === 401 || error.status === 403;
      const isNetworkError = !error.status || error.status >= 500 || error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch');
      const shouldRetryFreshOAuth = freshOAuth && !!liveToken && isAuthStatus && attempt < 4;
      const shouldRetryNetwork = isNetworkError && attempt < 3;

      if (shouldRetryFreshOAuth || shouldRetryNetwork) {
        const delay = shouldRetryFreshOAuth ? attempt * 600 : attempt * 800;
        if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log(`[auth] retrying auth check in ${delay}ms… (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return checkUserAuth(attempt + 1);
      }

      if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] auth check exhausted after', attempt, 'attempts — marking unauthenticated');

      // Never destroy a just-issued Google token on the same return cycle. If
      // validation still fails after the grace retries, preserve the token and
      // show the session-retry state instead of looping straight back to login.
      if (freshOAuth && liveToken && isAuthStatus) {
        setAuthError({ type: 'session_restore_failed', message: error.message || 'Google session is still being restored' });
        setHasToken(true);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      // A token that was not just issued and is explicitly rejected is stale.
      if (isAuthStatus) {
        if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] stale/invalid token — clearing from storage');
        try { localStorage.removeItem('base44_access_token'); } catch (_) {}
        try { localStorage.removeItem('token'); } catch (_) {}
        clearOAuthReturnMarker();
        setHasToken(false);
      }
      try { localStorage.removeItem('base44_session_active'); } catch (_) {}
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };

  const refetchUser = useCallback(async () => {
    if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] refetchUser — fetching latest');
    const liveToken = getLiveToken();
    if (liveToken) {
      try { base44.auth.setToken(liveToken); } catch (_) {}
    }
    const currentUser = await base44.auth.me();
    if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] refetchUser — user:', currentUser?.email);
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = (shouldRedirect = true) => {
    if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] logout — clearing session');
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
    if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] navigateToLogin');
    base44.auth.redirectToLogin(window.location.href);
  };

  const persistSession = () => {
    try {
      localStorage.setItem('base44_session_active', '1');
      if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.log('[auth] persistSession — session marker saved');
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