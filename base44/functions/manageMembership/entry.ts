import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Coach-only: approve, remove, or reject team membership requests
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { membership_id, action } = await req.json();
    if (!membership_id || !action) {
      return Response.json({ error: 'membership_id and action are required' }, { status: 400 });
    }

    const memberships = await base44.asServiceRole.entities.TeamMembership.filter({ id: membership_id });
    if (!memberships.length) return Response.json({ error: 'Membership not found' }, { status: 404 });

    const membership = memberships[0];
    // Allow athlete to leave their own membership
    if (action === 'leave') {
      if (membership.athlete_email !== user.email) {
        return Response.json({ error: 'You can only leave your own membership' }, { status: 403 });
      }
      await base44.asServiceRole.entities.TeamMembership.update(membership_id, { status: 'removed' });
      return Response.json({ success: true, status: 'removed' });
    }

    // Verify the requesting user is the coach of this team OR an admin
    if (user.role !== 'admin' && membership.coach_email !== user.email) {
      return Response.json({ error: 'You do not own this team' }, { status: 403 });
    }

    if (action === 'approve') {
      await base44.asServiceRole.entities.TeamMembership.update(membership_id, {
        status: 'active',
        joined_at: new Date().toISOString(),
      });
      return Response.json({ success: true, status: 'active', athlete_email: membership.athlete_email, team_id: membership.team_id });
    }

    if (action === 'remove' || action === 'reject') {
      await base44.asServiceRole.entities.TeamMembership.update(membership_id, {
        status: 'removed',
      });
      return Response.json({ success: true, status: 'removed' });
    }

    return Response.json({ error: 'Invalid action. Use approve, remove, or reject.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});