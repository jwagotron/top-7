import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkoutStepEditor from '@/components/workouts/WorkoutStepEditor';
import { Save, Plus, Pencil, Trash2, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const RUN_TYPES = [
  { value: 'easy', label: 'Easy Run', color: 'bg-secondary/10 text-secondary' },
  { value: 'long_run', label: 'Long Run', color: 'bg-primary/10 text-primary' },
  { value: 'tempo', label: 'Tempo', color: 'bg-accent/10 text-accent' },
  { value: 'interval', label: 'Intervals', color: 'bg-destructive/10 text-destructive' },
  { value: 'fartlek', label: 'Fartlek', color: 'bg-chart-4/10 text-chart-4' },
  { value: 'hill_repeats', label: 'Hill Repeats', color: 'bg-chart-5/10 text-chart-5' },
  { value: 'race', label: 'Race', color: 'bg-accent/10 text-accent' },
  { value: 'recovery', label: 'Recovery', color: 'bg-muted text-muted-foreground' },
  { value: 'progression', label: 'Progression', color: 'bg-secondary/10 text-secondary' },
];

const defaultForm = {
  title: '', sport: 'run', run_type: 'easy', description: '',
  estimated_duration_min: '', estimated_distance_km: '', target_pace: '',
  intensity: 'moderate',
  warmup_description: '', main_set_description: '', cooldown_description: '',
};

export default function WorkoutBuilder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toDisplay, toKm, label, paceLabel } = useUnits();
  const [form, setForm] = useState(defaultForm);
  const [steps, setSteps] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: workouts = [] } = useQuery({
    queryKey: ['builder-workouts'],
    queryFn: () => base44.entities.Workout.list('-created_date', 100),
  });

  const { data: allSteps = [] } = useQuery({
    queryKey: ['workout-steps'],
    queryFn: () => base44.entities.WorkoutStep.list('order', 500),
  });

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const saveMut = useMutation({
    mutationFn: async (data) => {
      let workoutId = editingId;
      if (editingId) {
        await base44.entities.Workout.update(editingId, data.workout);
        // Delete old steps
        const oldSteps = allSteps.filter(s => s.workout_id === editingId);
        await Promise.all(oldSteps.map(s => base44.entities.WorkoutStep.delete(s.id)));
      } else {
        const created = await base44.entities.Workout.create(data.workout);
        workoutId = created.id;
      }
      // Save steps
      if (data.steps.length > 0) {
        await base44.entities.WorkoutStep.bulkCreate(data.steps.map((s, i) => ({
          workout_id: workoutId,
          order: i + 1,
          step_type: s.step_type,
          name: s.name,
          duration_type: s.duration_type,
          duration_value: s.duration_value,
          target_type: s.target_type,
          target_min: s.target_min,
          target_max: s.target_max,
          repeat_count: s.repeat_count,
          notes: s.notes,
        })));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builder-workouts'] });
      qc.invalidateQueries({ queryKey: ['workout-steps'] });
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const stepsToDelete = allSteps.filter(s => s.workout_id === id);
      await Promise.all(stepsToDelete.map(s => base44.entities.WorkoutStep.delete(s.id)));
      await base44.entities.Workout.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builder-workouts'] });
      qc.invalidateQueries({ queryKey: ['workout-steps'] });
    },
  });

  const resetForm = () => { setForm(defaultForm); setSteps([]); setEditingId(null); setShowForm(false); };

  const handleEdit = (w) => {
    setForm({
      title: w.title,
      sport: w.sport || 'run',
      run_type: w.run_type || 'easy',
      description: w.description || '',
      estimated_duration_min: w.duration_minutes || '',
      estimated_distance_km: w.distance_km ? toDisplay(w.distance_km) : '',
      target_pace: w.target_pace || '',
      intensity: w.intensity || 'moderate',
      warmup_description: w.warmup_description || '',
      main_set_description: w.main_set_description || '',
      cooldown_description: w.cooldown_description || '',
    });
    setSteps(allSteps.filter(s => s.workout_id === w.id).map(s => ({ ...s, id: s.id })));
    setEditingId(w.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title) return;
    saveMut.mutate({
      workout: {
        title: form.title,
        sport: form.sport,
        run_type: form.run_type,
        description: form.description,
        duration_minutes: form.estimated_duration_min ? Number(form.estimated_duration_min) : null,
        distance_km: form.estimated_distance_km ? toKm(Number(form.estimated_distance_km)) : null,
        target_pace: form.target_pace || null,
        intensity: form.intensity || null,
        warmup_description: form.warmup_description,
        main_set_description: form.main_set_description,
        cooldown_description: form.cooldown_description,
        date: new Date().toISOString().slice(0, 10),
      },
      steps,
    });
  };

  const getStepsForWorkout = (id) => allSteps.filter(s => s.workout_id === id).sort((a, b) => a.order - b.order);

  return (
      <div className="flex flex-col h-full bg-background">
        <TopBar title="Workout Builder">
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5 h-8 px-2 sm:px-4">
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">New Workout</span>
          </Button>
        </TopBar>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Workout list */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Saved Workouts</h2>
            {workouts.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No workouts yet.
              </div>
            )}
            {workouts.map(w => {
              const wSteps = getStepsForWorkout(w.id);
              return (
                <Card key={w.id} className={`cursor-pointer transition-shadow hover:shadow-md ${editingId === w.id ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{w.title}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{w.sport}</Badge>
                          {w.run_type && <Badge variant="outline" className="text-[10px]">{w.run_type}</Badge>}
                          {wSteps.length > 0 && <Badge variant="outline" className="text-[10px]">{wSteps.length} steps</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(w)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(w.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    {w.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{w.description}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            {!showForm ? (
              <div className="text-center py-20 border-2 border-dashed border-border rounded-xl text-muted-foreground">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Select a workout to edit or create a new one.</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{editingId ? 'Edit Workout' : 'New Workout'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Title */}
                  <div>
                    <Label>Workout Title <span className="text-destructive">*</span></Label>
                    <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Tempo Run – 8km" />
                  </div>

                  {/* Run Type pills — exactly matching AssignWorkoutForm */}
                  <div>
                    <Label>Run Type <span className="text-destructive">*</span></Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {RUN_TYPES.map(rt => (
                        <button key={rt.value} type="button" onClick={() => set('run_type', rt.value)}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                            form.run_type === rt.value ? `${rt.color} border-current shadow-sm` : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80')}>
                          {rt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Intensity <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                      <Select value={form.intensity} onValueChange={v => set('intensity', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recovery">Recovery</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="race_pace">Race Pace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Target Distance ({label}) <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                      <Input type="number" step="0.01" value={form.estimated_distance_km} onChange={e => set('estimated_distance_km', e.target.value)} placeholder={label === 'mi' ? '6.2' : '10'} />
                    </div>
                    <div>
                      <Label>Target Duration (min) <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                      <Input type="number" value={form.estimated_duration_min} onChange={e => set('estimated_duration_min', e.target.value)} placeholder="55" />
                    </div>
                    <div>
                      <Label>Target Pace ({paceLabel}) <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                      <Input value={form.target_pace} onChange={e => set('target_pace', e.target.value)} placeholder={label === 'mi' ? '8:27' : '5:15'} />
                    </div>
                  </div>

                  {/* General description */}
                  <div>
                    <Label>General Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                    <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Overview of what this workout is about…" />
                  </div>

                  {/* Structure — required for assigning */}
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold">Workout Structure <span className="text-xs text-muted-foreground font-normal">(required for assigning)</span></p>
                    <div>
                      <Label>Warm-Up <span className="text-destructive">*</span></Label>
                      <Textarea value={form.warmup_description} onChange={e => set('warmup_description', e.target.value)} rows={2} placeholder="e.g. 10 min easy jog, dynamic stretches…" />
                    </div>
                    <div>
                      <Label>Main Set <span className="text-destructive">*</span></Label>
                      <Textarea value={form.main_set_description} onChange={e => set('main_set_description', e.target.value)} rows={3} placeholder="e.g. 4 × 1km at threshold pace with 90s recovery…" />
                    </div>
                    <div>
                      <Label>Cool-Down <span className="text-destructive">*</span></Label>
                      <Textarea value={form.cooldown_description} onChange={e => set('cooldown_description', e.target.value)} rows={2} placeholder="e.g. 10 min easy jog, static stretches…" />
                    </div>
                  </div>

                  {/* Workout steps */}
                  <div>
                    <Label className="mb-3 block">Workout Steps <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                    <WorkoutStepEditor steps={steps} onChange={setSteps} />
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t">
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!form.title || saveMut.isPending} className="gap-2">
                      <Save className="w-4 h-4" />
                      {saveMut.isPending ? 'Saving…' : editingId ? 'Update Workout' : 'Save Workout'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
            </div>
          </div>
        </div>
      </div>
  );
}