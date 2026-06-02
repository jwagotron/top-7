import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import TopBar from '@/components/layout/TopBar';
import TeamInviteCard from '@/components/coach/TeamInviteCard';
import TeamMembershipList from '@/components/coach/TeamMembershipList';
import TrainingMonthGrid from '@/components/workouts/TrainingMonthGrid';
import DayWorkoutList from '@/components/coach/DayWorkoutList';
import AssignWorkoutForm from '@/components/coach/AssignWorkoutForm';
import CompletionOverview from '@/components/coach/CompletionOverview';
import CreateTeamModal from '@/components/coach/CreateTeamModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AthleteGroupManager from '@/components/coach/AthleteGroupManager';
import AthleteFeedbackList from '@/components/coach/AthleteFeedbackList';
import { Plus, Users, Calendar, CheckCircle2, TrendingUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useUnits } from '@/hooks/useUnits';

import { format, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';

export default function CoachPanel() {
  const { user } = useAuth();
  const { role } = useRole();
  const qc = useQueryClient();
  const { toDisplay, label } = useUnits();

  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [athleteFilter, setAthleteFilter] = useState('all');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState('workouts');

  // Fetch coach's teams — always fresh, no stale cache
  // RLS on Team entity allows reads where coach_email == user.email
  const { data: myTeams = [], refetch: refetchTeams } = useQuery({
    queryKey: ['my-teams', user?.email],
    queryFn: async () => {
      console.log('[CoachPanel] fetching teams for email:', user?.email, 'id:', user?.id);
      const teams = await base44.entities.Team.filter({ coach_email: user?.email });
      console.log('[CoachPanel] teams found by coach_email:', teams.length, teams.map(t => t.id));
      return teams.filter(t => t.status !== 'archived');
    },
    enabled: !!user?.email,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const selectedTeam = myTeams.find(t => t.id === selectedTeamId) || myTeams[0] || null;
  const effectiveTeamId = selectedTeam?.id;

  // Fetch ALL members via backend function (service role) to bypass RLS gaps on old records
  const { data: rosterData = {}, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['team-roster', effectiveTeamId],
    queryFn: async () => {
      console.log('[CoachPanel] fetching roster for team:', effectiveTeamId, 'coach:', user?.email);
      const res = await base44.functions.invoke('getTeamRoster', { team_id: effectiveTeamId });
      const memberships = res.data?.memberships || [];
      console.log('[CoachPanel] roster loaded:', memberships.length, '| active:', memberships.filter(m => m.status === 'active').length);
      return { memberships };
    },
    enabled: !!effectiveTeamId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const members = rosterData.memberships || [];

  // Exclude the coach themselves — support athlete_email, email, or athlete_id fields on older records
  const resolveEmail = (m) => m.athlete_email || m.email || null;
  const nonCoachMembers = members.filter(m => resolveEmail(m) !== user?.email);
  // Only active members are used for workout assignment
  const activeMembers = nonCoachMembers.filter(m => m.status === 'active');
  const athleteEmails = activeMembers.map(resolveEmail).filter(Boolean);
  const normalizedAthletes = activeMembers.map(m => ({
    email: resolveEmail(m),
    full_name: m.athlete_name || m.full_name || resolveEmail(m),
  }));
  const selectedAthleteEmail = athleteFilter !== 'all' ? athleteFilter : null;
  // Emails to fetch completions for: single athlete or all team athletes
  const targetEmails = selectedAthleteEmail ? [selectedAthleteEmail] : athleteEmails;

  // Fetch completions directly per athlete — same pattern as AthleteProfile (confirmed working)
  const { data: coachCompletions = [], isLoading: isLoadingCompletions } = useQuery({
    queryKey: ['coach-completions-direct', effectiveTeamId, targetEmails.join(',')],
    queryFn: async () => {
      if (!targetEmails.length) return [];
      const results = await Promise.all(
        targetEmails.map(email =>
          base44.entities.WorkoutCompletion.filter({ athlete_email: email }, '-completed_at', 300)
        )
      );
      return results.flat();
    },
    enabled: !!effectiveTeamId && targetEmails.length > 0,
    staleTime: 10000,
  });

  // Real-time: when any PlannedWorkout changes, refresh both planned workouts and completions
  React.useEffect(() => {
    const unsub = base44.entities.PlannedWorkout.subscribe(() => {
      console.log('[CoachPanel] PlannedWorkout change — invalidating planned-workouts + coach-completions');
      qc.invalidateQueries({ queryKey: ['planned-workouts'] });
      qc.invalidateQueries({ queryKey: ['coach-completions-direct'] });
    });
    return unsub;
  }, [qc]);

  // Only fetch planned workouts for athletes on THIS team — prevents cross-team data leakage
  const { data: plannedWorkouts = [], isLoading } = useQuery({
    queryKey: ['planned-workouts', effectiveTeamId, athleteEmails],
    queryFn: async () => {
      if (athleteEmails.length === 0) return [];
      // Fetch in parallel per athlete then merge
      const results = await Promise.all(
        athleteEmails.map(email => base44.entities.PlannedWorkout.filter({ assigned_to: email }, 'scheduled_date', 500))
      );
      const seen = new Set();
      const merged = [];
      for (const arr of results) {
        for (const w of arr) {
          if (!seen.has(w.id)) { seen.add(w.id); merged.push(w); }
        }
      }
      return merged.sort((a, b) => a.scheduled_date > b.scheduled_date ? 1 : -1);
    },
    enabled: !!effectiveTeamId,
    staleTime: 5000,
  });

  const invalidatePlanned = () => {
    qc.invalidateQueries({ queryKey: ['planned-workouts'] });
    qc.invalidateQueries({ queryKey: ['assigned-plan-workouts'], exact: false });
    qc.invalidateQueries({ queryKey: ['direct-assigned-workouts'], exact: false });
  };

  const createMut = useMutation({
    mutationFn: (d) => {
      console.log('[assign] saving workout(s)', d);
      return Array.isArray(d)
        ? base44.entities.PlannedWorkout.bulkCreate(d)
        : base44.entities.PlannedWorkout.create(d);
    },
    onSuccess: (result) => {
      console.log('[assign] success', result);
      invalidatePlanned();
      setShowForm(false);
      toast.success('Workout assigned!');
    },
    onError: (err) => {
      console.error('[assign] failed', err);
      toast.error('Could not assign workout. Try again.');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('[assign] updating workout', id, data);
      return base44.entities.PlannedWorkout.update(id, data);
    },
    onSuccess: () => {
      console.log('[assign] update success');
      invalidatePlanned();
      setEditingWorkout(null);
      toast.success('Workout updated!');
    },
    onError: (err) => {
      console.error('[assign] update failed', err);
      toast.error('Could not update workout. Try again.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.PlannedWorkout.delete(id),
    onSuccess: () => invalidatePlanned(),
  });

  const handleMonthChange = (dir) => {
    if (dir === 0) { setCurrentMonth(new Date()); setSelectedDate(new Date()); }
    else setCurrentMonth(p => dir === 1 ? addMonths(p, 1) : subMonths(p, 1));
  };

  const filteredWorkouts = athleteFilter === 'all'
    ? plannedWorkouts
    : plannedWorkouts.filter(w => w.assigned_to === athleteFilter);

  const dayWorkouts = filteredWorkouts.filter(w => isSameDay(parseDateOnly(w.scheduled_date), selectedDate));

  const mStart = startOfMonth(currentMonth);
  const mEnd = endOfMonth(currentMonth);
  const monthWorkouts = filteredWorkouts.filter(w => {
    const d = parseDateOnly(w.scheduled_date);
    return d >= mStart && d <= mEnd;
  });
  // Single source of truth — all derived stats computed here, used by BOTH debug panel and stat cards
  const coachCompletedIds = new Set(
    coachCompletions
      .filter(c => c.status === 'completed')
      .flatMap(c => [c.planned_workout_id, c.workout_id, c.assignment_id].filter(Boolean))
  );
  const monthAssignmentIds = monthWorkouts.map(w => w.id);
  const allCompletionWorkoutIds = coachCompletions.filter(c => c.status === 'completed').flatMap(c =>
    [c.planned_workout_id, c.workout_id, c.assignment_id].filter(Boolean)
  );
  const matchedCompletedIds = monthAssignmentIds.filter(id => coachCompletedIds.has(id));

  const stats = {
    assigned: monthWorkouts.length,
    completed: matchedCompletedIds.length,
    remaining: monthWorkouts.length - matchedCompletedIds.length,
    rate: monthWorkouts.length > 0 ? Math.round((matchedCompletedIds.length / monthWorkouts.length) * 100) : 0,
  };

  const isStatsLoading = isLoading || isLoadingCompletions;

  console.log('[CoachPanel] ── STATS DEBUG ──');
  console.log('[CoachPanel] teamId:', effectiveTeamId, '| athleteFilter:', athleteFilter);
  console.log('[CoachPanel] targetEmails:', targetEmails);
  console.log('[CoachPanel] month:', format(mStart, 'yyyy-MM-dd'), '→', format(mEnd, 'yyyy-MM-dd'));
  console.log('[CoachPanel] plannedWorkouts total:', plannedWorkouts.length, '| filteredWorkouts:', filteredWorkouts.length, '| monthWorkouts:', monthWorkouts.length);
  console.log('[CoachPanel] coachCompletions loaded:', coachCompletions.length);
  console.log('[CoachPanel] monthAssignmentIds:', monthAssignmentIds);
  console.log('[CoachPanel] completedWorkoutIds:', allCompletionWorkoutIds);
  console.log('[CoachPanel] matchedCompletedIds:', matchedCompletedIds);
  console.log('[CoachPanel] stats:', stats);

  return (
      <div className="min-h-screen bg-background">
        <TopBar title="Coach Panel">
          {/* Team selector */}
          {myTeams.length > 1 && (
            <Select value={effectiveTeamId || ''} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {myTeams.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" className="h-8 px-2 gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Assign</span>
          </Button>
        </TopBar>

        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5 pb-24 lg:pb-8">

          {/* No teams yet */}
          {myTeams.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-xl font-bold mb-2">No teams yet</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                Create your first team to start adding athletes and assigning workouts.
              </p>
              <Button onClick={() => setShowCreateTeam(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Your First Team
              </Button>
            </div>
          ) : (
            <>
              {/* Team header + Invite card */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedTeam?.logo_url && (
                    <img src={selectedTeam.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  <div>
                    <h2 className="font-bold text-base">{selectedTeam?.name}</h2>
                    {selectedTeam?.school_club && <p className="text-xs text-muted-foreground">{selectedTeam.school_club}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreateTeam(true)}>
                    <Plus className="w-3 h-3" /> New Team
                  </Button>
                </div>
              </div>

              {/* Invite button */}
              {selectedTeam && (
                <Button onClick={() => setShowInvite(true)} className="mb-5 gap-2">
                  <Plus className="w-4 h-4" /> Invite Athlete
                </Button>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="workouts" className="text-xs px-3">Workouts</TabsTrigger>
                  <TabsTrigger value="athletes" className="text-xs px-3">
                    Athletes {nonCoachMembers.filter(m => m.status === 'pending').length > 0 && <Badge className="ml-1 h-4 px-1 text-[10px]">{nonCoachMembers.filter(m => m.status === 'pending').length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="text-xs px-3 gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Feedback
                  </TabsTrigger>
                </TabsList>

              {/* WORKOUTS TAB */}
              <TabsContent value="workouts" className="space-y-4 mt-0">
                {/* Debug panel */}
                <details className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3" open>
                  <summary className="cursor-pointer text-amber-700 dark:text-amber-400 font-semibold text-xs">🔍 Roster Debug (temporary)</summary>
                  <div className="mt-2 space-y-0.5 font-mono text-[11px] text-amber-800 dark:text-amber-300">
                    <div className="font-bold border-b border-amber-300 dark:border-amber-700 pb-1 mb-1">Identity</div>
                    <div>user.id: <span className="font-bold">{user?.id || 'NONE'}</span></div>
                    <div>user.email: <span className="font-bold">{user?.email || 'NONE'}</span></div>
                    <div className="font-bold border-b border-amber-300 dark:border-amber-700 pb-1 mb-1 mt-2">Team</div>
                    <div>selectedTeam.id: <span className="font-bold">{effectiveTeamId || 'NONE'}</span></div>
                    <div>Team name: <span className="font-bold">{selectedTeam?.name || 'NONE'}</span></div>
                    <div>Teams found: <span className="font-bold">{myTeams.length}</span> ({myTeams.map(t => t.name).join(', ') || 'none'})</div>
                    <div className="font-bold border-b border-amber-300 dark:border-amber-700 pb-1 mb-1 mt-2">Roster (via getTeamRoster backend fn)</div>
                    <div>TeamMembership records loaded: <span className="font-bold">{isLoadingMembers ? 'loading…' : members.length}</span></div>
                    <div>Approved memberships count: <span className="font-bold">{activeMembers.length}</span></div>
                    <div>Pending memberships: <span className="font-bold">{nonCoachMembers.filter(m => m.status === 'pending').length}</span></div>
                    <div>Approved athlete emails: <span className="font-bold">{athleteEmails.length > 0 ? athleteEmails.join(', ') : 'NONE'}</span></div>
                    <div>Resolved athlete rows: <span className="font-bold">{normalizedAthletes.length}</span> ({normalizedAthletes.map(a => a.full_name || a.email).join(', ') || 'none'})</div>
                    <div className="font-bold border-b border-amber-300 dark:border-amber-700 pb-1 mb-1 mt-2">Workout Stats ({format(mStart, 'MMM yyyy')})</div>
                    <div>Target emails: <span className="font-bold">{targetEmails.join(', ') || 'NONE'}</span></div>
                    <div>Assigned: <span className="font-bold">{stats.assigned}</span> | Completed: <span className="font-bold">{stats.completed}</span> | Rate: <span className="font-bold">{stats.rate}%</span></div>
                  </div>
                </details>

                {/* Stats — single source: stats object, same as debug panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {isStatsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-5 w-8 bg-muted rounded" />
                          <div className="h-2.5 w-14 bg-muted rounded" />
                        </div>
                      </div>
                    ))
                  ) : [
                    { icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', value: stats.assigned, label: 'Assigned' },
                    { icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10', value: stats.completed, label: 'Completed' },
                    { icon: Users, color: 'text-muted-foreground', bg: 'bg-muted', value: stats.remaining, label: 'Remaining' },
                    { icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', value: `${stats.rate}%`, label: 'Rate' },
                  ].map(({ icon: Icon, color, bg, value, label: lbl }) => (
                    <div key={lbl} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{lbl}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Athlete filter */}
                <Select value={athleteFilter} onValueChange={setAthleteFilter}>
                  <SelectTrigger className="w-44 text-sm h-8">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Athletes</SelectItem>
                    {activeMembers.map(m => (
                      <SelectItem key={m.athlete_email} value={m.athlete_email}>
                        {m.athlete_name || m.athlete_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <CompletionOverview plannedWorkouts={filteredWorkouts} completions={coachCompletions} athleteFilter={athleteFilter} mStart={mStart} mEnd={mEnd} />

                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    {isLoading ? (
                      <div className="flex justify-center py-20 bg-card border border-border rounded-2xl">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : (
                      <TrainingMonthGrid
                        currentMonth={currentMonth}
                        onMonthChange={handleMonthChange}
                        plannedWorkouts={filteredWorkouts}
                        completions={coachCompletions}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        permissions={{ canAssign: true, canComplete: false }}
                        onAddClick={(day) => { setSelectedDate(day); setShowForm(true); }}
                      />
                    )}
                  </div>
                  <DayWorkoutList
                    date={selectedDate}
                    workouts={dayWorkouts}
                    completions={coachCompletions}
                    onEdit={setEditingWorkout}
                    onDelete={(id) => deleteMut.mutate(id)}
                  />
                </div>
              </TabsContent>

              {/* FEEDBACK TAB */}
              <TabsContent value="feedback" className="mt-0">
                <AthleteFeedbackList athleteEmails={athleteEmails} plannedWorkouts={plannedWorkouts} />
              </TabsContent>

              {/* ATHLETES TAB */}
              <TabsContent value="athletes" className="mt-0 space-y-6">
                <TeamMembershipList teamId={effectiveTeamId} coachEmail={user?.email} members={members} />
                <div className="border-t border-border pt-5">
                  <AthleteGroupManager teamId={effectiveTeamId} coachEmail={user?.email} members={members} />
                </div>
              </TabsContent>
              </Tabs>
              </>
              )}
        </div>

        {/* Assign workout form */}
        <AssignWorkoutForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(d) => createMut.mutate(d)}
          isSubmitting={createMut.isPending}
          defaultDate={format(selectedDate, 'yyyy-MM-dd')}
          athletes={normalizedAthletes}
          athleteFilter={athleteFilter}
          teamId={effectiveTeamId}
        />
        {editingWorkout && (
          <AssignWorkoutForm
            open={!!editingWorkout}
            onClose={() => setEditingWorkout(null)}
            onSubmit={(d) => updateMut.mutate({ id: editingWorkout.id, data: d })}
            isSubmitting={updateMut.isPending}
            workout={editingWorkout}
            athletes={normalizedAthletes}
            athleteFilter={athleteFilter}
            teamId={effectiveTeamId}
          />
        )}

        <CreateTeamModal
          open={showCreateTeam}
          onClose={() => setShowCreateTeam(false)}
          onCreated={() => { refetchTeams(); setShowCreateTeam(false); }}
          coachEmail={user?.email}
        />

        {/* Invite modal */}
        {showInvite && selectedTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-bold">Invite Athlete</h2>
                <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="p-6">
                <TeamInviteCard team={selectedTeam} onTeamUpdated={() => { refetchTeams(); setShowInvite(false); }} />
              </div>
            </div>
          </div>
        )}
      </div>
  );
}