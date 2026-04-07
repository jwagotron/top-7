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
import { motion, AnimatePresence } from 'framer-motion';

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
        <motion.h2 
          key={format(currentMonth, 'MMMM yyyy')}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="font-semibold text-base tracking-tight text-foreground"
        >
          {format(currentMonth, 'MMMM yyyy')}
        </motion.h2>
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
      <AnimatePresence mode="wait">
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-7 flex-1 divide-x divide-y divide-border/15"
        >
          {days.map((day, i) => {
            const dayPlanned = getPlannedForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const todayDay = isToday(day);

            return (
              <motion.div
                key={i}
                onClick={() => onSelectDate(day)}
                layout
                layoutId={`coach-day-${format(day, 'yyyy-MM-dd')}`}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'aspect-square p-2 cursor-pointer flex flex-col items-stretch justify-start group relative',
                  !isCurrentMonth && 'opacity-30 pointer-events-none',
                  isSelected 
                    ? 'bg-primary/6 border-2 border-primary/30'
                    : todayDay 
                    ? 'bg-primary/3 border-2 border-primary/15'
                    : 'border-2 border-transparent hover:bg-muted/20 active:bg-muted/30',
                )}
                whileHover={isCurrentMonth ? { scale: 1.02 } : {}}
                whileTap={isCurrentMonth ? { scale: 0.98 } : {}}
              >
              {/* Date number + add button section */}
              <div className="flex justify-center items-center gap-1 shrink-0 mb-1">
                <span className={cn(
                  'text-xs font-semibold leading-4 transition-colors duration-200',
                  isSelected ? 'text-primary' :
                  todayDay ? 'text-primary/70' :
                  'text-foreground/50'
                )}>
                  {format(day, 'd')}
                </span>
                <motion.button
                  onClick={(e) => { e.stopPropagation(); onAddClick(day); }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-primary/15 hover:bg-primary/30 flex items-center justify-center transition-all duration-150 shrink-0"
                >
                  <Plus className="w-2.5 h-2.5 text-primary" />
                </motion.button>
              </div>

              {/* Workout marker section - true centered flex container */}
              <div className="w-full flex flex-col items-center justify-start gap-1"
              >
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
                        'px-2.5 py-1 rounded-md text-[9px] font-semibold transition-all duration-200 truncate max-w-[80%] whitespace-nowrap',
                        pw.status === 'completed' ? 'opacity-40 line-through' :
                        pw.status === 'skipped' ? 'opacity-25 line-through' :
                        color
                      )}
                      title={pw.title}
                    >
                      {label}
                    </motion.div>
                  );
                })}
                {dayPlanned.length > 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="text-[9px] font-medium text-muted-foreground/40"
                  >
                    +{dayPlanned.length - 2}
                  </motion.div>
                )}
              </div>
            </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}