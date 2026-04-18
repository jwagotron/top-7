import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invite_code } = await req.json();
    if (!invite_code) return Response.json({ error: 'invite_code is required' }, { status: 400 });

    // Find the team by invite code
    const teams = await base44.asServiceRole.entities.Team.filter({ invite_code: invite_code.trim().toUpperCase() });
    if (!teams.length) return Response.json({ error: 'Invalid invite code. No team found.' }, { status: 404 });

    const team = teams[0];
    if (team.status !== 'active') return Response.json({ error: 'This team is no longer active.' }, { status: 400 });

    // Check if already a member
    const existing = await base44.asServiceRole.entities.TeamMembership.filter({
      team_id: team.id,
      athlete_email: user.email,
    });

    if (existing.length > 0) {
      const m = existing[0];
      if (m.status === 'active') return Response.json({ error: 'You are already a member of this team.' }, { status: 400 });
      if (m.status === 'pending') return Response.json({ error: 'Your request is already pending approval.' }, { status: 400 });
      // If removed, re-activate or re-request
      const newStatus = team.auto_join ? 'active' : 'pending';
      await base44.asServiceRole.entities.TeamMembership.update(m.id, {
        status: newStatus,
        requested_at: new Date().toISOString(),
        joined_at: team.auto_join ? new Date().toISOString() : null,
      });
      return Response.json({ success: true, status: newStatus, team_name: team.name, auto_join: team.auto_join });
    }

    // Create new membership
    const status = team.auto_join ? 'active' : 'pending';
    await base44.asServiceRole.entities.TeamMembership.create({
      team_id: team.id,
      athlete_email: user.email,
      athlete_name: user.full_name || user.email,
      coach_email: team.coach_email,
      status,
      requested_at: new Date().toISOString(),
      joined_at: team.auto_join ? new Date().toISOString() : null,
    });

    return Response.json({ success: true, status, team_name: team.name, auto_join: team.auto_join });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});