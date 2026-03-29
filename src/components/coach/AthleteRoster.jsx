import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeStreaksFromWorkouts,
  getAthleteRosterStatus,
  STREAK_TYPES,
} from '@/lib/streakEngine';

const statusConfig = {
  on_track:     { label: 'On Track',      color: 'text-secondary',     bg: 'bg-secondary/8 border-secondary/25', Icon: CheckCircle2 },
  needs_attention: { label: 'Needs Attention', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800', Icon: AlertTriangle },
  slipping:     { label: 'Slipping',      color: 'text-destructive',   bg: 'bg-destructive/5 border-destructive/25', Icon: XCircle },
  no_data:      { label: 'No Data',       color: 'text-muted-foreground', bg: 'bg-muted border-border', Icon: Clock },
};

function getOverallStatus(rosterStatus, plannedWorkouts, workouts) {
  if (workouts.length === 0 && plannedWorkouts.length === 0) return 'no_data';
  if (rosterStatus.atRisk.length >= 2 || rosterStatus.disciplineScore < 35) return 'slipping';
  if (rosterStatus.atRisk.length >= 1 || rosterStatus.disciplineScore < 60) return 'needs_attention';
  return 'on_track';
}

function ScoreBar({ value }) {
  const color =
    value >= 75 ? 'bg-secondary' :
    value >= 50 ? 'bg-primary' :
    value >= 30 ? 'bg-amber-400' :
    'bg-destructive/60';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums w-7 text-right">{value}</span>
    </div>
  );
}

function AthleteRow({ athlete, allWorkouts, allPlanned, allStreaks }) {
  const athleteWorkouts = allWorkouts.filter(w => w.created_by === athlete.email);
  const athletePlanned  = allPlanned.filter(p => p.assigned_to === athlete.email);
  const athleteStreaks   = allStreaks.filter(s => s.athlete_email === athlete.email);

  const computed = useMemo(
    () => computeStreaksFromWorkouts(athleteWorkouts, athletePlanned, athleteStreaks),
    [athleteWorkouts, athletePlanned, athleteStreaks]
  );

  const rosterStatus = useMemo(() => getAthleteRosterStatus(computed), [computed]);
  const overallStatus = getOverallStatus(rosterStatus, athletePlanned, athleteWorkouts);
  const cfg = statusConfig[overallStatus];
  const StatusIcon = cfg.Icon;

  const thisWeekPlanned = athletePlanned.filter(p => {
    const d = new Date(p.scheduled_date);
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000);
    return d >= weekAgo && d <= now;
  });
  const completionRate = thisWeekPlanned.length > 0
    ? Math.round((thisWeekPlanned.filter(p => p.status === 'completed').length / thisWeekPlanned.length) * 100)
    : null;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Athlete name + email */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
            {(athlete.full_name || athlete.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{athlete.full_name || athlete.email}</p>
            {athlete.full_name && (
              <p className="text-[11px] text-muted-foreground truncate">{athlete.email}</p>
            )}
          </div>
        </div>
      </td>

      {/* Status badge */}
      <td className="py-3 px-4">
        <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-[11px] font-medium', cfg.bg, cfg.color)}>
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </div>
      </td>

      {/* Discipline score bar */}
      <td className="py-3 px-4 min-w-[120px]">
        <ScoreBar value={rosterStatus.disciplineScore} />
      </td>

      {/* This week completion */}
      <td className="py-3 px-4 text-sm text-center tabular-nums">
        {completionRate !== null ? (
          <span className={cn('font-semibold', completionRate === 100 ? 'text-secondary' : completionRate >= 60 ? 'text-foreground' : 'text-destructive')}>
            {completionRate}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>

      {/* At-risk streaks */}
      <td className="py-3 px-4">
        {rosterStatus.atRisk.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {rosterStatus.atRisk.slice(0, 2).map(label => (
              <span key={label} className="text-[10px] bg-destructive/8 text-destructive border border-destructive/20 rounded px-1.5 py-0.5">
                {label}
              </span>
            ))}
            {rosterStatus.atRisk.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{rosterStatus.atRisk.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">None</span>
        )}
      </td>

      {/* Passing streaks count */}
      <td className="py-3 px-4 text-center">
        <span className={cn('text-sm font-semibold', rosterStatus.passing.length > 0 ? 'text-secondary' : 'text-muted-foreground')}>
          {rosterStatus.passing.length}/{rosterStatus.totalStreaks}
        </span>
      </td>
    </tr>
  );
}

export default function AthleteRoster({ athletes }) {
  const { data: allWorkouts = [] } = useQuery({
    queryKey: ['all-workouts-roster'],
    queryFn: () => base44.entities.Workout.list('-date', 500),
  });

  const { data: allPlanned = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('scheduled_date', 1000),
  });

  const { data: allStreaks = [] } = useQuery({
    queryKey: ['all-streaks-roster'],
    queryFn: () => base44.entities.AthleteStreak.list('-updated_date', 200),
  });

  if (athletes.length === 0) return null;

  return (
    <Card className="border rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Athlete Roster</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''} · Weekly discipline overview</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Athlete</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Discipline</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">This Week</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">At Risk</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Passing</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map(athlete => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  allWorkouts={allWorkouts}
                  allPlanned={allPlanned}
                  allStreaks={allStreaks}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}