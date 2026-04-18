import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If coach already has a team code, return it
    if (user.team_code) {
      return Response.json({ team_code: user.team_code });
    }

    // Generate unique 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Check if code already exists
      const existing = await base44.asServiceRole.entities.User.filter(
        { team_code: code }
      );

      isUnique = existing.length === 0;
    }

    // Save code to user
    await base44.auth.updateMe({ team_code: code });

    return Response.json({ team_code: code, success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});