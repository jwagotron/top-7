import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import TopBar from '@/components/layout/TopBar';
import RoleGate from '@/components/RoleGate';
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
import { Plus, Users, Calendar, CheckCircle2, TrendingUp, ChevronDown, Settings } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useCompletions } from '@/hooks/useCompletions';
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

  // Fetch coach's teams
  const { data: myTeams = [], refetch: refetchTeams } = useQuery({
    queryKey: ['my-teams', user?.email],
    queryFn: () => base44.entities.Team.filter({ coach_email: user?.email, status: 'active' }),
    enabled: !!user?.email,
  });

  const selectedTeam = myTeams.find(t => t.id === selectedTeamId) || myTeams[0] || null;
  const effectiveTeamId = selectedTeam?.id;

  // Fetch members of selected team
  const { data: members = [] } = useQuery({
    queryKey: ['memberships', effectiveTeamId],
    queryFn: () => base44.entities.TeamMembership.filter({ team_id: effectiveTeamId, status: 'active' }),
    enabled: !!effectiveTeamId,
  });

  // Exclude the coach themselves from the athlete list (in case they joined as an athlete)
  const nonCoachMembers = members.filter(m => m.athlete_email !== user?.email);
  const athleteEmails = nonCoachMembers.map(m => m.athlete_email);
  const normalizedAthletes = nonCoachMembers.map(m => ({ email: m.athlete_email, full_name: m.athlete_name }));
  const selectedAthleteEmail = athleteFilter !== 'all' ? athleteFilter : null;
  const { completions } = useCompletions(selectedAthleteEmail);

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
  });

  const invalidatePlanned = () => {
    qc.invalidateQueries({ queryKey: ['planned-workouts'] });
    qc.invalidateQueries({ queryKey: ['assigned-plan-workouts'], exact: false });
    qc.invalidateQueries({ queryKey: ['direct-assigned-workouts'], exact: false });
  };

  const createMut = useMutation({
    mutationFn: (d) => Array.isArray(d)
      ? base44.entities.PlannedWorkout.bulkCreate(d)
      : base44.entities.PlannedWorkout.create(d),
    onSuccess: () => { invalidatePlanned(); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlannedWorkout.update(id, data),
    onSuccess: () => { invalidatePlanned(); setEditingWorkout(null); },
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
  const completed = monthWorkouts.filter(w => w.status === 'completed').length;
  const upcoming = monthWorkouts.filter(w => w.status === 'upcoming').length;

  return (
    <RoleGate allow={['coach', 'admin']}>
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

              <Tabs defaultValue="workouts">
                <TabsList className="h-8">
                  <TabsTrigger value="workouts" className="text-xs px-3">Workouts</TabsTrigger>
                  <TabsTrigger value="athletes" className="text-xs px-3">
                    Athletes {nonCoachMembers.length > 0 && <Badge className="ml-1 h-4 px-1 text-[10px]">{nonCoachMembers.length}</Badge>}
                  </TabsTrigger>
                </TabsList>

              {/* WORKOUTS TAB */}
              <TabsContent value="workouts" className="space-y-4 mt-0">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', value: upcoming, label: 'Upcoming' },
                    { icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10', value: completed, label: 'Completed' },
                    { icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', value: `${monthWorkouts.length > 0 ? Math.round((completed / monthWorkouts.length) * 100) : 0}%`, label: 'Rate' },
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
                    {members.map(m => (
                      <SelectItem key={m.athlete_email} value={m.athlete_email}>
                        {m.athlete_name || m.athlete_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <CompletionOverview plannedWorkouts={filteredWorkouts} completions={completions} athleteFilter={athleteFilter} />

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
                        completions={completions}
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
                    completions={completions}
                    onEdit={setEditingWorkout}
                    onDelete={(id) => deleteMut.mutate(id)}
                  />
                </div>
              </TabsContent>

              {/* ATHLETES TAB */}
              <TabsContent value="athletes" className="mt-0 space-y-6">
                <TeamMembershipList teamId={effectiveTeamId} coachEmail={user?.email} />
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
    </RoleGate>
  );
}