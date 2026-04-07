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
    <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
        <h2 className="font-semibold text-base tracking-tight text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-0.5 items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onMonthChange(0)}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/15 px-2 py-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/50 tracking-wider uppercase">{d}</div>
        ))}
      </div>

      {/* Clean grid */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border/15">
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
                'aspect-square p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-start group relative',
                !isCurrentMonth && 'opacity-30 pointer-events-none',
                isSelected 
                  ? 'bg-primary/6 border-2 border-primary/30'
                  : todayDay 
                  ? 'bg-primary/3 border-2 border-primary/15'
                  : 'border-2 border-transparent hover:bg-muted/20',
              )}
            >
              {/* Day number + add button */}
              <div className="flex items-start justify-between mb-3 h-4 shrink-0">
                <span className={cn(
                  'text-xs font-semibold leading-4',
                  isSelected ? 'text-primary' :
                  todayDay ? 'text-primary/70' :
                  'text-foreground/50'
                )}>
                  {format(day, 'd')}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddClick(day); }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-primary/15 hover:bg-primary/30 flex items-center justify-center transition-opacity duration-150 shrink-0"
                >
                  <Plus className="w-2.5 h-2.5 text-primary" />
                </button>
              </div>

              {/* Workout pills - left aligned */}
              <div className="space-y-1 w-full">
                {dayPlanned.slice(0, 2).map(pw => {
                  const label = getWorkoutLabel(pw);
                  const color = getWorkoutColor(pw);
                  return (
                    <div
                      key={pw.id}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 truncate',
                        pw.status === 'completed' ? 'opacity-40 line-through' :
                        pw.status === 'skipped' ? 'opacity-25 line-through' :
                        color
                      )}
                      title={pw.title}
                    >
                      {label}
                    </div>
                  );
                })}
                {dayPlanned.length > 2 && (
                  <div className="text-[9px] font-medium text-muted-foreground/40 pl-0.5 mt-1">
                    +{dayPlanned.length - 2}
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