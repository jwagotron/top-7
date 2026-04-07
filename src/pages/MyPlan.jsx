import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/lib/RoleContext';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import TopBar from '@/components/layout/TopBar';
import TodayWorkout from '@/components/myplan/TodayWorkout';
import WeeklySchedule from '@/components/myplan/WeeklySchedule';
import PlanProgress from '@/components/myplan/PlanProgress';
import {
  ClipboardList, ChevronDown, ChevronUp,
  CheckCircle2, Clock, MapPin, StickyNote, Loader2, ArrowLeft
} from 'lucide-react';
import { format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const statusConfig = {
  active:    { label: 'Active',    class: 'text-secondary bg-secondary/10 border-secondary/20' },
  draft:     { label: 'Draft',     class: 'text-muted-foreground bg-muted border-border' },
  paused:    { label: 'Paused',    class: 'text-accent bg-accent/10 border-accent/20' },
  completed: { label: 'Completed', class: 'text-primary bg-primary/10 border-primary/20' },
};

const intensityColors = {
  easy:      'text-secondary bg-secondary/10 border-secondary/20',
  moderate:  'text-primary bg-primary/10 border-primary/20',
  hard:      'text-accent bg-accent/10 border-accent/20',
  race_pace: 'text-destructive bg-destructive/10 border-destructive/20',
  recovery:  'text-muted-foreground bg-muted border-border',
};

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {children}
      </span>
    </div>
  );
}

