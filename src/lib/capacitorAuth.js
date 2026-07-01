/**
 * Capacitor-native OAuth handler for Android.
 *
 * Problem: base44.auth.loginWithProvider() does window.location.href = oauthUrl.
 * On Android WebView, Google blocks OAuth, so the system opens Chrome.
 * After auth, the redirect stays in Chrome — the user never returns to the app.
 *
 * Solution: construct the same OAuth URL the SDK builds, but open it in a
 * Chrome Custom Tab via the Capacitor Browser plugin. Listen for appUrlOpen
 * to capture the redirect callback, extract the token, close the browser,
 * and navigate into the app.
 *
 * No npm packages needed — uses window.Capacitor directly (available on
 * native builds via the Base44 Android/iOS shell).
 */

import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

function getCapacitor() {
  return typeof window !== 'undefined' ? window.Capacitor : undefined;
}

export function isNativePlatform() {
  const cap = getCapacitor();
  return !!(cap && cap.isNative === true);
}

function getPlugin(name) {
  const cap = getCapacitor();
  if (!cap) return null;
  // Capacitor 3-4: plugins are on cap.Plugins
  if (cap.Plugins && cap.Plugins[name]) return cap.Plugins[name];
  // Capacitor 5+: use registerPlugin
  if (cap.registerPlugin) {
    try {
      return cap.registerPlugin(name);
    } catch {
      return null;
    }
  }
  return null;
}

export function getAppPlugin() {
  return getPlugin('App');
}

export function getBrowserPlugin() {
  return getPlugin('Browser');
}

// ── OAuth diagnostics (read by AuthDiagnosticOverlay) ──────────────────

let _oauthDiag = {
  isNative: isNativePlatform(),
  redirectUrl: null,
  oauthUrl: null,
  browserOpened: false,
  callbackReceived: false,
  callbackUrl: null,
  tokenExtracted: false,
  tokenStored: false,
  authMeResult: null,
  lastError: null,
};

export function getOAuthDiagnostics() {
  return { ..._oauthDiag };
}

// ── Token extraction ───────────────────────────────────────────────────

function extractTokenFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    // Query params (Base44 SDK sets access_token as a query param)
    const token =
      url.searchParams.get('access_token') || url.searchParams.get('token');
    if (token) return token;
    // Hash fragment (some OAuth providers use #access_token=)
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      return hashParams.get('access_token') || hashParams.get('token');
    }
    return null;
  } catch {
    return null;
  }
}

// ── OAuth URL construction ─────────────────────────────────────────────

/**
 * Builds the same OAuth login URL that base44.auth.loginWithProvider constructs.
 * Derived from SDK source (dist/modules/auth.js):
 *   ${appBaseUrl}/api/apps/auth/login?app_id=${appId}&from_url=${redirectUrl}
 *
 * For non-google providers, a /${provider} segment is inserted.
 */
function buildOAuthUrl(provider, fromUrl) {
  const baseUrl = appParams.appBaseUrl || window.location.origin;
  const redirectUrl = new URL(fromUrl, window.location.origin).toString();
  const providerPath = provider === 'google' ? '' : `/${provider}`;
  const authPath = `/apps/auth${providerPath}/login`;
  return `${baseUrl}/api${authPath}?app_id=${appParams.appId}&from_url=${encodeURIComponent(redirectUrl)}`;
}

// ── Native Google OAuth flow ───────────────────────────────────────────

/**
 * Performs Google OAuth on Android/Capacitor:
 *
 * 1. Build the OAuth URL (same as SDK's loginWithProvider)
 * 2. Set up appUrlOpen listener
 * 3. Open the URL in a Chrome Custom Tab via Browser.open
 * 4. When appUrlOpen fires, extract the token
 * 5. Close the browser
 * 6. Store the token, set on SDK, verify with auth.me()
 * 7. Hard-navigate to the app
 *
 * @param {string} fromUrl  The web URL to return to after auth (token appended by backend)
 * @param {string} navigatePath  Where to navigate after token is stored (default '/')
 */
