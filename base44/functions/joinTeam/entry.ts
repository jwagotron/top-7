import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'athlete') {
      return Response.json({ error: 'Only athletes can join teams' }, { status: 403 });
    }

    const { team_code } = await req.json();

    if (!team_code || typeof team_code !== 'string') {
      return Response.json({ error: 'Invalid team code' }, { status: 400 });
    }

    // Find coach with this team code
    const coaches = await base44.asServiceRole.entities.User.filter(
      { team_code: team_code.toUpperCase(), role: 'coach' }
    );

    if (coaches.length === 0) {
      return Response.json({ error: 'Team code not found' }, { status: 404 });
    }

    const coach = coaches[0];

    // Update athlete with coach email
    await base44.auth.updateMe({ coach_email: coach.email });

    return Response.json({
      success: true,
      coach_email: coach.email,
      message: 'Successfully joined team'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});