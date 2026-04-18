import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil, Trash2, User, Clock, MapPin, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const RUN_TYPE_COLORS = {
  easy: 'bg-secondary/10 text-secondary border-secondary/20',
  long_run: 'bg-primary/10 text-primary border-primary/20',
  tempo: 'bg-accent/10 text-accent border-accent/20',
  interval: 'bg-destructive/10 text-destructive border-destructive/20',
  fartlek: 'bg-purple-100 text-purple-700 border-purple-200',
  hill_repeats: 'bg-orange-100 text-orange-700 border-orange-200',
  race: 'bg-amber-100 text-amber-700 border-amber-200',
  recovery: 'bg-muted text-muted-foreground border-border',
  progression: 'bg-teal-100 text-teal-700 border-teal-200',
};

const STATUS_STYLES = {
  completed: 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/40 dark:border-emerald-800/40',
  missed: 'bg-red-50/30 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40',
  skipped: 'bg-slate-100/30 dark:bg-slate-800/30 border-slate-300/30 dark:border-slate-600/30 opacity-70',
  pending: 'bg-card border-border',
};

function CompletionStatusBadge({ completion, scheduled_date }) {
  const isMissed = !completion && scheduled_date && new Date(scheduled_date) < new Date(new Date().toDateString());
  
  if (completion?.status === 'completed') return (
    <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 whitespace-nowrap shadow-sm">
      <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={2.5} />
      Completed
    </div>
  );
  if (completion?.status === 'skipped') return (
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-400 whitespace-nowrap">
      <Clock className="w-4 h-4 shrink-0" />
      Skipped
    </div>
  );
  if (isMissed) return (
    <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-red-500/60 bg-red-500/15 text-red-700 dark:text-red-300 whitespace-nowrap shadow-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2.5} />
      Missed
    </div>
  );
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-slate-300/50 bg-slate-100/50 dark:bg-slate-800/40 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 whitespace-nowrap">
      <div className="w-4 h-4 rounded-full border-2 border-current shrink-0" />
      Pending
    </div>
  );
}

export default function DayWorkoutList({ date, workouts, completions = [], onEdit, onDelete }) {
  const { toDisplay, label, paceLabel } = useUnits();
  
  const getCompletion = (workoutId) => completions.find(c => c.planned_workout_id === workoutId);
  return (
    <div>
      <h3 className="font-semibold text-base mb-4 text-foreground">{format(date, 'EEEE, MMMM d')}</h3>
      {workouts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No workouts scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Click + on the calendar or the button above</p>
        </div>
      ) : (
        <div className="space-y-2.5">
           {workouts.map(w => {
             const completion = getCompletion(w.id);
             const isMissed = !completion && w.scheduled_date && new Date(w.scheduled_date) < new Date(new Date().toDateString());
             const statusKey = completion?.status === 'completed' ? 'completed' : completion?.status === 'skipped' ? 'skipped' : isMissed ? 'missed' : 'pending';

             return (
             <div key={w.id} className={cn('rounded-xl border p-3 transition-all group', STATUS_STYLES[statusKey])}>
               <div className="flex items-start justify-between gap-3">
                 <div className="flex items-start gap-2.5 flex-1 min-w-0">
                   <div className={cn(
                     'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                     completion?.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : isMissed ? 'border-red-500' : completion?.status === 'skipped' ? 'border-slate-400' : 'border-slate-300'
                   )}>
                     {completion?.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 flex-wrap mb-0.5">
                        <span className={cn('text-sm font-semibold break-words flex-1', w.status === 'skipped' && 'line-through text-muted-foreground')}>{w.title}</span>
                       {w.run_type && (
                         <Badge variant="outline" className={cn('text-[9px] font-medium', RUN_TYPE_COLORS[w.run_type])}>
                           {w.run_type.replace('_', ' ')}
                         </Badge>
                       )}
                     </div>

                  {w.assigned_to && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" />{w.assigned_to}
                    </p>
                  )}

                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    {w.target_distance_km && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{toDisplay(w.target_distance_km)} {label}</span>}
                    {w.target_duration_minutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{w.target_duration_minutes} min</span>}
                    {w.target_pace && <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" />{w.target_pace} {paceLabel}</span>}
                  </div>

                  {w.main_set_description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{w.main_set_description}</p>
                  )}

                  {w.athlete_feedback && (
                    <div className="mt-2 bg-background/60 rounded-lg p-2">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Athlete feedback</p>
                      <p className="text-xs mt-0.5">{w.athlete_feedback}</p>
                    </div>
                  )}
                  </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                  <CompletionStatusBadge completion={completion} scheduled_date={w.scheduled_date} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(w)}>
                   <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(w.id)}>
                   <Trash2 className="w-3 h-3" />
                  </Button>
                  </div>
                  </div>
                  </div>
                  </div>
                  );
                  })}
        </div>
      )}
    </div>
  );
}