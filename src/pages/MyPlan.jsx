import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/lib/RoleContext';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import TodayWorkout from '@/components/myplan/TodayWorkout';
import WeeklySchedule from '@/components/myplan/WeeklySchedule';
import PlanProgress from '@/components/myplan/PlanProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ClipboardList, ChevronDown, ChevronUp, CheckCircle2, Clock, MapPin, Zap, StickyNote, Loader2, Moon } from 'lucide-react';
import { format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const statusColors = {
  active: 'bg-secondary/10 text-secondary border-secondary/20',
  draft: 'bg-muted text-muted-foreground border-border',
  paused: 'bg-accent/10 text-accent border-accent/20',
  completed: 'bg-primary/10 text-primary border-primary/20',
};

const intensityColors = {
  easy: 'bg-secondary/10 text-secondary border-secondary/20',
  moderate: 'bg-primary/10 text-primary border-primary/20',
  hard: 'bg-accent/10 text-accent border-accent/20',
  race_pace: 'bg-destructive/10 text-destructive border-destructive/20',
  recovery: 'bg-muted text-muted-foreground border-border',
};

export default function MyPlan() {
  const { role } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toDisplay, label } = useUnits();
  const [selectedDayWorkout, setSelectedDayWorkout] = useState(null);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [notesMap, setNotesMap] = useState({});
  const [showNotesFor, setShowNotesFor] = useState(null);
  const qc = useQueryClient();

  // Athletes only
  useEffect(() => {
    if (role && role !== 'athlete') navigate('/coach', { replace: true });
  }, [role, navigate]);

  const athleteEmail = user?.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch athlete's assigned plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['my-plans', athleteEmail],
    queryFn: async () => {
      const all = await base44.entities.TrainingPlan.list('-created_date', 50);
      return all.filter(p => p.assigned_to && p.assigned_to.includes(athleteEmail));
    },
    enabled: !!athleteEmail,
  });

  // Active plan (prefer active status, then most recent)
  const activePlan = plans.find(p => p.status === 'active') || plans[0] || null;

  // Fetch planned workouts for the active plan
  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['my-plan-workouts', activePlan?.id],
    queryFn: () => base44.entities.PlannedWorkout.filter({ plan_id: activePlan.id }, 'scheduled_date', 500),
    enabled: !!activePlan?.id,
  });

  // Fetch completions
  const { data: completions = [] } = useQuery({
    queryKey: ['completions', athleteEmail],
    queryFn: () => base44.entities.WorkoutCompletion.filter({ athlete_email: athleteEmail }, '-completed_at', 200),
    enabled: !!athleteEmail,
  });

  // Today's workout
  const todayWorkout = plannedWorkouts.find(w => isSameDay(new Date(w.scheduled_date), today));
  const todayCompletion = todayWorkout
    ? completions.find(c => c.planned_workout_id === todayWorkout.id)
    : null;

  // Selected day from weekly schedule
  const displayWorkout = selectedDayWorkout !== undefined ? selectedDayWorkout : todayWorkout;
  const displayDate = selectedDayWorkout ? new Date(selectedDayWorkout.scheduled_date) : today;
  const displayCompletion = displayWorkout
    ? completions.find(c => c.planned_workout_id === displayWorkout.id)
    : null;

  // Progress
  const completedCount = completions.filter(c => c.status === 'completed' && c.plan_id === activePlan?.id).length;

  const completeMut = useMutation({
    mutationFn: async ({ workout, notes }) => {
      const existing = completions.find(c => c.planned_workout_id === workout.id);
      if (existing) {
        return base44.entities.WorkoutCompletion.update(existing.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes || existing.notes,
        });
      }
      return base44.entities.WorkoutCompletion.create({
        athlete_email: athleteEmail,
        planned_workout_id: workout.id,
        plan_id: workout.plan_id,
        scheduled_date: workout.scheduled_date,
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || undefined,
      });
    },
    onSuccess: (_, { workout }) => {
      qc.invalidateQueries({ queryKey: ['completions', athleteEmail] });
      setCompletingId(null);
      setShowNotesFor(null);
    },
  });

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="My Plan" />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="My Plan" />
        <div className="p-6 max-w-md mx-auto">
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">No plan assigned yet</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Your coach will assign a training plan soon.<br />Check back after your next check-in.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="My Plan" />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5 pb-24 lg:pb-8">

        {/* Plan overview card */}
        <Card className="rounded-2xl bg-card border border-border/30 shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-bold tracking-tight">{activePlan.name}</h2>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", statusColors[activePlan.status])}>
                    {activePlan.status}
                  </Badge>
                </div>
                {activePlan.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{activePlan.description}</p>
                )}
              </div>
            </div>

            {/* Plan meta */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wide border-t border-border/20 pt-3">
              {activePlan.duration_weeks && <span>Weeks · {activePlan.duration_weeks}</span>}
              {activePlan.goal_event && <span>Goal · {activePlan.goal_event}</span>}
              {activePlan.difficulty && <span>Level · <span className="capitalize">{activePlan.difficulty}</span></span>}
              {activePlan.sport && <span>Sport · <span className="capitalize">{activePlan.sport}</span></span>}
            </div>

            {/* Progress */}
            {plannedWorkouts.length > 0 && (
              <PlanProgress total={plannedWorkouts.length} completed={completedCount} />
            )}
          </CardContent>
        </Card>

        {/* Today's workout heading */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {selectedDayWorkout
                ? format(new Date(selectedDayWorkout.scheduled_date), 'EEEE, MMM d')
                : "Today's Workout — " + format(today, 'EEEE, MMM d')}
            </h3>
            {selectedDayWorkout && (
              <button
                onClick={() => setSelectedDayWorkout(undefined)}
                className="text-xs text-primary hover:underline ml-auto"
              >
                Back to today
              </button>
            )}
          </div>
          <TodayWorkout
            workout={displayWorkout || null}
            completion={displayCompletion}
            athleteEmail={athleteEmail}
          />
        </div>

        {/* Weekly schedule */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">This Week</h3>
          </div>
          <WeeklySchedule
            plannedWorkouts={plannedWorkouts}
            completions={completions}
            selectedDate={selectedDayWorkout ? new Date(selectedDayWorkout.scheduled_date) : null}
            onSelectDate={(day) => {
              const workout = plannedWorkouts.find(w => isSameDay(new Date(w.scheduled_date), day));
              setSelectedDayWorkout(workout || null);
            }}
          />
        </div>

        {/* Full plan schedule (collapsible) */}
        {plannedWorkouts.length > 0 && (
          <div>
            <button
              onClick={() => setShowAllWorkouts(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ClipboardList className="w-4 h-4" />
              Full Schedule ({plannedWorkouts.length} workouts)
              {showAllWorkouts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAllWorkouts && (
              <div className="space-y-2">
                {[...plannedWorkouts]
                  .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                  .map(w => {
                    const comp = completions.find(c => c.planned_workout_id === w.id);
                    const done = comp?.status === 'completed';
                    const isShowingNotes = showNotesFor === w.id;

                    return (
                      <div
                        key={w.id}
                        className={cn(
                          "rounded-xl border p-3 transition-all",
                          done ? "bg-secondary/5 border-secondary/20" : "bg-card border-border/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Date */}
                          <div className="text-center shrink-0 w-9">
                            <p className="text-[10px] text-muted-foreground">{format(new Date(w.scheduled_date), 'MMM')}</p>
                            <p className={cn("text-base font-bold leading-none", isToday(new Date(w.scheduled_date)) && "text-primary")}>
                              {format(new Date(w.scheduled_date), 'd')}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(w.scheduled_date), 'EEE')}</p>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {done && <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />}
                              <span className={cn("text-sm font-medium", done && "text-secondary")}>{w.title}</span>
                              {w.intensity && (
                                <Badge variant="outline" className={cn("text-[10px] capitalize", intensityColors[w.intensity])}>
                                  {w.intensity.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-3 mt-0.5">
                              {w.target_duration_minutes && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-2.5 h-2.5" />{w.target_duration_minutes}m
                                </span>
                              )}
                              {w.target_distance_km && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-2.5 h-2.5" />{toDisplay(w.target_distance_km)}{label}
                                </span>
                              )}
                            </div>
                            {/* Notes textarea */}
                            {isShowingNotes && (
                              <textarea
                                className="mt-2 w-full rounded-lg bg-muted/40 border border-border/40 px-2.5 py-2 text-xs resize-none outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
                                rows={2}
                                placeholder="Add notes…"
                                value={notesMap[w.id] || ''}
                                onChange={e => setNotesMap(m => ({ ...m, [w.id]: e.target.value }))}
                              />
                            )}
                            {done && comp?.notes && !isShowingNotes && (
                              <p className="text-xs text-muted-foreground italic mt-1">"{comp.notes}"</p>
                            )}
                          </div>

                          {/* Action */}
                          <div className="shrink-0 flex gap-1">
                            {!done && (
                              <>
                                <button
                                  onClick={() => setShowNotesFor(isShowingNotes ? null : w.id)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                  title="Add note"
                                >
                                  <StickyNote className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setCompletingId(w.id);
                                    completeMut.mutate({ workout: w, notes: notesMap[w.id] });
                                  }}
                                  disabled={completingId === w.id && completeMut.isPending}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 text-xs font-medium transition-colors"
                                >
                                  {completingId === w.id && completeMut.isPending
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <><CheckCircle2 className="w-3 h-3" /> Done</>
                                  }
                                </button>
                              </>
                            )}
                            {done && (
                              <span className="text-[10px] font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}