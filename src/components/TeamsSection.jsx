import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, LogOut, Copy, Check, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import JoinTeamModal from '@/components/JoinTeamModal';

export default function TeamsSection() {
  const { user, refetchUser } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCoach = user?.role === 'coach';
  const isAthlete = user?.role === 'athlete';
  const hasCoach = !!user?.coach_email;
  const hasTeamCode = !!user?.team_code;

  // Fetch coach info if athlete is connected
  const { data: coachInfo } = useQuery({
    queryKey: ['coach-info', user?.coach_email],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.filter({});
      return users.find(u => u.email === user.coach_email);
    },
    enabled: !!user?.coach_email,
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.team_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Team code copied!');
  };

  const handleLeaveTeam = async () => {
    if (window.confirm('Leave this team?')) {
      try {
        await base44.auth.updateMe({ coach_email: null });
        await refetchUser?.();
        toast.success('Left team');
      } catch (err) {
        toast.error('Failed to leave team');
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCoach && !hasTeamCode && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Generate a team code to invite athletes to join your team.
              </p>
              <Button
                onClick={async () => {
                  try {
                    await base44.functions.invoke('generateTeamCode', {});
                    await refetchUser?.();
                    toast.success('Team code generated!');
                  } catch (err) {
                    toast.error('Failed to generate team code');
                  }
                }}
                variant="outline"
              >
                Generate Team Code
              </Button>
            </div>
          )}

          {isCoach && hasTeamCode && (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Your Team Code
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="text-base py-1 px-3 font-mono">{user.team_code}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyCode}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with athletes so they can join your team.
              </p>
            </div>
          )}

          {isAthlete && !hasCoach && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You're not connected to a coach yet. Enter your coach's team code to join their team and receive personalized training plans.
              </p>
              <Button onClick={() => setShowJoinModal(true)} className="w-full">
                Enter Team Code
              </Button>
            </div>
          )}

          {isAthlete && hasCoach && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Connected Coach
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(coachInfo?.full_name || user.coach_email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {coachInfo?.full_name || 'Coach'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      {user.coach_email}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleLeaveTeam}
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Team
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <JoinTeamModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={refetchUser}
      />
    </>
  );
}