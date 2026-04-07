import React from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format
} from 'date-fns';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkoutLabel, getWorkoutColor } from '@/lib/workoutLabels';

export default function CoachCalendar({ currentMonth, onMonthChange, plannedWorkouts, selectedDate, onSelectDate, onAddClick }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getPlannedForDay = (date) => plannedWorkouts.filter(w => isSameDay(parseDateOnly(w.scheduled_date), date));

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
        <h2 className="font-bold text-lg tracking-tight text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-1 items-center">
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
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground/70 tracking-wider uppercase">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 gap-2.5 p-4">
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
                 'aspect-square p-3 cursor-pointer transition-all duration-200 rounded-2xl border group relative',
                 !isCurrentMonth && 'opacity-30 pointer-events-none',
                 isSelected 
                   ? 'bg-primary/12 border-primary/50 shadow-lg shadow-primary/15 ring-1 ring-primary/25'
                   : todayDay 
                   ? 'bg-primary/8 border-primary/30 shadow-md shadow-primary/10'
                   : 'border-border/40 bg-background/50 hover:bg-muted/50 hover:border-border/60',
               )}
            >
              {/* Day number + add button */}
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'text-xs font-bold leading-none',
                  isSelected ? 'text-primary' :
                  todayDay ? 'text-primary/90' :
                  'text-foreground/70'
                )}>
                  {format(day, 'd')}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddClick(day); }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center transition-all duration-150"
                >
                  <Plus className="w-3 h-3 text-primary" />
                </button>
              </div>

              {/* Premium workout pills */}
              <div className="space-y-1.5">
                {dayPlanned.slice(0, 2).map(pw => {
                  const label = getWorkoutLabel(pw);
                  const color = getWorkoutColor(pw);
                  return (
                    <div
                      key={pw.id}
                      className={cn(
                        'px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 truncate shadow-sm',
                        pw.status === 'completed' ? 'opacity-50 line-through' :
                        pw.status === 'skipped' ? 'opacity-30 line-through' :
                        cn(color, 'shadow-md shadow-black/15 dark:shadow-black/30 hover:shadow-lg hover:shadow-black/20 dark:hover:shadow-black/40')
                      )}
                      title={pw.title}
                    >
                      {label}
                    </div>
                  );
                })}
                {dayPlanned.length > 2 && (
                  <div className="text-[10px] font-medium text-muted-foreground/60 pl-1">
                    +{dayPlanned.length - 2} more
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