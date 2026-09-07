import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";
import { startGoogleLogin } from "@/lib/googleLogin";
import { recordAuthPhase } from "@/lib/authSession";
import { describePasswordLoginError, PASSWORD_LOGIN_BUILD } from "@/lib/passwordLoginErrors";
import SignInDiagnostics from "@/components/SignInDiagnostics";

export default function Login() {
  const [email, setEmail] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("email") || "";
    } catch (_) {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFailure, setPasswordFailure] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, acceptLoginSession, authError, dismissAuthError } = useAuth();
  const navigate = useNavigate();

  // The duplicate-account handoff may prefill ?email=. Consume it once, then
  // remove it so the browser address bar stays clean and doesn't expose the
  // user's email after the form has already captured it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('email')) return;
    params.delete('email');
    const query = params.toString();
    window.history.replaceState(window.history.state, document.title, `/login${query ? `?${query}` : ''}${window.location.hash}`);
  }, []);

  // AuthProvider owns restoration. Never start a second validation on every
  // Login remount, which could repeatedly unmount and re-open this form.
  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace:true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    dismissAuthError();
    setError("");
    setPasswordFailure(null);
    setLoading(true);
    recordAuthPhase('email_login', {method:'password', startedAt:Date.now(), callbackSeen:false});
    try {
      // Whitespace around an autofilled email is not part of its identity.
      // Never trim or otherwise modify the password.
      const result = await base44.auth.loginViaEmailPassword(email.trim(), password);
      await acceptLoginSession(result?.access_token);
      navigate("/", { replace:true });
    } catch (err) {
      // Base44 also uses HTTP 400 for credential rejections. Classify the
      // response body rather than hiding every 400 behind a generic message.
      // Only fixed, safe messages/codes leave the classifier, never raw payloads.
      const failure = describePasswordLoginError(err);
      recordAuthPhase('email_login_failed', {httpStatus:failure.status});
      setPasswordFailure(failure);
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    dismissAuthError();
    setError("");
    setPasswordFailure(null);
    try { startGoogleLogin(); }
    catch { setError('Google sign-in could not be opened. Please try again.'); }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Your training, team, and feedback are waiting."
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
        type="button"
        disabled={loading}
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

      {(error || authError) && (
        <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 text-sm">
          <p>{error || authError.message}</p>
          {(passwordFailure?.code || authError?.code) && <p className="mt-2 text-xs">{passwordFailure?.code || authError.code}</p>}
          {passwordFailure?.recovery && (
            <Link to="/forgot-password" state={{email:email.trim()}} className="inline-block mt-3 font-semibold underline">
              Reset password for this email
            </Link>
          )}
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
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
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
            <Link to="/forgot-password" state={{email:email.trim()}} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-describedby="password-help"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-12 h-12"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(value => !value)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
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
      <p id="password-help" className="mt-4 text-xs text-muted-foreground">
        Already joined with Google? Use Continue with Google. This password field is for a password you set for Top 7, not your Google password.
      </p>
      <SignInDiagnostics code={passwordFailure?.code || authError?.code} formBuild={PASSWORD_LOGIN_BUILD} />
    </AuthLayout>
  );
}