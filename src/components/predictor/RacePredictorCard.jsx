import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatTime, DISTANCE_LABELS } from '@/lib/predictionEngine';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/utils';

const confidenceMeta = {
  high:   { label: 'High confidence',   cls: 'text-secondary bg-secondary/8 border-secondary/25' },
  medium: { label: 'Medium confidence', cls: 'text-foreground bg-muted border-border' },
  low:    { label: 'Low confidence',    cls: 'text-muted-foreground bg-muted border-border' },
};

const trendMeta = {
  improving: { Icon: TrendingUp,   color: 'text-secondary', label: '↑ Improving' },
  steady:    { Icon: Minus,        color: 'text-muted-foreground', label: '— Steady' },
  declining: { Icon: TrendingDown, color: 'text-destructive', label: '↓ Declining' },
};

const readinessLabel = (s) =>
  s >= 80 ? 'Race-ready' : s >= 60 ? 'On track' : s >= 35 ? 'Building' : 'Low volume';

export default function RacePredictorCard({ distance, prediction }) {
  const [expanded, setExpanded] = useState(false);
  const { formatPace } = useUnits();
  if (!prediction) return null;

  const {
    predicted_time_sec, previous_time_sec, confidence = 'low',
    explanation, readiness_score = 0, trend = 'steady', paceSecPerKm,
  } = prediction;

  const diffSec = previous_time_sec ? previous_time_sec - predicted_time_sec : null;
  const trendCfg = trendMeta[trend] || trendMeta.steady;
  const confMeta = confidenceMeta[confidence] || confidenceMeta.low;

  const readinessColor =
    readiness_score >= 70 ? 'bg-secondary' :
    readiness_score >= 40 ? 'bg-primary' :
    'bg-muted-foreground/40';

  const TrendIconComp = trendCfg.Icon;

  return (
    <Card className="border bg-card hover:shadow-sm transition-all">
      <CardContent className="p-4 space-y-3">

        {/* Distance + time */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {DISTANCE_LABELS[distance] || distance}
          </p>
          <p className="text-3xl font-bold tracking-tight leading-none tabular-nums">
            {formatTime(predicted_time_sec)}
          </p>
          {paceSecPerKm && (
            <p className="text-xs text-muted-foreground mt-1">{formatPace(paceSecPerKm)} avg pace</p>
          )}
        </div>

        {/* Trend + delta */}
        <div className="flex items-center justify-between">
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendCfg.color)}>
            <TrendIconComp className="w-3.5 h-3.5" />
            {trendCfg.label}
          </div>
          {diffSec !== null && Math.abs(diffSec) >= 8 && (
            <span className={cn('text-xs font-medium', diffSec > 0 ? 'text-secondary' : 'text-destructive')}>
              {diffSec > 0 ? `−${formatTime(Math.abs(diffSec))}` : `+${formatTime(Math.abs(diffSec))}`}
            </span>
          )}
        </div>

        {/* Readiness bar */}
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Readiness</span>
            <span className="font-medium">{readinessLabel(readiness_score)}</span>
          </div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', readinessColor)}
              style={{ width: `${readiness_score}%` }}
            />
          </div>
        </div>

        {/* Confidence badge */}
        <Badge className={cn('text-[11px] border w-full justify-center py-0.5', confMeta.cls)}>
          {confMeta.label}
        </Badge>

        {/* Explanation toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <Info className="w-3 h-3" />
          How was this calculated?
          {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>

        {expanded && (
          <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/60 rounded-lg p-3 border border-border/60">
            {explanation || 'Based on recent training data.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}