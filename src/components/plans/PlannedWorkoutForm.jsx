import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnits } from '@/hooks/useUnits';

export default function PlannedWorkoutForm({ open, onClose, onSubmit, planId, workout }) {
  const { toDisplay, toKm, label } = useUnits();
  const [form, setForm] = useState(() => {
    const base = workout || {
      title: '', description: '', sport: 'run', scheduled_date: '',
      target_duration_minutes: '', target_distance_km: '', intensity: 'moderate', status: 'upcoming'
    };
    return {
      ...base,
      target_distance_km: base.target_distance_km ? toDisplay(Number(base.target_distance_km)) : '',
    };
  });
  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, plan_id: planId };
    if (data.target_duration_minutes) data.target_duration_minutes = Number(data.target_duration_minutes);
    if (data.target_distance_km) data.target_distance_km = toKm(Number(data.target_distance_km));
    
    // Debug: verify the scheduled date is preserved correctly
    console.log('[PlannedWorkoutForm] Submitting workout:', {
      title: data.title,
      selectedDate: data.scheduled_date,
      dateType: typeof data.scheduled_date,
    });
    
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{workout ? 'Edit Planned Workout' : 'Schedule Workout'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Tempo Run" required />
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Warm up 10 min, then..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sport</Label>
              <Select value={form.sport} onValueChange={v => handleChange('sport', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="run">Run</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="swim">Swim</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.scheduled_date} onChange={e => handleChange('scheduled_date', e.target.value)} required />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={form.target_duration_minutes} onChange={e => handleChange('target_duration_minutes', e.target.value)} placeholder="60" />
            </div>
            <div>
              <Label>Distance ({label})</Label>
              <Input type="number" step="0.01" value={form.target_distance_km} onChange={e => handleChange('target_distance_km', e.target.value)} placeholder={label === 'mi' ? '9.3' : '15'} />
            </div>
            <div>
              <Label>Intensity</Label>
              <Select value={form.intensity} onValueChange={v => handleChange('intensity', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="race_pace">Race Pace</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{workout ? 'Update' : 'Add Workout'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}