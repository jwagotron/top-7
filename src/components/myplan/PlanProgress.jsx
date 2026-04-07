import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlanProgress({ total, completed }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
          Plan Progress
        </span>
        <span className="font-bold text-foreground">{completed} / {total} workouts</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 80 ? "bg-secondary" : pct >= 40 ? "bg-primary" : "bg-accent"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{pct}% complete</p>
    </div>
  );
}