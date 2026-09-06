/** Shared callback/session handling. Never log or include tokens in diagnostics. */
export const AUTH_BUILD = 'T7-AUTH-2026-09-06-3';
const DEBUG_KEY = 'top7_auth_diagnostics';
let memoryToken = null;
let memoryOnly = false;
const rejectedTokens = new Set();
let memoryDiagnostics = {};

const browser = () => typeof window !== 'undefined';
const remove = (key) => { try { window.localStorage.removeItem(key); } catch { /* storage may be unavailable */ } };

export function getAuthDiagnostics() {
  let stored = {};
  try { stored = JSON.parse(window.localStorage.getItem(DEBUG_KEY) || '{}'); } catch { /* optional */ }
  // Explicit allowlist: never render arbitrary stored properties, credentials, or URLs with queries.
  return {
    build: AUTH_BUILD,
    phase: String(memoryDiagnostics.phase || stored.phase || 'idle').slice(0,40),
    method: String(memoryDiagnostics.method || stored.method || '').slice(0,20),
    startedAt: Number(memoryDiagnostics.startedAt || stored.startedAt || 0),
    callbackSeen: Boolean(memoryDiagnostics.callbackSeen ?? stored.callbackSeen),
    httpStatus: Number(memoryDiagnostics.httpStatus ?? stored.httpStatus) || null,
    origin: browser() ? window.location.origin : '',
  };
}

export function recordAuthPhase(phase, details = {}) {
  const previous = getAuthDiagnostics();
  memoryDiagnostics = {
    phase,
    method: details.method ?? previous.method,
    startedAt: details.startedAt ?? previous.startedAt,
    callbackSeen: details.callbackSeen ?? previous.callbackSeen,
    httpStatus: details.httpStatus ?? null,
  };
  try { window.localStorage.setItem(DEBUG_KEY, JSON.stringify(memoryDiagnostics)); } catch { /* optional */ }
}

export function saveSessionToken(token) {
  if (typeof token !== 'string' || !token) return false;
  memoryToken = token;
  rejectedTokens.delete(token);
  memoryOnly = true;
  try {
    window.localStorage.setItem('base44_access_token', token);
    window.localStorage.setItem('token', token);
    memoryOnly = window.localStorage.getItem('base44_access_token') !== token;
  } catch { /* retain token in memory for this page, never require a hard reload */ }
  return true;
}

export function getSessionToken() {
  if (!browser()) return null;
  if (memoryOnly) return memoryToken;
  try {
    const token = window.localStorage.getItem('base44_access_token') || window.localStorage.getItem('token');
    // Do not resurrect a rejected token from a frozen appParams value or failed storage removal.
    memoryToken = token && !rejectedTokens.has(token) ? token : null;
  } catch { /* use only the current page's in-memory token */ }
  return memoryToken;
}

export function clearSessionToken(expectedToken) {
  const current = getSessionToken();
  if (expectedToken && current !== expectedToken) return false;
  if (current) rejectedTokens.add(current);
  memoryToken = null;
  memoryOnly = false;
  remove('base44_access_token');
  remove('token');
  remove('base44_session_active');
  remove('top7_oauth_returned_at');
  return true;
}

export function captureAuthCallback() {
  if (!browser()) return false;
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  // Never interpret the generic ?token= from a password-reset link as a login token.
  const token = url.searchParams.get('access_token') || fragment.get('access_token');
  const clearRequested = url.searchParams.get('clear_access_token') === 'true';
  remove('base44_clear_access_token');
  if (clearRequested) clearSessionToken();
  if (token) {
    saveSessionToken(token);
    try { window.localStorage.setItem('top7_oauth_returned_at', String(Date.now())); } catch { /* optional */ }
    recordAuthPhase('callback_received', {callbackSeen:true});
  }
  if (token || url.searchParams.has('clear_access_token')) {
    url.searchParams.delete('access_token');
    url.searchParams.delete('clear_access_token');
    if (fragment.has('access_token')) {
      fragment.delete('access_token');
      url.hash = fragment.toString() ? '#' + fragment.toString() : '';
    }
    // Save before cleaning the URL. Preserve router state and unrelated reset/invite parameters.
    window.history.replaceState(window.history.state, document.title, url.pathname + url.search + url.hash);
  }
  return Boolean(token);
}

export function isFreshOAuthReturn() {
  try {
    const age = Date.now() - Number(window.localStorage.getItem('top7_oauth_returned_at') || 0);
    return age >= 0 && age < 20000;
  } catch { return getAuthDiagnostics().phase === 'callback_received'; }
}

export function finishAuthAttempt() {
  remove('base44_session_active');
  remove('top7_oauth_returned_at');
  recordAuthPhase('verified', {httpStatus:200});
}

export function isPendingGoogleLogin() {
  const details = getAuthDiagnostics();
  const age = Date.now() - details.startedAt;
  return details.method === 'google' && details.phase === 'opening_google' && age >= 0 && age < 600000;
}

export function getAuthStatus(error) {
  return Number(error?.status || error?.response?.status || error?.originalError?.response?.status) || 0;
}

export function getAuthFailureMessage(error) {
  const status = getAuthStatus(error);
  if (status === 401) return 'Top 7 could not verify that email and password. Use your Top 7 password, or Continue with Google if that is how you joined. Forgot password can help recover password access.';
  if (status === 429) return 'Too many attempts. Please wait a few minutes before trying again.';
  if (!status || status >= 500) return 'Top 7 could not reach the sign-in service. Please try again when your connection is stable.';
  if (status === 403) return 'Sign-in was not permitted. Check that your email is verified and use the sign-in method you originally chose.';
  return 'Sign-in could not be completed. Please try again or use account recovery.';
}
