import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil, Trash2, User, Clock, MapPin, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  upcoming: 'bg-primary/5 border-primary/20',
  completed: 'bg-secondary/5 border-secondary/20',
  skipped: 'bg-muted/50 border-dashed opacity-60',
};

export default function DayWorkoutList({ date, workouts, onEdit, onDelete }) {
  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">{format(date, 'EEEE, MMMM d')}</h3>
      {workouts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No workouts scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Click + on the calendar or the button above</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {workouts.map(w => (
            <div key={w.id} className={cn('rounded-xl border p-3 transition-all group', STATUS_STYLES[w.status] || STATUS_STYLES.upcoming)}>
              <div className="flex items-start gap-2.5">
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                  w.status === 'completed' ? 'border-secondary bg-secondary' : w.status === 'skipped' ? 'border-muted-foreground' : 'border-primary'
                )}>
                  {w.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('text-sm font-semibold', w.status === 'skipped' && 'line-through text-muted-foreground')}>{w.title}</span>
                    {w.run_type && (
                      <Badge variant="outline" className={cn('text-[10px]', RUN_TYPE_COLORS[w.run_type])}>
                        {w.run_type.replace('_', ' ')}
                      </Badge>
                    )}
                    {w.status === 'completed' && <Badge className="text-[10px] bg-secondary/20 text-secondary border-0">Done</Badge>}
                    {w.status === 'skipped' && <Badge variant="outline" className="text-[10px] text-muted-foreground">Skipped</Badge>}
                  </div>

                  {w.assigned_to && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" />{w.assigned_to}
                    </p>
                  )}

                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    {w.target_distance_km && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{w.target_distance_km} km</span>}
                    {w.target_duration_minutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{w.target_duration_minutes} min</span>}
                    {w.target_pace && <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" />{w.target_pace} /km</span>}
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

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(w)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(w.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}