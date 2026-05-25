import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnits } from '@/hooks/useUnits';

const defaults = {
  title: '', sport: 'run', date: new Date().toISOString().split('T')[0],
  duration_minutes: '', distance_km: '', avg_pace: '', avg_heart_rate: '',
  max_heart_rate: '', calories: '', elevation_gain: '', perceived_effort: '',
  notes: '', feeling: ''
};

export default function WorkoutForm({ open, onClose, onSubmit, workout }) {
  const { units, toDisplay, toKm, label, paceLabel, elevationLabel } = useUnits();

  // For display in the form, convert stored km → display unit
  const toDisplayForm = (km) => (km != null && km !== '') ? toDisplay(Number(km)) : '';
  const toDisplayElev = (m) => (m != null && m !== '') ? (units === 'mi' ? Math.round(Number(m) * 3.28084) : Number(m)) : '';

  const initForm = (w) => {
    if (!w) return defaults;
    return {
      ...w,
      distance_km: toDisplayForm(w.distance_km),
      elevation_gain: toDisplayElev(w.elevation_gain),
    };
  };

  const [form, setForm] = useState(initForm(workout));

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    // Convert display units back to km for storage
    if (data.distance_km !== '' && data.distance_km !== undefined) {
      data.distance_km = toKm(Number(data.distance_km));
    } else { delete data.distance_km; }
    if (data.elevation_gain !== '' && data.elevation_gain !== undefined) {
      data.elevation_gain = units === 'mi' ? Math.round(Number(data.elevation_gain) / 3.28084) : Number(data.elevation_gain);
    } else { delete data.elevation_gain; }
    ['duration_minutes', 'avg_heart_rate', 'max_heart_rate', 'calories', 'perceived_effort'].forEach(f => {
      if (data[f] !== '' && data[f] !== undefined) data[f] = Number(data[f]);
      else delete data[f];
    });
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workout ? 'Edit Workout' : 'Log Workout'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Morning Run" required />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} required />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={form.duration_minutes} onChange={e => handleChange('duration_minutes', e.target.value)} placeholder="45" />
            </div>
            <div>
              <Label>Distance ({label})</Label>
              <Input type="number" step="0.01" value={form.distance_km} onChange={e => handleChange('distance_km', e.target.value)} placeholder={label === 'mi' ? '6.5' : '10.5'} />
            </div>
            <div>
              <Label>Avg Pace</Label>
              <Input value={form.avg_pace} onChange={e => handleChange('avg_pace', e.target.value)} placeholder={label === 'mi' ? '8:50 /mi' : '5:30 /km'} />
            </div>
            <div>
              <Label>Avg Heart Rate</Label>
              <Input type="number" value={form.avg_heart_rate} onChange={e => handleChange('avg_heart_rate', e.target.value)} placeholder="145" />
            </div>
            <div>
              <Label>Max Heart Rate</Label>
              <Input type="number" value={form.max_heart_rate} onChange={e => handleChange('max_heart_rate', e.target.value)} placeholder="175" />
            </div>
            <div>
              <Label>Calories</Label>
              <Input type="number" value={form.calories} onChange={e => handleChange('calories', e.target.value)} placeholder="450" />
            </div>
            <div>
              <Label>Elevation ({elevationLabel})</Label>
              <Input type="number" value={form.elevation_gain} onChange={e => handleChange('elevation_gain', e.target.value)} placeholder={elevationLabel === 'ft' ? '394' : '120'} />
            </div>
            <div>
              <Label>Effort (1-10)</Label>
              <Input type="number" min="1" max="10" value={form.perceived_effort} onChange={e => handleChange('perceived_effort', e.target.value)} placeholder="7" />
            </div>
            <div>
              <Label>Feeling</Label>
              <Select value={form.feeling || ''} onValueChange={v => handleChange('feeling', v)}>
                <SelectTrigger><SelectValue placeholder="How did you feel?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="great">Great</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="okay">Okay</SelectItem>
                  <SelectItem value="tired">Tired</SelectItem>
                  <SelectItem value="exhausted">Exhausted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="How did the workout go?" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{workout ? 'Update' : 'Log Workout'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}