import React from 'react';
import { isSameDay, isToday, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getWorkoutLabel, getWorkoutColor } from '@/lib/workoutLabels';
import { motion } from 'framer-motion';

export default function CalendarDayCell({
  day,
  currentMonth,
  selectedDate,
  plannedWorkouts,
  workouts,
  onSelectDate,
  onAddClick,
  showAddButton,
}) {
  const isSameMonthDay = day.getMonth() === currentMonth.getMonth();
  const todayDay = isToday(day);
  const isSelected = selectedDate && isSameDay(day, selectedDate);

  const dayWorkouts = (workouts || []).filter(w => isSameDay(new Date(w.date), day));
  const dayPlanned = (plannedWorkouts || []).filter(pw => isSameDay(new Date(pw.scheduled_date), day));

  return (
    <motion.div
      onClick={() => isSameMonthDay && onSelectDate(day)}
      layout
      layoutId={`day-${format(day, 'yyyy-MM-dd')}`}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'aspect-square p-2 cursor-pointer flex flex-col items-stretch justify-start group relative',
        !isSameMonthDay && 'opacity-30 pointer-events-none',
        isSelected
          ? 'bg-primary/6 border-2 border-primary/30'
          : todayDay
          ? 'bg-primary/3 border-2 border-primary/15'
          : 'border-2 border-transparent hover:bg-muted/20 active:bg-muted/30',
      )}
      whileHover={isSameMonthDay ? { scale: 1.02 } : {}}
      whileTap={isSameMonthDay ? { scale: 0.98 } : {}}
    >
      {/* Date number + optional add button */}
      <div className="flex justify-center items-center gap-1 shrink-0 mb-1">
        <span
          className={cn(
            'text-xs font-semibold leading-4 transition-colors duration-200',
            isSelected ? 'text-primary' : todayDay ? 'text-primary/70' : 'text-foreground/50',
          )}
        >
          {format(day, 'd')}
        </span>
        {showAddButton && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onAddClick(day);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-primary/15 hover:bg-primary/30 flex items-center justify-center transition-all duration-150 shrink-0"
          >
            <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>
        )}
      </div>

      {/* Centered workout markers */}
      <div className="w-full flex flex-col items-center justify-start gap-0.5">
        {dayPlanned.slice(0, 2).map((pw, idx) => {
          const label = getWorkoutLabel(pw);
          const color = getWorkoutColor(pw);
          return (
            <motion.div
              key={pw.id}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={cn(
                'px-2 py-0.5 rounded text-[8px] font-semibold transition-all duration-200 truncate max-w-[75%] whitespace-nowrap',
                pw.status === 'completed'
                  ? 'opacity-40 line-through'
                  : pw.status === 'skipped'
                  ? 'opacity-25 line-through'
                  : color,
              )}
              title={pw.title}
            >
              {label}
            </motion.div>
          );
        })}

        {dayWorkouts
          .filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id))
          .slice(0, 1)
          .map((w, idx) => {
            const label = getWorkoutLabel(w);
            const color = getWorkoutColor(w);
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className={cn(
                  'px-2 py-0.5 rounded text-[8px] font-semibold transition-all duration-200 truncate opacity-70 max-w-[75%] whitespace-nowrap',
                  color,
                )}
                title={`✓ ${w.title}`}
              >
                ✓{label}
              </motion.div>
            );
          })}

        {dayPlanned.length + dayWorkouts.length > 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="text-[9px] font-medium text-muted-foreground/40"
          >
            +{dayPlanned.length + dayWorkouts.length - 2}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}