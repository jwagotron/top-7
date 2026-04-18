import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
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
  const { role } = useRole();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const isCoach = role === 'coach';
  const isAthlete = role === 'athlete';
  const hasCoach = !!user?.coach_email;
  const hasTeamCode = !!user?.team_code;

  // Auto-generate team code for coaches on first load
  useEffect(() => {
    if (isCoach && !hasTeamCode && !autoGenerating) {
      setAutoGenerating(true);
      base44.functions.invoke('generateTeamCode', {})
        .then(async (res) => {
          if (res?.data?.team_code) {
            // Force refetch to get the newly saved code from the database
            await refetchUser?.();
          }
        })
        .catch(err => console.error('Auto-generation failed:', err))
        .finally(() => setAutoGenerating(false));
    }
  }, [isCoach, hasTeamCode]);

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
          {isCoach && (
           <div className="space-y-3">
             <div>
               <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                 Your Team Code
               </p>
               <div className="flex items-center gap-2">
                 <Badge className="text-base py-1 px-3 font-mono">
                   {autoGenerating ? 'Generating...' : (user?.team_code || '—')}
                 </Badge>
                 {user?.team_code && (
                   <Button
                     size="sm"
                     variant="ghost"
                     onClick={handleCopyCode}
                     className="h-8 w-8 p-0"
                     title="Copy team code"
                   >
                     {copied ? (
                       <Check className="w-4 h-4 text-green-600" />
                     ) : (
                       <Copy className="w-4 h-4" />
                     )}
                   </Button>
                 )}
               </div>
             </div>
             <p className="text-xs text-muted-foreground">
               Share this code with athletes so they can join your team.
             </p>
           </div>
          )}

          {isAthlete && !hasCoach && (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">No Team Joined</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Join a team to receive workouts from your coach
                </p>
              </div>
              <Button onClick={() => setShowJoinModal(true)} className="w-full">
                Join Team
              </Button>
            </div>
          )}

          {isAthlete && hasCoach && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Coach
                  </p>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(coachInfo?.full_name || user.coach_email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {coachInfo?.full_name || 'Coach'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
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

          {!isAthlete && !isCoach && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Team information will appear here once you join a team.
              </p>
              <Button onClick={() => setShowJoinModal(true)} className="w-full">
                Join Team
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