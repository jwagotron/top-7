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
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
        <h2 className="font-bold text-lg tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
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
      <div className="grid grid-cols-7 border-b border-border/20">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{d}</div>
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
                'min-h-[90px] p-2 cursor-pointer transition-all border-b border-r border-border/15 relative',
                !isCurrentMonth && 'opacity-25',
                isSelected && 'bg-primary/8 ring-1 ring-inset ring-primary/40',
                !isSelected && 'hover:bg-muted/30',
                todayDay && !isSelected && 'bg-secondary/5',
              )}
            >
              {/* Day number */}
              <div className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium mb-1.5',
                todayDay ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground',
                isSelected && !todayDay ? 'ring-2 ring-primary/40 bg-primary/10 font-semibold' : ''
              )}>
                {format(day, 'd')}
              </div>

              {/* Compact workout pills */}
              <div className="flex flex-wrap gap-1">
                {dayPlanned.slice(0, 4).map(pw => {
                  const label = getWorkoutLabel(pw);
                  const color = getWorkoutColor(pw);
                  return (
                    <div
                      key={pw.id}
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-transform hover:scale-110',
                        pw.status === 'completed' ? 'opacity-50 line-through' :
                        pw.status === 'skipped' ? 'opacity-30' :
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
                        'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-transform hover:scale-110 opacity-75',
                        color
                      )}
                      title={`✓ ${w.title}`}
                    >
                      {label}
                    </div>
                  );
                })}
                {(dayPlanned.length + dayWorkouts.length) > 4 && (
                  <div className="text-[9px] font-medium text-muted-foreground pt-0.5">
                    +{dayPlanned.length + dayWorkouts.length - 4}
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