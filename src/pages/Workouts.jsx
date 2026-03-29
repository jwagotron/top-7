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

export default function Workouts() {
  const { user } = useAuth();
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

  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('scheduled_date', 500),
  });

  const myPlanned = plannedWorkouts.filter(p =>
    !p.assigned_to || p.assigned_to === user?.email
  );

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
        <Button variant="outline" onClick={() => setShowGpxImport(true)} className="gap-2">
          <Upload className="w-4 h-4" /> Import GPX
        </Button>
        <Button onClick={() => { setPreFillPlanned(null); setShowLogForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Log Run
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Weekly summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Footprints className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{weekWorkouts.length}</p>
              <p className="text-[11px] text-muted-foreground">Runs this week</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="text-lg font-bold">{toDisplay(weekKm).toFixed(1)}</p>
              <p className="text-[11px] text-muted-foreground">{label} this week</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{Math.round(weekMin / 60 * 10) / 10}</p>
              <p className="text-[11px] text-muted-foreground">hrs this week</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{format(selectedDate, 'EEEE, MMM d')}</h3>
              <button
                onClick={() => { setPreFillPlanned(null); setShowLogForm(true); }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Log run
              </button>
            </div>

            {dayPlanned.length === 0 && dayWorkouts.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Rest day or no workouts</p>
              </div>
            )}

            {/* Planned workouts for the day */}
            {dayPlanned.map(pw => (
              <PlannedWorkoutCard
                key={pw.id}
                planned={pw}
                expanded={expandedPlanned === pw.id}
                onToggle={() => setExpandedPlanned(expandedPlanned === pw.id ? null : pw.id)}
                onLogRun={() => handleLogFromPlanned(pw)}
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

      {/* Forms & drawers */}
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
      <RunDetailDrawer
        workout={viewingWorkout}
        open={!!viewingWorkout}
        onClose={() => setViewingWorkout(null)}
        onEdit={(w) => { setViewingWorkout(null); setEditingWorkout(w); }}
        onDelete={(id) => deleteWorkoutMut.mutate(id)}
      />
    </div>
  );
}