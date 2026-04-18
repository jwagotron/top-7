import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinTeam() {
  const { user, isAuthenticated } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, status, team_name, error }
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Auto-read code from URL ?code=XXXXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, []);

  // Auto-submit if code came from URL and user is logged in
  useEffect(() => {
    if (code && isAuthenticated && user && !autoSubmitted) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code')) {
        setAutoSubmitted(true);
        handleJoin(code);
      }
    }
  }, [code, isAuthenticated, user, autoSubmitted]);

  const handleJoin = async (joinCode) => {
    const c = (joinCode || code).trim().toUpperCase();
    if (!c) return;
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('joinTeam', { invite_code: c });
      setResult({ success: true, ...res.data });
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Join a Team</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter the invite code your coach shared with you</p>
        </div>

        {result?.success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {result.status === 'active' ? 'Joined!' : 'Request Sent!'}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {result.status === 'active'
                ? `You've joined ${result.team_name}. Welcome to the team!`
                : `Your request to join ${result.team_name} has been sent. Your coach will review it soon.`}
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Go to Dashboard
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {!isAuthenticated && (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-center">
                You need to be signed in to join a team.{' '}
                <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </div>
            )}

            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC12345"
              className="uppercase font-mono text-center text-lg tracking-widest"
              maxLength={8}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />

            {result?.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {result.error}
              </div>
            )}

            <Button onClick={() => handleJoin()} disabled={loading || !code.trim()} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining…</> : 'Join Team'}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}