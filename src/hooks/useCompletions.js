import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDateOnly } from '@/lib/dateUtils';

/**
 * Shared hook for athlete workout completions.
 * Provides data + helpers for marking workouts complete/incomplete.
 */
export function useCompletions(athleteEmail) {
  const qc = useQueryClient();

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['completions', athleteEmail],
    queryFn: () => base44.entities.WorkoutCompletion.filter({ athlete_email: athleteEmail }, '-completed_at', 500),
    enabled: !!athleteEmail,
  });

  // Real-time updates
  useEffect(() => {
    if (!athleteEmail) return;
    const unsubscribe = base44.entities.WorkoutCompletion.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['completions', athleteEmail] });
    });
    return unsubscribe;
  }, [athleteEmail, qc]);

  const completeMut = useMutation({
    mutationFn: async ({ workout, notes }) => {
      const existing = completions.find(c => c.planned_workout_id === workout.id);
      if (existing) {
        return base44.entities.WorkoutCompletion.update(existing.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes || existing.notes,
        });
      }
      return base44.entities.WorkoutCompletion.create({
        athlete_email: athleteEmail,
        planned_workout_id: workout.id,
        plan_id: workout.plan_id || undefined,
        scheduled_date: workout.scheduled_date,
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || undefined,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['completions', athleteEmail] }),
  });

  /** Returns the completion record for a given workout id, or null */
  const getCompletion = (workoutId) =>
    completions.find(c => c.planned_workout_id === workoutId) || null;

  /** Returns true if the given workout id has been completed */
  const isCompleted = (workoutId) =>
    completions.some(c => c.planned_workout_id === workoutId && c.status === 'completed');

  return { completions, isLoading, completeMut, getCompletion, isCompleted };
}