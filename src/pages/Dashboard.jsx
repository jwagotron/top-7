import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import JoinTeamCTA from '@/components/dashboard/JoinTeamCTA';
import WorkoutDetailDrawer from '@/components/dashboard/WorkoutDetailDrawer.jsx';
import {
  Activity, MapPin, Clock, CheckCircle2, ChevronRight,
  Footprints, Bike, Waves, Dumbbell, CircleDot,
  Moon, Play
} from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import { useCompletions } from '@/hooks/useCompletions';
import {
  startOfWeek, endOfWeek, isWithinInterval, format, isToday,
  isTomorrow, isSameDay, addDays
} from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const sportIcons = {
  run: Footprints, bike: Bike, swim: Waves, strength: Dumbbell, other: CircleDot,
};

const intensityColors = {
  easy: 'bg-secondary/10 text-secondary border-secondary/20',
  moderate: 'bg-primary/10 text-primary border-primary/20',
  hard: 'bg-accent/10 text-accent border-accent/20',
  race_pace: 'bg-destructive/10 text-destructive border-destructive/20',
  recovery: 'bg-muted text-muted-foreground border-border',
};

function dayLabel(dateObj) {
  if (isToday(dateObj)) return 'Today';
  if (isTomorrow(dateObj)) return 'Tomorrow';
  return format(dateObj, 'EEE, MMM d');
}


