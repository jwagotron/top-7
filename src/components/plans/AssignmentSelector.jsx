import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, X, Loader2, CheckCircle2, Check, UserCircle2 } from 'lucide-react';

export default function AssignmentSelector({ value, onChange }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selected, setSelected] = useState(value.type === 'multiple' ? value.athletes : []);

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Active athletes linked to this coach
  const { data: relationships = [] } = useQuery({
    queryKey: ['coach-athletes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.CoachAthleteRelationship.list();
      return all.filter(r =>
        r.coach_email === user.email &&
        r.status === 'active' &&
        r.athlete_email !== user.email
      );
    },
    enabled: !!user?.email,
  });

  const athletes = relationships.map(r => ({ email: r.athlete_email, name: r.athlete_name }));

  // Pending invitations sent by this coach
  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ['pending-invites', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.AthleteInvitation.list('-invited_at', 50);
      return all.filter(inv => inv.coach_email === user.email && inv.status === 'pending');
    },
    enabled: !!user?.email,
  });

  // Draft mode tracked inside the modal independently
  const [draftMode, setDraftMode] = useState('all'); // 'all' | 'multiple'

  // Open the modal, always restoring current saved state
  const openMultiSelect = () => {
    setDraftMode(value.type === 'multiple' ? 'multiple' : 'all');
    setSelected(value.type === 'multiple' ? value.athletes : []);
    setShowMultiSelect(true);
  };

  const handleMultiSelectChange = (email, checked) => {
    setSelected(prev => checked ? [...prev, email] : prev.filter(e => e !== email));
  };

  const handleMultiSelectSave = () => {
    if (draftMode === 'all') {
      onChange({ type: 'all', athletes: [] });
    } else {
      onChange({ type: 'multiple', athletes: selected });
    }
    setShowMultiSelect(false);
  };

  const openInvite = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteError('');
    setInviteSuccess('');
    setShowInvite(true);
  };

  const handleInviteAthlete = async () => {
    const email = inviteEmail.trim().toLowerCase();
    setInviteError('');
    setInviteSuccess('');

    // Validation
    if (!email) { setInviteError('Please enter an email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError('Please enter a valid email address.'); return; }
    if (email === user?.email) { setInviteError('You cannot invite yourself as an athlete.'); return; }

    // Duplicate check
    const alreadyPending = pendingInvites.some(inv => inv.athlete_email === email);
    if (alreadyPending) { setInviteError('This athlete already has a pending invite.'); return; }

    setInviteLoading(true);
    console.log('[Invite] Submitting invite:', { email, coachEmail: user?.email });

    try {
      const record = await base44.entities.AthleteInvitation.create({
        coach_email: user.email,
        athlete_email: email,
        athlete_name: inviteName.trim() || email.split('@')[0],
        status: 'pending',
        invited_at: new Date().toISOString(),
      });

      console.log('[Invite] Success. Created record id:', record?.id);

      setInviteSuccess(`Invitation sent to ${email}`);
      setInviteEmail('');
      setInviteName('');

      // Refresh pending invites immediately
      await refetchInvites();
      qc.invalidateQueries({ queryKey: ['pending-invites', user?.email] });

      // Auto-close after short delay so user sees confirmation
      setTimeout(() => {
        setShowInvite(false);
        setInviteSuccess('');
      }, 1800);
    } catch (err) {
      console.error('[Invite] Failed:', err);
      setInviteError('Could not send invite. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await base44.entities.AthleteInvitation.update(inviteId, { status: 'canceled' });
      refetchInvites();
    } catch (err) {
      console.error('[Invite] Cancel failed:', err);
    }
  };

  // PREVIEW ONLY — simulates athlete accepting invite
  const handleSimulateAcceptance = async (inv) => {
    try {
      console.log('[Preview] Simulating acceptance for:', inv.athlete_email);
      // Create active coach-athlete relationship
      await base44.entities.CoachAthleteRelationship.create({
        coach_email: user.email,
        athlete_email: inv.athlete_email,
        athlete_name: inv.athlete_name || inv.athlete_email.split('@')[0],
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      });
      // Mark invitation as accepted
      await base44.entities.AthleteInvitation.update(inv.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });
      console.log('[Preview] Athlete activated:', inv.athlete_email);
      qc.invalidateQueries({ queryKey: ['coach-athletes', user?.email] });
      qc.invalidateQueries({ queryKey: ['pending-invites', user?.email] });
    } catch (err) {
      console.error('[Preview] Simulate acceptance failed:', err);
    }
  };

  const getDisplayLabel = () => {
    if (value.type === 'all') return 'All Athletes';
    if (value.type === 'multiple' && value.athletes.length > 0)
      return value.athletes.length === 1 ? '1 Athlete' : `${value.athletes.length} Athletes`;
    return 'Select Athletes';
  };

  return (
    <>
      <button
        onClick={openMultiSelect}
        className="h-8 px-2 sm:px-3 flex items-center gap-1 rounded-md text-xs sm:text-sm bg-muted hover:bg-muted/80 transition-colors text-foreground"
      >
        {getDisplayLabel()}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {/* ── Assign to Athletes modal ── */}
      {showMultiSelect && (
        <Dialog open onOpenChange={() => setShowMultiSelect(false)}>
          <DialogContent className="max-w-sm w-[calc(100vw-2rem)] p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
              <DialogTitle className="text-base">Assign to Athletes</DialogTitle>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="px-5 pt-4 pb-1">
              <div className="flex rounded-xl overflow-hidden border border-border bg-muted/40 p-1 gap-1">
                {[
                  { id: 'all', label: 'All Athletes' },
                  { id: 'multiple', label: 'Select Athletes' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDraftMode(opt.id)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      draftMode === opt.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {draftMode === 'all' && (
                <p className="text-xs text-muted-foreground mt-2.5 px-1">
                  This plan will be visible to all active athletes on your roster.
                </p>
              )}
              {draftMode === 'multiple' && selected.length > 0 && (
                <p className="text-xs text-primary font-medium mt-2.5 px-1">
                  {selected.length} athlete{selected.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '45vh' }}>
              {/* Active Athletes — only shown in Select mode */}
              {draftMode === 'multiple' && athletes.length > 0 ? (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">Active Athletes</p>
                  <div className="space-y-1">
                    {athletes.map(athlete => {
                      const isSelected = selected.includes(athlete.email);
                      return (
                        <button
                          key={athlete.email}
                          onClick={() => handleMultiSelectChange(athlete.email, !isSelected)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'bg-primary/10 border border-primary/30 text-foreground'
                              : 'bg-muted/30 border border-transparent hover:bg-muted/60 text-foreground'
                          }`}
                        >
                          {/* Avatar circle */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {isSelected
                              ? <Check className="w-4 h-4" />
                              : (athlete.name || athlete.email).charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                              {athlete.name || athlete.email}
                            </p>
                            {athlete.name && (
                              <p className="text-xs text-muted-foreground truncate">{athlete.email}</p>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : draftMode === 'multiple' ? (
                <div className="py-8 text-center px-5">
                  <UserCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No active athletes yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Invite athletes to assign plans to them</p>
                </div>
              ) : null}

              {/* Pending Invites — always visible so coach can manage/activate */}
              {pendingInvites.length > 0 && (
                <div className="px-3 pt-2 pb-3 border-t border-border/30 mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">Pending Invites</p>
                  <div className="space-y-1.5">
                    {pendingInvites.map(inv => (
                      <div key={inv.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/20 border border-border/30">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{inv.athlete_name || inv.athlete_email}</p>
                          <p className="text-xs text-muted-foreground truncate">{inv.athlete_email}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSimulateAcceptance(inv)}
                            title="Preview only: simulate athlete accepting invite"
                            className="text-[10px] px-2 py-1 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors font-medium"
                          >
                            Activate ⚡
                          </button>
                          <button
                            onClick={() => handleCancelInvite(inv.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Cancel invite"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border/40 bg-card">
              <Button size="sm" variant="outline" onClick={openInvite} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Invite Athlete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowMultiSelect(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleMultiSelectSave}
                  disabled={draftMode === 'multiple' && selected.length === 0}
                  className="min-w-[80px]"
                >
                  {draftMode === 'multiple' && selected.length > 0 ? `Save (${selected.length})` : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Invite Athlete modal ── */}
      {showInvite && (
        <Dialog open onOpenChange={() => { if (!inviteLoading) setShowInvite(false); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Invite Athlete</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Email *</Label>
                <Input
                  type="email"
                  placeholder="athlete@example.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(''); }}
                  className="mt-1"
                  disabled={inviteLoading}
                  onKeyDown={e => e.key === 'Enter' && handleInviteAthlete()}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Name (optional)</Label>
                <Input
                  placeholder="Athlete Name"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="mt-1"
                  disabled={inviteLoading}
                />
              </div>

              {/* Error message */}
              {inviteError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {inviteError}
                </div>
              )}

              {/* Success message */}
              {inviteSuccess && (
                <div className="flex items-center gap-2 text-xs text-secondary bg-secondary/10 border border-secondary/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {inviteSuccess}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInvite(false)}
                disabled={inviteLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleInviteAthlete}
                disabled={!inviteEmail.trim() || inviteLoading}
                className="min-w-[100px]"
              >
                {inviteLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}