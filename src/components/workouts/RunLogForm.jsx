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
  duration_minutes: '', distance_km: '', avg_pace: '',
  calories: '', perceived_effort: '', shoes: '', notes: '', feeling: '',
  planned_workout_id: ''
};

export default function RunLogForm({ open, onClose, onSubmit, workout, plannedWorkout }) {
  const [form, setForm] = useState(defaults);


  useEffect(() => {
    if (open) {
      if (workout) {
        setForm({ ...defaults, ...workout });
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

    }
  }, [open, workout, plannedWorkout]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));


  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ['duration_minutes', 'distance_km', 'calories', 'perceived_effort'].forEach(f => {
      if (data[f] !== '' && data[f] !== undefined) data[f] = Number(data[f]);
      else delete data[f];
    });
    onSubmit(data);
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{workout ? 'Edit Run' : 'Log Run'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
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
                  <Label>Calories (kcal)</Label>
                  <Input type="number" value={form.calories} onChange={e => set('calories', e.target.value)} placeholder="520" />
                </div>
                <div>
                  <Label>Effort (RPE 1–10)</Label>
                  <Input type="number" min="1" max="10" value={form.perceived_effort} onChange={e => set('perceived_effort', e.target.value)} placeholder="6" />
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
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{workout ? 'Update Run' : 'Log Run'}</Button>
          </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}