import React from 'react';
import { isSameDay, isToday, format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getWorkoutLabel, getWorkoutColor } from '@/lib/workoutLabels';

// Parse date string (handles ISO, YYYY-MM-DD formats)
const parseWorkoutDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    // If it's already a Date object, return it
    if (dateStr instanceof Date) return dateStr;
    // Try parsing as ISO string
    return parseISO(String(dateStr).split('T')[0]);
  } catch {
    return null;
  }
};

export default function CalendarDayCell({
  day,
  currentMonth,
  selectedDate,
  plannedWorkouts = [],
  workouts = [],
  onSelectDate,
  onAddClick,
  showAddButton,
}) {
  const isSameMonthDay = day.getMonth() === currentMonth.getMonth();
  const todayDay = isToday(day);
  const isSelected = selectedDate && isSameDay(day, selectedDate);

  // Filter workouts for this specific day (self-contained rendering)
  const dayWorkouts = workouts.filter(w => {
    const workoutDate = parseWorkoutDate(w.date);
    return workoutDate && isSameDay(workoutDate, day);
  });

  // Filter planned workouts for this specific day
  const dayPlanned = plannedWorkouts.filter(pw => {
    const plannedDate = parseWorkoutDate(pw.scheduled_date);
    return plannedDate && isSameDay(plannedDate, day);
  });

  return (
    <div
      onClick={() => isSameMonthDay && onSelectDate(day)}
      className={cn(
        'aspect-square p-2.5 cursor-pointer flex flex-col items-stretch group relative overflow-hidden transition-all duration-200',
        !isSameMonthDay && 'opacity-25 pointer-events-none',
        isSelected
          ? 'bg-primary/8 border border-primary/40 shadow-sm shadow-primary/10'
          : todayDay
          ? 'bg-primary/4 border border-primary/20'
          : 'border border-border/40 hover:bg-muted/15 hover:border-border/60',
      )}
    >
      {/* Date number zone - top-left, compact */}
      <div className="flex items-center gap-1 shrink-0 z-10 mb-1">
        <span
          className={cn(
            'text-xs font-semibold leading-4 transition-colors duration-200',
            isSelected ? 'text-primary' : todayDay ? 'text-primary/60' : 'text-foreground/45',
          )}
        >
          {format(day, 'd')}
        </span>
        {showAddButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddClick(day);
            }}
            className="opacity-0 group-hover:opacity-100 w-3 h-3 rounded-full bg-primary/20 hover:bg-primary/40 flex items-center justify-center transition-all duration-200 shrink-0"
          >
            <svg className="w-1.5 h-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Workout content area - centered below date, vertically balanced */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-1 min-h-0 overflow-hidden">
        {dayPlanned.slice(0, 2).map((pw) => {
          const label = getWorkoutLabel(pw);
          const color = getWorkoutColor(pw);
          return (
            <div
              key={pw.id}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[8px] font-semibold transition-all duration-200 truncate max-w-[90%] whitespace-nowrap flex-shrink-0 shadow-xs',
                pw.status === 'completed'
                  ? 'opacity-35 line-through'
                  : pw.status === 'skipped'
                  ? 'opacity-20 line-through'
                  : color,
              )}
              title={pw.title}
            >
              {label}
            </div>
          );
        })}

        {dayWorkouts
          .filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id))
          .slice(0, 1)
          .map((w) => {
            const label = getWorkoutLabel(w);
            const color = getWorkoutColor(w);
            return (
              <div
                key={w.id}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[8px] font-semibold transition-all duration-200 truncate opacity-55 max-w-[90%] whitespace-nowrap flex-shrink-0 shadow-xs',
                  color,
                )}
                title={`✓ ${w.title}`}
              >
                ✓{label}
              </div>
            );
          })}

        {dayPlanned.length + dayWorkouts.length > 2 && (
          <div className="text-[7px] font-medium text-muted-foreground/35 flex-shrink-0">
            +{dayPlanned.length + dayWorkouts.length - 2}
          </div>
        )}
      </div>
    </div>
  );
}