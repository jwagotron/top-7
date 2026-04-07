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
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden">
      {/* Month navigation */}
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
        <div className="flex gap-0.5">
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
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">{d}</div>
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
          className="grid grid-cols-7 divide-x divide-y divide-border/15"
        >
          {days.map((day, i) => {
            const dayWorkouts = getWorkoutsForDay(day);
            const dayPlanned = getPlannedForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const todayDay = isToday(day);

            return (
              <motion.div
                key={i}
                onClick={() => onSelectDate(day)}
                layout
                layoutId={`athlete-day-${format(day, 'yyyy-MM-dd')}`}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'aspect-square p-3.5 cursor-pointer flex flex-col justify-start group relative',
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
              {/* Day number */}
              <div className={cn(
                'text-xs font-semibold leading-4 mb-4 h-4 shrink-0 transition-colors duration-200',
                isSelected ? 'text-primary' :
                todayDay ? 'text-primary/70' :
                'text-foreground/50'
              )}>
                {format(day, 'd')}
              </div>

              {/* Workout pills - centered */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
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
                        'px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 truncate max-w-[85%]',
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
                {dayWorkouts.filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id)).slice(0, 1).map((w, idx) => {
                  const label = getWorkoutLabel(w);
                  const color = getWorkoutColor(w);
                  return (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 truncate opacity-70 max-w-[85%]',
                        color
                      )}
                      title={`✓ ${w.title}`}
                    >
                      ✓ {label}
                    </motion.div>
                  );
                })}
                {(dayPlanned.length + dayWorkouts.length) > 2 && (
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
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}