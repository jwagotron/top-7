import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  captureAuthCallback, getSessionToken, clearSessionToken, saveSessionToken,
  isFreshOAuthReturn, finishAuthAttempt, getAuthStatus, recordAuthPhase,
  isPendingGoogleLogin,
} from '@/lib/authSession';

const AuthContext = createContext();
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout(promise, ms = 10000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Session verification timed out')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const inFlight = useRef(null);
  const verifiedToken = useRef(null);

  const checkAppState = useCallback(() => {
    captureAuthCallback();
    // Capture outside try/catch. Previously the catch referenced a block-scoped
    // liveToken and crashed instead of handling a rejected session.
    const token = getSessionToken();
    if (inFlight.current?.token === token) return inFlight.current.promise;
    const run = ++generation.current;
    const current = () => mounted.current && generation.current === run;
    if (mounted.current) {
      setAuthError(null);
      setHasToken(Boolean(token));
      setIsLoadingAuth(Boolean(token));
    }

    if (!token) {
      verifiedToken.current = null;
      if (mounted.current) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        if (isPendingGoogleLogin()) {
          recordAuthPhase('no_callback');
          setAuthError({type:'callback_missing', code:'T7-NO-CALLBACK',
            message:'Google sign-in was canceled or did not return a session to Top 7. No account was created by this page. Please try again.'});
        }
      }
      return Promise.resolve(null);
    }

    const pending = (async () => {
      const freshReturn = isFreshOAuthReturn();
      const attempts = freshReturn ? 4 : 3;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          if (!current()) return null;
          // An old request must never authenticate, reject, or erase a newer login.
          if (getSessionToken() !== token) return checkAppState();
          base44.auth.setToken(token);
          recordAuthPhase('verifying');
          const currentUser = await withTimeout(base44.auth.me());
          if (!current()) return null;
          if (getSessionToken() !== token) return checkAppState();
          if (!currentUser?.id) throw Object.assign(new Error('Invalid session response'), {status:502});
          verifiedToken.current = token;
          finishAuthAttempt();
          setUser(currentUser);
          setIsAuthenticated(true);
          setHasToken(true);
          setAuthError(null);
          setIsLoadingAuth(false);
          return currentUser;
        } catch (error) {
          if (!current()) return null;
          if (getSessionToken() !== token) return checkAppState();
          const status = getAuthStatus(error);
          const data = error?.data || error?.response?.data || {};
          const notRegistered = status === 403 && (data?.extra_data?.reason || data?.reason) === 'user_not_registered';
          const retryable = !status || status >= 500 || (freshReturn && status === 401);
          recordAuthPhase('verification_failed', {httpStatus:status});
          if (!notRegistered && retryable && attempt < attempts) {
            await wait(attempt * 600);
            continue;
          }
          verifiedToken.current = null;
          // 403 means access was refused, not proof of an expired token. Keep the
          // identity for troubleshooting; never grant access without a successful me().
          if (status === 401) {
            clearSessionToken(token);
            setHasToken(false);
          }
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setAuthError(notRegistered
            ? {type:'user_not_registered', code:'T7-NOT-MEMBER', message:'This account was not admitted to Top 7.'}
            : {type:'session_restore_failed', code:status ? `T7-SESSION-${status}` : 'T7-SESSION-NETWORK',
              message:status === 401 ? 'Top 7 could not validate the returned session. Please sign in again.'
                : status === 403 ? 'Top 7 received a session, but access was not permitted.'
                : 'Top 7 could not finish checking your session. Please retry.'});
          return null;
        }
      }
      return null;
    })();
    inFlight.current = {token, promise:pending};
    void pending.finally(() => {
      if (inFlight.current?.promise === pending) inFlight.current = null;
    });
    return pending;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void checkAppState();
    let resumeTimer;
    const syncSession = () => {
      const received = captureAuthCallback();
      const token = getSessionToken();
      if (received || token !== verifiedToken.current || isPendingGoogleLogin()) void checkAppState();
    };
    const resume = () => {
      clearTimeout(resumeTimer);
      // Give the native callback a brief chance to arrive after Chrome loses focus.
      resumeTimer = setTimeout(syncSession, isPendingGoogleLogin() ? 1500 : 0);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') resume(); };
    const onStorage = (event) => {
      if (!event.key || ['base44_access_token','token'].includes(event.key)) syncSession();
    };
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('popstate', syncSession);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted.current = false;
      generation.current++;
      inFlight.current = null;
      clearTimeout(resumeTimer);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('popstate', syncSession);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkAppState]);

  const refetchUser = useCallback(async () => {
    const currentUser = await checkAppState();
    if (!currentUser) throw new Error('The session could not be verified. Please sign in again.');
    return currentUser;
  }, [checkAppState]);

  const acceptLoginSession = useCallback(async (token) => {
    if (token) { saveSessionToken(token); base44.auth.setToken(token); }
    const currentUser = await checkAppState();
    if (!currentUser) throw Object.assign(new Error('The sign-in response could not be verified.'), {code:'SESSION_NOT_VERIFIED'});
    return currentUser;
  }, [checkAppState]);

  const logout = () => {
    generation.current++;
    inFlight.current = null;
    verifiedToken.current = null;
    clearSessionToken();
    recordAuthPhase('signed_out');
    setUser(null);
    setIsAuthenticated(false);
    setHasToken(false);
    setAuthError(null);
    base44.auth.logout(new URL('/login', window.location.origin).href);
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, isAuthenticated, isLoadingAuth, isLoadingPublicSettings:false,
      authError, authErrorMessage:authError?.message || null, hasToken, appPublicSettings:null,
      logout, navigateToLogin:() => { window.location.assign('/login'); },
      checkAppState, refetchUser, acceptLoginSession,
      persistSession:() => { try { localStorage.setItem('base44_session_active','1'); } catch { /* optional */ } },
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
