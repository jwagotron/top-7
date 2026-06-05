import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle, UserMinus, Clock, Users, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamMembershipList({ teamId, coachEmail, members }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Use passed members prop (shared cache from CoachPanel) so counts stay in sync
  const nonCoachMemberships = (members || []).filter(m => m.athlete_email !== coachEmail);
  const pending = nonCoachMemberships.filter(m => m.status === 'pending');
  const active = nonCoachMemberships.filter(m => m.status === 'active');

  const [removingId, setRemovingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const removingAthlete = nonCoachMemberships.find(m => m.id === removingId);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['memberships'] });
    qc.invalidateQueries({ queryKey: ['team-memberships'] });
    qc.invalidateQueries({ queryKey: ['athlete-memberships'] });
    qc.invalidateQueries({ queryKey: ['athlete-memberships-dash'] });
    qc.invalidateQueries({ queryKey: ['team-roster', teamId] });
  };

  const handleAction = async (membershipId, action) => {
    if (action === 'remove') {
      setRemovingId(membershipId);
      return;
    }
    if (action === 'approve') {
      setApprovingId(membershipId);
      try {
        await base44.functions.invoke('manageMembership', { membership_id: membershipId, action: 'approve' });
        invalidateAll();
        toast.success('Athlete approved!');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Could not approve athlete. Try again.');
      } finally {
        setApprovingId(null);
      }
      return;
    }
    try {
      await base44.functions.invoke('manageMembership', { membership_id: membershipId, action });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const confirmRemove = async () => {
    if (!removingId) return;
    try {
      await base44.functions.invoke('manageMembership', { membership_id: removingId, action: 'remove' });
      invalidateAll();
      toast.success('Athlete removed');
    } catch (err) {
      toast.error('Could not remove athlete. Try again.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <AlertDialog open={!!removingId} onOpenChange={(open) => !open && setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove athlete from team?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingAthlete ? `${removingAthlete.athlete_name || removingAthlete.athlete_email} will be removed from the team. This action cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold">Pending Requests ({pending.length})</p>
          </div>
          <div className="space-y-2">
            {pending.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {(m.athlete_name || m.athlete_email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.athlete_name || m.athlete_email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.athlete_email}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs bg-secondary hover:bg-secondary/90"
                    onClick={() => handleAction(m.id, 'approve')}
                    disabled={approvingId === m.id}
                  >
                    {approvingId === m.id
                      ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Approving...</>
                      : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleAction(m.id, 'reject')} disabled={approvingId === m.id}>
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Active Athletes ({active.length})</p>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
            No active athletes yet. Share your invite code to get started.
          </p>
        ) : (
          <div className="space-y-1.5">
            {active.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/athlete-profile?athlete=${encodeURIComponent(m.athlete_email)}&name=${encodeURIComponent(m.athlete_name || m.athlete_email)}`)}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(m.athlete_name || m.athlete_email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.athlete_name || m.athlete_email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.athlete_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleAction(m.id, 'remove'); }}>
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}