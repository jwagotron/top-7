import React from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { CheckCircle2, Clock, MapPin, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const intensityDot = {
  easy: 'bg-secondary',
  moderate: 'bg-primary',
  hard: 'bg-accent',
  race_pace: 'bg-destructive',
  recovery: 'bg-muted-foreground',
};

export default function WeeklySchedule({ plannedWorkouts, completions, selectedDate, onSelectDate }) {
  const { toDisplay, label } = useUnits();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-2">
      {days.map(day => {
        const workout = plannedWorkouts.find(w => isSameDay(new Date(w.scheduled_date), day));
        const completion = workout
          ? completions.find(c => c.planned_workout_id === workout.id)
          : null;
        const isDone = completion?.status === 'completed';
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
              isSelected
                ? "bg-primary/10 border-primary/30"
                : today
                ? "bg-muted/60 border-primary/20"
                : "bg-card border-border/30 hover:border-border hover:bg-muted/30"
            )}
          >
            {/* Day label */}
            <div className={cn(
              "w-11 shrink-0 text-center",
            )}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", today ? "text-primary" : "text-muted-foreground")}>
                {format(day, 'EEE')}
              </p>
              <p className={cn(
                "text-lg font-bold leading-tight",
                today ? "text-primary" : "text-foreground"
              )}>
                {format(day, 'd')}
              </p>
            </div>

            {/* Workout or rest */}
            {workout ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", intensityDot[workout.intensity] || 'bg-muted-foreground')} />
                  <p className={cn("text-sm font-medium truncate", isDone && "text-secondary")}>{workout.title}</p>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />}
                </div>
                <div className="flex gap-3 mt-0.5 pl-3">
                  {workout.target_duration_minutes && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />{workout.target_duration_minutes}m
                    </span>
                  )}
                  {workout.target_distance_km && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" />{toDisplay(workout.target_distance_km)}{label}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground/60">Rest day</p>
              </div>
            )}

            {/* Right: status badge */}
            {workout && (
              <div className="shrink-0">
                {isDone ? (
                  <span className="text-[10px] font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Done</span>
                ) : today ? (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Today</span>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{workout.intensity || 'planned'}</span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}