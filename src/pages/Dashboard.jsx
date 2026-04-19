import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import JoinTeamCTA from '@/components/dashboard/JoinTeamCTA';
import WorkoutDetailDrawer from '@/components/dashboard/WorkoutDetailDrawer';
import { Activity, MapPin, Clock, Flame, CheckCircle2, ChevronRight, Footprints, Bike, Waves, Dumbbell, CircleDot, Calendar } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { DEFAULT_ROUTE } from '@/lib/roleConfig';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import { useCompletions } from '@/hooks/useCompletions';
import { startOfWeek, endOfWeek, isWithinInterval, format, isToday, isTomorrow, isSameDay, addDays } from 'date-fns';
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
  const { role } = useRole();
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const { athleteEmail, plannedWorkouts, activePlan, isLoading } = useAssignedPlan();
  const { completions } = useCompletions(athleteEmail);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showAllSchedule, setShowAllSchedule] = useState(false);

  useEffect(() => {
    if (!role) return;
    if (role !== 'athlete') {
      navigate(DEFAULT_ROUTE[role] || '/coach', { replace: true });
    }
  }, [role, navigate]);

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', athleteEmail],
    queryFn: () => base44.entities.Workout.filter({ created_by: athleteEmail }, '-date', 100),
    enabled: !!athleteEmail,
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekWorkouts = workouts.filter(w => {
    const d = parseDateOnly(w.date);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const { toDisplay, label } = useUnits();
  const totalDistanceKm = thisWeekWorkouts.reduce((s, w) => s + (w.distance_km || 0), 0);
  const totalDistance = toDisplay(totalDistanceKm);
  const totalDuration = thisWeekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const totalCalories = thisWeekWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
  const totalWorkouts = thisWeekWorkouts.length;

  // Upcoming workouts — next 7 days
  const isCompleted = (w) =>
    w.status === 'completed' ||
    completions.some(c => c.planned_workout_id === w.id);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingWindow = addDays(today, 14);
  const upcomingWorkouts = plannedWorkouts
    .filter(w => !isCompleted(w) && parseDateOnly(w.scheduled_date) >= today && parseDateOnly(w.scheduled_date) <= upcomingWindow)
    .sort((a, b) => parseDateOnly(a.scheduled_date) - parseDateOnly(b.scheduled_date));

  // Today's workout
  const todayWorkout = plannedWorkouts.find(w => isSameDay(parseDateOnly(w.scheduled_date), today));
  const todayCompletion = todayWorkout ? completions.find(c => c.planned_workout_id === todayWorkout.id) : null;
  const todayDone = !!todayCompletion;

  // Recent completed workouts (clickable)
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

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
        {!user?.coach_email && !user?.team_id && (
          <JoinTeamCTA onSuccess={refetchUser} />
        )}

        {/* This week stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Workouts" value={totalWorkouts} icon={Activity} color="primary" />
          <StatCard title="Distance" value={totalDistance.toFixed(1)} unit={label} icon={MapPin} color="secondary" />
          <StatCard title="Time" value={totalDuration} unit="min" icon={Clock} color="accent" />
          <StatCard title="Calories" value={totalCalories} unit="kcal" icon={Flame} color="destructive" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 lg:gap-5">
          <WeeklyChart workouts={thisWeekWorkouts} />

          {/* Today's workout */}
          <div className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight">Today's Workout</h3>
              {format(today, 'EEE, MMM d') && (
                <span className="text-xs text-muted-foreground">{format(today, 'EEE, MMM d')}</span>
              )}
            </div>
            <div className="px-4 pb-4">
              {todayWorkout ? (
                <div className={cn('p-4 rounded-xl border', todayDone ? 'bg-secondary/5 border-secondary/20' : 'bg-card border-border/30')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', todayDone ? 'bg-secondary/10' : 'bg-primary/10')}>
                      {todayDone
                        ? <CheckCircle2 className="w-5 h-5 text-secondary" />
                        : <Calendar className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-sm', todayDone && 'text-secondary')}>{todayWorkout.title}</p>
                      {todayWorkout.run_type && (
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{todayWorkout.run_type.replace(/_/g, ' ')}</p>
                      )}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {todayWorkout.target_distance_km && (
                          <span className="text-[11px] text-muted-foreground/70">{toDisplay(todayWorkout.target_distance_km).toFixed(1)} {label}</span>
                        )}
                        {todayWorkout.target_duration_minutes && (
                          <span className="text-[11px] text-muted-foreground/70">{todayWorkout.target_duration_minutes} min</span>
                        )}
                        {todayWorkout.target_pace && (
                          <span className="text-[11px] text-muted-foreground/70">@ {todayWorkout.target_pace}</span>
                        )}
                      </div>
                      {todayWorkout.warmup_description && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{todayWorkout.warmup_description}</p>
                      )}
                      {todayWorkout.main_set_description && (
                        <p className="text-xs text-foreground/70 mt-1 leading-relaxed line-clamp-3 font-medium">{todayWorkout.main_set_description}</p>
                      )}
                    </div>
                  </div>
                  {todayWorkout.intensity && (
                    <div className="mt-3">
                      <Badge variant="outline" className={cn('text-[10px] capitalize', intensityColors[todayWorkout.intensity])}>
                        {todayWorkout.intensity.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                  {todayDone && todayCompletion?.notes && (
                    <p className="text-xs text-muted-foreground italic mt-2">"{todayCompletion.notes}"</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No workout scheduled for today</p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming schedule */}
        {upcomingWorkouts.length > 0 && (
          <div className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight">Coming Up</h3>
              {upcomingWorkouts.length > 3 && (
                <button onClick={() => setShowAllSchedule(v => !v)} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-0.5">
                  {showAllSchedule ? 'Show less' : `+${upcomingWorkouts.length - 3} more`}
                  <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showAllSchedule && 'rotate-90')} />
                </button>
              )}
            </div>
            <div className="px-4 pb-4 space-y-2">
              {(showAllSchedule ? upcomingWorkouts : upcomingWorkouts.slice(0, 3)).map(w => {
                const SportIcon = sportIcons[w.sport] || CircleDot;
                const d = parseDateOnly(w.scheduled_date);
                return (
                  <div key={w.id} className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <SportIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{w.title}</p>
                      <p className="text-[11px] text-muted-foreground">{dayLabel(d)}
                        {w.run_type ? ` · ${w.run_type.replace(/_/g, ' ')}` : ''}
                      </p>
                      {(w.target_distance_km || w.target_duration_minutes) && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {w.target_distance_km ? `${toDisplay(w.target_distance_km).toFixed(1)} ${label}` : ''}
                          {w.target_distance_km && w.target_duration_minutes ? ' · ' : ''}
                          {w.target_duration_minutes ? `${w.target_duration_minutes} min` : ''}
                        </p>
                      )}
                    </div>
                    {w.intensity && (
                      <Badge variant="outline" className={cn('text-[10px] capitalize shrink-0', intensityColors[w.intensity])}>
                        {w.intensity.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent completed runs — clickable for full Garmin detail */}
        <div className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-base font-bold tracking-tight">Recent Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tap a run to see full details</p>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No workouts logged yet</p>
            ) : recentWorkouts.map(w => {
              const SportIcon = sportIcons[w.sport] || CircleDot;
              const hasDetail = !!(w.avg_heart_rate || w.distance_km || w.splits?.length);
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
                        {format(new Date(w.date), 'MMM d')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {w.duration_minutes && <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1"><Clock className="w-3 h-3" />{w.duration_minutes}m</span>}
                      {w.distance_km && <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1"><MapPin className="w-3 h-3" />{toDisplay(w.distance_km).toFixed(2)}{label}</span>}
                      {w.avg_heart_rate && <span className="text-[11px] text-destructive/70 flex items-center gap-1"><span className="w-3 h-3 text-center">♥</span>{w.avg_heart_rate}bpm</span>}
                      {w.avg_pace && <span className="text-[11px] text-muted-foreground/70">{w.avg_pace}</span>}
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