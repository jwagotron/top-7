import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * Single source of truth for the current athlete's assigned training plan
 * and its planned workouts. Used by Dashboard, MyPlan, and WeeklySchedule.
 */
export function useAssignedPlan() {
  const { user } = useAuth();
  const athleteEmail = user?.email;

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['assigned-plans', athleteEmail],
    queryFn: async () => {
      const all = await base44.entities.TrainingPlan.list('-created_date', 100);
      return all.filter(p => Array.isArray(p.assigned_to) && p.assigned_to.includes(athleteEmail));
    },
    enabled: !!athleteEmail,
  });

  const activePlan = plans.find(p => p.status === 'active') || plans[0] || null;

  // Debug log
  if (athleteEmail) {
    console.log('[useAssignedPlan] athlete_email:', athleteEmail, '| assigned plan_id:', activePlan?.id ?? 'none', '| workouts:', plannedWorkouts.length);
  }

  const { data: plannedWorkouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ['assigned-plan-workouts', activePlan?.id],
    queryFn: () => base44.entities.PlannedWorkout.filter({ plan_id: activePlan.id }, 'scheduled_date', 500),
    enabled: !!activePlan?.id,
  });

  return {
    athleteEmail,
    activePlan,
    plannedWorkouts,
    isLoading: plansLoading || (!!activePlan?.id && workoutsLoading),
  };
}