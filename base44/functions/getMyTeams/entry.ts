import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get all memberships for this athlete
    const memberships = await base44.asServiceRole.entities.TeamMembership.filter({
      athlete_email: user.email,
    });

    if (!memberships.length) return Response.json({ teams: [], memberships: [] });

    // Deduplicate team IDs
    const teamIds = [...new Set(memberships.map(m => m.team_id).filter(Boolean))];

    // Fetch all teams using service role
    const teamResults = await Promise.all(
      teamIds.map(id =>
        base44.asServiceRole.entities.Team.filter({ id })
          .then(r => r[0] || null)
          .catch(() => null)
      )
    );
    const teams = teamResults.filter(Boolean);

    return Response.json({ teams, memberships });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});