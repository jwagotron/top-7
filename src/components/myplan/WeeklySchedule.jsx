import React from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { CheckCircle2, Clock, MapPin, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { useUnits } from '@/hooks/useUnits';

const intensityDot = {
  easy:      'bg-secondary',
  moderate:  'bg-primary',
  hard:      'bg-accent',
  race_pace: 'bg-destructive',
  recovery:  'bg-muted-foreground/40',
};

const intensityLabel = {
  easy: 'Easy', moderate: 'Moderate', hard: 'Hard', race_pace: 'Race', recovery: 'Recovery',
};

export default function WeeklySchedule({ plannedWorkouts, completions, selectedDate, onSelectDate }) {
  const { toDisplay, label } = useUnits();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="rounded-2xl border border-border/30 bg-card overflow-hidden divide-y divide-border/20">
      {days.map((day, idx) => {
         const workout = plannedWorkouts.find(w => isSameDay(parseDateOnly(w.scheduled_date), day));
        const completion = workout ? completions.find(c => c.planned_workout_id === workout.id) : null;
        const isDone = completion?.status === 'completed';
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 transition-all text-left group",
              isSelected
                ? "bg-primary/10"
                : today
                ? "bg-primary/5"
                : "hover:bg-muted/30"
            )}
          >
            {/* Day column */}
            <div className="w-10 shrink-0 text-center">
              <p className={cn(
                "text-[10px] font-semibold uppercase tracking-wider leading-none mb-0.5",
                today ? "text-primary" : "text-muted-foreground/60"
              )}>
                {format(day, 'EEE')}
              </p>
              <p className={cn(
                "text-base font-bold leading-none",
                today
                  ? "text-primary"
                  : isSelected
                  ? "text-foreground"
                  : "text-foreground/70"
              )}>
                {format(day, 'd')}
              </p>
            </div>

            {/* Left accent bar */}
            <div className={cn(
              "w-0.5 self-stretch rounded-full shrink-0 transition-all",
              isDone
                ? "bg-secondary/60"
                : today
                ? "bg-primary/60"
                : workout
                ? (intensityDot[workout.intensity] || "bg-muted-foreground/20")
                : "bg-transparent"
            )} />

            {/* Content */}
            {workout ? (
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-start gap-1.5 mb-0.5">
                   <p className={cn(
                     "text-sm font-medium leading-tight break-words flex-1",
                     isDone ? "text-secondary" : "text-foreground"
                   )}>
                     {workout.title}
                   </p>
                   {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />}
                 </div>
                <div className="flex gap-3">
                  {workout.target_duration_minutes && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />{workout.target_duration_minutes}m
                    </span>
                  )}
                  {workout.target_distance_km && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" />{toDisplay(workout.target_distance_km)} {label}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 py-0.5 flex items-center gap-1.5">
                <Moon className="w-3 h-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/40">Rest</p>
              </div>
            )}

            {/* Right badge */}
            <div className="shrink-0">
              {isDone ? (
                <span className="text-[10px] font-semibold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                  Done
                </span>
              ) : today && workout ? (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Today
                </span>
              ) : workout && workout.intensity ? (
                <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full">
                  {intensityLabel[workout.intensity] || workout.intensity}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}