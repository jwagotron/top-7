import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns public profile (full_name, email) for a specific coach.
// Runs asServiceRole server-side so the client never bypasses RLS.
// Only returns the single requested coach's minimal public attributes.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { coach_email } = await req.json();
    if (!coach_email) return Response.json({ error: 'coach_email is required' }, { status: 400 });

    const users = await base44.asServiceRole.entities.User.filter({ email: coach_email }, '-created_date', 1);
    if (!users.length) return Response.json({ coach: null });

    const coach = users[0];
    return Response.json({
      coach: {
        email: coach.email,
        full_name: coach.full_name || null,
      },
    });
  } catch (error) {
    console.error('[getCoachInfo] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});