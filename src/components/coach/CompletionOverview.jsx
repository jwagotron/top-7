import React from 'react';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { CheckCircle2, ClipboardList, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function rateColor(rate) {
  if (rate >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' };
  if (rate >= 40) return { bar: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' };
  return { bar: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800' };
}

/**
 * CompletionOverview
 *
 * Props:
 *   plannedWorkouts  – all PlannedWorkout records (already filtered by athlete if needed)
 *   completions      – WorkoutCompletion records for the selected athlete (or [] if "all")
 *   athleteFilter    – 'all' | email string
 */
export default function CompletionOverview({ plannedWorkouts = [], completions = [], athleteFilter }) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(now, { weekStartsOn: 1 });

  // This week's assigned workouts (from the already-filtered set)
  const weekAssigned = plannedWorkouts.filter(w => {
    const d = parseDateOnly(w.scheduled_date);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  // Completed = status on PlannedWorkout OR a WorkoutCompletion record with status=completed
  const weekCompleted = weekAssigned.filter(w => {
    if (w.status === 'completed') return true;
    return completions.some(c => c.planned_workout_id === w.id && c.status === 'completed');
  });

  const assigned  = weekAssigned.length;
  const completed = weekCompleted.length;
  const rate      = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
  const colors    = rateColor(rate);

  const metrics = [
    { icon: ClipboardList,  label: 'Assigned',        value: assigned,  color: 'text-primary',   bg: 'bg-primary/10'   },
    { icon: CheckCircle2,   label: 'Completed',        value: completed, color: 'text-secondary', bg: 'bg-secondary/10' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 lg:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Completion Overview</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            This week · {athleteFilter === 'all' ? 'All athletes' : athleteFilter}
          </p>
        </div>
        {/* Rate badge */}
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold text-sm', colors.bg, colors.border, colors.text)}>
          <TrendingUp className="w-3.5 h-3.5" />
          {rate}%
        </div>
      </div>

      {/* Assigned / Completed mini-stats */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-2.5 bg-muted/30 rounded-xl p-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>Completion rate</span>
          <span className={cn('font-semibold', colors.text)}>{rate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    </div>
  );
}