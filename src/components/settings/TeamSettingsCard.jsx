import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, LogOut, QrCode, Clock } from 'lucide-react';
import JoinTeamModal from '@/components/JoinTeamModal';
import { toast } from 'sonner';

export default function TeamSettingsCard() {
  const { user, refetchUser } = useAuth();
  const { role } = useRole();
  const qc = useQueryClient();
  const [showJoin, setShowJoin] = useState(false);

  const isAthlete = role === 'athlete';
  const isCoach = role === 'coach';

  // Athlete: fetch their active memberships
  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.TeamMembership.filter({ athlete_email: user?.email }),
    enabled: !!user?.email && isAthlete,
  });

  // Get team info for each membership
  const { data: teamDetails = [] } = useQuery({
    queryKey: ['my-team-details', myMemberships.map(m => m.team_id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        myMemberships.map(m => base44.entities.Team.filter({ id: m.team_id }).then(r => r[0]).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: myMemberships.length > 0,
  });

  // Coach: fetch their teams
  const { data: coachTeams = [] } = useQuery({
    queryKey: ['coach-teams', user?.email],
    queryFn: () => base44.entities.Team.filter({ coach_email: user?.email, status: 'active' }),
    enabled: !!user?.email && isCoach,
  });

  const handleLeave = async (membershipId, teamName) => {
    if (!window.confirm(`Leave ${teamName}?`)) return;
    await base44.entities.TeamMembership.update(membershipId, { status: 'removed' });
    qc.invalidateQueries({ queryKey: ['my-memberships'] });
    toast.success('Left team');
  };

  const activeMemberships = myMemberships.filter(m => m.status === 'active');
  const pendingMemberships = myMemberships.filter(m => m.status === 'pending');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" /> Teams
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAthlete && (
            <>
              {pendingMemberships.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending Requests</p>
                  {pendingMemberships.map(m => {
                    const team = teamDetails.find(t => t.id === m.team_id);
                    return (
                      <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
                        <Clock className="w-4 h-4 text-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{team?.name || 'Team'}</p>
                          <p className="text-xs text-muted-foreground">Awaiting coach approval</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeMemberships.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My Teams</p>
                  {activeMemberships.map(m => {
                    const team = teamDetails.find(t => t.id === m.team_id);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {team?.logo_url ? <img src={team.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{team?.name || 'Team'}</p>
                          <p className="text-xs text-muted-foreground">{team?.school_club || m.coach_email}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive px-2" onClick={() => handleLeave(m.id, team?.name || 'this team')}>
                          <LogOut className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeMemberships.length === 0 && pendingMemberships.length === 0 && (
                <p className="text-sm text-muted-foreground">You're not on any teams yet.</p>
              )}

              <Button onClick={() => setShowJoin(true)} variant="outline" className="w-full">
                <QrCode className="w-4 h-4 mr-2" /> Join a Team
              </Button>
            </>
          )}

          {isCoach && (
            <div className="space-y-2">
              {coachTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teams yet. Create one from the Coach Panel.</p>
              ) : (
                coachTeams.map(team => (
                  <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {team.logo_url ? <img src={team.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-secondary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.school_club || team.location}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{team.auto_join ? 'Open Join' : 'Coach Approval'}</Badge>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">Manage teams and invites from the Coach Panel.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <JoinTeamModal open={showJoin} onOpenChange={setShowJoin} onSuccess={() => qc.invalidateQueries({ queryKey: ['my-memberships'] })} />
    </>
  );
}