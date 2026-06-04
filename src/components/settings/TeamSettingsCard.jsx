import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, LogOut, QrCode, Clock, Loader2 } from 'lucide-react';
import JoinTeamModal from '@/components/JoinTeamModal';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TeamSettingsCard() {
  const { user } = useAuth();
  const { role } = useRole();
  const qc = useQueryClient();
  const [showJoin, setShowJoin] = useState(false);
  const [leavingId, setLeavingId] = useState(null);

  const isAthlete = role === 'athlete';
  const isCoach = role === 'coach';

  // Athlete: fetch memberships + team names via backend (service role reads Team)
  const { data: myTeamsData = { teams: [], memberships: [] }, refetch: refetchMyTeams } = useQuery({
    queryKey: ['my-teams-full', user?.email],
    queryFn: () => base44.functions.invoke('getMyTeams', {}).then(r => r.data),
    enabled: !!user?.email && isAthlete,
  });

  const { teams: teamDetails, memberships: myMemberships } = myTeamsData;

  // Deduplicate by team_id, keep latest
  const seen = new Set();
  const uniqueMemberships = myMemberships.filter(m => {
    if (seen.has(m.team_id)) return false;
    seen.add(m.team_id);
    return true;
  });

  const activeMemberships = uniqueMemberships.filter(m => m.status === 'active');
  const pendingMemberships = uniqueMemberships.filter(m => m.status === 'pending');

  // Coach: fetch their teams
  const { data: coachTeams = [] } = useQuery({
    queryKey: ['coach-teams', user?.email],
    queryFn: () => base44.entities.Team.filter({ coach_email: user?.email, status: 'active' }),
    enabled: !!user?.email && isCoach,
  });

  const leaveMutation = useMutation({
    mutationFn: (membershipId) =>
      base44.entities.TeamMembership.update(membershipId, { status: 'removed' }),
    onSuccess: () => {
      refetchMyTeams();
      qc.invalidateQueries({ queryKey: ['my-memberships'] });
      qc.invalidateQueries({ queryKey: ['team-membership'] });
      qc.invalidateQueries({ queryKey: ['team-roster'] });
      toast.success('Left team');
      setLeavingId(null);
    },
    onError: () => {
      toast.error('Failed to leave team. Please try again.');
      setLeavingId(null);
    },
  });

  const handleLeave = (membershipId) => {
    setLeavingId(membershipId);
    leaveMutation.mutate(membershipId);
  };

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
                          <p className="text-xs text-muted-foreground">{team?.school_club || 'Awaiting coach approval'}</p>
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
                    const teamName = team?.name || 'My Team';
                    const subtitle = team?.school_club || team?.location || (m.coach_email ? `Coach: ${m.coach_email}` : 'Active member');
                    const isLeaving = leavingId === m.id && leaveMutation.isPending;

                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {team?.logo_url
                            ? <img src={team.logo_url} alt="logo" className="w-full h-full object-cover" />
                            : <Users className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{teamName}</p>
                          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive px-2"
                              disabled={isLeaving}
                            >
                              {isLeaving
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <LogOut className="w-3.5 h-3.5" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Leave {teamName}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                You will be removed from this team. You can rejoin with a new invite code.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleLeave(m.id)}
                              >
                                Leave Team
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                      {team.logo_url
                        ? <img src={team.logo_url} alt="logo" className="w-full h-full object-cover" />
                        : <Users className="w-4 h-4 text-secondary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{team.school_club || team.location || 'Your team'}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{team.auto_join ? 'Open Join' : 'Approval'}</Badge>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">Manage teams and invites from the Coach Panel.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <JoinTeamModal
        open={showJoin}
        onOpenChange={setShowJoin}
        onSuccess={() => refetchMyTeams()}
      />
    </>
  );
}