export async function performNativeGoogleAuth(fromUrl, navigatePath = '/') {
  const App = getAppPlugin();
  const Browser = getBrowserPlugin();
  const isNative = isNativePlatform();

  _oauthDiag = {
    isNative,
    redirectUrl: fromUrl,
    oauthUrl: null,
    browserOpened: false,
    callbackReceived: false,
    callbackUrl: null,
    tokenExtracted: false,
    tokenStored: false,
    authMeResult: null,
    lastError: null,
  };

  // If not native or plugins missing, fall back to the web flow
  if (!isNative || !App || !Browser) {
    _oauthDiag.lastError = !isNative
      ? 'Not native — web flow'
      : `Missing plugins: App=${!!App} Browser=${!!Browser}`;
    console.log('[capacitor-auth] Falling back to web flow:', _oauthDiag.lastError);
    base44.auth.loginWithProvider('google', fromUrl);
    return;
  }

  // 1. Build OAuth URL
  const oauthUrl = buildOAuthUrl('google', fromUrl);
  _oauthDiag.oauthUrl = oauthUrl;
  console.log('[capacitor-auth] OAuth URL:', oauthUrl);

  // 2. Set up appUrlOpen listener BEFORE opening the browser
  let listenerHandle = null;
  const callbackPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      _oauthDiag.lastError = 'OAuth callback timeout (120s) — appUrlOpen did not fire';
      reject(new Error('OAuth callback timeout'));
    }, 120000);

    const addListenerResult = App.addListener('appUrlOpen', ({ url }) => {
      console.log('[capacitor-auth] appUrlOpen received:', url);
      // Only handle URLs that contain a token
      if (url.includes('access_token=') || url.includes('token=')) {
        clearTimeout(timeout);
        _oauthDiag.callbackReceived = true;
        _oauthDiag.callbackUrl = url;
        // Close the Chrome Custom Tab
        Browser.close().catch(() => {});
        resolve(url);
      }
    });

    // Capacitor 5+ returns a Promise; Capacitor 3-4 returns the handle
    Promise.resolve(addListenerResult).then((h) => {
      if (h && h.remove) listenerHandle = h;
    });
  });

  // 3. Open in Chrome Custom Tab
  try {
    await Browser.open({ url: oauthUrl });
    _oauthDiag.browserOpened = true;
    console.log('[capacitor-auth] Chrome Custom Tab opened');
  } catch (e) {
    _oauthDiag.lastError = `Browser.open failed: ${e.message}`;
    console.error('[capacitor-auth] Browser.open failed:', e);
    if (listenerHandle) listenerHandle.remove().catch(() => {});
    // Fall back to web flow
    base44.auth.loginWithProvider('google', fromUrl);
    return;
  }

  // 4. Wait for the callback
  let callbackUrl;
  try {
    callbackUrl = await callbackPromise;
  } catch (e) {
    console.error('[capacitor-auth] Callback failed:', e.message);
    if (listenerHandle) listenerHandle.remove().catch(() => {});
    return;
  }

  // 5. Extract the token
  const token = extractTokenFromUrl(callbackUrl);
  _oauthDiag.tokenExtracted = !!token;
  console.log('[capacitor-auth] Token extracted:', token ? `YES (${token.length}ch)` : 'NO');

  if (!token) {
    _oauthDiag.lastError = 'No token found in callback URL';
    console.error('[capacitor-auth] No token in callback:', callbackUrl);
    if (listenerHandle) listenerHandle.remove().catch(() => {});
    return;
  }

  // 6. Store the token in the same localStorage keys AuthContext reads
  try {
    localStorage.setItem('base44_access_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('base44_session_active', '1');
    _oauthDiag.tokenStored = true;
    console.log('[capacitor-auth] Token stored in localStorage');
  } catch (e) {
    _oauthDiag.lastError = `localStorage write failed: ${e.message}`;
    console.error('[capacitor-auth] localStorage failed:', e);
    if (listenerHandle) listenerHandle.remove().catch(() => {});
    return;
  }

  // 7. Set on SDK and verify with auth.me()
  try {
    base44.auth.setToken(token);
    console.log('[capacitor-auth] Token set on SDK, verifying with auth.me()...');
    const meUser = await base44.auth.me();
    _oauthDiag.authMeResult = `success: ${meUser?.email || 'unknown'}`;
    console.log('[capacitor-auth] ✅ auth.me() succeeded:', meUser?.email);
  } catch (e) {
    _oauthDiag.authMeResult = `failed: ${e.message}`;
    _oauthDiag.lastError = `auth.me() failed: ${e.message}`;
    console.error('[capacitor-auth] auth.me() failed:', e);
    // Still navigate — the token may work on a fresh page load
  }

  // Clean up listener
  if (listenerHandle) listenerHandle.remove().catch(() => {});

  // 8. Hard-navigate to the app (triggers fresh AuthContext init with the stored token)
  console.log('[capacitor-auth] Navigating to', navigatePath);
  window.location.href = navigatePath;
}

// ── Global appUrlOpen listener (cold start + warm start) ───────────────

/**
 * Sets up a global appUrlOpen listener for cold-start deep links and
 * unexpected warm-start callbacks. Call this early in the app lifecycle
 * (e.g., in AuthProvider's useEffect).
 *
 * @param {(token: string) => void} onTokenReceived  Called when a token is captured
 */
export function setupGlobalAppUrlListener(onTokenReceived) {
  const App = getAppPlugin();
  if (!App) {
    console.log('[capacitor-auth] App plugin not available — skipping global listener');
    return;
  }

  // Cold-start: app was launched via a deep link with a token
  if (App.getLaunchUrl) {
    App.getLaunchUrl()
      .then(({ url }) => {
        if (url && (url.includes('access_token=') || url.includes('token='))) {
          console.log('[capacitor-auth] Cold-start launch URL with token:', url);
          const token = extractTokenFromUrl(url);
          if (token) {
            localStorage.setItem('base44_access_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('base44_session_active', '1');
            if (onTokenReceived) onTokenReceived(token);
          }
        }
      })
      .catch(() => {});
  }

  // Warm-start: app is running, OAuth callback arrives via appUrlOpen
  const addListenerResult = App.addListener('appUrlOpen', ({ url }) => {
    console.log('[capacitor-auth] Global appUrlOpen:', url);
    if (url.includes('access_token=') || url.includes('token=')) {
      const token = extractTokenFromUrl(url);
      if (token) {
        localStorage.setItem('base44_access_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('base44_session_active', '1');
        if (onTokenReceived) onTokenReceived(token);
      }
    }
  });

  // Return a cleanup function
  let handle = null;
  Promise.resolve(addListenerResult).then((h) => {
    if (h && h.remove) handle = h;
  });

  return () => {
    if (handle) handle.remove().catch(() => {});
  };
}