import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RoleGate from '@/components/RoleGate';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkoutStepEditor from '@/components/workouts/WorkoutStepEditor';
import { Save, Plus, Pencil, Trash2, Copy, ChevronRight, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { useUnits } from '@/hooks/useUnits';

const defaultForm = { title: '', sport: 'run', run_type: 'interval', description: '', estimated_duration_min: '', estimated_distance_km: '' };

export default function WorkoutBuilder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toDisplay, toKm, label } = useUnits();
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
      run_type: w.run_type || 'interval',
      description: w.description || '',
      estimated_duration_min: w.duration_minutes || '',
      estimated_distance_km: w.distance_km ? toDisplay(w.distance_km) : '',
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
        date: new Date().toISOString().slice(0, 10),
      },
      steps,
    });
  };

  const getStepsForWorkout = (id) => allSteps.filter(s => s.workout_id === id).sort((a, b) => a.order - b.order);

  return (
    <RoleGate allow={['coach', 'admin']}>
    <div className="min-h-screen bg-background">
      <TopBar title="Workout Builder">
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5 h-8 px-2 sm:px-4">
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">New Workout</span>
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-6">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Workout Title</Label>
                      <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Threshold Intervals 5×1km" />
                    </div>
                    <div>
                      <Label>Sport</Label>
                      <Select value={form.sport} onValueChange={v => set('sport', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="run">Run</SelectItem>
                          <SelectItem value="bike">Bike</SelectItem>
                          <SelectItem value="swim">Swim</SelectItem>
                          <SelectItem value="strength">Strength</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Run Type</Label>
                      <Select value={form.run_type} onValueChange={v => set('run_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['easy','long_run','tempo','interval','fartlek','hill_repeats','race','recovery','progression'].map(t => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Est. Distance ({label})</Label>
                      <Input type="number" step="0.01" value={form.estimated_distance_km} onChange={e => set('estimated_distance_km', e.target.value)} placeholder={label === 'mi' ? '7.5' : '12'} />
                    </div>
                    <div>
                      <Label>Est. Duration (min)</Label>
                      <Input type="number" value={form.estimated_duration_min} onChange={e => set('estimated_duration_min', e.target.value)} placeholder="65" />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Overview for athlete…" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Workout Steps</Label>
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
    </RoleGate>
        );
        }