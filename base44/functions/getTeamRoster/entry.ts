import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns all TeamMembership records for a team the requesting user coaches.
// Uses service role to bypass RLS (old records may have null coach_email).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { team_id } = await req.json();
    if (!team_id) return Response.json({ error: 'team_id is required' }, { status: 400 });

    // Verify requesting user is the coach of this team
    const teams = await base44.asServiceRole.entities.Team.filter({ id: team_id });
    if (!teams.length) return Response.json({ error: 'Team not found' }, { status: 404 });

    const team = teams[0];
    if (team.coach_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: you do not own this team' }, { status: 403 });
    }

    // Fetch all memberships for this team via service role (no RLS restriction)
    const memberships = await base44.asServiceRole.entities.TeamMembership.filter(
      { team_id },
      'requested_at',
      500
    );

    console.log(`[getTeamRoster] team=${team_id} coach=${user.email} → ${memberships.length} memberships`);

    return Response.json({ memberships, team });
  } catch (error) {
    console.error('[getTeamRoster] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});