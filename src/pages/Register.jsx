import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { startGoogleLogin } from "@/lib/googleLogin";
import { getAuthFailureMessage, getAuthStatus, recordAuthPhase } from "@/lib/authSession";
import SignInDiagnostics from "@/components/SignInDiagnostics";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const { isAuthenticated, acceptLoginSession, authError, dismissAuthError } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) navigate('/', {replace:true});
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    dismissAuthError();
    setError("");
    setAccountExists(false);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email:email.trim(), password });
      setShowOtp(true);
    } catch (err) {
      const responseData = err?.response?.data || err?.data || {};
      const status = err?.status || err?.response?.status;
      const rawMessage = [
        err?.message,
        responseData?.message,
        responseData?.detail,
        responseData?.error,
        responseData?.reason,
      ].filter(Boolean).join(" ").toLowerCase();

      const isExistingAccount =
        status === 409 ||
        /already\s+(exists|registered|created|in use)|account\s+exists|email\s+(exists|registered|in use)|duplicate/.test(rawMessage);

      if (isExistingAccount) {
        setAccountExists(true);
        setError("An account already exists with this email. Log in instead using the same sign-in method you used before.");
      } else {
        setError(err.message || responseData?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    dismissAuthError();
    setError("");
    setLoading(true);
    let verificationCompleted = otpVerified;
    try {
      // Older/newer platform responses can differ: verification is not proof
      // of a usable session unless a token is returned and me() validates it.
      const verified = otpVerified ? null : await base44.auth.verifyOtp({email:email.trim(), otpCode});
      verificationCompleted = true;
      setOtpVerified(true);
      const result = verified?.access_token ? verified
        : await base44.auth.loginViaEmailPassword(email.trim(), password);
      await acceptLoginSession(result?.access_token);
      navigate('/', {replace:true});
    } catch (err) {
      recordAuthPhase('registration_verification_failed', {httpStatus:getAuthStatus(err)});
      setError(verificationCompleted
        ? getAuthFailureMessage(err)
        : 'That verification code could not be accepted. Check the code or request another one.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email.trim());
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    dismissAuthError();
    setError("");
    try { startGoogleLogin(); }
    catch { setError('Google sign-in could not be opened. Please try again.'); }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || (!otpVerified && otpCode.length < 6)}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Create your account, then choose Athlete or Coach."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Button
        type="button"
        disabled={loading}
        variant="outline"
        className="w-full h-12 text-sm font-medium"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>
      <p className="mt-2 mb-6 text-center text-xs text-muted-foreground">
        New or returning? Continue with Google will create your account or sign you in automatically.
      </p>

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
          <p>{error}</p>
          {accountExists && (
            <Link
              to={`/login?email=${encodeURIComponent(email)}`}
              className="inline-block mt-2 font-semibold text-primary hover:underline"
            >
              Log in instead →
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
              autoComplete="email"
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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <SignInDiagnostics code={authError?.code} />
    </AuthLayout>
  );
}