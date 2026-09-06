import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { detectRuntime } from '@/lib/runtimeDetect';
import { isNativePlatform } from '@/lib/capacitorAuth';
import { recordAuthPhase } from '@/lib/authSession';

/** Both buttons use the same provider. Email registration is a separate action. */
export function startGoogleLogin() {
  const returnUrl = new URL('/', window.location.origin);
  recordAuthPhase('opening_google', {
    method:'google', startedAt:Date.now(), callbackSeen:false,
  });
  const runtime = detectRuntime();
  if (isNativePlatform() || runtime.isWebView) {
    // The inspected Base44 Android shell intercepts app.base44.com/api/apps/auth.
    // Navigate directly to that same platform endpoint instead of first visiting
    // the site's proxy URL. The shell still owns Auth Tab; no manual browser,
    // intent, custom scheme, access-token forwarding, or postMessage listener.
    const loginUrl = new URL('/api/apps/auth/login', 'https://app.base44.com');
    loginUrl.searchParams.set('app_id', appParams.appId);
    loginUrl.searchParams.set('from_url', returnUrl.href);
    window.location.assign(loginUrl.href);
    return;
  }
  // A browser stays on its current origin. Do not force a branded web login
  // onto the old native build's Base44 origin, or vice versa.
  base44.auth.loginWithProvider('google', '/');
}
