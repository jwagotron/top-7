import React from 'react';
import { cn } from '@/lib/utils';

export default function PlanProgress({ total, completed }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            pct >= 80 ? "bg-secondary" : pct >= 40 ? "bg-primary" : "bg-primary/60"
          )}
          style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-secondary text-sm">{completed}</span> done
          </span>
          {remaining > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground text-sm">{remaining}</span> left
            </span>
          )}
        </div>
        <span className={cn(
          "text-xs font-bold tabular-nums",
          pct >= 80 ? "text-secondary" : "text-muted-foreground"
        )}>
          {pct}%
        </span>
      </div>
    </div>
  );
}