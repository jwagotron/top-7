import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { Clock, MapPin, Heart, Mountain, Zap, Footprints, Pencil, Trash2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';
import WorkoutComments from '@/components/workouts/WorkoutComments';

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

const RUN_TYPE_LABELS = {
  easy: 'Easy Run', long_run: 'Long Run', tempo: 'Tempo', interval: 'Intervals',
  fartlek: 'Fartlek', hill_repeats: 'Hill Repeats', race: 'Race', recovery: 'Recovery', progression: 'Progression',
};

const feelingEmojis = { great: '🔥', good: '💪', okay: '👌', tired: '😓', exhausted: '😵' };

export default function RunDetailDrawer({ workout, open, onClose, onEdit, onDelete }) {
  const { toDisplay, label, paceLabel, convertPaceLabel, toDisplayElevation, elevationLabel } = useUnits();
  if (!workout) return null;

  const metrics = [
    { icon: MapPin, label: 'Distance', value: workout.distance_km ? `${toDisplay(workout.distance_km)} ${label}` : null },
    { icon: Clock, label: 'Duration', value: workout.duration_minutes ? `${workout.duration_minutes} min` : null },
    { icon: Zap, label: 'Avg Pace', value: workout.avg_pace ? `${convertPaceLabel(workout.avg_pace)} ${paceLabel}` : null },
    { icon: Zap, label: 'Best Pace', value: workout.best_pace ? `${convertPaceLabel(workout.best_pace)} ${paceLabel}` : null },
    { icon: Heart, label: 'Avg HR', value: workout.avg_heart_rate ? `${workout.avg_heart_rate} bpm` : null },
    { icon: Heart, label: 'Max HR', value: workout.max_heart_rate ? `${workout.max_heart_rate} bpm` : null },
    { icon: Activity, label: 'Cadence', value: workout.cadence ? `${workout.cadence} spm` : null },
    { icon: Mountain, label: 'Elevation', value: workout.elevation_gain ? `${toDisplayElevation(workout.elevation_gain)} ${elevationLabel}` : null },
    { icon: Zap, label: 'Calories', value: workout.calories ? `${workout.calories} kcal` : null },
    { icon: Footprints, label: 'RPE', value: workout.perceived_effort ? `${workout.perceived_effort}/10` : null },
  ].filter(m => m.value);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">{workout.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {workout.run_type && (
                <Badge variant="outline" className={cn('text-xs capitalize', RUN_TYPE_COLORS[workout.run_type])}>
                  {RUN_TYPE_LABELS[workout.run_type] || workout.run_type}
                </Badge>
              )}
              {workout.feeling && (
                <span className="text-sm">{feelingEmojis[workout.feeling]}</span>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(workout)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { onDelete(workout.id); onClose(); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{format(parseDateOnly(workout.date), 'EEEE, MMMM d, yyyy')}</p>

          {/* Key metrics */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {metrics.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Shoes */}
          {workout.shoes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Shoes</p>
              <p className="text-sm font-medium">{workout.shoes}</p>
            </div>
          )}

          {/* Splits */}
          {workout.splits && workout.splits.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Splits</p>
              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-3 gap-0 bg-muted px-3 py-2 text-xs text-muted-foreground font-medium">
                  <span>{label.toUpperCase()}</span><span>Pace</span><span>HR</span>
                </div>
                {workout.splits.map((s, i) => (
                  <div key={i} className={cn('grid grid-cols-3 gap-0 px-3 py-2 text-sm', i % 2 === 0 ? 'bg-card' : 'bg-muted/30')}>
                    <span className="font-medium">{toDisplay(s.km)}</span>
                    <span>{s.pace ? convertPaceLabel(s.pace) : '—'}</span>
                    <span className="text-muted-foreground">{s.heart_rate || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {workout.notes && (
            <div>
              <p className="text-sm font-semibold mb-1">Notes</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{workout.notes}</p>
            </div>
          )}

          {/* Workout comments */}
          <WorkoutComments workoutId={workout.id} role="athlete" />
          </div>
          </SheetContent>
          </Sheet>
          );
          }