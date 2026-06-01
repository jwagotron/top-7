import React from 'react';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

function rateColor(rate) {
  if (rate >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-500', ring: 'ring-emerald-500/20', label: 'On Track' };
  if (rate >= 40) return { bar: 'bg-amber-400',   text: 'text-amber-500',   ring: 'ring-amber-400/20',  label: 'Needs Attention' };
  return               { bar: 'bg-rose-500',      text: 'text-rose-500',    ring: 'ring-rose-500/20',   label: 'Behind' };
}

export default function CompletionOverview({ plannedWorkouts = [], completions = [], athleteFilter, mStart, mEnd }) {
  // Use passed month range (from CoachPanel calendar), fall back to current month
  const now = new Date();
  const rangeStart = mStart || startOfMonth(now);
  const rangeEnd   = mEnd   || endOfMonth(now);
  const rangeLabel = format(rangeStart, 'MMMM yyyy');

  const assigned = plannedWorkouts.filter(w => {
    const d = parseDateOnly(w.scheduled_date);
    return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
  });

  const completedSet = new Set(completions.filter(c => c.status === 'completed').map(c => c.planned_workout_id));
  const weekCompleted = assigned.filter(w => w.status === 'completed' || completedSet.has(w.id));

  const assignedCount  = assigned.length;
  const completed = weekCompleted.length;
  const rate      = assignedCount > 0 ? Math.round((completed / assignedCount) * 100) : 0;
  const colors    = rateColor(rate);

  console.log('[CompletionOverview] range:', format(rangeStart,'yyyy-MM-dd'), '->', format(rangeEnd,'yyyy-MM-dd'));
  console.log('[CompletionOverview] assigned:', assignedCount, '| completions prop:', completions.length, '| completed:', completed);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 lg:p-6">
      {/* Top row: title + scope */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Completion Overview</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {rangeLabel} · {athleteFilter === 'all' ? 'All athletes' : athleteFilter}
          </p>
        </div>
        {/* Status pill */}
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full ring-2', colors.text, colors.ring,
          rate >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/30' :
          rate >= 40 ? 'bg-amber-50 dark:bg-amber-950/30' :
                       'bg-rose-50 dark:bg-rose-950/30'
        )}>
          {colors.label}
        </span>
      </div>

      {/* Hero: big % number */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className={cn('text-6xl font-extrabold leading-none tracking-tight', colors.text)}>
            {rate}<span className="text-3xl font-bold">%</span>
          </p>

        </div>

        {/* Assigned / Completed stacked */}
        <div className="flex gap-4 text-right pb-1">
          <div>
            <p className="text-2xl font-bold leading-none text-foreground">{assignedCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Assigned</p>
          </div>
          <div className="w-px bg-border self-stretch" />
          <div>
            <p className="text-2xl font-bold leading-none text-foreground">{completed}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-muted/60 border border-border/40 rounded-full overflow-hidden mt-4">
        <div
          className={cn('h-full rounded-full transition-all duration-700 shadow-sm', colors.bar)}
          style={{ width: `${rate}%`, minWidth: rate > 0 ? '6px' : '0' }}
        />
      </div>
    </div>
  );
}