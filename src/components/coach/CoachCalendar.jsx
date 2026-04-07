import React from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format
} from 'date-fns';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RUN_TYPE_STYLES = {
  easy: 'bg-secondary/20 text-secondary',
  long_run: 'bg-primary/20 text-primary',
  tempo: 'bg-amber-100 text-amber-700',
  interval: 'bg-destructive/15 text-destructive',
  fartlek: 'bg-purple-100 text-purple-700',
  hill_repeats: 'bg-orange-100 text-orange-700',
  race: 'bg-amber-100 text-amber-800',
  recovery: 'bg-muted text-muted-foreground',
  progression: 'bg-teal-100 text-teal-700',
};

const INTENSITY_LEFT = {
  recovery: 'border-l-2 border-muted-foreground',
  easy: 'border-l-2 border-secondary',
  moderate: 'border-l-2 border-primary',
  hard: 'border-l-2 border-accent',
  race_pace: 'border-l-2 border-destructive',
};

export default function CoachCalendar({ currentMonth, onMonthChange, plannedWorkouts, selectedDate, onSelectDate, onAddClick }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getPlannedForDay = (date) => plannedWorkouts.filter(w => isSameDay(parseDateOnly(w.scheduled_date), date));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-1 items-center">
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
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground tracking-wide">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, i) => {
          const dayPlanned = getPlannedForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const todayDay = isToday(day);

          return (
            <div
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                 'min-h-[130px] p-1.5 cursor-pointer transition-all border-b border-r border-border/40 group relative',
                 !isCurrentMonth && 'opacity-25',
                 isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/40',
                 !isSelected && 'hover:bg-muted/30',
               )}
            >
              {/* Day number + add button */}
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold',
                  todayDay ? 'bg-primary text-primary-foreground' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddClick(day); }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all"
                >
                  <Plus className="w-3 h-3 text-primary" />
                </button>
              </div>

              {/* Workout pills */}
              <div className="space-y-0.5">
                {dayPlanned.slice(0, 3).map(pw => (
                  <div
                    key={pw.id}
                    className={cn(
                      'text-[9px] px-2 py-0.5 rounded-md leading-snug font-medium line-clamp-2 break-words relative overflow-hidden before:absolute before:inset-y-0 before:right-0 before:w-4 before:bg-gradient-to-l before:from-current before:to-transparent before:opacity-0 hover:before:opacity-10',
                      pw.status === 'completed' ? 'bg-secondary/15 text-secondary line-through' :
                      pw.status === 'skipped' ? 'opacity-50 bg-muted text-muted-foreground line-through' :
                      RUN_TYPE_STYLES[pw.run_type] || 'bg-primary/10 text-primary',
                      INTENSITY_LEFT[pw.intensity] || ''
                    )}
                    title={pw.title}
                  >
                    {pw.assigned_to && <span className="opacity-60">● </span>}
                    {pw.title}
                  </div>
                ))}
                {dayPlanned.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{dayPlanned.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}