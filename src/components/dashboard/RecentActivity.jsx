import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Bike, Footprints, Waves, Dumbbell, CircleDot, Clock, MapPin, Heart } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';

const sportIcons = {
  run: Footprints,
  bike: Bike,
  swim: Waves,
  strength: Dumbbell,
  other: CircleDot,
};

export default function RecentActivity({ workouts }) {
  const { toDisplay, label } = useUnits();
  const recent = [...workouts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return (
    <Card className="border border-border rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No workouts logged yet</p>
        ) : recent.map((w) => {
          const SportIcon = sportIcons[w.sport] || CircleDot;
          return (
            <div key={w.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                <SportIcon className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1 min-w-0">{w.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {format(new Date(w.date), 'MMM d')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {w.duration_minutes && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />{w.duration_minutes}m
                    </span>
                  )}
                  {w.distance_km && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />{toDisplay(w.distance_km)}{label}
                    </span>
                  )}
                  {w.avg_heart_rate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="w-3 h-3 shrink-0" />{w.avg_heart_rate}bpm
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}