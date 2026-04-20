import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import JoinTeamCTA from '@/components/dashboard/JoinTeamCTA';
import WorkoutDetailDrawer from '@/components/dashboard/WorkoutDetailDrawer.jsx';
import { Activity, MapPin, Clock, Flame, CheckCircle2, ChevronRight, Footprints, Bike, Waves, Dumbbell, CircleDot, Calendar, ChevronLeft } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { DEFAULT_ROUTE } from '@/lib/roleConfig';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import { useCompletions } from '@/hooks/useCompletions';
import { startOfWeek, endOfWeek, isWithinInterval, format, isToday, isTomorrow, isSameDay, addDays, addWeeks, subWeeks } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const { completions, completeMut } = useCompletions(athleteEmail);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showTodayWorkout, setShowTodayWorkout] = useState(false);

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

  // Check team membership
  const { data: memberships = [] } = useQuery({
    queryKey: ['athlete-memberships-dash', athleteEmail],
    queryFn: () => base44.entities.TeamMembership.filter({ athlete_email: athleteEmail, status: 'active' }),
    enabled: !!athleteEmail,
  });
  const hasTeam = memberships.length > 0 || !!user?.team_id || !!user?.coach_email;

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
  const totalCalories = thisWeekWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
  const totalWorkouts = thisWeekWorkouts.length;

  const isCompleted = (w) =>
    w.status === 'completed' ||
    completions.some(c => c.planned_workout_id === w.id);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Today's workout
  const todayWorkout = plannedWorkouts.find(w => isSameDay(parseDateOnly(w.scheduled_date), today));
  const todayCompletion = todayWorkout ? completions.find(c => c.planned_workout_id === todayWorkout.id) : null;
  const todayDone = !!todayCompletion;

  // Upcoming workouts — next 14 days
  const upcomingWindow = addDays(today, 14);
  const upcomingWorkouts = plannedWorkouts
    .filter(w => !isCompleted(w) && parseDateOnly(w.scheduled_date) >= today && parseDateOnly(w.scheduled_date) <= upcomingWindow)
    .sort((a, b) => parseDateOnly(a.scheduled_date) - parseDateOnly(b.scheduled_date));

  // Recent completed workouts
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  // Calendar view — 7 days from calendarWeekStart
  const calendarDays = Array.from({ length: 7 }, (_, i) => addDays(calendarWeekStart, i));
  const calendarWeekEnd = addDays(calendarWeekStart, 6);

  const getWorkoutsForDay = (day) =>
    plannedWorkouts.filter(w => isSameDay(parseDateOnly(w.scheduled_date), day));

  const getLoggedForDay = (day) =>
    workouts.filter(w => isSameDay(parseDateOnly(w.date), day));

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
      <TopBar title="My Progress">
        <Button
          variant={showCalendar ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowCalendar(v => !v)}
          className="gap-1.5"
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Schedule</span>
        </Button>
      </TopBar>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5 lg:space-y-6 pb-24 lg:pb-8">

        {/* Today's Workout — prominent CTA */}
        {todayWorkout && (
          <div
            className={cn(
              'w-full text-left rounded-2xl border-2 shadow-lg transition-all duration-200 overflow-hidden',
              todayDone
                ? 'bg-secondary/5 border-secondary/30'
                : 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30'
            )}
          >
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Completion dot — athlete only */}
                <button
                  type="button"
                  disabled={todayDone || completeMut.isPending || role !== 'athlete'}
                  onClick={e => { e.stopPropagation(); completeMut.mutate({ workout: todayWorkout }); }}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
                    todayDone
                      ? 'bg-secondary border-secondary text-white'
                      : role === 'athlete'
                        ? 'border-primary/40 bg-transparent hover:border-primary hover:bg-primary/10 cursor-pointer'
                        : 'border-muted-foreground/30 bg-transparent cursor-default'
                  )}
                  title={todayDone ? 'Completed' : 'Mark as complete'}
                >
                  {todayDone && <CheckCircle2 className="w-4 h-4" />}
                  {!todayDone && completeMut.isPending && (
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-primary border-t-transparent animate-spin block" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTodayWorkout(v => !v)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                      {todayDone ? "Today's Workout — Done ✓" : "Today's Workout"}
                    </p>
                    <p className={cn('font-bold text-base leading-tight truncate', todayDone ? 'text-secondary' : 'text-foreground')}>
                      {todayWorkout.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {todayWorkout.run_type ? todayWorkout.run_type.replace(/_/g, ' ') : ''}
                      {todayWorkout.target_distance_km ? ` · ${toDisplay(todayWorkout.target_distance_km).toFixed(1)} ${label}` : ''}
                      {todayWorkout.target_duration_minutes ? ` · ${todayWorkout.target_duration_minutes} min` : ''}
                    </p>
                  </div>
                  <ChevronRight className={cn('w-5 h-5 text-muted-foreground/50 shrink-0 transition-transform', showTodayWorkout && 'rotate-90')} />
                </button>
              </div>
            </div>
            {showTodayWorkout && (
              <div className="px-5 pb-5 space-y-3 border-t border-border/20 pt-3">
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
                {todayWorkout.intensity && (
                  <Badge variant="outline" className={cn('text-[10px] capitalize', intensityColors[todayWorkout.intensity])}>
                    {todayWorkout.intensity.replace('_', ' ')}
                  </Badge>
                )}
                {todayDone && todayCompletion?.notes && (
                  <p className="text-xs text-muted-foreground italic">"{todayCompletion.notes}"</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* JoinTeam CTA — only if not on a team */}
        {!hasTeam && <JoinTeamCTA onSuccess={refetchUser} />}

        {/* This week stats */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            This Week · {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Workouts" value={totalWorkouts} icon={Activity} color="primary" />
            <StatCard title="Distance" value={totalDistance.toFixed(1)} unit={label} icon={MapPin} color="secondary" />
            <StatCard title="Time" value={totalDuration} unit="min" icon={Clock} color="accent" />
            <StatCard title="Calories" value={totalCalories} unit="kcal" icon={Flame} color="destructive" />
          </div>
        </div>

        {/* Calendar / Schedule view */}
        {showCalendar && (
          <div className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border/20">
              <h3 className="text-base font-bold tracking-tight">Schedule</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setCalendarWeekStart(w => subWeeks(w, 1))} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground font-medium px-1">
                  {format(calendarWeekStart, 'MMM d')} – {format(calendarWeekEnd, 'MMM d, yyyy')}
                </span>
                <button onClick={() => setCalendarWeekStart(w => addWeeks(w, 1))} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 divide-x divide-border/20">
              {calendarDays.map(day => {
                const planned = getWorkoutsForDay(day);
                const logged = getLoggedForDay(day);
                const isT = isToday(day);
                return (
                  <div key={day.toISOString()} className={cn('p-2 min-h-[80px]', isT && 'bg-primary/5')}>
                    <p className={cn('text-[10px] font-bold text-center mb-1.5', isT ? 'text-primary' : 'text-muted-foreground/60')}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={cn('text-sm font-bold text-center mb-2', isT ? 'text-primary' : 'text-foreground/80')}>
                      {format(day, 'd')}
                    </p>
                    <div className="space-y-1">
                      {planned.map(w => {
                        const done = isCompleted(w);
                        const SportIcon = sportIcons[w.sport] || CircleDot;
                        return (
                          <div key={w.id} className={cn('rounded px-1 py-0.5 text-[9px] font-semibold truncate flex items-center gap-0.5', done ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary')}>
                            {done && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                            <span className="truncate">{w.title}</span>
                          </div>
                        );
                      })}
                      {logged.map(w => (
                        <button key={w.id} onClick={() => setSelectedWorkout(w)} className="w-full rounded px-1 py-0.5 text-[9px] font-semibold truncate bg-secondary/10 text-secondary hover:bg-secondary/20 text-left transition-colors">
                          ✓ {w.title}
                        </button>
                      ))}
                      {planned.length === 0 && logged.length === 0 && (
                        <div className="text-[9px] text-muted-foreground/30 text-center">—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <WeeklyChart workouts={thisWeekWorkouts} />

        {/* Upcoming schedule */}
        {upcomingWorkouts.length > 0 && (
          <div className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight">Coming Up</h3>
              <span className="text-xs text-muted-foreground">{upcomingWorkouts.length} workouts</span>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {upcomingWorkouts.slice(0, 5).map(w => {
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

        {/* Recent Activity — clickable for full detail */}
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
                      {w.distance_km && <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1"><MapPin className="w-3 h-3" />{toDisplay(w.distance_km).toFixed(2)} {label}</span>}
                      {w.avg_heart_rate && <span className="text-[11px] text-destructive/70 flex items-center gap-1"><span className="w-3 h-3 text-center">♥</span>{w.avg_heart_rate}bpm</span>}
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