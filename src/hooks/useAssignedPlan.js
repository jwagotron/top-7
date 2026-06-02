import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * Single source of truth for the current athlete's assigned workouts.
 * Only returns workouts assigned directly to this athlete's email,
 * preventing cross-team / cross-coach data leakage.
 */
export function useAssignedPlan() {
  const { user } = useAuth();
  const athleteEmail = user?.email;
  const qc = useQueryClient();

  // ── 1. Find which teams this athlete belongs to ─────────────────────────
  // Always fresh — RLS on TeamMembership allows reads where athlete_email == user.email
  const { data: memberships = [] } = useQuery({
    queryKey: ['athlete-memberships', athleteEmail],
    queryFn: () => base44.entities.TeamMembership.filter({ athlete_email: athleteEmail, status: 'active' }),
    enabled: !!athleteEmail,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const coachEmails = [...new Set(memberships.map(m => m.coach_email).filter(Boolean))];

  // ── 2. Fetch plans — only those assigned to this athlete AND owned by their coach ──
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['assigned-plans', athleteEmail],
    queryFn: async () => {
      // Fetch plans from each coach in parallel, then deduplicate
      const results = await Promise.all(
        coachEmails.map(email => base44.entities.TrainingPlan.filter({ coach_email: email }, '-created_date', 100))
      );
      const seen = new Set();
      const all = [];
      for (const arr of results) {
        for (const p of arr) {
          if (!seen.has(p.id)) { seen.add(p.id); all.push(p); }
        }
      }
      return all.filter(p => Array.isArray(p.assigned_to) && p.assigned_to.includes(athleteEmail));
    },
    enabled: !!athleteEmail && coachEmails.length > 0,
  });

  const activePlan = plans.find(p => p.status === 'active') || plans[0] || null;

  // ── 3. Plan-based workouts ───────────────────────────────────────────────
  const { data: planWorkouts = [], isLoading: planWorkoutsLoading } = useQuery({
    queryKey: ['assigned-plan-workouts', activePlan?.id],
    queryFn: () => base44.entities.PlannedWorkout.filter({ plan_id: activePlan.id, assigned_to: athleteEmail }, 'scheduled_date', 500),
    enabled: !!activePlan?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ── 4. Directly assigned workouts (assigned_to = this athlete's email only) ─
  const { data: directWorkouts = [], isLoading: directLoading } = useQuery({
    queryKey: ['direct-assigned-workouts', athleteEmail],
    queryFn: () => base44.entities.PlannedWorkout.filter({ assigned_to: athleteEmail }, 'scheduled_date', 500),
    enabled: !!athleteEmail,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ── 5. Merge & deduplicate ───────────────────────────────────────────────
  const seen = new Set();
  const plannedWorkouts = [];
  for (const w of [...planWorkouts, ...directWorkouts]) {
    if (!seen.has(w.id)) {
      seen.add(w.id);
      plannedWorkouts.push(w);
    }
  }
  plannedWorkouts.sort((a, b) => (a.scheduled_date > b.scheduled_date ? 1 : -1));

  // ── 6. Real-time subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!athleteEmail) return;
    const unsubscribe = base44.entities.PlannedWorkout.subscribe(() => {
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