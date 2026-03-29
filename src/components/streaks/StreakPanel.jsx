import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import StreakCard from './StreakCard';
import DisciplineScore from './DisciplineScore';
import {
  STREAK_TYPES, computeStreaksFromWorkouts, computeDisciplineScore
} from '@/lib/streakEngine';

export default function StreakPanel({ userEmail }) {
  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => base44.entities.Workout.list('-date', 100),
  });

  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('-scheduled_date', 50),
  });

  const { data: existingStreaks = [] } = useQuery({
    queryKey: ['athlete-streaks', userEmail],
    queryFn: () => base44.entities.AthleteStreak.filter({ athlete_email: userEmail }, '-updated_date', 50),
    enabled: !!userEmail,
  });

  const computed = useMemo(() =>
    computeStreaksFromWorkouts(workouts, plannedWorkouts, existingStreaks),
    [workouts, plannedWorkouts, existingStreaks]
  );

  const disciplineScore = useMemo(() => computeDisciplineScore(computed), [computed]);

  const atRisk = Object.entries(computed).filter(([, s]) => s.risk_level === 'high' || s.risk_level === 'medium');
  const badges = useMemo(() => {
    const result = [];
    for (const [type, s] of Object.entries(computed)) {
      if (s.current_count >= 7) result.push({ type, count: s.current_count });
    }
    return result;
  }, [computed]);

  return (
    <Card className="border rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-accent" />
            </div>
            <CardTitle className="text-base">Discipline & Streaks</CardTitle>
          </div>
          {badges.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {badges.map(b => (
                <Badge key={b.type} className="text-xs bg-accent/10 text-accent border border-accent/20">
                  🔥 {b.count} {STREAK_TYPES[b.type]?.unit}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Discipline Score */}
          <div className="flex-shrink-0 flex items-center justify-center lg:justify-start">
            <DisciplineScore score={disciplineScore} />
          </div>

          {/* Streak cards grid */}
          <div className="flex-1">
            {atRisk.length > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-accent font-medium">
                ⚠️ {atRisk.length} streak{atRisk.length > 1 ? 's' : ''} at risk — {atRisk.map(([t]) => STREAK_TYPES[t]?.label).join(', ')}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(computed).map(([type, data]) => (
                <StreakCard key={type} streakType={type} streakData={data} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}