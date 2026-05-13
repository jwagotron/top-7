import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function CreateTeamModal({ open, onClose, onCreated, coachEmail }) {
  const [form, setForm] = useState({ name: '', school_club: '', location: '', season_year: '', description: '', motto: '', website: '', contact_info: '', logo_url: '', auto_join: false });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', res.file_url);
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Team name is required'); return; }
    setSaving(true);
    await base44.entities.Team.create({ ...form, coach_email: coachEmail, invite_code: generateCode(), status: 'active' });
    toast.success(`Team "${form.name}" created!`);
    setForm({ name: '', school_club: '', location: '', season_year: '', description: '', motto: '', website: '', contact_info: '', logo_url: '', auto_join: false });
    setSaving(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0">
              {form.logo_url ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
            </div>
            <label className="cursor-pointer text-xs text-primary font-medium hover:underline">
              {uploading ? 'Uploading…' : 'Upload Logo'} <span className="text-muted-foreground font-normal">(optional)</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Team Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Lincoln XC Varsity" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>School / Club</Label><Input value={form.school_club} onChange={e => set('school_club', e.target.value)} placeholder="Lincoln High" /></div>
            <div className="space-y-1.5"><Label>City / Location</Label><Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Chicago, IL" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Season / Year</Label><Input value={form.season_year} onChange={e => set('season_year', e.target.value)} placeholder="Fall 2025" /></div>
            <div className="space-y-1.5"><Label>Motto</Label><Input value={form.motto} onChange={e => set('motto', e.target.value)} placeholder="Run fast…" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="h-16 resize-none" placeholder="About the team…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Website <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label><Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label>Contact <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label><Input value={form.contact_info} onChange={e => set('contact_info', e.target.value)} placeholder="email or phone" /></div>
          </div>

          {/* Join mode */}
          <div className="flex gap-2">
            {[{ val: false, label: 'Approval Required' }, { val: true, label: 'Auto-Join' }].map(opt => (
              <button key={String(opt.val)} onClick={() => set('auto_join', opt.val)}
                className={`flex-1 py-2 text-xs rounded-lg border-2 font-semibold transition-all ${form.auto_join === opt.val ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Team'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}