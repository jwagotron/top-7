import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function RaceGoalForm({ athleteEmail, onSubmit, onClose }) {
  const [form, setForm] = useState({ race_name: '', race_date: '', distance: '', goal_time: '', priority: 'A', notes: '' });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Race Goal</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Race Name</Label><Input value={form.race_name} onChange={e => set('race_name', e.target.value)} placeholder="Boston Marathon" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Race Date</Label><Input type="date" value={form.race_date} onChange={e => set('race_date', e.target.value)} /></div>
            <div><Label>Distance</Label><Input value={form.distance} onChange={e => set('distance', e.target.value)} placeholder="Marathon" /></div>
            <div><Label>Goal Time</Label><Input value={form.goal_time} onChange={e => set('goal_time', e.target.value)} placeholder="3:30:00" /></div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A — Goal Race</SelectItem>
                  <SelectItem value="B">B — Important</SelectItem>
                  <SelectItem value="C">C — Training Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSubmit(form)} disabled={!form.race_name || !form.race_date}>Save Race</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}