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
import { Plus, Clock, X, Loader2, CheckCircle2 } from 'lucide-react';

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

  // Open the modal, always restoring current selection state
  const openMultiSelect = () => {
    setSelected(value.type === 'multiple' ? value.athletes : []);
    setShowMultiSelect(true);
  };

  const handleMultiSelectChange = (email, checked) => {
    setSelected(prev => checked ? [...prev, email] : prev.filter(e => e !== email));
  };

  const handleMultiSelectSave = () => {
    onChange({ type: 'multiple', athletes: selected });
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
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign to Athletes</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Active Athletes */}
              {athletes.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Active Athletes</p>
                  <div className="space-y-1">
                    {athletes.map(athlete => (
                      <div key={athlete.email} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <Checkbox
                          checked={selected.includes(athlete.email)}
                          onCheckedChange={(checked) => handleMultiSelectChange(athlete.email, checked)}
                          id={`ath-${athlete.email}`}
                        />
                        <label htmlFor={`ath-${athlete.email}`} className="text-sm cursor-pointer flex-1 select-none">
                          {athlete.name || athlete.email}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm font-medium text-foreground">No active athletes yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Invite athletes below to assign plans to them</p>
                </div>
              )}

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div className={athletes.length > 0 ? 'border-t border-border/40 pt-3' : ''}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pending Invites</p>
                  <div className="space-y-1.5">
                    {pendingInvites.map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/20 border border-border/30">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{inv.athlete_name || inv.athlete_email}</p>
                          <p className="text-xs text-muted-foreground truncate">{inv.athlete_email}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSimulateAcceptance(inv)}
                            title="Preview only: simulate athlete accepting invite"
                            className="text-[10px] px-1.5 py-0.5 rounded border border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors font-medium"
                          >
                            Activate ⚡
                          </button>
                          <button
                            onClick={() => handleCancelInvite(inv.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
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

            <div className="flex justify-between gap-3 pt-3 border-t border-border/30">
              <Button size="sm" variant="outline" onClick={openInvite} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Invite
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowMultiSelect(false)}>Cancel</Button>
                <Button size="sm" onClick={handleMultiSelectSave} disabled={selected.length === 0}>
                  Save {selected.length > 0 ? `(${selected.length})` : ''}
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