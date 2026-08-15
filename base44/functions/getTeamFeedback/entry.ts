import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Returns athlete feedback for a team the requesting user owns.
 * Service-role access is used only after team ownership is verified, then results are
 * restricted to active team members and workouts assigned to that team.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { team_id, athlete_email = null } = await req.json();
    if (!team_id) return Response.json({ error: 'team_id is required' }, { status: 400 });

    const teams = await base44.asServiceRole.entities.Team.filter({ id: team_id });
    if (!teams.length) return Response.json({ error: 'Team not found' }, { status: 404 });

    const team = teams[0];
    if (team.coach_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: you do not own this team' }, { status: 403 });
    }

    const memberships = await base44.asServiceRole.entities.TeamMembership.filter(
      { team_id, status: 'active' },
      'athlete_name',
      500
    );

    const memberMap = new Map(
      memberships
        .filter(m => m.athlete_email)
        .map(m => [m.athlete_email, m.athlete_name || m.athlete_email])
    );

    let athleteEmails = [...memberMap.keys()];
    if (athlete_email) {
      if (!memberMap.has(athlete_email)) {
        return Response.json({ error: 'Athlete is not an active member of this team' }, { status: 403 });
      }
      athleteEmails = [athlete_email];
    }

    if (!athleteEmails.length) return Response.json({ feedback: [] });

    const workoutResults = await Promise.all(
      athleteEmails.map(email =>
        base44.asServiceRole.entities.PlannedWorkout.filter(
          { team_id, assigned_to: email },
          '-scheduled_date',
          500
        )
      )
    );
    const workoutIds = new Set(workoutResults.flat().map(w => w.id));

    if (!workoutIds.size) return Response.json({ feedback: [] });

    const feedbackResults = await Promise.all(
      athleteEmails.map(email =>
        base44.asServiceRole.entities.AthleteFeedback.filter(
          { athlete_email: email },
          '-created_date',
          200
        )
      )
    );

    const feedback = feedbackResults
      .flat()
      .filter(item => item.workout_id && workoutIds.has(item.workout_id))
      .map(item => ({
        ...item,
        athlete_name: memberMap.get(item.athlete_email) || item.athlete_email,
      }))
      .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    return Response.json({ feedback });
  } catch (error) {
    console.error('[getTeamFeedback] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