export default function Dashboard() {
  const { role, canPreview } = useRole();
  const { user, refetchUser } = useAuth();
  const { athleteEmail, plannedWorkouts, activePlan, isLoading } = useAssignedPlan();
  const { completions, completeMut } = useCompletions(athleteEmail);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showTodayWorkout, setShowTodayWorkout] = useState(false);


  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', athleteEmail],
    queryFn: () => base44.entities.Workout.filter({ created_by: athleteEmail }, '-date', 100),
    enabled: !!athleteEmail,
  });

  const { data: memberships = [], isLoading: isLoadingMemberships } = useQuery({
    queryKey: ['athlete-memberships-dash', athleteEmail],
    queryFn: () => base44.entities.TeamMembership.filter({ athlete_email: athleteEmail, status: 'active' }),
    enabled: !!athleteEmail,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  // Suppress JoinTeamCTA while memberships are loading to avoid flashing it for existing members
  const hasTeam = isLoadingMemberships || memberships.length > 0 || !!user?.team_id || !!user?.coach_email;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekWorkouts = workouts.filter(w => {
    const d = parseDateOnly(w.date);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const { toDisplay, label, convertPaceLabel, paceLabel } = useUnits();
  const totalDistanceKm = thisWeekWorkouts.reduce((s, w) => s + (w.distance_km || 0), 0);
  const totalDistance = toDisplay(totalDistanceKm);
  const totalDuration = thisWeekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const totalCalories = thisWeekWorkouts.length > 0
    ? Math.round(thisWeekWorkouts.reduce((s, w) => s + (w.calories || 0), 0) / thisWeekWorkouts.length)
    : 0;
  const totalWorkouts = thisWeekWorkouts.length;



  const isCompleted = (w) =>
    w.status === 'completed' ||
    completions.some(c => c.planned_workout_id === w.id);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const todayWorkout = plannedWorkouts.find(w => isSameDay(parseDateOnly(w.scheduled_date), today));
  const todayCompletion = todayWorkout ? completions.find(c => c.planned_workout_id === todayWorkout.id) : null;
  const todayDone = !!todayCompletion;

  // Recent completed workouts
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="My Progress" />
        <div className="flex justify-center py-24">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="My Progress" />
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5 lg:space-y-6 pb-24 lg:pb-8">

        {/* ── TODAY'S WORKOUT — always prominent ── */}
        {todayWorkout ? (
          <div className={cn(
            'rounded-2xl border-2 shadow-lg overflow-hidden transition-all duration-200',
            todayDone
              ? 'bg-secondary/5 border-secondary/30'
              : 'bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border-primary/40'
          )}>
            {/* Header row */}
            <div className="px-5 py-4 flex items-center gap-3">
              {/* Completion circle */}
              <button
                type="button"
                disabled={todayDone || completeMut.isPending || role !== 'athlete'}
                onClick={() => completeMut.mutate({ workout: todayWorkout })}
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
                  todayDone
                    ? 'bg-secondary border-secondary text-white'
                    : role === 'athlete'
                      ? 'border-primary/50 bg-transparent hover:border-primary hover:bg-primary/10 cursor-pointer'
                      : 'border-muted-foreground/30 bg-transparent cursor-default'
                )}
              >
                {todayDone
                  ? <CheckCircle2 className="w-4 h-4" />
                  : completeMut.isPending
                    ? <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin block" />
                    : <Play className="w-3 h-3 text-primary fill-primary" />
                }
              </button>

              {/* Title / meta */}
              <button
                type="button"
                onClick={() => setShowTodayWorkout(v => !v)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                  {todayDone ? "✓ Today's Workout — Complete!" : "Today's Workout"}
                </p>
                <p className={cn('font-bold text-lg leading-tight truncate', todayDone ? 'text-secondary' : 'text-foreground')}>
                  {todayWorkout.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                  {todayWorkout.run_type && (
                    <span className="text-xs text-muted-foreground capitalize">{todayWorkout.run_type.replace(/_/g, ' ')}</span>
                  )}
                  {todayWorkout.target_distance_km && (
                    <span className="text-xs text-muted-foreground">{toDisplay(todayWorkout.target_distance_km).toFixed(1)} {label}</span>
                  )}
                  {todayWorkout.target_duration_minutes && (
                    <span className="text-xs text-muted-foreground">{todayWorkout.target_duration_minutes} min</span>
                  )}
                  {todayWorkout.intensity && (
                    <Badge variant="outline" className={cn('text-[10px] capitalize py-0', intensityColors[todayWorkout.intensity])}>
                      {todayWorkout.intensity.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </button>

              <ChevronRight
                className={cn('w-5 h-5 text-muted-foreground/40 shrink-0 transition-transform duration-200', showTodayWorkout && 'rotate-90')}
                onClick={() => setShowTodayWorkout(v => !v)}
              />
            </div>

            {/* Expanded detail */}
            {showTodayWorkout && (
              <div className="px-5 pb-5 pt-1 space-y-3 border-t border-border/20">
                {todayWorkout.warmup_description && (
                  <div className="p-3 rounded-xl bg-secondary/5 border border-secondary/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-secondary/70 mb-1">Warm-Up</p>
                    <p className="text-sm text-foreground/80">{todayWorkout.warmup_description}</p>
                  </div>
                )}
                {todayWorkout.main_set_description && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1">Main Set</p>
                    <p className="text-sm text-foreground/80">{todayWorkout.main_set_description}</p>
                  </div>
                )}
                {todayWorkout.cooldown_description && (
                  <div className="p-3 rounded-xl bg-muted border border-border/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Cool-Down</p>
                    <p className="text-sm text-foreground/80">{todayWorkout.cooldown_description}</p>
                  </div>
                )}
                {todayDone && todayCompletion?.notes && (
                  <p className="text-xs text-muted-foreground italic">"{todayCompletion.notes}"</p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Rest day card
          <div className="rounded-2xl border border-border/30 bg-muted/30 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Today's Workout</p>
              <p className="font-semibold text-muted-foreground">Rest Day — no workout scheduled</p>
            </div>
          </div>
        )}

        {/* JoinTeam CTA — athletes only */}
        {role === 'athlete' && !hasTeam && <JoinTeamCTA onSuccess={refetchUser} />}

        {/* This week stats */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            This Week · {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard title="Workouts" value={totalWorkouts} icon={Activity} color="primary" />
            <StatCard title="Distance" value={totalDistance.toFixed(1)} unit={label} icon={MapPin} color="secondary" />
            <StatCard title="Time" value={totalDuration} unit="min" icon={Clock} color="accent" />
          </div>
        </div>

        <WeeklyChart workouts={thisWeekWorkouts} />

        {/* Recent Activity */}
        <div className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-base font-bold tracking-tight">Recent Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tap a workout to see full details & analytics</p>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No workouts logged yet</p>
            ) : recentWorkouts.map(w => {
              const SportIcon = sportIcons[w.sport] || CircleDot;
              const hasDetail = !!(w.distance_km || w.duration_minutes);
              return (
                <button key={w.id} type="button" onClick={() => setSelectedWorkout(w)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/30 hover:bg-background/90 active:scale-[0.99] transition-all duration-150 text-left">
                  <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <SportIcon className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate flex-1">{w.title}</p>
                      <span className="text-[11px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                        {w.date ? format(parseDateOnly(w.date), 'MMM d') : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {w.duration_minutes && <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1"><Clock className="w-3 h-3" />{w.duration_minutes}m</span>}
                      {w.distance_km && <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1"><MapPin className="w-3 h-3" />{toDisplay(w.distance_km).toFixed(2)} {label}</span>}
                      {w.avg_pace && <span className="text-[11px] text-muted-foreground/70">{convertPaceLabel(w.avg_pace)} {paceLabel}</span>}
                    </div>
                  </div>
                  {hasDetail && <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedWorkout && (
        <WorkoutDetailDrawer workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />
      )}
    </div>
  );
}