export default function MyPlan() {
  const { role } = useRole();
  const navigate = useNavigate();
  const { toDisplay, label } = useUnits();
  const [selectedDayWorkout, setSelectedDayWorkout] = useState(undefined);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [notesMap, setNotesMap] = useState({});
  const [showNotesFor, setShowNotesFor] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (role && role !== 'athlete') navigate('/coach', { replace: true });
  }, [role, navigate]);

  const { activePlan, plannedWorkouts, isLoading: plansLoading, athleteEmail } = useAssignedPlan();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: completions = [] } = useQuery({
    queryKey: ['completions', athleteEmail],
    queryFn: () => base44.entities.WorkoutCompletion.filter({ athlete_email: athleteEmail }, '-completed_at', 200),
    enabled: !!athleteEmail,
  });

  const todayWorkout = plannedWorkouts.find(w => isSameDay(new Date(w.scheduled_date), today));

  const displayWorkout = selectedDayWorkout === undefined ? todayWorkout : selectedDayWorkout;
  const displayCompletion = displayWorkout
    ? completions.find(c => c.planned_workout_id === displayWorkout.id)
    : null;

  const isViewingToday = selectedDayWorkout === undefined;

  const completedCount = completions.filter(
    c => c.status === 'completed' && c.plan_id === activePlan?.id
  ).length;

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['completions', athleteEmail] });
      setCompletingId(null);
      setShowNotesFor(null);
    },
  });

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="My Plan" />
        <div className="flex justify-center py-24">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="My Plan" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-5 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted/60 flex items-center justify-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xl font-bold text-foreground">No plan assigned yet</p>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Your coach will assign a training plan soon. Check back after your next check-in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sc = statusConfig[activePlan.status] || statusConfig.draft;
  const sortedWorkouts = [...plannedWorkouts].sort(
    (a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="My Plan" />

      <div className="max-w-2xl mx-auto px-4 lg:px-6 pt-5 pb-28 lg:pb-10 space-y-7">

        {/* Plan overview */}
        <div className="rounded-2xl bg-card border border-border/30 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-60" />
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight leading-tight flex-1 min-w-0">
                {activePlan.name}
              </h2>
              <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0", sc.class)}>
                {sc.label}
              </span>
            </div>

            {activePlan.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activePlan.description}
              </p>
            )}

            {(activePlan.duration_weeks || activePlan.goal_event || activePlan.difficulty || activePlan.sport) && (
              <div className="flex flex-wrap gap-2">
                {activePlan.duration_weeks && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {activePlan.duration_weeks} weeks
                  </span>
                )}
                {activePlan.difficulty && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full capitalize">
                    {activePlan.difficulty}
                  </span>
                )}
                {activePlan.sport && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full capitalize">
                    {activePlan.sport}
                  </span>
                )}
                {activePlan.goal_event && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {activePlan.goal_event}
                  </span>
                )}
              </div>
            )}

            {plannedWorkouts.length > 0 && (
              <div className="border-t border-border/20 pt-4">
                <PlanProgress total={plannedWorkouts.length} completed={completedCount} />
              </div>
            )}
          </div>
        </div>

        {/* Today's / selected workout */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <SectionLabel>
              {isViewingToday
                ? 'Today · ' + format(today, 'EEEE, MMM d')
                : displayWorkout
                  ? format(new Date(displayWorkout.scheduled_date), 'EEEE, MMM d')
                  : format(new Date(), 'EEEE, MMM d') + ' · Rest'
              }
            </SectionLabel>
            {!isViewingToday && (
              <button
                onClick={() => setSelectedDayWorkout(undefined)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <ArrowLeft className="w-3 h-3" /> Today
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
          <SectionLabel>This Week</SectionLabel>
          <WeeklySchedule
            plannedWorkouts={plannedWorkouts}
            completions={completions}
            selectedDate={selectedDayWorkout !== undefined && selectedDayWorkout
              ? new Date(selectedDayWorkout.scheduled_date)
              : null}
            onSelectDate={(day) => {
              const workout = plannedWorkouts.find(w => isSameDay(new Date(w.scheduled_date), day));
              if (isToday(day)) {
                setSelectedDayWorkout(undefined);
              } else {
                setSelectedDayWorkout(workout || null);
              }
            }}
          />
        </div>

        {/* Full schedule */}
        {sortedWorkouts.length > 0 && (
          <div>
            <button
              onClick={() => setShowAllWorkouts(v => !v)}
              className="flex items-center gap-2 w-full px-1 mb-3 group"
            >
              <ClipboardList className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 flex-1 text-left">
                Full Schedule ({sortedWorkouts.length} workouts)
              </span>
              {showAllWorkouts
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
              }
            </button>

            {showAllWorkouts && (
              <div className="rounded-2xl border border-border/30 bg-card overflow-hidden divide-y divide-border/20">
                {sortedWorkouts.map(w => {
                  const comp = completions.find(c => c.planned_workout_id === w.id);
                  const done = comp?.status === 'completed';
                  const isShowingNotes = showNotesFor === w.id;

                  return (
                    <div
                      key={w.id}
                      className={cn(
                        "px-4 py-3 transition-colors",
                        done ? "bg-secondary/5" : "bg-transparent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-center shrink-0 w-9 pt-0.5">
                          <p className="text-[9px] font-semibold uppercase text-muted-foreground/50 leading-none">
                            {format(new Date(w.scheduled_date), 'MMM')}
                          </p>
                          <p className={cn(
                            "text-sm font-bold leading-snug",
                            isToday(new Date(w.scheduled_date)) ? "text-primary" : "text-foreground/70"
                          )}>
                            {format(new Date(w.scheduled_date), 'd')}
                          </p>
                          <p className="text-[9px] text-muted-foreground/40 leading-none">
                            {format(new Date(w.scheduled_date), 'EEE')}
                          </p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            {done && <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />}
                            <span className={cn(
                              "text-sm font-semibold",
                              done ? "text-secondary" : "text-foreground"
                            )}>
                              {w.title}
                            </span>
                            {w.intensity && (
                              <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                                intensityColors[w.intensity]
                              )}>
                                {w.intensity.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3">
                            {w.target_duration_minutes && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="w-2.5 h-2.5" />{w.target_duration_minutes}m
                              </span>
                            )}
                            {w.target_distance_km && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="w-2.5 h-2.5" />{toDisplay(w.target_distance_km)} {label}
                              </span>
                            )}
                          </div>

                          {isShowingNotes && (
                            <textarea
                              className="mt-2 w-full rounded-lg bg-muted/40 border border-border/40 px-2.5 py-2 text-xs resize-none outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
                              rows={2}
                              placeholder="How did it go?"
                              value={notesMap[w.id] || ''}
                              onChange={e => setNotesMap(m => ({ ...m, [w.id]: e.target.value }))}
                              autoFocus
                            />
                          )}
                          {done && comp?.notes && !isShowingNotes && (
                            <p className="text-[11px] text-muted-foreground italic mt-1">
                              "{comp.notes}"
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          {!done ? (
                            <React.Fragment>
                              <button
                                onClick={() => setShowNotesFor(isShowingNotes ? null : w.id)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  isShowingNotes
                                    ? "bg-muted text-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                )}
                              >
                                <StickyNote className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setCompletingId(w.id);
                                  completeMut.mutate({ workout: w, notes: notesMap[w.id] });
                                }}
                                disabled={completingId === w.id && completeMut.isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-[11px] font-semibold transition-colors"
                              >
                                {completingId === w.id && completeMut.isPending
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <React.Fragment><CheckCircle2 className="w-3 h-3" /> Done</React.Fragment>
                                }
                              </button>
                            </React.Fragment>
                          ) : (
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-secondary/15">
                              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                            </span>
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