import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatTime } from '@/lib/predictionEngine';
import { cn } from '@/lib/utils';

const confidenceColors = {
  high:   'bg-secondary/10 text-secondary border-secondary/20',
  medium: 'bg-accent/10 text-accent border-accent/20',
  low:    'bg-muted text-muted-foreground border-border',
};

const trendConfig = {
  improving: { icon: TrendingUp,   color: 'text-secondary', label: 'Improving' },
  steady:    { icon: Minus,        color: 'text-muted-foreground', label: 'Steady' },
  declining: { icon: TrendingDown, color: 'text-destructive', label: 'Declining' },
};

export default function RacePredictorCard({ distance, prediction, previousPrediction }) {
  const [expanded, setExpanded] = useState(false);
  if (!prediction) return null;

  const { predicted_time_sec, confidence, explanation, readiness_score, trend } = prediction;
  const prevSec = previousPrediction?.predicted_time_sec;
  const diffSec = prevSec ? prevSec - predicted_time_sec : null;

  const TrendIcon = trendConfig[trend || 'steady'].icon;
  const trendColor = trendConfig[trend || 'steady'].color;

  const readinessColor =
    (readiness_score || 0) >= 70 ? 'bg-secondary' :
    (readiness_score || 0) >= 40 ? 'bg-accent' : 'bg-destructive/60';

  return (
    <Card className="border hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{distance}</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{formatTime(predicted_time_sec)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn('text-xs border', confidenceColors[confidence || 'low'])}>
              {confidence} confidence
            </Badge>
            <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trendConfig[trend || 'steady'].label}
            </div>
          </div>
        </div>

        {diffSec !== null && (
          <p className={cn('text-xs font-medium mb-2', diffSec > 5 ? 'text-secondary' : diffSec < -5 ? 'text-destructive' : 'text-muted-foreground')}>
            {diffSec > 5 ? `▲ ${formatTime(Math.abs(diffSec))} faster than last week` :
             diffSec < -5 ? `▼ ${formatTime(Math.abs(diffSec))} slower than last week` :
             'No change from last week'}
          </p>
        )}

        {/* Readiness bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Race Readiness</span>
            <span>{readiness_score || 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', readinessColor)} style={{ width: `${readiness_score || 0}%` }} />
          </div>
        </div>

        {/* Expandable explanation */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Why this prediction?
        </button>

        {expanded && (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
            {explanation || 'Prediction based on your recent training data.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}