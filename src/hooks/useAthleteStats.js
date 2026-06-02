/**
 * Single source of truth for an athlete's completed workout data.
 * Used by Dashboard and Analytics to guarantee consistent values.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  startOfWeek, endOfWeek, isWithinInterval, subDays, endOfWeek as eow,
  eachWeekOfInterval, format
} from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { useCompletions } from '@/hooks/useCompletions';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import { useUnits } from '@/hooks/useUnits';

export function useAthleteStats(athleteEmail) {
  const { plannedWorkouts } = useAssignedPlan();
  const { completions } = useCompletions(athleteEmail);
  const { toDisplay } = useUnits();

  // Manual Workout entity records (used as a fallback / supplemental source)
  const { data: manualWorkouts = [] } = useQuery({
    queryKey: ['workouts', athleteEmail],
    queryFn: () => base44.entities.Workout.filter({ created_by: athleteEmail }, '-date', 500),
    enabled: !!athleteEmail,
    staleTime: 0,
  });

  // ── Build unified "workout-like" items from ALL completed records ──────────
  const completedWorkoutItems = buildCompletedItems(completions, plannedWorkouts, manualWorkouts);

  // ── This week slice ────────────────────────────────────────────────────────
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 });

  const thisWeekItems = completedWorkoutItems.filter(w => {
    const d = parseDateOnly(w.date);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const weeklyWorkouts  = thisWeekItems.length;
  const weeklyDistKm    = thisWeekItems.reduce((s, w) => s + (w.distance_km || 0), 0);
  const weeklyDuration  = thisWeekItems.reduce((s, w) => s + (w.duration_minutes || 0), 0);

  // ── Recent (last 6) ───────────────────────────────────────────────────────
  const recentCompletedWorkouts = [...completedWorkoutItems]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  // ── Volume series builder (used by Analytics) ─────────────────────────────
  function buildVolumeSeries(periodDays) {
    const cutoff = subDays(now, Number(periodDays));
    const filtered = completedWorkoutItems.filter(w => w.date && parseDateOnly(w.date) >= cutoff);

    const isDaily = periodDays === 7;

    const series = isDaily
      ? Array.from({ length: 7 }, (_, i) => {
          const day = subDays(now, 6 - i);
          const dayStr = format(day, 'yyyy-MM-dd');
          const ww = filtered.filter(w => w.date && w.date.slice(0, 10) === dayStr);
          return {
            week: format(day, 'EEE'),
            distance: Number(toDisplay(ww.reduce((s, w) => s + (w.distance_km || 0), 0)).toFixed(1)),
            duration: Math.round(ww.reduce((s, w) => s + (w.duration_minutes || 0), 0)),
            count: ww.length,
          };
        })
      : eachWeekOfInterval({ start: cutoff, end: now }, { weekStartsOn: 1 }).map(ws => {
          const we = eow(ws, { weekStartsOn: 1 });
          const ww = filtered.filter(w => {
            const d = parseDateOnly(w.date);
            return d >= ws && d <= we;
          });
          return {
            week: format(ws, 'MMM d'),
            distance: Number(toDisplay(ww.reduce((s, w) => s + (w.distance_km || 0), 0)).toFixed(1)),
            duration: Math.round(ww.reduce((s, w) => s + (w.duration_minutes || 0), 0)),
            count: ww.length,
          };
        });

    const totalDistKm  = filtered.reduce((s, w) => s + (w.distance_km || 0), 0);
    const totalDurMins = filtered.reduce((s, w) => s + (w.duration_minutes || 0), 0);
    const longestRunKm = filtered.filter(w => w.distance_km).reduce((max, w) =>
      w.distance_km > (max || 0) ? w.distance_km : max, null);

    console.log('[useAthleteStats:analytics]', {
      period: periodDays,
      completedCount: filtered.length,
      totalDistKm,
      totalDurMins,
      seriesPoints: series.length,
    });

    return { series, filtered, totalDistKm, totalDurMins, longestRunKm };
  }

  console.log('[useAthleteStats:weekly]', {
    athleteEmail,
    weeklyWorkouts,
    weeklyDistKm,
    weeklyDuration,
    totalCompletions: completedWorkoutItems.length,
  });

  return {
    // This-week summary (Dashboard stat cards)
    weeklyWorkouts,
    weeklyDistKm,
    weeklyDuration,

    // For WeeklyChart (this week items with date/distance/duration)
    thisWeekItems,

    // For Recent Activity feed
    recentCompletedWorkouts,

    // For Analytics (full history, volume series builder)
    completedWorkoutItems,
    buildVolumeSeries,
  };
}

/**
 * Merges manual Workout entity records with WorkoutCompletion records
 * into a unified array of objects shaped like:
 *   { id, title, sport, date, distance_km, duration_minutes, intensity, ... }
 */
function buildCompletedItems(completions, plannedWorkouts, manualWorkouts) {
  // IDs of planned workouts that already have a manual log
  const manualCoveredIds = new Set(manualWorkouts.map(w => w.planned_workout_id).filter(Boolean));

  const fromCompletions = completions
    .filter(c => c.status === 'completed')
    .map(c => {
      // Skip if a manual workout already covers this planned workout
      if (manualCoveredIds.has(c.planned_workout_id)) return null;
      const pw = plannedWorkouts.find(p => p.id === c.planned_workout_id);
      if (!pw) return null;
      return {
        id: `comp-${c.id}`,
        title: pw.title,
        sport: pw.sport,
        date: c.scheduled_date || pw.scheduled_date,
        distance_km: pw.target_distance_km || 0,
        duration_minutes: pw.target_duration_minutes || 0,
        intensity: pw.intensity,
        _fromCompletion: true,
      };
    })
    .filter(Boolean);

  return [...manualWorkouts, ...fromCompletions];
}