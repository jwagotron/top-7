import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, format
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarDayCell from '@/components/workouts/CalendarDayCell';

export default function WorkoutCalendar({ currentMonth, onMonthChange, workouts, plannedWorkouts, selectedDate, onSelectDate }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });



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
          {days.map((day, i) => (
            <CalendarDayCell
              key={i}
              day={day}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              plannedWorkouts={plannedWorkouts}
              workouts={workouts}
              onSelectDate={onSelectDate}
              onAddClick={() => {}}
              showAddButton={false}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}