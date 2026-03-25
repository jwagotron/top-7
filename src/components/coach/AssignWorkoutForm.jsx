import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, Users } from 'lucide-react';

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
  title: '', description: '', sport: 'run', run_type: 'easy',
  scheduled_date: '', target_duration_minutes: '', target_distance_km: '',
  target_pace: '', intensity: 'moderate', warmup_description: '',
  main_set_description: '', cooldown_description: '', coach_notes: '',
  assigned_to: '', status: 'upcoming'
};

export default function AssignWorkoutForm({ open, onClose, onSubmit, workout, defaultDate, athletes }) {
  const [form, setForm] = useState(defaults);
  const [activeTab, setActiveTab] = useState('details');
  // Multi-select: array of emails (empty = all / unassigned)
  const [selectedAthletes, setSelectedAthletes] = useState([]);

  useEffect(() => {
    if (open) {
      if (workout) {
        setForm({ ...defaults, ...workout });
        setSelectedAthletes(workout.assigned_to ? [workout.assigned_to] : []);
      } else {
        setForm({ ...defaults, scheduled_date: defaultDate || '' });
        setSelectedAthletes([]);
      }
      setActiveTab('details');
    }
  }, [open, workout, defaultDate]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const toggleAthlete = (email) => {
    setSelectedAthletes(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const base = { ...form };
    if (base.target_duration_minutes) base.target_duration_minutes = Number(base.target_duration_minutes);
    if (base.target_distance_km) base.target_distance_km = Number(base.target_distance_km);

    if (selectedAthletes.length > 1) {
      // Bulk assign — one record per athlete
      onSubmit(selectedAthletes.map(email => ({ ...base, assigned_to: email })));
    } else {
      onSubmit({ ...base, assigned_to: selectedAthletes[0] || '' });
    }
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'structure', label: 'Structure' },
    { id: 'assign', label: 'Assign' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{workout ? 'Edit Workout' : 'Assign Workout'}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
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
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <Label>Workout Title</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Tempo Run – 8km" required />
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
                        form.run_type === rt.value ? `${rt.color} border-current shadow-sm` : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                      )}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Scheduled Date</Label>
                  <Input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} required />
                </div>
                <div>
                  <Label>Intensity</Label>
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
                  <Label>Target Distance (km)</Label>
                  <Input type="number" step="0.1" value={form.target_distance_km} onChange={e => set('target_distance_km', e.target.value)} placeholder="10" />
                </div>
                <div>
                  <Label>Target Duration (min)</Label>
                  <Input type="number" value={form.target_duration_minutes} onChange={e => set('target_duration_minutes', e.target.value)} placeholder="55" />
                </div>
                <div className="col-span-2">
                  <Label>Target Pace (/km)</Label>
                  <Input value={form.target_pace} onChange={e => set('target_pace', e.target.value)} placeholder="5:15" />
                </div>
              </div>

              <div>
                <Label>General Description</Label>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Overview of what this workout is about..." rows={2} />
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div>
                <Label>Warm-Up</Label>
                <Textarea value={form.warmup_description} onChange={e => set('warmup_description', e.target.value)} placeholder="e.g. 10 min easy jog, dynamic stretches..." rows={3} />
              </div>
              <div>
                <Label>Main Set</Label>
                <Textarea value={form.main_set_description} onChange={e => set('main_set_description', e.target.value)} placeholder="e.g. 4 × 1km at threshold pace (4:30/km) with 90s recovery..." rows={4} />
              </div>
              <div>
                <Label>Cool-Down</Label>
                <Textarea value={form.cooldown_description} onChange={e => set('cooldown_description', e.target.value)} placeholder="e.g. 10 min easy jog, static stretches..." rows={3} />
              </div>
              <div>
                <Label>Coach Notes (private)</Label>
                <Textarea value={form.coach_notes} onChange={e => set('coach_notes', e.target.value)} placeholder="Notes only visible to athlete after completion check..." rows={2} />
              </div>
            </div>
          )}

          {activeTab === 'assign' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Assign to Athletes</Label>
                  {athletes && athletes.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setSelectedAthletes(
                        selectedAthletes.length === athletes.length ? [] : athletes.map(a => a.email)
                      )}
                    >
                      {selectedAthletes.length === athletes.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>

                {athletes && athletes.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {athletes.map(a => {
                      const selected = selectedAthletes.includes(a.email);
                      return (
                        <button
                          key={a.email}
                          type="button"
                          onClick={() => toggleAthlete(a.email)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                            selected
                              ? 'bg-primary/5 border-primary/30 text-foreground'
                              : 'bg-muted/30 border-transparent hover:bg-muted/60 text-foreground'
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                            selected ? 'bg-primary border-primary' : 'border-muted-foreground'
                          )}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{a.full_name || a.email}</p>
                            {a.full_name && <p className="text-xs text-muted-foreground">{a.email}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    value={selectedAthletes[0] || ''}
                    onChange={e => setSelectedAthletes(e.target.value ? [e.target.value] : [])}
                    placeholder="athlete@email.com"
                    type="email"
                  />
                )}

                {selectedAthletes.length > 1 && (
                  <div className="flex items-center gap-2 mt-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">
                      This workout will be assigned to {selectedAthletes.length} athletes individually.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {workout ? 'Update' : selectedAthletes.length > 1 ? `Assign to ${selectedAthletes.length} Athletes` : 'Assign Workout'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}