import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Bike, Footprints, Waves, Dumbbell, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const sportIcons = {
  run: Footprints,
  bike: Bike,
  swim: Waves,
  strength: Dumbbell,
  other: CircleDot,
};

const intensityColors = {
  easy: "bg-secondary/10 text-secondary border-secondary/20",
  moderate: "bg-primary/10 text-primary border-primary/20",
  hard: "bg-accent/10 text-accent border-accent/20",
  race_pace: "bg-destructive/10 text-destructive border-destructive/20",
  recovery: "bg-muted text-muted-foreground border-border",
};

export default function UpcomingWorkouts({ plannedWorkouts }) {
  const { toDisplay, label } = useUnits();
  const upcoming = plannedWorkouts
    .filter(w => w.status === 'upcoming')
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
    .slice(0, 5);

  return (
    <Card className="border border-border rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Upcoming Workouts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming workouts scheduled</p>
        ) : upcoming.map((w) => {
          const SportIcon = sportIcons[w.sport] || CircleDot;
          return (
            <div key={w.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <SportIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 justify-between">
                  <p className="text-sm font-medium leading-tight flex-1 min-w-0 break-words">{w.title}</p>
                  {w.intensity && (
                    <Badge variant="outline" className={cn("text-[10px] capitalize shrink-0", intensityColors[w.intensity])}>
                      {w.intensity.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  {format(new Date(w.scheduled_date), 'EEE, MMM d')}
                  {w.target_distance_km ? ` · ${toDisplay(w.target_distance_km)} ${label}` : ''}
                  {w.target_duration_minutes ? ` · ${w.target_duration_minutes} min` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}