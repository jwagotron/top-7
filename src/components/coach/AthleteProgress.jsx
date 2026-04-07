import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, MapPin, StickyNote, Users } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

function ProgressBar({ pct }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden w-24">
      <div
        className={cn("h-full rounded-full transition-all", pct >= 80 ? "bg-secondary" : pct >= 40 ? "bg-primary" : "bg-accent")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AthleteRow({ athlete, plans, plannedWorkouts, completions }) {
  const { toDisplay, label } = useUnits();
  const [expanded, setExpanded] = useState(false);

  const assignedPlan = plans.find(p =>
    p.assigned_to && p.assigned_to.includes(athlete.email)
  );

  const planWorkouts = assignedPlan
    ? plannedWorkouts.filter(w => w.plan_id === assignedPlan.id && w.assigned_to === athlete.email)
    : plannedWorkouts.filter(w => w.assigned_to === athlete.email);

  const athleteCompletions = completions.filter(c => c.athlete_email === athlete.email);
  const completedCount = athleteCompletions.filter(c => c.status === 'completed').length;
  const total = planWorkouts.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const recentCompletions = [...athleteCompletions]
    .filter(c => c.status === 'completed')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 3);

  const pending = planWorkouts.filter(w => {
    const comp = athleteCompletions.find(c => c.planned_workout_id === w.id);
    return !comp || comp.status !== 'completed';
  });

  return (
    <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
          {(athlete.full_name || athlete.email).charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{athlete.full_name || athlete.email}</p>
          <p className="text-xs text-muted-foreground truncate">
            {assignedPlan ? assignedPlan.name : 'No plan assigned'}
          </p>
        </div>

        {/* Progress */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <p className="text-xs font-semibold text-foreground">{completedCount}/{total}</p>
          <ProgressBar pct={pct} />
          <p className="text-[10px] text-muted-foreground">{pct}%</p>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-3">
          {/* Recent completions */}
          {recentCompletions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Completions</p>
              <div className="space-y-1.5">
                {recentCompletions.map(comp => {
                  const w = planWorkouts.find(pw => pw.id === comp.planned_workout_id);
                  return (
                    <div key={comp.id} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="flex-1 text-foreground truncate">{w?.title || 'Workout'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {comp.completed_at ? format(new Date(comp.completed_at), 'MMM d') : '—'}
                      </span>
                      {comp.notes && <StickyNote className="w-3 h-3 text-muted-foreground shrink-0" title={comp.notes} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending workouts */}
          {pending.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Pending / Missed ({pending.length})
              </p>
              <div className="space-y-1">
                {pending.slice(0, 5).map(w => (
                  <div key={w.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="flex-1 truncate">{w.title}</span>
                    <span className="shrink-0">{format(new Date(w.scheduled_date), 'MMM d')}</span>
                  </div>
                ))}
                {pending.length > 5 && (
                  <p className="text-xs text-muted-foreground pl-3.5">+{pending.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">No workouts assigned to this athlete yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AthleteProgress({ athletes }) {
  const { data: plans = [] } = useQuery({
    queryKey: ['plans-all'],
    queryFn: () => base44.entities.TrainingPlan.list('-created_date', 100),
  });

  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('scheduled_date', 1000),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['completions-all'],
    queryFn: () => base44.entities.WorkoutCompletion.list('-completed_at', 500),
  });

  const activeAthletes = athletes.filter(a => a.role === 'user' || a.role === 'athlete');

  if (activeAthletes.length === 0) return null;

  return (
    <Card className="rounded-2xl bg-muted/20 border border-border/30 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base font-bold">Athlete Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-5 space-y-2">
        {activeAthletes.map(athlete => (
          <AthleteRow
            key={athlete.id}
            athlete={athlete}
            plans={plans}
            plannedWorkouts={plannedWorkouts}
            completions={completions}
          />
        ))}
      </CardContent>
    </Card>
  );
}