// @ts-nocheck
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Permanently deletes the authenticated Top 7 account and user-associated data.
 * The User record is deleted LAST so a partial cleanup cannot strand data behind
 * a removed login. Service-role access is required because several records were
 * created by a coach on an athlete's behalf and cannot be deleted by the athlete
 * directly under normal RLS.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = base44.asServiceRole.entities;
    const email = user.email;
    const userId = user.id;
    const deletedIds = new Set<string>();
    const deleted: Record<string, number> = {};

    const deleteRecords = async (entityName: string, query: Record<string, unknown>) => {
      const entity = service[entityName];
      const records = await entity.filter(query);
      for (const record of records || []) {
        const key = `${entityName}:${record.id}`;
        if (!record?.id || deletedIds.has(key)) continue;
        await entity.delete(record.id);
        deletedIds.add(key);
        deleted[entityName] = (deleted[entityName] || 0) + 1;
      }
    };

    // Remove the athlete from coach-owned collections without deleting the coach's
    // entire plan/group. Coach-owned plans/groups are deleted later if this user is
    // the coach who owns them.
    const assignedPlans = await service.TrainingPlan.filter({ assigned_to: { $in: [email] } });
    for (const plan of assignedPlans || []) {
      if (plan.coach_email === email) continue;
      const assigned = Array.isArray(plan.assigned_to)
        ? plan.assigned_to.filter((value: string) => value !== email)
        : [];
      await service.TrainingPlan.update(plan.id, { assigned_to: assigned });
    }

    const athleteGroups = await service.AthleteGroup.filter({ athlete_emails: { $in: [email] } });
    for (const group of athleteGroups || []) {
      if (group.coach_email === email) continue;
      const athleteEmails = Array.isArray(group.athlete_emails)
        ? group.athlete_emails.filter((value: string) => value !== email)
        : [];
      await service.AthleteGroup.update(group.id, { athlete_emails: athleteEmails });
    }

    // Athlete-owned / athlete-specific data.
    await deleteRecords('Activity', { user_email: email });
    await deleteRecords('AthleteFeedback', { athlete_email: email });
    await deleteRecords('AthleteStreak', { athlete_email: email });
    await deleteRecords('BenchmarkEffort', { athlete_email: email });
    await deleteRecords('DeviceConnection', { user_email: email });
    await deleteRecords('GarminSyncEvent', { user_email: email });
    await deleteRecords('PersonalRecord', { athlete_email: email });
    await deleteRecords('RaceGoal', { athlete_email: email });
    await deleteRecords('RacePrediction', { athlete_email: email });
    await deleteRecords('StreakBadge', { athlete_email: email });
    await deleteRecords('WorkoutComment', { user_email: email });
    await deleteRecords('WorkoutCompletion', { athlete_email: email });

    // Records where the user can appear on either side of a relationship/message.
    await deleteRecords('AthleteInvitation', { athlete_email: email });
    await deleteRecords('AthleteInvitation', { coach_email: email });
    await deleteRecords('CoachAthleteRelationship', { athlete_email: email });
    await deleteRecords('CoachAthleteRelationship', { coach_email: email });
    await deleteRecords('CoachMessage', { sender_email: email });
    await deleteRecords('CoachMessage', { recipient_email: email });
    await deleteRecords('TeamMembership', { athlete_email: email });
    await deleteRecords('TeamMembership', { coach_email: email });

    // Workouts assigned to the athlete, plus records authored by this user.
    await deleteRecords('PlannedWorkout', { assigned_to: email });
    await deleteRecords('PlannedWorkout', { created_by_id: userId });
    await deleteRecords('Goal', { created_by_id: userId });
    await deleteRecords('Shoe', { created_by_id: userId });
    await deleteRecords('Workout', { created_by_id: userId });
    await deleteRecords('WorkoutStep', { created_by_id: userId });

    // Coach-owned team structures.
    await deleteRecords('AthleteGroup', { coach_email: email });
    await deleteRecords('TrainingPlan', { coach_email: email });
    await deleteRecords('Team', { coach_email: email });

    // Delete the authentication account/core profile last.
    await service.User.delete(userId);
    deleted.User = 1;

    return Response.json({
      success: true,
      message: 'Your Top 7 account and associated app data were deleted.',
      deleted,
    });
  } catch (error) {
    console.error('[deleteMyAccount] deletion failed:', error);
    return Response.json(
      { error: 'Account deletion could not be completed. No further deletion should be attempted until this error is resolved.' },
      { status: 500 },
    );
  }
});
