import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import CoachCalendar from '@/components/coach/CoachCalendar';
import DayWorkoutList from '@/components/coach/DayWorkoutList';
import AssignWorkoutForm from '@/components/coach/AssignWorkoutForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, CheckCircle2, Calendar, TrendingUp, ShieldCheck } from 'lucide-react';
import { format, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function CoachPanel() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [athleteFilter, setAthleteFilter] = useState('all');
  const qc = useQueryClient();

  // Only admins/coaches can access this
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <ShieldCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Coach Access Only</h2>
          <p className="text-muted-foreground text-sm">This panel is restricted to coaches and admins.</p>
        </div>
      </div>
    );
  }

  const { data: plannedWorkouts = [], isLoading } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('scheduled_date', 1000),
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.PlannedWorkout.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planned-workouts'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlannedWorkout.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planned-workouts'] }); setEditingWorkout(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.PlannedWorkout.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planned-workouts'] }),
  });

  const handleMonthChange = (dir) => {
    if (dir === 0) { setCurrentMonth(new Date()); setSelectedDate(new Date()); }
    else setCurrentMonth(p => dir === 1 ? addMonths(p, 1) : subMonths(p, 1));
  };

  const handleAddClick = (day) => {
    setSelectedDate(day);
    setShowForm(true);
  };

  const filteredWorkouts = athleteFilter === 'all'
    ? plannedWorkouts
    : plannedWorkouts.filter(w => w.assigned_to === athleteFilter);

  const dayWorkouts = filteredWorkouts.filter(w => isSameDay(new Date(w.scheduled_date), selectedDate));

  // Month stats
  const mStart = startOfMonth(currentMonth);
  const mEnd = endOfMonth(currentMonth);
  const monthWorkouts = filteredWorkouts.filter(w => {
    const d = new Date(w.scheduled_date);
    return d >= mStart && d <= mEnd;
  });
  const completed = monthWorkouts.filter(w => w.status === 'completed').length;
  const skipped = monthWorkouts.filter(w => w.status === 'skipped').length;
  const upcoming = monthWorkouts.filter(w => w.status === 'upcoming').length;

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Coach Panel">
        <div className="flex items-center gap-3">
          <Select value={athleteFilter} onValueChange={setAthleteFilter}>
            <SelectTrigger className="w-44">
              <Users className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Athletes</SelectItem>
              {athletes.map(a => (
                <SelectItem key={a.id} value={a.email}>{a.full_name || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Assign Workout
          </Button>
        </div>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
        {/* Month summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{upcoming}</p>
              <p className="text-xs text-muted-foreground">Upcoming this month</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed this month</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {monthWorkouts.length > 0 ? Math.round((completed / monthWorkouts.length) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Completion rate</p>
            </div>
          </div>
        </div>

        {/* Calendar + Day panel */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex justify-center py-20 bg-card border border-border rounded-2xl">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <CoachCalendar
                currentMonth={currentMonth}
                onMonthChange={handleMonthChange}
                plannedWorkouts={filteredWorkouts}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onAddClick={handleAddClick}
              />
            )}
          </div>

          <div>
            <DayWorkoutList
              date={selectedDate}
              workouts={dayWorkouts}
              onEdit={(w) => setEditingWorkout(w)}
              onDelete={(id) => deleteMut.mutate(id)}
            />
          </div>
        </div>

        {/* Upcoming workouts list */}
        <div>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">All Scheduled — {format(currentMonth, 'MMMM yyyy')}</h3>
          {monthWorkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No workouts scheduled for this month</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {monthWorkouts
                .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                .map(w => (
                <div key={w.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3 group hover:shadow-sm transition-all">
                  <div className="text-center shrink-0 w-10">
                    <p className="text-xs text-muted-foreground">{format(new Date(w.scheduled_date), 'MMM')}</p>
                    <p className="text-lg font-bold leading-none">{format(new Date(w.scheduled_date), 'd')}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(w.scheduled_date), 'EEE')}</p>
                  </div>
                  <div className="flex-1 min-w-0 border-l border-border pl-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{w.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {w.status}
                      </Badge>
                    </div>
                    {w.assigned_to && <p className="text-xs text-muted-foreground mt-0.5">{w.assigned_to}</p>}
                    <div className="flex gap-2 mt-1">
                      {w.target_distance_km && <span className="text-xs text-muted-foreground">{w.target_distance_km}km</span>}
                      {w.target_pace && <span className="text-xs text-muted-foreground">@ {w.target_pace}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingWorkout(w)}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(w.id)}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AssignWorkoutForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(d) => createMut.mutate(d)}
        defaultDate={format(selectedDate, 'yyyy-MM-dd')}
        athletes={athletes}
      />
      {editingWorkout && (
        <AssignWorkoutForm
          open={!!editingWorkout}
          onClose={() => setEditingWorkout(null)}
          onSubmit={(d) => updateMut.mutate({ id: editingWorkout.id, data: d })}
          workout={editingWorkout}
          athletes={athletes}
        />
      )}
    </div>
  );
}