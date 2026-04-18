import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Regenerate or return the invite code for a team the coach owns
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { team_id, regenerate } = await req.json().catch(() => ({}));

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const generateCode = () => Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    if (team_id) {
      // Specific team
      const teams = await base44.asServiceRole.entities.Team.filter({ id: team_id });
      if (!teams.length) return Response.json({ error: 'Team not found' }, { status: 404 });
      const team = teams[0];
      if (team.coach_email !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Not your team' }, { status: 403 });
      }
      if (regenerate || !team.invite_code) {
        const newCode = generateCode();
        await base44.asServiceRole.entities.Team.update(team_id, { invite_code: newCode });
        return Response.json({ invite_code: newCode, success: true });
      }
      return Response.json({ invite_code: team.invite_code, success: true });
    }

    // Legacy: generate a code for the user record (backwards compat)
    if (user.team_code && !regenerate) return Response.json({ team_code: user.team_code });
    const code = generateCode();
    await base44.auth.updateMe({ team_code: code });
    return Response.json({ team_code: code, success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});