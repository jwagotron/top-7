import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Zap, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const energyColors = {
  great: 'text-secondary bg-secondary/10',
  good: 'text-primary bg-primary/10',
  okay: 'text-accent bg-accent/10',
  tired: 'text-destructive/70 bg-destructive/10',
  exhausted: 'text-destructive bg-destructive/10',
};

const rpeColor = (rpe) => {
  if (!rpe) return 'bg-muted text-muted-foreground';
  if (rpe <= 4) return 'bg-secondary/15 text-secondary';
  if (rpe <= 7) return 'bg-accent/15 text-accent';
  return 'bg-destructive/15 text-destructive';
};

export default function AthleteFeedbackList({ teamId, plannedWorkouts, athleteEmail = null }) {
  const { data: feedbackList = [], isLoading, isError } = useQuery({
    queryKey: ['athlete-feedback', teamId, athleteEmail || 'all'],
    queryFn: async () => {
      if (!teamId) return [];
      const res = await base44.functions.invoke('getTeamFeedback', {
        team_id: teamId,
        athlete_email: athleteEmail || null,
      });
      return res.data?.feedback || [];
    },
    enabled: !!teamId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Map workout_id → workout title
  const workoutMap = Object.fromEntries((plannedWorkouts || []).map(w => [w.id, w]));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-14">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-7 h-7 text-destructive/60" />
        </div>
        <p className="font-semibold text-foreground">Couldn’t load athlete feedback</p>
        <p className="text-sm text-muted-foreground mt-1">Refresh the page and try again. Team data remains protected.</p>
      </div>
    );
  }

  if (feedbackList.length === 0) {
    return (
      <div className="text-center py-14">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-foreground">No feedback yet</p>
        <p className="text-sm text-muted-foreground mt-1">Athletes will appear here after they complete workouts and send feedback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedbackList.map(fb => {
        const workout = workoutMap[fb.workout_id];
        return (
          <div key={fb.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{fb.athlete_name || fb.athlete_email}</p>
                {fb.athlete_name && fb.athlete_name !== fb.athlete_email && (
                  <p className="text-[11px] text-muted-foreground">{fb.athlete_email}</p>
                )}
                {workout && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {workout.title} · {workout.scheduled_date}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {fb.created_date ? formatDistanceToNow(new Date(fb.created_date), { addSuffix: true }) : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {fb.energy_level && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${energyColors[fb.energy_level] || 'bg-muted text-muted-foreground'}`}>
                  <Heart className="w-3 h-3" /> {fb.energy_level}
                </span>
              )}
              {fb.rpe && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${rpeColor(fb.rpe)}`}>
                  <Zap className="w-3 h-3" /> RPE {fb.rpe}/10
                </span>
              )}
            </div>

            {fb.notes && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                "{fb.notes}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}