import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, hasToken, checkAppState } = useAuth();
  const navigate = useNavigate();

  // If the user lands on /login with a valid token, try to restore the session
  // and redirect to the app instead of showing the login form.
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    // Token exists but not authenticated yet — try to restore session
    if (hasToken && !isAuthenticated) {
      console.log('[login] token found on /login — attempting session restore');
      checkAppState();
    }
  }, [isAuthenticated, hasToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    console.log('[login] email/password login started for:', email);
    try {
      const result = await base44.auth.loginViaEmailPassword(email, password);
      console.log('[login] ✅ loginViaEmailPassword succeeded | result keys:', result ? Object.keys(result) : 'null');

      // Explicitly persist the token ourselves — the SDK writes it internally,
      // but on Android WebView the localStorage write may not complete before
      // the hard redirect fires. Writing it here ensures it's in storage.
      if (result?.access_token) {
        try {
          localStorage.setItem('base44_access_token', result.access_token);
          localStorage.setItem('token', result.access_token);
          console.log('[login] token explicitly persisted to localStorage');
        } catch (_) {}
        // Force the SDK to use the fresh token
        try { base44.auth.setToken(result.access_token); } catch (_) {}
      }

      // Also persist session marker
      try { localStorage.setItem('base44_session_active', '1'); } catch (_) {}

      // Verify the session actually works by calling me() BEFORE redirecting.
      // This catches the case where the token is saved but the SDK can't use it.
      console.log('[login] verifying session with base44.auth.me()…');
      try {
        const meUser = await base44.auth.me();
        console.log('[login] ✅ session verified — email:', meUser?.email, '| user_type:', meUser?.user_type);
      } catch (meErr) {
        console.error('[login] ⚠️ session verification failed:', meErr.message, 'status:', meErr.status);
        // Don't block the redirect — the token may still work on the fresh page load.
        // The AuthContext will retry me() with setToken() on the new page.
      }

      // Small delay to let Android WebView localStorage settle before hard redirect
      console.log('[login] redirecting to / in 300ms (Android storage settle delay)');
      setTimeout(() => { window.location.href = "/"; }, 300);
    } catch (err) {
      console.error('[login] ❌ login failed:', err.message, 'status:', err.status);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    console.log('[login] Google Sign-In started, redirecting to provider');
    // Persist session marker so we know auth was in progress
    try { localStorage.setItem('base44_session_active', '1'); } catch (_) {}
    // Use full current URL as fromUrl so the OAuth callback returns to the right place
    // on Android/Capacitor where the origin may differ from web
    const currentUrl = window.location.origin + window.location.pathname;
    base44.auth.loginWithProvider("google", currentUrl);
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}