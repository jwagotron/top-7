import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, LogOut, Copy, Check } from 'lucide-react';
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
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Join a coach's team to receive personalized training plans.
              </p>
              <Button onClick={() => setShowJoinModal(true)} className="w-full">
                Join a Team
              </Button>
            </div>
          )}

          {isAthlete && hasCoach && (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Connected Coach
                </p>
                <Badge variant="secondary" className="text-base py-1 px-3">
                  {user.coach_email}
                </Badge>
              </div>
              <Button
                onClick={handleLeaveTeam}
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
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