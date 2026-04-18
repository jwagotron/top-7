import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import WeeklyTrainingBoard from '@/components/workouts/WeeklyTrainingBoard';
import RunLogForm from '@/components/workouts/RunLogForm';
import RunDetailDrawer from '@/components/workouts/RunDetailDrawer';
import PlannedWorkoutCard from '@/components/workouts/PlannedWorkoutCard';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, Footprints, Clock, MapPin, Upload } from 'lucide-react';
import GpxImportDialog from '@/components/workouts/GpxImportDialog';
import { format, isSameDay, addMonths, subMonths, startOfWeek, addDays } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import { useCompletions } from '@/hooks/useCompletions';

export default function Workouts() {
  const { user } = useAuth();
  const { role } = useRole();
  const isAthlete = role === 'athlete';
  const canCreate = !isAthlete; // coaches/admins can log runs; athletes view-only
  // Athlete's assigned workouts from the single source of truth
  const { plannedWorkouts: assignedWorkouts, athleteEmail } = useAssignedPlan();
  const { completions, completeMut, getCompletion, isCompleted: isWorkoutCompleted } = useCompletions(isAthlete ? athleteEmail : null);
  const { toDisplay, label } = useUnits();
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [viewingWorkout, setViewingWorkout] = useState(null);
  const [expandedPlanned, setExpandedPlanned] = useState(null);
  const [preFillPlanned, setPreFillPlanned] = useState(null);
  const [showGpxImport, setShowGpxImport] = useState(false);
  const qc = useQueryClient();

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['workouts'] });
    qc.invalidateQueries({ queryKey: ['planned-workouts'] });
    qc.invalidateQueries({ queryKey: ['assigned-plan-workouts'], exact: false });
    qc.invalidateQueries({ queryKey: ['direct-assigned-workouts'], exact: false });
    qc.invalidateQueries({ queryKey: ['assigned-plans'], exact: false });
  }, [qc]);

  const handleRefresh = useCallback(async () => {
    invalidateAll();
  }, [invalidateAll]);
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

  // Athletes: only workouts assigned to them (from their active plan)
  // Coaches/admins: workouts assigned to themselves as an athlete, or unassigned
  const myPlanned = isAthlete
    ? assignedWorkouts
    : allPlannedWorkouts.filter(p => !p.assigned_to || p.assigned_to === user?.email);

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Workout.create(data),
    onSuccess: () => { invalidateAll(); setShowLogForm(false); setPreFillPlanned(null); },
  });

  const updateWorkoutMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Workout.update(id, data),
    onSuccess: () => { invalidateAll(); setEditingWorkout(null); },
  });

  const deleteWorkoutMut = useMutation({
    mutationFn: (id) => base44.entities.Workout.delete(id),
    onSuccess: () => invalidateAll(),
  });

  const updatePlannedMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlannedWorkout.update(id, data),
    onSuccess: () => invalidateAll(),
  });

  const handleWeekChange = (dir) => {
    if (dir === 0) {
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      start.setHours(0, 0, 0, 0);
      setWeekStart(start);
    } else {
      setWeekStart(p => addDays(p, dir * 7));
    }
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



  // DEBUG: athlete workout visibility
  console.debug('[Workouts] role:', role, '| athlete:', athleteEmail, '| weekStart:', format(weekStart, 'yyyy-MM-dd'));
  console.debug('[Workouts] assignedWorkouts total:', assignedWorkouts.length, '| myPlanned total:', myPlanned.length);
  console.debug('[Workouts] all myPlanned dates:', myPlanned.map(p => p.scheduled_date + '(' + p.title + ')').join(', '));

  // Weekly stats for the current week
  const weekEnd = addDays(weekStart, 6);
  const weekWorkouts = workouts.filter(w => {
    const d = parseDateOnly(w.date);
    return d >= weekStart && d <= weekEnd;
  });
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

      <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
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

        {/* Weekly training board */}
        <WeeklyTrainingBoard
          weekStart={weekStart}
          onWeekChange={handleWeekChange}
          plannedWorkouts={myPlanned}
          workouts={workouts}
          completions={completions}
          expandedPlanned={expandedPlanned}
          onToggleExpanded={(id) => setExpandedPlanned(expandedPlanned === id ? null : id)}
          showCompleteButton={isAthlete}
          onMarkComplete={isAthlete ? ({ workout, notes }) => completeMut.mutateAsync({ workout, notes }) : undefined}
          role={role}
        />
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