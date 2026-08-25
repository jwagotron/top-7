import React, { useEffect, useMemo, useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { APP_NAME } from '@/lib/branding';
import { base44 } from '@/api/base44Client';
import { isNativePlatform } from '@/lib/capacitorAuth';
import { detectRuntime } from '@/lib/runtimeDetect';

const ANDROID_PACKAGE = 'com.base69c32a03dfe10b4cd6245abe.app';

function readToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('access_token')
      || params.get('token')
      || localStorage.getItem('base44_access_token')
      || localStorage.getItem('token')
      || null;
  } catch (_) {
    return null;
  }
}

function getAndroidIntentUrl(token) {
  const query = new URLSearchParams({
    access_token: token,
  });

  // Explicitly target the Play Store package. The HTTPS URL is also a verified
  // Android App Link for top-7.app, so Android can deliver the callback to the
  // installed Top 7 app instead of leaving it inside the Chrome Custom Tab.
  return `intent://top-7.app/auth-return?${query.toString()}#Intent;scheme=https;package=${ANDROID_PACKAGE};end`;
}

export default function AuthReturn() {
  const [error, setError] = useState('');
  const [showReturnButton, setShowReturnButton] = useState(false);
  const token = useMemo(() => readToken(), []);

  const runtime = detectRuntime();
  const isAndroid = runtime.isAndroid;
  const native = isNativePlatform() || (runtime.isAndroid && (runtime.isWebView || runtime.isCapacitor || runtime.isStandalone));

  const returnToAndroidApp = () => {
    if (!token) {
      setError('Google sign-in finished, but no Top 7 session was returned. Please try again.');
      return;
    }
    window.location.href = getAndroidIntentUrl(token);
  };

  useEffect(() => {
    if (!token) {
      setError('Google sign-in finished, but no Top 7 session was returned. Please try again.');
      return;
    }

    try {
      localStorage.setItem('base44_access_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('base44_session_active', '1');
      base44.auth.setToken(token);
    } catch (_) {}

    // If Android already delivered the verified App Link into the installed
    // WebView, the token is now in the app's storage. Finish the login there.
    if (native) {
      window.location.replace('/');
      return;
    }

    // This route is reserved for the installed-app Google OAuth flow. If the
    // callback remains in Android Chrome instead of reopening Top 7, force an
    // explicit package-targeted intent so the token crosses the browser/WebView
    // storage boundary. If Chrome blocks an automatic external-app launch,
    // reveal the same action as a user tap.
    if (isAndroid) {
      const timer = window.setTimeout(() => {
        returnToAndroidApp();
        window.setTimeout(() => setShowReturnButton(true), 900);
      }, 150);
      return () => window.clearTimeout(timer);
    }

    // Ordinary web OAuth should never linger on this bridge page.
    window.location.replace('/');
  }, [token, native, isAndroid]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-5">
          <AppLogo className="w-14 h-14" rounded="rounded-2xl" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Finishing sign in</h1>
        {!error && (
          <p className="mt-2 text-sm text-muted-foreground">
            Returning you to {APP_NAME}…
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {showReturnButton && !error && (
          <button
            type="button"
            onClick={returnToAndroidApp}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Return to Top 7
          </button>
        )}
      </div>
    </div>
  );
}
