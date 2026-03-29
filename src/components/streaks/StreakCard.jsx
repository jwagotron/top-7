import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, AlertTriangle, Flame } from 'lucide-react';
import { STREAK_TYPES, getMilestoneLabel } from '@/lib/streakEngine';
import { cn } from '@/lib/utils';

const riskColors = {
  none:   '',
  low:    'border-accent/40',
  medium: 'border-accent',
  high:   'border-destructive',
};

const statusColors = {
  active:   'bg-secondary/10 text-secondary border-secondary/20',
  at_risk:  'bg-accent/10 text-accent border-accent/20',
  broken:   'bg-destructive/10 text-destructive border-destructive/20',
  paused:   'bg-muted text-muted-foreground border-border',
};

export default function StreakCard({ streakType, streakData }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STREAK_TYPES[streakType];
  if (!meta || !streakData) return null;

  const { current_count = 0, best_count = 0, status = 'active', risk_level = 'none', explanation } = streakData;
  const milestone = getMilestoneLabel(current_count);
  const isBroken = status === 'broken';
  const isAtRisk = risk_level === 'medium' || risk_level === 'high';

  return (
    <Card className={cn('border transition-all hover:shadow-md', riskColors[risk_level])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <p className="text-sm font-semibold leading-tight">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.unit}</p>
            </div>
          </div>
          <Badge className={cn('text-xs border', statusColors[status])}>
            {status === 'active' && current_count > 0 ? `${current_count} ${meta.unit}` : status}
          </Badge>
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              {!isBroken && current_count > 0 && <Flame className="w-4 h-4 text-accent" />}
              <span className="text-3xl font-bold tracking-tight">{current_count}</span>
            </div>
            <p className="text-xs text-muted-foreground">Best: {best_count}</p>
          </div>
          <div className="text-right">
            <span className="text-lg">{milestone.emoji}</span>
            <p className="text-xs text-muted-foreground">{milestone.label}</p>
          </div>
        </div>

        {isAtRisk && (
          <div className="flex items-center gap-1.5 text-xs text-accent mb-2 bg-accent/5 rounded-lg px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Streak at risk — take action today.</span>
          </div>
        )}

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Details
        </button>

        {expanded && (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
            {explanation || meta.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}