import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { STREAK_TYPES, getMilestoneTier } from '@/lib/streakEngine';
import { cn } from '@/lib/utils';

const statusWeekConfig = {
  pass:    { Icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/8 border-secondary/25' },
  pending: { Icon: Clock,        color: 'text-muted-foreground', bg: 'bg-muted/60 border-border' },
  fail:    { Icon: XCircle,      color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/25' },
};

const riskBorder = {
  none:   'border-border',
  low:    'border-border',
  medium: 'border-amber-400/60',
  high:   'border-destructive/50',
};

export default function StreakCard({ streakType, streakData }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STREAK_TYPES[streakType];
  if (!meta || !streakData) return null;

  const {
    current_count = 0, best_count = 0,
    status = 'active', risk_level = 'none',
    explanation, this_week_status = 'pending',
  } = streakData;

  const isBroken = status === 'broken';
  const tier = getMilestoneTier(current_count);
  const weekCfg = statusWeekConfig[this_week_status] || statusWeekConfig.pending;
  const WeekIconComp = weekCfg.Icon;

  return (
    <Card className={cn('border transition-all hover:shadow-sm', riskBorder[risk_level], isBroken && 'opacity-70')}>
      <CardContent className="p-4 space-y-3">

        {/* Header row */}
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold leading-tight">{meta.label}</p>
          <div className={cn('flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 border text-[11px] font-medium', weekCfg.bg, weekCfg.color)}>
            <WeekIconComp className="w-3 h-3" />
            {this_week_status === 'pass' ? 'Done' : this_week_status === 'fail' ? 'Missed' : 'Pending'}
          </div>
        </div>

        {/* Streak count */}
        <div className="flex items-end justify-between">
          <div>
            <span className={cn('text-3xl font-bold tracking-tight tabular-nums', isBroken && 'text-muted-foreground')}>
              {current_count}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{meta.unit}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Best: {best_count}</p>
          </div>
          {tier.rank > 0 && (
            <div className="text-right">
              <p className="text-[11px] font-semibold text-muted-foreground">{tier.label}</p>
            </div>
          )}
        </div>

        {/* Streak progress bar */}
        {!isBroken && current_count > 0 && (() => {
          const nextMilestone = [4, 8, 12, 26, 52].find(m => m > current_count) || 52;
          const prevMilestone = [4, 8, 12, 26, 52].reverse().find(m => m <= current_count) || 0;
          const pct = Math.min(100, ((current_count - prevMilestone) / (nextMilestone - prevMilestone)) * 100);
          return (
            <div>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{nextMilestone - current_count} more to next milestone</p>
            </div>
          );
        })()}

        {/* At-risk warning */}
        {(risk_level === 'high' || risk_level === 'medium') && !isBroken && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {risk_level === 'high' ? 'Streak in danger — act today.' : 'Streak at risk this week.'}
          </div>
        )}

        {/* Explanation toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide detail' : 'This week'}
          <span className="ml-auto" />
        </button>

        {expanded && (
          <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-2.5 border border-border/60">
            {explanation || meta.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}