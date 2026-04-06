import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Bike, Footprints, Waves, Dumbbell, CircleDot, Clock, MapPin, Heart, Mountain, Pencil, Trash2 } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';

const sportIcons = { run: Footprints, bike: Bike, swim: Waves, strength: Dumbbell, other: CircleDot };
const sportColors = {
  run: "bg-primary/10 text-primary",
  bike: "bg-secondary/10 text-secondary",
  swim: "bg-chart-4/10 text-chart-4",
  strength: "bg-accent/10 text-accent",
  other: "bg-muted text-muted-foreground",
};
const feelingEmojis = { great: '🔥', good: '💪', okay: '👌', tired: '😓', exhausted: '😵' };

export default function WorkoutCard({ workout, onEdit, onDelete }) {
  const SportIcon = sportIcons[workout.sport] || CircleDot;
  const { toDisplay, label, convertPaceLabel, toDisplayElevation, elevationLabel } = useUnits();

  return (
    <Card className="border border-border rounded-2xl hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${sportColors[workout.sport]}`}>
            <SportIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{workout.title}</h3>
              {workout.feeling && <span className="text-sm">{feelingEmojis[workout.feeling]}</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{format(new Date(workout.date), 'EEEE, MMMM d, yyyy')}</p>
            <div className="flex flex-wrap gap-3">
              {workout.duration_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{workout.duration_minutes} min
                </span>
              )}
              {workout.distance_km && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{toDisplay(workout.distance_km)} {label}
                </span>
              )}
              {workout.avg_heart_rate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="w-3 h-3" />{workout.avg_heart_rate} bpm
                </span>
              )}
              {workout.elevation_gain && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mountain className="w-3 h-3" />{toDisplayElevation(workout.elevation_gain)} {elevationLabel}
                </span>
              )}
              {workout.avg_pace && (
                <Badge variant="outline" className="text-[10px]">{convertPaceLabel(workout.avg_pace)} {label === 'mi' ? '/mi' : '/km'}</Badge>
              )}
              {workout.perceived_effort && (
                <Badge variant="outline" className="text-[10px]">RPE {workout.perceived_effort}/10</Badge>
              )}
            </div>
            {workout.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{workout.notes}</p>}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(workout)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(workout.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}