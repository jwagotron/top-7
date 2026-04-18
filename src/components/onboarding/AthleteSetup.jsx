import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AthleteSetup() {
  const { user, refetchUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    display_name: user?.full_name || '',
    unit_preference: 'km',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleComplete = async () => {
    if (!form.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({
      full_name: form.display_name,
      unit_preference: form.unit_preference,
      onboarding_completed: true,
    });
    await refetchUser();
    setDone(true);
    setSaving(false);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            Your athlete profile is ready. Let's start tracking your runs and building your training.
          </p>
          <ul className="text-left space-y-2 mb-8">
            {[
              'Track your runs and activities',
              'Follow assigned training plans',
              'View personal analytics and progress',
              'Set and track your goals',
              'Connect Garmin for auto-sync',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Go to My Dashboard
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
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
              <h1 className="text-2xl font-bold">Set Up Your Athlete Profile</h1>
              <p className="text-sm text-muted-foreground">A few quick details to get you started</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1.5">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.display_name}
                onChange={e => set('display_name', e.target.value)}
                placeholder="Your name as it should appear"
              />
              <p className="text-xs text-muted-foreground">This is how coaches and teammates will see you.</p>
            </div>

            {/* Unit Preference */}
            <div className="space-y-1.5">
              <Label>Distance Units <span className="text-destructive">*</span></Label>
              <Select value={form.unit_preference} onValueChange={v => set('unit_preference', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilometers</SelectItem>
                  <SelectItem value="mi">Miles</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">All distances will be displayed in your preferred unit.</p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              onClick={handleComplete}
              disabled={saving || !form.display_name.trim()}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}