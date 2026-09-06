import React, { useEffect, useMemo, useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { APP_NAME } from '@/lib/branding';
import { base44 } from '@/api/base44Client';

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

/**
 * Legacy OAuth landing route.
 *
 * Google sign-in now returns directly to `/`, which is the callback path the
 * Base44 native mobile wrapper expects. Keep this route only so an old/in-flight
 * callback cannot strand a user. It never tries to launch an Android package or
 * redirect to Google Play.
 */
export default function AuthReturn() {
  const token = useMemo(() => readToken(), []);
  const [error, setError] = useState('');

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

    window.location.replace('/');
  }, [token]);

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
      </div>
    </div>
  );
}
