import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, MapPin, Zap, StickyNote, Loader2, Moon, Flame } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/utils';

const intensityConfig = {
  easy:      { label: 'Easy',       color: 'text-secondary',    bg: 'bg-secondary/10',    dot: 'bg-secondary' },
  moderate:  { label: 'Moderate',   color: 'text-primary',      bg: 'bg-primary/10',      dot: 'bg-primary' },
  hard:      { label: 'Hard',       color: 'text-accent',       bg: 'bg-accent/10',       dot: 'bg-accent' },
  race_pace: { label: 'Race Pace',  color: 'text-destructive',  bg: 'bg-destructive/10',  dot: 'bg-destructive' },
  recovery:  { label: 'Recovery',   color: 'text-muted-foreground', bg: 'bg-muted',       dot: 'bg-muted-foreground/50' },
};

const runTypeLabel = {
  easy: 'Easy Run', long_run: 'Long Run', tempo: 'Tempo', interval: 'Intervals',
  fartlek: 'Fartlek', hill_repeats: 'Hill Repeats', race: 'Race', recovery: 'Recovery', progression: 'Progression',
};

export default function TodayWorkout({ workout, completion, athleteEmail }) {
  const { toDisplay, label } = useUnits();
  const qc = useQueryClient();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(completion?.notes || '');
  const isCompleted = completion?.status === 'completed';

  const completeMut = useMutation({
    mutationFn: async () => {
      if (completion?.id) {
        return base44.entities.WorkoutCompletion.update(completion.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes || undefined,
        });
      }
      return base44.entities.WorkoutCompletion.create({
        athlete_email: athleteEmail,
        planned_workout_id: workout.id,
        plan_id: workout.plan_id,
        scheduled_date: workout.scheduled_date,
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['completions'] });
      setShowNotes(false);
    },
  });

  // Rest day
  if (!workout) {
    return (
      <div className="rounded-2xl border border-border/20 bg-muted/20 p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Moon className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Rest Day</p>
          <p className="text-sm text-muted-foreground mt-0.5">Take it easy. Recovery is training too.</p>
        </div>
      </div>
    );
  }

  const intensity = intensityConfig[workout.intensity];
  const metrics = [
    workout.target_duration_minutes && { icon: Clock,  value: `${workout.target_duration_minutes} min` },
    workout.target_distance_km      && { icon: MapPin, value: `${toDisplay(workout.target_distance_km)} ${label}` },
    workout.target_pace             && { icon: Zap,    value: `${workout.target_pace} /km` },
  ].filter(Boolean);

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-300",
      isCompleted
        ? "bg-secondary/5 border-secondary/25"
        : "bg-card border-border/30 shadow-sm"
    )}>
      {/* Accent strip */}
      <div className={cn(
        "h-1 w-full",
        isCompleted ? "bg-secondary" : intensity ? intensity.dot : "bg-primary"
      )} style={{ opacity: 0.7 }} />

      <div className="p-5 space-y-4">
        {/* Title + badges */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            {isCompleted
              ? <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              : <Flame className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            }
            <h3 className={cn(
              "font-bold text-xl leading-tight tracking-tight",
              isCompleted ? "text-secondary" : "text-foreground"
            )}>
              {workout.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-7">
            {workout.run_type && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                {runTypeLabel[workout.run_type] || workout.run_type.replace('_', ' ')}
              </span>
            )}
            {intensity && (
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", intensity.color, intensity.bg)}>
                {intensity.label}
              </span>
            )}
            {isCompleted && (
              <span className="text-[11px] font-semibold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                ✓ Completed
              </span>
            )}
          </div>
        </div>

        {/* Metrics strip */}
        {metrics.length > 0 && (
          <div className="flex flex-wrap gap-4 pl-7 border-t border-border/20 pt-4">
            {metrics.map(({ icon: Icon, value }, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {(workout.description || workout.main_set_description) && (
          <div className="pl-7 space-y-2">
            {workout.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {workout.description}
              </p>
            )}
            {workout.main_set_description && (
              <div className="rounded-xl bg-muted/40 border border-border/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Main Set</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{workout.main_set_description}</p>
              </div>
            )}
          </div>
        )}

        {/* Completion note */}
        {isCompleted && completion?.notes && !showNotes && (
          <div className="pl-7">
            <p className="text-sm text-secondary/80 italic border-l-2 border-secondary/30 pl-3">
              "{completion.notes}"
            </p>
          </div>
        )}

        {/* Notes input */}
        {showNotes && !isCompleted && (
          <div className="pl-7">
            <textarea
              className="w-full rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40 transition-all"
              rows={3}
              placeholder="How did it go? Any notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        {!isCompleted && (
          <div className="flex gap-2 pl-7 pt-1">
            <Button
              className="flex-1 gap-2 h-10 bg-secondary hover:bg-secondary/90 text-white font-semibold shadow-sm shadow-secondary/20 active:scale-[0.98]"
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
            >
              {completeMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Mark Complete</>
              }
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-10 w-10 shrink-0", showNotes && "bg-muted border-primary/30")}
              onClick={() => setShowNotes(v => !v)}
              title="Add a note"
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}