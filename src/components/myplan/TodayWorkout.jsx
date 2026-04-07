import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, MapPin, Zap, StickyNote, Loader2, Moon } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/utils';

const intensityColors = {
  easy: 'bg-secondary/10 text-secondary border-secondary/20',
  moderate: 'bg-primary/10 text-primary border-primary/20',
  hard: 'bg-accent/10 text-accent border-accent/20',
  race_pace: 'bg-destructive/10 text-destructive border-destructive/20',
  recovery: 'bg-muted text-muted-foreground border-border',
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

  if (!workout) {
    return (
      <Card className="rounded-2xl bg-muted/30 border border-border/30">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <Moon className="w-9 h-9 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Rest Day</p>
          <p className="text-sm text-muted-foreground text-center">No workout scheduled for today. Recover well.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "rounded-2xl border transition-all duration-300",
      isCompleted
        ? "bg-secondary/5 border-secondary/20"
        : "bg-card border-border/30 shadow-sm hover:shadow-md"
    )}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
              )}
              <h3 className={cn("font-bold text-lg leading-tight", isCompleted && "text-secondary")}>
                {workout.title}
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize">{workout.sport}</Badge>
              {workout.run_type && <Badge variant="outline" className="text-[10px] capitalize">{workout.run_type.replace('_', ' ')}</Badge>}
              {workout.intensity && (
                <Badge variant="outline" className={cn("text-[10px] capitalize", intensityColors[workout.intensity])}>
                  {workout.intensity.replace('_', ' ')}
                </Badge>
              )}
              {isCompleted && <Badge className="text-[10px] bg-secondary text-white">Done ✓</Badge>}
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {workout.target_duration_minutes && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{workout.target_duration_minutes} min</span>
            </div>
          )}
          {workout.target_distance_km && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{toDisplay(workout.target_distance_km)} {label}</span>
            </div>
          )}
          {workout.target_pace && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{workout.target_pace} /km</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        {workout.description && (
          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
            {workout.description}
          </p>
        )}
        {workout.main_set_description && (
          <div className="rounded-xl bg-muted/40 p-3 text-sm text-foreground/80 leading-relaxed">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Main Set</p>
            {workout.main_set_description}
          </div>
        )}

        {/* Notes input */}
        {showNotes && (
          <textarea
            className="w-full rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
            rows={3}
            placeholder="How did it go? Add any notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        )}

        {/* Completion notes from DB */}
        {isCompleted && completion?.notes && !showNotes && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-secondary/30 pl-3">
            "{completion.notes}"
          </p>
        )}

        {/* Actions */}
        {!isCompleted && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-secondary hover:bg-secondary/90 text-white"
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
            >
              {completeMut.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete</>
              }
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowNotes(v => !v)}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showNotes ? 'Hide' : 'Add Note'}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}