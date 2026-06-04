import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fetches WorkoutCompletion records for a list of athlete emails using service-role,
 * scoped to a specific set of planned_workout_ids (this team's assignments only).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_emails = [], planned_workout_ids = [] } = await req.json();

    if (!athlete_emails.length) {
      return Response.json({ completions: [] });
    }

    // Fetch in parallel for each athlete email via service role (bypasses RLS)
    const results = await Promise.all(
      athlete_emails.map(email =>
        base44.asServiceRole.entities.WorkoutCompletion.filter(
          { athlete_email: email },
          '-completed_at',
          500
        )
      )
    );

    let completions = results.flat();

    // If a set of planned_workout_ids was provided, scope completions to this team only
    if (planned_workout_ids.length > 0) {
      const idSet = new Set(planned_workout_ids);
      completions = completions.filter(c => c.planned_workout_id && idSet.has(c.planned_workout_id));
    }

    console.log(
      `[getTeamCompletions] coach: ${user.email} | athletes: ${athlete_emails.length} | completions: ${completions.length}`
    );

    return Response.json({ completions });
  } catch (error) {
    console.error('[getTeamCompletions] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});