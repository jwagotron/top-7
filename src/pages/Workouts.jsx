import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import WorkoutCalendar from '@/components/workouts/WorkoutCalendar';
import RunLogForm from '@/components/workouts/RunLogForm';
import RunDetailDrawer from '@/components/workouts/RunDetailDrawer';
import PlannedWorkoutCard from '@/components/workouts/PlannedWorkoutCard';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, Footprints, Clock, MapPin, Upload } from 'lucide-react';
import GpxImportDialog from '@/components/workouts/GpxImportDialog';
import { format, isSameDay, addMonths, subMonths } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';

export default function Workouts() {
  const { user } = useAuth();
  const { role } = useRole();
  const isAthlete = role === 'athlete';
  const canCreate = !isAthlete; // coaches/admins can log runs; athletes view-only
  // Athlete's assigned workouts from the single source of truth
  const { plannedWorkouts: assignedWorkouts } = useAssignedPlan();
  const { toDisplay, label } = useUnits();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [viewingWorkout, setViewingWorkout] = useState(null);
  const [expandedPlanned, setExpandedPlanned] = useState(null);
  const [preFillPlanned, setPreFillPlanned] = useState(null);
  const [showGpxImport, setShowGpxImport] = useState(false);
  const qc = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['workouts'] }),
      qc.invalidateQueries({ queryKey: ['planned-workouts'] }),
    ]);
  }, [qc]);
  const ptr = usePullToRefresh(handleRefresh);

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => base44.entities.Workout.list('-date', 500),
  });

  const { data: allPlannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('scheduled_date', 500),
    enabled: !isAthlete, // coaches/admins fetch all; athletes use assignedWorkouts
  });

  // Athletes use assigned workouts from the shared hook; coaches see all
  const myPlanned = isAthlete
    ? assignedWorkouts
    : allPlannedWorkouts.filter(p => !p.assigned_to || p.assigned_to === user?.email);

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Workout.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); setShowLogForm(false); setPreFillPlanned(null); },
  });

  const updateWorkoutMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Workout.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); setEditingWorkout(null); },
  });

  const deleteWorkoutMut = useMutation({
    mutationFn: (id) => base44.entities.Workout.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });

  const updatePlannedMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlannedWorkout.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planned-workouts'] }),
  });

  const handleMonthChange = (dir) => {
    if (dir === 0) { setCurrentMonth(new Date()); setSelectedDate(new Date()); }
    else setCurrentMonth(p => dir === 1 ? addMonths(p, 1) : subMonths(p, 1));
  };

  const handleLogFromPlanned = (planned) => {
    setPreFillPlanned(planned);
    setShowLogForm(true);
  };

  const handleMarkSkipped = (planned) => {
    updatePlannedMut.mutate({ id: planned.id, data: { status: 'skipped' } });
  };

  const handleCreateWorkout = (data) => {
    createMut.mutate(data);
    // If logging from a planned workout, mark it complete
    if (preFillPlanned) {
      updatePlannedMut.mutate({ id: preFillPlanned.id, data: { status: 'completed' } });
    }
  };

  // Selected day data
  const dayWorkouts = workouts.filter(w => isSameDay(new Date(w.date), selectedDate));
  const dayPlanned = myPlanned.filter(p => isSameDay(new Date(p.scheduled_date), selectedDate));

  // Weekly stats
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekWorkouts = workouts.filter(w => new Date(w.date) >= weekStart);
  const weekKm = weekWorkouts.reduce((s, w) => s + (w.distance_km || 0), 0);
  const weekMin = weekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator {...ptr} />
      <TopBar title="My Runs">
        {canCreate && (
          <Button variant="outline" onClick={() => setShowGpxImport(true)} className="gap-1 lg:gap-2 px-2 lg:px-4">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import </span>GPX
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => { setPreFillPlanned(null); setShowLogForm(true); }} className="gap-1 lg:gap-2 px-3 lg:px-4">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Log </span>Run
          </Button>
        )}
      </TopBar>

      <div className="p-4 lg:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
        {/* Weekly summary strip */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
          {[
            { icon: Footprints, color: 'bg-primary/10 text-primary', value: weekWorkouts.length, label2: 'Runs' },
            { icon: MapPin, color: 'bg-secondary/10 text-secondary', value: toDisplay(weekKm).toFixed(1), label2: label },
            { icon: Clock, color: 'bg-accent/10 text-accent', value: Math.round(weekMin / 60 * 10) / 10, label2: 'hrs' },
          ].map(({ icon: Icon, color, value, label2 }) => (
            <div key={label2} className="relative overflow-hidden bg-card rounded-xl p-4 flex flex-col gap-1.5 min-w-0 shadow-md border border-border/40 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl font-bold tracking-tight text-foreground leading-none">{value}</p>
              <p className="text-[11px] font-medium text-muted-foreground/60 mt-0.5 leading-tight uppercase tracking-wide">{label2} this week</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <WorkoutCalendar
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              workouts={workouts}
              plannedWorkouts={myPlanned}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          {/* Day panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{format(selectedDate, 'EEEE, MMM d')}</h3>
              {canCreate && (
                <button
                  onClick={() => { setPreFillPlanned(null); setShowLogForm(true); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Log run
                </button>
              )}
            </div>

            {dayPlanned.length === 0 && dayWorkouts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-muted/30 border border-border/40 gap-2">
                <CalendarDays className="w-7 h-7 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  {isAthlete ? 'No sessions scheduled' : 'No workouts assigned for this day'}
                </p>
                {isAthlete && (
                  <p className="text-xs text-muted-foreground/60">Check back or pick another day</p>
                )}
              </div>
            )}

            {/* Planned workouts for the day */}
            {dayPlanned.map(pw => (
              <PlannedWorkoutCard
                key={pw.id}
                planned={pw}
                expanded={expandedPlanned === pw.id}
                onToggle={() => setExpandedPlanned(expandedPlanned === pw.id ? null : pw.id)}
                onLogRun={canCreate ? () => handleLogFromPlanned(pw) : undefined}
                onMarkSkipped={() => handleMarkSkipped(pw)}
              />
            ))}

            {/* Logged workouts for the day (not linked to planned) */}
            {dayWorkouts
              .filter(w => !dayPlanned.some(p => p.id === w.planned_workout_id))
              .map(w => (
              <div
                key={w.id}
                onClick={() => setViewingWorkout(w)}
                className="bg-secondary/5 border border-secondary/20 rounded-xl p-3 cursor-pointer hover:bg-secondary/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                  <span className="text-sm font-medium">{w.title}</span>
                  {w.feeling && <span className="text-xs">{{ great: '🔥', good: '💪', okay: '👌', tired: '😓', exhausted: '😵' }[w.feeling]}</span>}
                </div>
                <div className="flex gap-3 pl-4">
                  {w.distance_km && <span className="text-xs text-muted-foreground">{toDisplay(w.distance_km)} {label}</span>}
                  {w.duration_minutes && <span className="text-xs text-muted-foreground">{w.duration_minutes} min</span>}
                  {w.avg_pace && <span className="text-xs text-muted-foreground">{w.avg_pace} /km</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GpxImportDialog
        open={showGpxImport}
        onClose={() => setShowGpxImport(false)}
        onImport={(data) => { createMut.mutate(data); setShowGpxImport(false); }}
      />

      {/* Forms & drawers — coach/admin only */}
      {canCreate && (
        <>
          <RunLogForm
            open={showLogForm}
            onClose={() => { setShowLogForm(false); setPreFillPlanned(null); }}
            onSubmit={handleCreateWorkout}
            plannedWorkout={preFillPlanned}
          />
          {editingWorkout && (
            <RunLogForm
              open={!!editingWorkout}
              onClose={() => setEditingWorkout(null)}
              onSubmit={(data) => updateWorkoutMut.mutate({ id: editingWorkout.id, data })}
              workout={editingWorkout}
            />
          )}
        </>
      )}
      <RunDetailDrawer
        workout={viewingWorkout}
        open={!!viewingWorkout}
        onClose={() => setViewingWorkout(null)}
        onEdit={canCreate ? (w) => { setViewingWorkout(null); setEditingWorkout(w); } : undefined}
        onDelete={canCreate ? (id) => deleteWorkoutMut.mutate(id) : undefined}
      />
    </div>
  );
}