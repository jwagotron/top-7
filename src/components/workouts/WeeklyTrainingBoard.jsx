import React from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import PlannedWorkoutCard from '@/components/workouts/PlannedWorkoutCard';

export default function WeeklyTrainingBoard({
  weekStart,
  onWeekChange,
  plannedWorkouts = [],
  workouts = [],
  completions = [],
  expandedPlanned,
  onToggleExpanded,
  showCompleteButton = false,
  onMarkComplete,
  role = 'athlete',
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getCompletion = (workoutId) => completions.find(c => c.planned_workout_id === workoutId);

  const getWorkoutsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return plannedWorkouts.filter(w => {
      const wStr = String(w.scheduled_date).split('T')[0];
      return wStr === dayStr;
    });
  };

  const getLoggedForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return workouts.filter(w => {
      const wStr = String(w.date).split('T')[0];
      return wStr === dayStr;
    });
  };



  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(-1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(0)}
            className="h-8 px-3"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-5">
        {days.map(day => {
          // Single source of truth for this day
          const dayWorkouts = getWorkoutsForDay(day);
          const loggedWorkouts = getLoggedForDay(day);
          const unlinkedLogged = loggedWorkouts.filter(w => !dayWorkouts.some(p => p.id === w.planned_workout_id));
          const allVisibleWorkouts = dayWorkouts.length + unlinkedLogged.length;
          const completedCount = dayWorkouts.filter(w => getCompletion(w.id)?.status === 'completed').length;
          
          // Debug: ensure header and list use same data
          console.debug(`[Day ${format(day, 'EEE')}] visible=${allVisibleWorkouts} completed=${completedCount}`);
          
          const isToday = isSameDay(day, today);

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={cn(
                'rounded-2xl border-2 overflow-hidden transition-all',
                isToday
                  ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/15'
                  : 'bg-card border-border hover:border-border/80'
              )}
            >
              {/* Day header */}
              <div className={cn(
                'px-4 py-3 border-b',
                isToday ? 'bg-primary/10 border-primary/20' : 'bg-muted/30 border-border/50'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={cn(
                      'font-semibold text-base',
                      isToday ? 'text-primary' : 'text-foreground'
                    )}>
                      {format(day, 'EEEE')}
                    </h3>
                    <p className={cn(
                      'text-xs',
                      isToday ? 'text-primary/70' : 'text-muted-foreground'
                    )}>
                      {format(day, 'MMM d')}
                      {isToday && <span className="ml-2 text-[10px] font-bold uppercase">Today</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    {allVisibleWorkouts === 0 ? (
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">No workouts</p>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">
                        {completedCount} <span className="text-muted-foreground font-normal">/ {allVisibleWorkouts}</span>
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">completed</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Day content */}
              <div className="px-4 py-3">
                {allVisibleWorkouts === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic py-6 text-center">Rest day</p>
                ) : (
                  <div className="space-y-3">
                    {/* Planned workouts */}
                    {dayWorkouts.map(pw => (
                      <PlannedWorkoutCard
                        key={pw.id}
                        planned={pw}
                        expanded={expandedPlanned === pw.id}
                        onToggle={() => onToggleExpanded(expandedPlanned === pw.id ? null : pw.id)}
                        completion={getCompletion(pw.id)}
                        showCompleteButton={showCompleteButton}
                        onMarkComplete={onMarkComplete}
                        role={role}
                      />
                    ))}

                    {/* Logged workouts (unlinked) */}
                    {unlinkedLogged.map(w => (
                        <div key={w.id} className="bg-secondary/5 border border-secondary/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{w.title}</p>
                              <div className="flex gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                                {w.distance_km && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {w.distance_km} km
                                  </span>
                                )}
                                {w.duration_minutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {w.duration_minutes} min
                                  </span>
                                )}
                                {w.avg_pace && (
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> {w.avg_pace} /km
                                  </span>
                                )}
                              </div>
                            </div>
                            {w.feeling && (
                              <span className="text-lg">{{ great: '🔥', good: '💪', okay: '👌', tired: '😓', exhausted: '😵' }[w.feeling]}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}