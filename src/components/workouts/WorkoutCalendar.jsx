import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format
} from 'date-fns';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkoutLabel, getWorkoutColor } from '@/lib/workoutLabels';

export default function WorkoutCalendar({ currentMonth, onMonthChange, workouts, plannedWorkouts, selectedDate, onSelectDate }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getWorkoutsForDay = (date) => workouts.filter(w => {
    const workoutDate = parseDateOnly(w.date);
    // Debug: log for verification
    if (process.env.NODE_ENV === 'development') {
      console.log('[Calendar] Workout:', w.title, '| stored:', w.date, '| parsed:', format(workoutDate, 'yyyy-MM-dd'), '| calendar day:', format(date, 'yyyy-MM-dd'), '| match:', isSameDay(workoutDate, date));
    }
    return isSameDay(workoutDate, date);
  });
  
  const getPlannedForDay = (date) => plannedWorkouts.filter(w => {
    const plannedDate = parseDateOnly(w.scheduled_date);
    // Debug: log for verification
    if (process.env.NODE_ENV === 'development') {
      console.log('[Calendar] Planned:', w.title, '| stored:', w.scheduled_date, '| parsed:', format(plannedDate, 'yyyy-MM-dd'), '| calendar day:', format(date, 'yyyy-MM-dd'), '| match:', isSameDay(plannedDate, date));
    }
    return isSameDay(plannedDate, date);
  });

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden shadow-sm">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
        <h2 className="font-bold text-lg tracking-tight text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-muted/60" onClick={() => onMonthChange(0)}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/20 px-2 py-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2.5 p-4">
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
                'aspect-square p-3 cursor-pointer transition-all duration-200 rounded-2xl border group relative',
                !isCurrentMonth && 'opacity-30 pointer-events-none',
                isSelected
                  ? 'bg-primary/12 border-primary/50 shadow-lg shadow-primary/15 ring-1 ring-primary/25'
                  : todayDay
                  ? 'bg-primary/8 border-primary/30 shadow-md shadow-primary/10'
                  : 'border-border/40 bg-background/50 hover:bg-muted/50 hover:border-border/60',
              )}
            >
              {/* Day number */}
              <div className={cn(
                'text-xs font-bold leading-none mb-2',
                isSelected ? 'text-primary' :
                todayDay ? 'text-primary/90' :
                'text-foreground/70'
              )}>
                {format(day, 'd')}
              </div>

              {/* Readable workout pills */}
              <div className="space-y-1">
                {dayPlanned.slice(0, 2).map(pw => {
                  const label = getWorkoutLabel(pw);
                  const color = getWorkoutColor(pw);
                  return (
                    <div
                      key={pw.id}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 truncate',
                        pw.status === 'completed' ? 'opacity-50 line-through' :
                        pw.status === 'skipped' ? 'opacity-30 line-through' :
                        color
                      )}
                      title={pw.title}
                    >
                      {label}
                    </div>
                  );
                })}
                {dayWorkouts.filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id)).slice(0, 1).map(w => {
                  const label = getWorkoutLabel(w);
                  const color = getWorkoutColor(w);
                  return (
                    <div
                      key={w.id}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 truncate opacity-75',
                        color
                      )}
                      title={`✓ ${w.title}`}
                    >
                      ✓ {label}
                    </div>
                  );
                })}
                {(dayPlanned.length + dayWorkouts.length) > 2 && (
                  <div className="text-[10px] font-medium text-muted-foreground/70">
                    +{dayPlanned.length + dayWorkouts.length - 2}
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