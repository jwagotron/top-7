import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { setLocalRole } from '@/lib/RoleContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CoachOnboarding({ userType = 'coach' }) {
  const { user, refetchUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '',
    school_club: '',
    location: '',
    season_year: '',
    description: '',
    motto: '',
    website: '',
    contact_info: '',
    logo_url: '',
    auto_join: false,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', res.file_url);
    setUploading(false);
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    setSaving(true);
    const inviteCode = generateInviteCode();
    try {
      await base44.entities.Team.create({
        ...form,
        coach_email: user.email,
        invite_code: inviteCode,
        status: 'active',
      });
      await base44.auth.updateMe({ user_type: userType });
      setLocalRole(userType);
      setDone(true);
    } catch (err) {
      console.error('Failed to create team:', err);
      toast.error('Failed to create team');
    }
    setSaving(false);
  };

  const handleSkip = async () => {
    await base44.auth.updateMe({ user_type: userType });
    setLocalRole(userType);
    await refetchUser();
  };

  const handleDone = async () => {
    await refetchUser();
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
          <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Team Created!</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            Your team <strong>{form.name}</strong> is ready. You can now add athletes, assign workouts, and manage your team from the Coach Panel.
          </p>
          <button
            onClick={handleDone}
            className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Go to Coach Panel
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Create Your Team</h1>
              <p className="text-xs text-muted-foreground">You can create more teams later from the Coach Panel.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Logo Upload */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Team Logo</Label>
                <p className="text-xs text-muted-foreground mb-1">Optional — PNG or JPG recommended</p>
                <label className="cursor-pointer">
                  <span className="text-xs text-primary font-medium hover:underline">
                    {uploading ? 'Uploading…' : 'Upload logo'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Required */}
            <div className="space-y-1.5">
              <Label>Team Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Lincoln XC Varsity" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>School / Club</Label>
                <Input value={form.school_club} onChange={e => set('school_club', e.target.value)} placeholder="Lincoln High School" />
              </div>
              <div className="space-y-1.5">
                <Label>City / Location</Label>
                <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Chicago, IL" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Season / Year</Label>
                <Input value={form.season_year} onChange={e => set('season_year', e.target.value)} placeholder="Fall 2025" />
              </div>
              <div className="space-y-1.5">
                <Label>Team Motto</Label>
                <Input value={form.motto} onChange={e => set('motto', e.target.value)} placeholder="Run fast, think faster" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell athletes a bit about the team…" className="h-20 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Info</Label>
                <Input value={form.contact_info} onChange={e => set('contact_info', e.target.value)} placeholder="coach@email.com" />
              </div>
            </div>

            {/* Join mode */}
            <div className="p-3 rounded-xl border border-border bg-muted/30">
              <p className="text-sm font-medium mb-1">Athlete Join Mode</p>
              <p className="text-xs text-muted-foreground mb-2">Can be changed later from your team settings.</p>
              <div className="flex gap-2">
                {[
                  { val: false, label: 'Approval Required', desc: 'You review each request' },
                  { val: true, label: 'Auto-Join', desc: 'Anyone with the code joins instantly' },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => set('auto_join', opt.val)}
                    className={`flex-1 p-2.5 rounded-lg border-2 text-left transition-all ${
                      form.auto_join === opt.val ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip for now
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Team'}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}