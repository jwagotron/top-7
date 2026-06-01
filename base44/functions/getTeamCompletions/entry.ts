import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fetches WorkoutCompletion records for a list of athlete emails using service-role,
 * bypassing the RLS that restricts coaches from reading athlete completion records.
 * Called by CoachPanel to power accurate stats.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_emails = [] } = await req.json();

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

    const completions = results.flat();

    console.log(
      `[getTeamCompletions] coach: ${user.email} | athletes: ${athlete_emails.length} | completions: ${completions.length}`
    );

    return Response.json({ completions });
  } catch (error) {
    console.error('[getTeamCompletions] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});