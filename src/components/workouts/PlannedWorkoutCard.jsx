import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, MapPin, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const RUN_TYPE_COLORS = {
  easy: 'bg-secondary/10 text-secondary border-secondary/20',
  long_run: 'bg-primary/10 text-primary border-primary/20',
  tempo: 'bg-accent/10 text-accent border-accent/20',
  interval: 'bg-destructive/10 text-destructive border-destructive/20',
  fartlek: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  hill_repeats: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  race: 'bg-accent/10 text-accent border-accent/20',
  recovery: 'bg-muted text-muted-foreground border-border',
  progression: 'bg-secondary/10 text-secondary border-secondary/20',
};

const INTENSITY_BAR = {
  recovery: 1, easy: 2, moderate: 3, hard: 4, race_pace: 5,
};

export default function PlannedWorkoutCard({ planned, onLogRun, onMarkSkipped, expanded, onToggle }) {
  const isCompleted = planned.status === 'completed';
  const isSkipped = planned.status === 'skipped';

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      isCompleted ? 'bg-secondary/5 border-secondary/20' :
      isSkipped ? 'bg-muted/50 border-dashed opacity-60' :
      'bg-card border-border hover:shadow-sm'
    )}>
      <div className="p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-2.5">
          <div className={cn('mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
            isCompleted ? 'border-secondary bg-secondary' : isSkipped ? 'border-muted-foreground' : 'border-primary'
          )}>
            {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn('text-sm font-medium', isSkipped && 'line-through text-muted-foreground')}>{planned.title}</span>
              {planned.run_type && (
                <Badge variant="outline" className={cn('text-[10px]', RUN_TYPE_COLORS[planned.run_type])}>
                  {planned.run_type.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <div className="flex gap-3 mt-1 flex-wrap">
              {planned.target_distance_km && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{planned.target_distance_km} km
                </span>
              )}
              {planned.target_duration_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{planned.target_duration_minutes} min
                </span>
              )}
              {planned.target_pace && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />{planned.target_pace} /km
                </span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-2.5">
          {planned.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{planned.description}</p>
          )}
          {planned.warmup_description && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Warm Up</p>
              <p className="text-xs text-foreground">{planned.warmup_description}</p>
            </div>
          )}
          {planned.main_set_description && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Main Set</p>
              <p className="text-xs text-foreground">{planned.main_set_description}</p>
            </div>
          )}
          {planned.cooldown_description && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Cool Down</p>
              <p className="text-xs text-foreground">{planned.cooldown_description}</p>
            </div>
          )}
          {planned.coach_notes && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Coach Notes</p>
              <p className="text-xs text-foreground">{planned.coach_notes}</p>
            </div>
          )}
          {!isCompleted && !isSkipped && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={onLogRun}>Log This Run</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs text-muted-foreground" onClick={onMarkSkipped}>Skip</Button>
            </div>
          )}
          {planned.athlete_feedback && (
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Your Feedback</p>
              <p className="text-xs">{planned.athlete_feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}