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
        'aspect-square p-2 cursor-pointer flex flex-col items-stretch group relative overflow-hidden transition-colors duration-150',
        !isSameMonthDay && 'opacity-30 pointer-events-none',
        isSelected
          ? 'bg-primary/6 border-2 border-primary/30'
          : todayDay
          ? 'bg-primary/3 border-2 border-primary/15'
          : 'border-2 border-transparent hover:bg-muted/20 active:bg-muted/30',
      )}
    >
      {/* Date number zone - top-left, compact */}
      <div className="flex items-center gap-0.5 shrink-0 z-10">
        <span
          className={cn(
            'text-xs font-semibold leading-4 transition-colors duration-200',
            isSelected ? 'text-primary' : todayDay ? 'text-primary/70' : 'text-foreground/50',
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
            className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded-full bg-primary/15 hover:bg-primary/30 flex items-center justify-center transition-all duration-150 shrink-0"
          >
            <svg className="w-2 h-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Workout content area - centered below date, vertically balanced */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-0.5 min-h-0 overflow-hidden">
        {dayPlanned.slice(0, 2).map((pw) => {
          const label = getWorkoutLabel(pw);
          const color = getWorkoutColor(pw);
          return (
            <div
              key={pw.id}
              className={cn(
                'px-2 py-1 rounded text-[8px] font-semibold transition-all duration-200 truncate max-w-[85%] whitespace-nowrap flex-shrink-0',
                pw.status === 'completed'
                  ? 'opacity-40 line-through'
                  : pw.status === 'skipped'
                  ? 'opacity-25 line-through'
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
                  'px-2 py-1 rounded text-[8px] font-semibold transition-all duration-200 truncate opacity-60 max-w-[85%] whitespace-nowrap flex-shrink-0',
                  color,
                )}
                title={`✓ ${w.title}`}
              >
                ✓{label}
              </div>
            );
          })}

        {dayPlanned.length + dayWorkouts.length > 2 && (
          <div className="text-[8px] font-medium text-muted-foreground/40 flex-shrink-0">
            +{dayPlanned.length + dayWorkouts.length - 2}
          </div>
        )}
      </div>
    </div>
  );
}