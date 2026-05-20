import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Target, Trash2, Pencil, Trophy, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const categoryIcons = {
  distance: TrendingUp, time: TrendingUp, race: Trophy, consistency: Target, other: Target,
};

const statusColors = {
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-secondary/10 text-secondary",
  abandoned: "bg-muted text-muted-foreground",
};

export default function Goals() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 50),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Goal.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  return (
    <div>
      <TopBar title="My Goals">
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5 h-8 px-2 sm:px-4">
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">New Goal</span>
        </Button>
      </TopBar>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-24 lg:pb-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Set your first goal to start tracking progress!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
            {goals.map(goal => {
              const Icon = categoryIcons[goal.category] || Target;
              const progress = goal.target_value ? Math.min(100, ((goal.current_value || 0) / goal.target_value) * 100) : 0;
              return (
                <Card key={goal.id} className="border rounded-2xl group hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0 break-words">{goal.title}</h3>
                          <div className="flex gap-1 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(goal)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(goal.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] capitalize mt-1", statusColors[goal.status])}>
                          {goal.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {goal.description && <p className="text-xs text-muted-foreground/70 mb-4">{goal.description}</p>}
                    {goal.target_value && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{goal.current_value || 0} / {goal.target_value} {goal.unit}</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground mt-2">Deadline: {format(parseDateOnly(goal.deadline), 'MMM d, yyyy')}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <GoalFormDialog
        open={showForm || !!editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={(data) => editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data)}
        goal={editing}
      />
    </div>
  );
}

function GoalFormDialog({ open, onClose, onSubmit, goal }) {
  const [form, setForm] = useState(goal || {
    title: '', description: '', category: 'distance', target_value: '', current_value: '', unit: 'km', deadline: '', status: 'in_progress'
  });
  
  React.useEffect(() => {
    if (goal) setForm(goal);
    else setForm({ title: '', description: '', category: 'distance', target_value: '', current_value: '', unit: 'km', deadline: '', status: 'in_progress' });
  }, [goal, open]);

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.target_value) data.target_value = Number(data.target_value);
    if (data.current_value) data.current_value = Number(data.current_value);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Run 1000km this year" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => handleChange('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="race">Race</SelectItem>
                  <SelectItem value="consistency">Consistency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Value or Time</Label>
              <Input type="number" value={form.target_value} onChange={e => handleChange('target_value', e.target.value)} placeholder="1000" />
            </div>
            <div>
              <Label>Current Value or Time</Label>
              <Input type="number" value={form.current_value} onChange={e => handleChange('current_value', e.target.value)} placeholder="250" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => handleChange('unit', e.target.value)} placeholder="km" />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={e => handleChange('deadline', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{goal ? 'Update' : 'Create Goal'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}