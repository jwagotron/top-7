import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, MapPin, Zap, StickyNote, Loader2, Moon, Flame, MessageSquare, Send } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ rpe: '', energy_level: '', notes: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);
  const isCompleted = completion?.status === 'completed';

  const feedbackMut = useMutation({
    mutationFn: async () => {
      await base44.entities.AthleteFeedback.create({
        workout_id: workout.id,
        athlete_email: athleteEmail,
        rpe: feedback.rpe ? Number(feedback.rpe) : undefined,
        energy_level: feedback.energy_level || undefined,
        notes: feedback.notes || undefined,
        completion_status: 'completed',
      });
    },
    onSuccess: () => {
      setFeedbackSent(true);
      setShowFeedback(false);
    },
  });

  const { data: shoes = [] } = useQuery({
    queryKey: ['shoes'],
    queryFn: () => base44.entities.Shoe.list('-created_date', 100),
  });

  const uncompleteMut = useMutation({
    mutationFn: async () => {
      if (!completion?.id) return;
      // Reverse shoe mileage if it was logged
      if (completion.shoe_id && completion.distance_logged_km) {
        const freshShoe = await base44.entities.Shoe.get(completion.shoe_id);
        if (freshShoe) {
          await base44.entities.Shoe.update(completion.shoe_id, {
            mileage_km: Math.max(0, (freshShoe.mileage_km || 0) - completion.distance_logged_km),
          });
        }
      }
      await base44.entities.WorkoutCompletion.update(completion.id, {
        status: 'pending',
        shoe_id: null,
        distance_logged_km: null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shoes'] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['completions', athleteEmail] });
    },
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      let result;
      if (completion?.id) {
        result = await base44.entities.WorkoutCompletion.update(completion.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes || undefined,
        });
      } else {
        result = await base44.entities.WorkoutCompletion.create({
          athlete_email: athleteEmail,
          planned_workout_id: workout.id,
          plan_id: workout.plan_id,
          scheduled_date: workout.scheduled_date,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes || undefined,
        });
      }
      // Auto-log mileage to primary shoe (fresh fetch to avoid stale data)
      let loggedShoeId = null;
      let loggedDistanceKm = null;
      const distanceToLog = workout.target_distance_km;
      console.log('[ShoeLog] target_distance_km:', distanceToLog);
      if (distanceToLog) {
        const primaryShoeId = localStorage.getItem('primary_shoe_id');
        console.log('[ShoeLog] primaryShoeId from localStorage:', primaryShoeId);
        let targetShoeId = primaryShoeId;
        if (!targetShoeId) {
          const allShoes = await base44.entities.Shoe.list('-created_date', 100);
          const firstActive = allShoes.find(s => s.status !== 'retired');
          console.log('[ShoeLog] fallback shoe:', firstActive?.id, firstActive?.name);
          if (firstActive) targetShoeId = firstActive.id;
        }
        if (targetShoeId) {
          const freshShoe = await base44.entities.Shoe.get(targetShoeId);
          console.log('[ShoeLog] freshShoe:', freshShoe?.name, 'current mileage:', freshShoe?.mileage_km);
          if (freshShoe && freshShoe.status !== 'retired') {
            await base44.entities.Shoe.update(targetShoeId, {
              mileage_km: (freshShoe.mileage_km || 0) + distanceToLog,
            });
            loggedShoeId = targetShoeId;
            loggedDistanceKm = distanceToLog;
            console.log('[ShoeLog] Updated shoe mileage +', distanceToLog, 'km');
          }
        } else {
          console.log('[ShoeLog] No shoe found to log to');
        }
      }
      // Save shoe log info on the completion record
      const completionId = result?.id || completion?.id;
      if (completionId && loggedShoeId) {
        await base44.entities.WorkoutCompletion.update(completionId, {
          shoe_id: loggedShoeId,
          distance_logged_km: loggedDistanceKm,
        });
      }
      return result;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['completions', athleteEmail] });
      const previous = qc.getQueryData(['completions', athleteEmail]);
      const now = new Date().toISOString();
      qc.setQueryData(['completions', athleteEmail], (old = []) => {
        if (completion?.id) {
          return old.map(c => c.id === completion.id
            ? { ...c, status: 'completed', completed_at: now, notes: notes || c.notes }
            : c
          );
        }
        return [...old, {
          id: `optimistic-${workout.id}`,
          athlete_email: athleteEmail,
          planned_workout_id: workout.id,
          status: 'completed',
          completed_at: now,
          notes: notes || undefined,
        }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['completions', athleteEmail], ctx.previous);
    },
    onSuccess: () => {
      setShowNotes(false);
      qc.invalidateQueries({ queryKey: ['shoes'] });
      toast.success('Workout completed! 🎉', {
        description: 'Great work — keep the momentum going.',
        duration: 3000,
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['completions', athleteEmail] });
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
              "font-bold text-xl leading-snug tracking-tight break-words",
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
            {metrics.map((metric, i) => {
              const MetricIcon = metric.icon;
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <MetricIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{metric.value}</span>
                </div>
              );
            })}
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

        {/* Coach message to athlete */}
        {workout.athlete_message && (
          <div className="pl-7">
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">Coach Message</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{workout.athlete_message}</p>
            </div>
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

        {/* Post-completion feedback */}
        {isCompleted && !feedbackSent && (
          <div className="pl-7">
            {!showFeedback ? (
              <button
                type="button"
                onClick={() => setShowFeedback(true)}
                className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/8 border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary/15 transition-colors w-full"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                Send feedback to your coach
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback for Coach</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">How did you feel?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['great', 'good', 'okay', 'tired', 'exhausted'].map(v => (
                      <button key={v} type="button" onClick={() => setFeedback(p => ({ ...p, energy_level: v }))}
                        className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize',
                          feedback.energy_level === v ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80')}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Effort (RPE 1–10)</p>
                  <div className="flex gap-1 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} type="button" onClick={() => setFeedback(p => ({ ...p, rpe: n }))}
                        className={cn('w-8 h-8 rounded-lg text-xs font-bold border transition-all',
                          feedback.rpe === n ? 'bg-primary text-white border-primary' : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="w-full rounded-xl bg-card border border-border/40 px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                  rows={2}
                  placeholder="Any notes for your coach…"
                  value={feedback.notes}
                  onChange={e => setFeedback(p => ({ ...p, notes: e.target.value }))}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowFeedback(false)}>Cancel</Button>
                  <Button type="button" size="sm" className="gap-1.5" onClick={() => feedbackMut.mutate()} disabled={feedbackMut.isPending}>
                    {feedbackMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {isCompleted && feedbackSent && (
          <div className="pl-7">
            <p className="text-xs text-secondary font-medium">✓ Feedback sent to coach</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pl-7 pt-1">
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex gap-2 flex-1"
              >
                <div className="flex-1 flex items-center gap-2 h-10 px-4 rounded-md bg-secondary/15 border border-secondary/30 text-secondary font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs text-muted-foreground shrink-0"
                  onClick={() => uncompleteMut.mutate()}
                  disabled={uncompleteMut.isPending}
                  title="Undo completion"
                >
                  {uncompleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Undo'}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="action" className="flex gap-2 flex-1">
                <Button
                  className="flex-1 gap-2 h-10 bg-secondary hover:bg-secondary/90 text-white font-semibold shadow-sm shadow-secondary/20"
                  onClick={() => completeMut.mutate()}
                  disabled={completeMut.isPending}
                >
                  <AnimatePresence mode="wait">
                    {completeMut.isPending ? (
                      <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                      </motion.span>
                    ) : (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Mark Complete
                      </motion.span>
                    )}
                  </AnimatePresence>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}