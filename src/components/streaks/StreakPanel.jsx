import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import StreakCard from './StreakCard';
import DisciplineScore from './DisciplineScore';
import { STREAK_TYPES, computeStreaksFromWorkouts, computeDisciplineScore } from '@/lib/streakEngine';

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

  const computed = useMemo(
    () => computeStreaksFromWorkouts(workouts, plannedWorkouts, existingStreaks),
    [workouts, plannedWorkouts, existingStreaks]
  );

  const disciplineScore = useMemo(() => computeDisciplineScore(computed), [computed]);

  const atRiskCount = Object.values(computed).filter(s =>
    s.risk_level === 'high' || s.status === 'broken' || s.this_week_status === 'fail'
  ).length;

  const passingCount = Object.values(computed).filter(s => s.this_week_status === 'pass').length;

  // Sort: broken/at-risk first, then passing, then pending
  const sortedEntries = Object.entries(computed).sort(([, a], [, b]) => {
    const rank = (s) =>
      s.status === 'broken' ? 0 :
      s.risk_level === 'high' ? 1 :
      s.risk_level === 'medium' ? 2 :
      s.this_week_status === 'pass' ? 4 : 3;
    return rank(a) - rank(b);
  });

  return (
    <Card className="border rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold">Discipline & Execution</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {passingCount} passing · {atRiskCount > 0 ? `${atRiskCount} need attention` : 'nothing at risk this week'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Discipline score */}
          <div className="shrink-0 flex flex-row lg:flex-col items-center gap-5 lg:gap-0 lg:justify-start lg:pt-2">
            <DisciplineScore score={disciplineScore} />
            <div className="flex flex-row lg:flex-col lg:mt-4 gap-3 lg:gap-1.5 lg:text-center">
              <div className="text-[11px] text-muted-foreground"><span className="font-medium text-secondary">{passingCount}</span> on track</div>
              <div className="text-[11px] text-muted-foreground"><span className="font-medium text-destructive">{atRiskCount}</span> at risk</div>
              <div className="text-[11px] text-muted-foreground"><span className="font-medium">{Object.keys(computed).length - passingCount - atRiskCount}</span> pending</div>
            </div>
          </div>

          {/* Streak grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sortedEntries.map(([type, data]) => (
              <StreakCard key={type} streakType={type} streakData={data} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}