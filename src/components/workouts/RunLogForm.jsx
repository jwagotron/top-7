import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const defaults = {
  title: '', sport: 'run', run_type: 'easy',
  date: new Date().toISOString().split('T')[0],
  duration_minutes: '', distance_km: '', avg_pace: '', best_pace: '',
  avg_heart_rate: '', max_heart_rate: '', cadence: '', calories: '',
  elevation_gain: '', perceived_effort: '', shoes: '', notes: '', feeling: '',
  splits: [], planned_workout_id: ''
};

export default function RunLogForm({ open, onClose, onSubmit, workout, plannedWorkout }) {
  const [form, setForm] = useState(defaults);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (open) {
      if (workout) {
        setForm({ ...defaults, ...workout, splits: workout.splits || [] });
      } else if (plannedWorkout) {
        setForm({
          ...defaults,
          title: plannedWorkout.title,
          sport: plannedWorkout.sport || 'run',
          run_type: plannedWorkout.run_type || 'easy',
          date: plannedWorkout.scheduled_date,
          distance_km: plannedWorkout.target_distance_km || '',
          duration_minutes: plannedWorkout.target_duration_minutes || '',
          planned_workout_id: plannedWorkout.id,
        });
      } else {
        setForm(defaults);
      }
      setActiveTab('basic');
    }
  }, [open, workout, plannedWorkout]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const addSplit = () => setForm(p => ({ ...p, splits: [...(p.splits || []), { km: (p.splits?.length || 0) + 1, pace: '', heart_rate: '' }] }));
  const removeSplit = (i) => setForm(p => ({ ...p, splits: p.splits.filter((_, idx) => idx !== i) }));
  const updateSplit = (i, field, val) => setForm(p => {
    const splits = [...p.splits];
    splits[i] = { ...splits[i], [field]: val };
    return { ...p, splits };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ['duration_minutes', 'distance_km', 'avg_heart_rate', 'max_heart_rate', 'cadence', 'calories', 'elevation_gain', 'perceived_effort'].forEach(f => {
      if (data[f] !== '' && data[f] !== undefined) data[f] = Number(data[f]);
      else delete data[f];
    });
    if (!data.splits || data.splits.length === 0) delete data.splits;
    onSubmit(data);
  };

  const tabs = [
    { id: 'basic', label: 'Basic' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'splits', label: 'Splits' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{workout ? 'Edit Run' : 'Log Run'}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn('flex-1 text-sm py-1.5 rounded-md font-medium transition-all', activeTab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Morning Easy Run" required />
              </div>

              <div>
                <Label>Run Type</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {RUN_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => set('run_type', rt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        form.run_type === rt.value
                          ? `${rt.color} border-current shadow-sm`
                          : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                      )}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
                </div>
                <div>
                  <Label>Feeling</Label>
                  <Select value={form.feeling || ''} onValueChange={v => set('feeling', v)}>
                    <SelectTrigger><SelectValue placeholder="How did it go?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="great">🔥 Great</SelectItem>
                      <SelectItem value="good">💪 Good</SelectItem>
                      <SelectItem value="okay">👌 Okay</SelectItem>
                      <SelectItem value="tired">😓 Tired</SelectItem>
                      <SelectItem value="exhausted">😵 Exhausted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Distance (km)</Label>
                  <Input type="number" step="0.01" value={form.distance_km} onChange={e => set('distance_km', e.target.value)} placeholder="10.5" />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} placeholder="55" />
                </div>
                <div>
                  <Label>Avg Pace (/km)</Label>
                  <Input value={form.avg_pace} onChange={e => set('avg_pace', e.target.value)} placeholder="5:15" />
                </div>
                <div>
                  <Label>Best Pace (/km)</Label>
                  <Input value={form.best_pace} onChange={e => set('best_pace', e.target.value)} placeholder="4:45" />
                </div>
              </div>

              <div>
                <Label>Shoes</Label>
                <Input value={form.shoes} onChange={e => set('shoes', e.target.value)} placeholder="Nike Vaporfly, Saucony Endorphin..." />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="How did the run feel? Any highlights..." rows={3} />
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Avg Heart Rate (bpm)</Label>
                <Input type="number" value={form.avg_heart_rate} onChange={e => set('avg_heart_rate', e.target.value)} placeholder="145" />
              </div>
              <div>
                <Label>Max Heart Rate (bpm)</Label>
                <Input type="number" value={form.max_heart_rate} onChange={e => set('max_heart_rate', e.target.value)} placeholder="178" />
              </div>
              <div>
                <Label>Cadence (spm)</Label>
                <Input type="number" value={form.cadence} onChange={e => set('cadence', e.target.value)} placeholder="172" />
              </div>
              <div>
                <Label>Elevation Gain (m)</Label>
                <Input type="number" value={form.elevation_gain} onChange={e => set('elevation_gain', e.target.value)} placeholder="85" />
              </div>
              <div>
                <Label>Calories</Label>
                <Input type="number" value={form.calories} onChange={e => set('calories', e.target.value)} placeholder="520" />
              </div>
              <div>
                <Label>Effort (RPE 1-10)</Label>
                <Input type="number" min="1" max="10" value={form.perceived_effort} onChange={e => set('perceived_effort', e.target.value)} placeholder="6" />
              </div>
            </div>
          )}

          {activeTab === 'splits' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Record your per-km splits</p>
                <Button type="button" size="sm" variant="outline" onClick={addSplit} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Split
                </Button>
              </div>
              {(form.splits || []).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  No splits added yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>KM</span><span>Pace</span><span>HR (bpm)</span><span></span>
                  </div>
                  {(form.splits || []).map((split, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center">
                      <Input type="number" value={split.km} onChange={e => updateSplit(i, 'km', Number(e.target.value))} className="h-8 text-sm" />
                      <Input value={split.pace} onChange={e => updateSplit(i, 'pace', e.target.value)} placeholder="5:15" className="h-8 text-sm" />
                      <Input type="number" value={split.heart_rate || ''} onChange={e => updateSplit(i, 'heart_rate', Number(e.target.value))} placeholder="148" className="h-8 text-sm" />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSplit(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{workout ? 'Update Run' : 'Log Run'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}