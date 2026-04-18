import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, MapPin, Zap, ChevronDown, ChevronUp, Loader2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

export default function PlannedWorkoutCard({
  planned,
  onLogRun,
  onMarkSkipped,
  expanded,
  onToggle,
  // Completion props (athlete-facing)
  completion = null,
  onMarkComplete,   // async fn({ workout, notes })
  showCompleteButton = false,
}) {
  const [notes, setNotes] = useState(completion?.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCompleted = completion?.status === 'completed' || planned.status === 'completed';
  const isSkipped = planned.status === 'skipped';

  const handleComplete = async () => {
    if (!onMarkComplete) return;
    setSaving(true);
    try {
      await onMarkComplete({ workout: planned, notes });
      setShowNotes(false);
      toast.success('Workout completed! 🎉', {
        description: 'Great work — keep the momentum going.',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border transition-colors duration-300',
        isCompleted ? 'bg-secondary/5 border-secondary/20' :
        isSkipped ? 'bg-muted/50 border-dashed opacity-60' :
        'bg-card border-border hover:shadow-sm'
      )}
    >
      <div className="p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-2.5">
          {/* Status dot */}
          <div className={cn('mt-1 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center',
            isCompleted ? 'border-secondary bg-secondary' : isSkipped ? 'border-muted-foreground/40' : 'border-primary/60'
          )}>
            {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn(
                'text-sm font-semibold leading-snug truncate',
                isSkipped && 'line-through text-muted-foreground',
                isCompleted ? 'text-secondary' : 'text-foreground'
              )}>
                {planned.title}
              </span>
              {isCompleted && (
                <span className="shrink-0 text-[10px] font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">✓ Done</span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Run-type tag — only show if it's not redundant with the title */}
              {planned.run_type && !planned.title.toLowerCase().includes(planned.run_type.replace('_', ' ')) && (
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize',
                  RUN_TYPE_COLORS[planned.run_type]
                )}>
                  {planned.run_type.replace('_', ' ')}
                </span>
              )}
              {planned.target_distance_km && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />{planned.target_distance_km} km
                </span>
              )}
              {planned.target_duration_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />{planned.target_duration_minutes} min
                </span>
              )}
              {planned.target_pace && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3 shrink-0" />{planned.target_pace} /km
                </span>
              )}
            </div>
          </div>

          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
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

          {/* Completion note if done */}
          {isCompleted && completion?.notes && (
            <p className="text-xs text-secondary/80 italic border-l-2 border-secondary/30 pl-2">"{completion.notes}"</p>
          )}

          {/* Notes input for athlete */}
          {showCompleteButton && !isCompleted && !isSkipped && showNotes && (
            <textarea
              className="w-full rounded-lg bg-muted/40 border border-border/40 px-2.5 py-2 text-xs resize-none outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
              rows={2}
              placeholder="How did it go? (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              autoFocus
            />
          )}

          {/* Athlete actions */}
          {showCompleteButton && !isSkipped && (
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-secondary/15 border border-secondary/25 text-secondary text-xs font-semibold"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.06 }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </motion.div>
                  Completed
                </motion.div>
              ) : (
                <motion.div key="actions" className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-secondary hover:bg-secondary/90 text-white gap-1.5"
                    onClick={handleComplete}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    {saving ? 'Saving…' : 'Mark Complete'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("h-8 w-8 p-0", showNotes && "bg-muted border-primary/30")}
                    onClick={() => setShowNotes(v => !v)}
                    title="Add note"
                  >
                    <StickyNote className="w-3 h-3" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Coach actions */}
          {!showCompleteButton && !isCompleted && !isSkipped && (
            <div className="flex gap-2">
              {onLogRun && <Button size="sm" className="flex-1 h-8 text-xs" onClick={onLogRun}>Log This Run</Button>}
              {onMarkSkipped && <Button size="sm" variant="outline" className="h-8 text-xs text-muted-foreground" onClick={onMarkSkipped}>Skip</Button>}
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
    </motion.div>
  );
}