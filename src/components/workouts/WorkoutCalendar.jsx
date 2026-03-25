import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RUN_TYPE_DOT = {
  easy: 'bg-secondary',
  long_run: 'bg-primary',
  tempo: 'bg-accent',
  interval: 'bg-destructive',
  fartlek: 'bg-chart-4',
  hill_repeats: 'bg-chart-5',
  race: 'bg-accent',
  recovery: 'bg-muted-foreground',
  progression: 'bg-secondary',
};

const INTENSITY_DOT = {
  easy: 'bg-secondary',
  moderate: 'bg-primary',
  hard: 'bg-accent',
  race_pace: 'bg-destructive',
  recovery: 'bg-muted-foreground',
};

export default function WorkoutCalendar({ currentMonth, onMonthChange, workouts, plannedWorkouts, selectedDate, onSelectDate }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getWorkoutsForDay = (date) => workouts.filter(w => isSameDay(new Date(w.date), date));
  const getPlannedForDay = (date) => plannedWorkouts.filter(w => isSameDay(new Date(w.scheduled_date), date));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bold text-base">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => onMonthChange(0)}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayWorkouts = getWorkoutsForDay(day);
          const dayPlanned = getPlannedForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const todayDay = isToday(day);
          const hasPending = dayPlanned.some(p => p.status === 'upcoming');
          const hasCompleted = dayWorkouts.length > 0;

          return (
            <div
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                'min-h-[80px] p-1.5 cursor-pointer transition-all border-b border-r border-border/50 relative',
                !isCurrentMonth && 'opacity-30',
                isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
                !isSelected && 'hover:bg-muted/40',
                todayDay && !isSelected && 'bg-secondary/5',
              )}
            >
              {/* Day number */}
              <div className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1',
                todayDay ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </div>

              {/* Workout dots / pills */}
              <div className="space-y-0.5">
                {dayPlanned.slice(0, 2).map(pw => (
                  <div
                    key={pw.id}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight font-medium',
                      pw.status === 'completed' ? 'bg-secondary/20 text-secondary line-through' :
                      pw.status === 'skipped' ? 'bg-muted text-muted-foreground line-through opacity-60' :
                      'bg-primary/10 text-primary'
                    )}
                  >
                    {pw.title}
                  </div>
                ))}
                {dayWorkouts.filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id)).slice(0, 1).map(w => (
                  <div key={w.id} className="text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight font-medium bg-secondary/20 text-secondary">
                    ✓ {w.title}
                  </div>
                ))}
                {(dayPlanned.length + dayWorkouts.length) > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayPlanned.length + dayWorkouts.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}