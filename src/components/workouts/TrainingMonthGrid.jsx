import React from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getWorkoutLabel, getWorkoutColor } from '@/lib/workoutLabels';
import { parseDateOnly } from '@/lib/dateUtils';

// Always parse via parseDateOnly — never new Date() or parseISO on date strings
const parseDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d;
  // Strip time component if present, then parse as local date
  const dateOnly = String(d).split('T')[0];
  return parseDateOnly(dateOnly);
};

function WorkoutChip({ workout, done, skipped }) {
  const label = getWorkoutLabel(workout);
  const baseColor = getWorkoutColor(workout);

  if (done) {
    return (
      <div className="flex items-center gap-1 px-1.5 py-[3px] rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium leading-none truncate max-w-full">
        <Check className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="px-1.5 py-[3px] rounded-md bg-muted/60 text-muted-foreground/40 text-[10px] font-medium leading-none truncate max-w-full line-through">
        {label}
      </div>
    );
  }

  return (
    <div className={cn(
      'px-1.5 py-[3px] rounded-md text-[10px] font-semibold leading-none truncate max-w-full',
      baseColor
    )}>
      {label}
    </div>
  );
}

function DayCell({ day, currentMonth, selectedDate, plannedWorkouts, workouts, completions, onSelectDate, showAddButton, onAddClick }) {
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const selected = selectedDate && isSameDay(day, selectedDate);

  const dayPlanned = plannedWorkouts.filter(pw => {
    const d = parseDate(pw.scheduled_date);
    return d && isSameDay(d, day);
  });

  const dayLogged = workouts.filter(w => {
    const d = parseDate(w.date);
    return d && isSameDay(d, day);
  });

  const allItems = [
    ...dayPlanned.map(pw => {
      const hasCompletion = completions.some(c => c.planned_workout_id === pw.id && c.status === 'completed');
      const done = pw.status === 'completed' || hasCompletion;
      const skipped = pw.status === 'skipped';
      return { id: pw.id, workout: pw, done, skipped };
    }),
    ...dayLogged
      .filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id))
      .map(w => ({ id: w.id, workout: w, done: true, skipped: false })),
  ];

  const visible = allItems.slice(0, 2);
  const overflow = allItems.length - 2;

  return (
    <div
      onClick={() => inMonth && onSelectDate(day)}
      className={cn(
        'relative flex flex-col p-2 min-h-[72px] transition-colors duration-150 group',
        !inMonth && 'pointer-events-none',
        selected
          ? 'bg-primary/10 ring-1 ring-inset ring-primary/40'
          : today
          ? 'bg-primary/[0.04]'
          : inMonth
          ? 'hover:bg-muted/25 cursor-pointer'
          : 'opacity-30',
      )}
    >
      {/* Day number */}
      <div className="flex items-start justify-between mb-1.5">
        <span className={cn(
          'w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold leading-none transition-colors duration-150 shrink-0',
          selected
            ? 'bg-primary text-white'
            : today
            ? 'bg-primary/15 text-primary'
            : 'text-foreground/50',
        )}>
          {format(day, 'd')}
        </span>

        {showAddButton && inMonth && (
          <button
            onClick={e => { e.stopPropagation(); onAddClick(day); }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-primary/20 hover:bg-primary/40 flex items-center justify-center transition-all duration-150 shrink-0 mt-0.5"
          >
            <svg className="w-2 h-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Workout chips */}
      <div className="flex flex-col gap-1 flex-1">
        {visible.map(item => (
          <WorkoutChip key={item.id} workout={item.workout} done={item.done} skipped={item.skipped} />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] text-muted-foreground/40 font-medium pl-0.5 leading-none">+{overflow}</span>
        )}
      </div>
    </div>
  );
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * permissions prop controls role-based behavior:
 *   canAssign   – show the "+" add button on cells (coach/admin)
 *   canComplete – show completion state from completions array (athlete)
 */
export default function TrainingMonthGrid({
  currentMonth,
  onMonthChange,
  plannedWorkouts = [],
  workouts = [],
  completions = [],
  selectedDate,
  onSelectDate,
  // role-based flags (replaces showAddButton for clearer intent)
  showAddButton = false,
  onAddClick = () => {},
  permissions = {},
}) {
  const canAssign   = permissions.canAssign   ?? showAddButton;
  const canComplete = permissions.canComplete ?? true;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
        <AnimatePresence mode="wait">
          <motion.h2
            key={format(currentMonth, 'MMMM yyyy')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="font-semibold text-base tracking-tight text-foreground"
          >
            {format(currentMonth, 'MMMM yyyy')}
          </motion.h2>
        </AnimatePresence>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs rounded-lg" onClick={() => onMonthChange(0)}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day-of-week column headers */}
      <div className="grid grid-cols-7 border-b border-border/15 bg-muted/20">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-7 divide-x divide-y divide-border/15"
        >
          {days.map((day, i) => (
            <DayCell
              key={i}
              day={day}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              plannedWorkouts={plannedWorkouts}
              workouts={workouts}
              completions={canComplete ? completions : []}
              onSelectDate={onSelectDate}
              showAddButton={canAssign}
              onAddClick={onAddClick}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}