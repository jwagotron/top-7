import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, UserMinus, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamMembershipList({ teamId, coachEmail }) {
  const qc = useQueryClient();

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships', teamId],
    queryFn: () => base44.entities.TeamMembership.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const pending = memberships.filter(m => m.status === 'pending');
  const active = memberships.filter(m => m.status === 'active');

  const handleAction = async (membershipId, action) => {
    await base44.functions.invoke('manageMembership', { membership_id: membershipId, action });
    qc.invalidateQueries({ queryKey: ['memberships', teamId] });
    toast.success(action === 'approve' ? 'Athlete approved!' : 'Athlete removed');
  };

  return (
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
                  <Button size="sm" className="h-7 px-2 text-xs bg-secondary hover:bg-secondary/90" onClick={() => handleAction(m.id, 'approve')}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleAction(m.id, 'reject')}>
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
              <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(m.athlete_name || m.athlete_email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.athlete_name || m.athlete_email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.athlete_email}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleAction(m.id, 'remove')}>
                  <UserMinus className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}