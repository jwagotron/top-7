import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const defaults = {
  name: '', description: '', sport: 'run', difficulty: 'intermediate',
  duration_weeks: '', start_date: '', goal_event: '', status: 'draft'
};

export default function PlanForm({ open, onClose, onSubmit, plan, assignment }) {
  const [form, setForm] = useState(plan || defaults);
  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.duration_weeks) data.duration_weeks = Number(data.duration_weeks);
    
    // Apply assignment if creating new plan
    if (!plan && assignment) {
      if (assignment.type === 'all') {
        data.assigned_to = []; // empty array means template for all
      } else if (assignment.type === 'multiple' && assignment.athletes.length > 0) {
        data.assigned_to = assignment.athletes;
      }
    }
    
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create Training Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Plan Name</Label>
            <Input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Marathon Prep 16-Week" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Describe the plan..." rows={2} />
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
                  <SelectItem value="triathlon">Triathlon</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => handleChange('difficulty', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (weeks)</Label>
              <Input type="number" value={form.duration_weeks} onChange={e => handleChange('duration_weeks', e.target.value)} placeholder="12" />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => handleChange('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Goal Event</Label>
            <Input value={form.goal_event} onChange={e => handleChange('goal_event', e.target.value)} placeholder="City Marathon 2026" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{plan ? 'Update' : 'Create Plan'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}