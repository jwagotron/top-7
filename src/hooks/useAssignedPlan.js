import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * Single source of truth for the current athlete's assigned workouts.
 *
 * Merges two sources:
 *   1. Plan-based: PlannedWorkouts where plan_id is in a plan assigned to this athlete
 *   2. Direct:     PlannedWorkouts where assigned_to === athlete email (no plan required)
 *
 * De-duplicates by id so workouts that appear in both are only shown once.
 */
export function useAssignedPlan() {
  const { user } = useAuth();
  const athleteEmail = user?.email;
  const qc = useQueryClient();

  // ── 1. Fetch plans assigned to this athlete ──────────────────────────────
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['assigned-plans', athleteEmail],
    queryFn: async () => {
      const all = await base44.entities.TrainingPlan.list('-created_date', 100);
      return all.filter(p => Array.isArray(p.assigned_to) && p.assigned_to.includes(athleteEmail));
    },
    enabled: !!athleteEmail,
  });

  const activePlan = plans.find(p => p.status === 'active') || plans[0] || null;

  // ── 2. Plan-based workouts ───────────────────────────────────────────────
  const { data: planWorkouts = [], isLoading: planWorkoutsLoading } = useQuery({
    queryKey: ['assigned-plan-workouts', activePlan?.id],
    queryFn: () => base44.entities.PlannedWorkout.filter({ plan_id: activePlan.id }, 'scheduled_date', 500),
    enabled: !!activePlan?.id,
  });

  // ── 3. Directly assigned workouts (assigned_to = email, any plan or none) ─
  const { data: directWorkouts = [], isLoading: directLoading } = useQuery({
    queryKey: ['direct-assigned-workouts', athleteEmail],
    queryFn: () => base44.entities.PlannedWorkout.filter({ assigned_to: athleteEmail }, 'scheduled_date', 500),
    enabled: !!athleteEmail,
  });

  // ── 4. Merge & deduplicate ───────────────────────────────────────────────
  const seen = new Set();
  const plannedWorkouts = [];
  for (const w of [...planWorkouts, ...directWorkouts]) {
    if (!seen.has(w.id)) {
      seen.add(w.id);
      plannedWorkouts.push(w);
    }
  }
  plannedWorkouts.sort((a, b) => (a.scheduled_date > b.scheduled_date ? 1 : -1));

  // ── 5. Real-time subscription — invalidate on any PlannedWorkout change ──
  useEffect(() => {
    if (!athleteEmail) return;
    const unsubscribe = base44.entities.PlannedWorkout.subscribe(() => {
      // Use partial key match so ALL plan-based workout queries are invalidated
      qc.invalidateQueries({ queryKey: ['assigned-plan-workouts'], exact: false });
      qc.invalidateQueries({ queryKey: ['direct-assigned-workouts', athleteEmail] });
      qc.invalidateQueries({ queryKey: ['assigned-plans', athleteEmail] });
    });
    return unsubscribe;
  }, [athleteEmail, qc]);

  return {
    athleteEmail,
    activePlan,
    plannedWorkouts,
    isLoading: plansLoading || (!!activePlan?.id && planWorkoutsLoading) || directLoading,
  };
}