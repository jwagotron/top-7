import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Loader2, CheckCircle2, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { setLocalRole } from '@/lib/RoleContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AthleteSetup({ userType = 'athlete' }) {
  const { user, refetchUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('profile');
  const [teamCode, setTeamCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinResult, setJoinResult] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [form, setForm] = useState({
    display_name: user?.full_name || '',
    unit_preference: user?.unit_preference || 'mi',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleComplete = async () => {
    if (!form.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: form.display_name,
        unit_preference: form.unit_preference,
        user_type: userType,
      });
      setLocalRole(userType);
      await refetchUser();
      setStep('team');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinTeam = async () => {
    const code = teamCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Enter the 8-character code your coach gave you.');
      return;
    }

    setJoining(true);
    setJoinError('');
    setJoinResult(null);
    try {
      const response = await base44.functions.invoke('joinTeam', { invite_code: code });
      setJoinResult(response.data);
      await refetchUser();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unable to join team';
      if (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('already')) {
        setJoinError('You already have a request for this team. Your coach may still need to approve it.');
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setJoinError('That team code was not found. Check the code with your coach and try again.');
      } else {
        setJoinError(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/';
  };

  if (step === 'team') {
    const joined = joinResult?.status === 'active';
    const pending = joinResult && !joined;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 overflow-y-auto app-safe-viewport-lg"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-7">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              {joinResult ? <CheckCircle2 className="w-10 h-10 text-primary" /> : <Users className="w-10 h-10 text-primary" />}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">Profile complete</p>
            <h1 className="text-2xl font-bold mb-2">{joinResult ? 'You’re connected.' : 'Join your team'}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {joined
                ? `You joined ${joinResult.team_name}. Your coach can now assign training directly to Top 7.`
                : pending
                  ? `Your request to join ${joinResult.team_name} was sent. Your coach will approve it before workouts appear.`
                  : 'Enter the invite code from your coach so your assigned workouts can show up automatically.'}
            </p>
          </div>

          {!joinResult && (
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4 shadow-sm">
              <div className="space-y-1.5">
                <Label htmlFor="team-code">Coach Team Code</Label>
                <Input
                  id="team-code"
                  value={teamCode}
                  onChange={e => {
                    setTeamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
                    setJoinError('');
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinTeam()}
                  placeholder="ABC12345"
                  autoFocus
                  className="h-12 uppercase font-mono text-center text-lg tracking-[0.22em]"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">Ask your coach for the 8-character Top 7 team code.</p>
              </div>

              {joinError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{joinError}</span>
                </div>
              )}

              <Button onClick={handleJoinTeam} disabled={joining || teamCode.length < 8} className="w-full h-11 gap-2">
                {joining ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                ) : (
                  <>Join Team <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Button onClick={goToDashboard} className="w-full h-11" variant={joinResult ? 'default' : 'outline'}>
              {joined ? 'Go to My Training' : pending ? 'Go to Dashboard' : 'I’ll join a team later'}
            </Button>
            {!joinResult && (
              <p className="text-center text-[11px] text-muted-foreground">
                You can enter a team code later from the dashboard or Settings.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto app-safe-inset"
    >
      <div className="min-h-full flex items-start justify-center p-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary mb-0.5">Step 1 of 2</p>
              <h1 className="text-2xl font-bold">Set Up Your Athlete Profile</h1>
              <p className="text-sm text-muted-foreground">Two quick details, then connect to your coach.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-5 shadow-sm">
            <div className="space-y-1.5">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.display_name}
                onChange={e => set('display_name', e.target.value)}
                placeholder="Your name as it should appear"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">This is how your coach will see you.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Distance Units <span className="text-destructive">*</span></Label>
              <Select value={form.unit_preference} onValueChange={v => set('unit_preference', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mi">Miles</SelectItem>
                  <SelectItem value="km">Kilometers</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">You can change this later in Settings.</p>
            </div>
          </div>

          <Button
            onClick={handleComplete}
            disabled={saving || !form.display_name.trim()}
            className="w-full mt-5 h-11 gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <>Continue to Team <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
