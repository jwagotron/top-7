import React, { useEffect, useMemo, useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { APP_NAME, APP_URL } from '@/lib/branding';
import { base44 } from '@/api/base44Client';
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

function buildAppIntent(token) {
  const appUrl = new URL('/', APP_URL);
  appUrl.searchParams.set('access_token', token);
  appUrl.searchParams.set('oauth_return', '1');

  const query = appUrl.searchParams.toString();
  return `intent://top-7.app/?${query}#Intent;scheme=https;package=${ANDROID_PACKAGE};end`;
}

export default function AuthReturn() {
  const token = useMemo(() => readToken(), []);
  const runtime = useMemo(() => detectRuntime(), []);
  const [error, setError] = useState('');
  const [showFallbacks, setShowFallbacks] = useState(false);

  const isInstalledRuntime = runtime.isAndroid
    && (runtime.isWebView || runtime.isCapacitor || runtime.isStandalone);

  const continueInBrowser = () => {
    if (!token) return;
    try {
      localStorage.setItem('base44_access_token', token);
      localStorage.setItem('token', token);
      base44.auth.setToken(token);
    } catch (_) {}
    window.location.replace('/');
  };

  const openInstalledApp = () => {
    if (!token) {
      setError('Google sign-in finished, but no Top 7 session was returned. Please try again.');
      return;
    }
    window.location.href = buildAppIntent(token);
  };

  useEffect(() => {
    if (!token) {
      setError('Google sign-in finished, but no Top 7 session was returned. Please try again.');
      return;
    }

    // app-params.js may already have consumed the URL token before this route
    // renders. Persisting it here is harmless on web and gives this page a
    // reliable browser fallback if Android refuses to launch the app.
    try {
      localStorage.setItem('base44_access_token', token);
      localStorage.setItem('token', token);
      base44.auth.setToken(token);
    } catch (_) {}

    // If Android has already delivered the verified App Link into the installed
    // Top 7 WebView, there is nothing left to hand off. Finish inside the app.
    if (isInstalledRuntime) {
      window.location.replace('/');
      return;
    }

    // Normal desktop/iOS web sign-in should simply finish in the browser.
    if (!runtime.isAndroid) {
      window.location.replace('/');
      return;
    }

    // Android OAuth commonly finishes inside a Chrome Custom Tab. Explicitly
    // target the installed Play Store package so the final authenticated page
    // returns to Top 7 instead of leaving top-7.app visible in Chrome.
    const launchTimer = window.setTimeout(openInstalledApp, 100);
    const fallbackTimer = window.setTimeout(() => setShowFallbacks(true), 1200);

    return () => {
      window.clearTimeout(launchTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [token, isInstalledRuntime, runtime.isAndroid]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-6 app-safe-viewport">
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

        {showFallbacks && !error && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={openInstalledApp}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              Open {APP_NAME}
            </button>
            <button
              type="button"
              onClick={continueInBrowser}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground"
            >
              Continue in browser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
