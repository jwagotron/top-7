import React from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format, parseISO,
  addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getWorkoutLabel, getWorkoutColor } from '@/lib/workoutLabels';

const parseDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d;
  try { return parseISO(String(d).split('T')[0]); } catch { return null; }
};

// Compact chip for a single workout inside a calendar cell
function WorkoutChip({ workout, done, skipped }) {
  const label = getWorkoutLabel(workout);
  const baseColor = getWorkoutColor(workout);

  if (done) {
    return (
      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-semibold leading-tight truncate max-w-full">
        <Check className="w-2 h-2 shrink-0" strokeWidth={3} />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="px-1.5 py-0.5 rounded bg-slate-600/40 text-slate-400 text-[9px] font-medium leading-tight truncate max-w-full line-through">
        {label}
      </div>
    );
  }

  return (
    <div className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold leading-tight truncate max-w-full', baseColor)}>
      {label}
    </div>
  );
}

function DayCell({ day, currentMonth, selectedDate, plannedWorkouts, workouts, completions, onSelectDate, showAddButton, onAddClick }) {
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const selected = selectedDate && isSameDay(day, selectedDate);

  const dayStr = format(day, 'yyyy-MM-dd');

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
      return { id: pw.id, workout: pw, done, skipped, source: 'planned' };
    }),
    ...dayLogged
      .filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id))
      .map(w => ({ id: w.id, workout: w, done: true, skipped: false, source: 'logged' })),
  ];

  const visible = allItems.slice(0, 2);
  const overflow = allItems.length - 2;

  return (
    <div
      onClick={() => inMonth && onSelectDate(day)}
      className={cn(
        'min-h-[64px] p-1.5 flex flex-col transition-colors duration-150 relative',
        !inMonth && 'pointer-events-none',
        selected
          ? 'bg-primary/12 ring-1 ring-inset ring-primary/50'
          : today
          ? 'bg-primary/5'
          : inMonth
          ? 'hover:bg-muted/20 cursor-pointer'
          : '',
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          'text-[11px] font-semibold leading-none w-5 h-5 flex items-center justify-center rounded-full',
          !inMonth && 'text-muted-foreground/20',
          selected && inMonth ? 'bg-primary text-white' :
          today && !selected ? 'text-primary font-bold' :
          inMonth ? 'text-foreground/60' : '',
        )}>
          {format(day, 'd')}
        </span>

        {showAddButton && inMonth && (
          <button
            onClick={e => { e.stopPropagation(); onAddClick(day); }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-primary/20 hover:bg-primary/40 flex items-center justify-center transition-opacity"
          >
            <svg className="w-2 h-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Workout chips */}
      <div className="flex flex-col gap-0.5 flex-1">
        {visible.map(item => (
          <WorkoutChip key={item.id} workout={item.workout} done={item.done} skipped={item.skipped} />
        ))}
        {overflow > 0 && (
          <span className="text-[8px] text-muted-foreground/50 font-medium pl-0.5">+{overflow} more</span>
        )}
      </div>
    </div>
  );
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrainingMonthGrid({
  currentMonth,
  onMonthChange,
  plannedWorkouts = [],
  workouts = [],
  completions = [],
  selectedDate,
  onSelectDate,
  showAddButton = false,
  onAddClick = () => {},
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="bg-card/40 backdrop-blur-sm border border-border/25 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/15">
        <h2 className="font-semibold text-sm tracking-tight text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onMonthChange(0)}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border/15">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/10 group">
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            plannedWorkouts={plannedWorkouts}
            workouts={workouts}
            completions={completions}
            onSelectDate={onSelectDate}
            showAddButton={showAddButton}
            onAddClick={onAddClick}
          />
        ))}
      </div>
    </div>
  );
}