import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  User, Mail, Calendar, Activity, MapPin, Users, Trophy,
  Shield, TrendingUp, Dumbbell, ClipboardList, UserCheck
} from 'lucide-react';

function Avatar({ name, size = 'lg' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center font-bold text-white shadow-lg shrink-0`}>
      {initials}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-7 h-7 shrink-0 ${color}`} />
        <div>
          <p className="text-xl font-bold">{value ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border">
      {message}
    </p>
  );
}

// ── ATHLETE PROFILE ────────────────────────────────────────────────
function AthleteProfileContent({ user }) {
  const { data: workouts = [] } = useQuery({
    queryKey: ['my-workouts-profile', user?.email],
    queryFn: () => base44.entities.Workout.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['my-memberships-profile', user?.email],
    queryFn: () => base44.entities.TeamMembership.filter({ athlete_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['all-teams-profile'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['my-activities-profile', user?.email],
    queryFn: () => base44.entities.Activity.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const activeTeams = memberships.filter(m => m.status === 'active');
  const totalKm = Math.round(activities.reduce((s, a) => s + (a.distance_m || 0) / 1000, 0));

  // Last 7 days km
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyKm = Math.round(
    activities
      .filter(a => new Date(a.started_at) >= weekAgo)
      .reduce((s, a) => s + (a.distance_m || 0) / 1000, 0) * 10
  ) / 10;

  const recentWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity}   label="Total Workouts"   value={workouts.length}  color="text-primary" />
        <StatCard icon={MapPin}     label="Total km"         value={totalKm}          color="text-secondary" />
        <StatCard icon={TrendingUp} label="Weekly km"        value={weeklyKm}         color="text-accent" />
        <StatCard icon={Users}      label="Teams Joined"     value={activeTeams.length} color="text-chart-4" />
      </div>

      {/* Teams */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> My Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeTeams.length === 0 ? (
            <EmptyState message="No teams joined yet" />
          ) : activeTeams.map(m => {
            const team = teams.find(t => t.id === m.team_id);
            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <p className="font-medium text-sm">{team?.name || m.team_id}</p>
                  <p className="text-xs text-muted-foreground">{team?.school_club || team?.location || 'No location'}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Active</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent workouts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Dumbbell className="w-4 h-4 text-primary" /> Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentWorkouts.length === 0 ? (
            <EmptyState message="No workout history yet" />
          ) : recentWorkouts.map(w => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div>
                <p className="font-medium text-sm">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.date ? format(new Date(w.date), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                {w.distance_km && <span className="text-xs text-muted-foreground">{w.distance_km} km</span>}
                <Badge variant="outline" className="text-[10px] capitalize">{w.run_type || w.sport}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ── COACH PROFILE ─────────────────────────────────────────────────
function CoachProfileContent({ user }) {
  const { data: teams = [] } = useQuery({
    queryKey: ['coach-teams-profile', user?.email],
    queryFn: () => base44.entities.Team.filter({ coach_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['coach-memberships-profile', user?.email],
    queryFn: () => base44.entities.TeamMembership.filter({ coach_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['coach-planned-workouts-profile', user?.email],
    queryFn: () => base44.entities.PlannedWorkout.filter({ coach_email: user.email }, '-scheduled_date', 200),
    enabled: !!user?.email,
  });

  const activeAthletes = memberships.filter(m => m.status === 'active');
  const assignedWorkouts = plannedWorkouts.filter(pw => pw.assigned_to);
  const recentAssigned = [...assignedWorkouts].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)).slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Teams Created"      value={teams.length}          color="text-primary" />
        <StatCard icon={UserCheck}     label="Active Athletes"    value={activeAthletes.length}  color="text-secondary" />
        <StatCard icon={ClipboardList} label="Workouts Assigned"  value={assignedWorkouts.length} color="text-accent" />
        <StatCard icon={Activity}      label="Pending Members"    value={memberships.filter(m => m.status === 'pending').length} color="text-chart-4" />
      </div>

      {/* Teams */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> My Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 ? (
            <EmptyState message="No teams created yet" />
          ) : teams.map(t => {
            const count = memberships.filter(m => m.team_id === t.id && m.status === 'active').length;
            return (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">Code: {t.invite_code || '—'}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{count} athletes</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent assigned workouts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Recent Assigned Workouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentAssigned.length === 0 ? (
            <EmptyState message="No workouts assigned yet" />
          ) : recentAssigned.map(pw => (
            <div key={pw.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div>
                <p className="font-medium text-sm">{pw.title}</p>
                <p className="text-xs text-muted-foreground">{pw.assigned_to} · {pw.scheduled_date ? format(new Date(pw.scheduled_date), 'MMM d') : '—'}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] capitalize ${pw.status === 'completed' ? 'text-secondary border-secondary/40' : ''}`}>{pw.status || 'upcoming'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ── ADMIN PROFILE ─────────────────────────────────────────────────
function AdminProfileContent({ user }) {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users-profile'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['admin-teams-profile'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allActivities = [] } = useQuery({
    queryKey: ['admin-activities-profile'],
    queryFn: () => base44.entities.Activity.list('-created_date', 50),
  });

  const { data: syncEvents = [] } = useQuery({
    queryKey: ['admin-sync-profile'],
    queryFn: () => base44.entities.GarminSyncEvent.list('-received_at', 20),
  });

  const athletes = allUsers.filter(u => u.user_type === 'athlete');
  const coaches  = allUsers.filter(u => u.user_type === 'coach');
  const recentActivity = allActivities.slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}    label="Total Users"      value={allUsers.length}   color="text-primary" />
        <StatCard icon={Shield}   label="Teams Created"    value={allTeams.length}   color="text-secondary" />
        <StatCard icon={UserCheck}label="Active Athletes"  value={athletes.length}   color="text-accent" />
        <StatCard icon={Activity} label="Active Coaches"   value={coaches.length}    color="text-chart-4" />
      </div>

      {/* Recent system activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.length === 0 ? (
            <EmptyState message="No recent activity recorded" />
          ) : recentActivity.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div>
                <p className="font-medium text-sm">{a.title || a.sport}</p>
                <p className="text-xs text-muted-foreground">{a.user_email}</p>
              </div>
              <span className="text-xs text-muted-foreground">{a.started_at ? format(new Date(a.started_at), 'MMM d') : '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent sync events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Recent Sync Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {syncEvents.length === 0 ? (
            <EmptyState message="No sync events recorded" />
          ) : syncEvents.slice(0, 5).map(e => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div>
                <p className="font-medium text-sm capitalize">{e.event_type?.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{e.user_email || 'System'}</p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${e.processing_status === 'success' ? 'text-secondary border-secondary/40' : e.processing_status === 'failed' ? 'text-destructive border-destructive/40' : ''}`}
              >
                {e.processing_status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
const ROLE_CONFIG = {
  athlete: { title: 'Athlete Profile', badge: 'Athlete', badgeClass: 'bg-primary/10 text-primary border-primary/30' },
  coach:   { title: 'Coach Profile',   badge: 'Coach',   badgeClass: 'bg-secondary/10 text-secondary border-secondary/30' },
  admin:   { title: 'Admin Profile',   badge: 'Admin',   badgeClass: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export default function UserProfile() {
  const { user, isLoadingAuth } = useAuth();
  const { role } = useRole();

  // Derive effective role: admin first, then user_type, then role context, then fallback
  const effectiveRole = user?.role === 'admin'
    ? 'admin'
    : (user?.user_type || role || 'athlete');

  const config = ROLE_CONFIG[effectiveRole] || ROLE_CONFIG.athlete;

  if (isLoadingAuth) {
    return (
      <div className="bg-background">
        <TopBar title="Profile" />
        <div className="p-6 space-y-4 max-w-3xl mx-auto">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <TopBar title={config.title} />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8">

        {/* Profile header — always visible */}
        <Card>
          <CardContent className="p-6 flex items-center gap-5">
            <Avatar name={user?.full_name || user?.email} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold truncate">{user?.full_name || user?.email || 'Unknown User'}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className={`text-xs ${config.badgeClass}`}>{config.badge}</Badge>
                {user?.created_date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Joined {format(new Date(user.created_date), 'MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role-specific content — always renders one of the three */}
        {effectiveRole === 'coach'
          ? <CoachProfileContent user={user} />
          : effectiveRole === 'admin'
            ? <AdminProfileContent user={user} />
            : <AthleteProfileContent user={user} />
        }
      </div>
    </div>
  );
}