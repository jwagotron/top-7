import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Users, ChevronRight, User, BookOpen, X, ChevronDown } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { getGroupColorClasses } from '@/components/coach/AthleteGroupManager';

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

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>;
}

function OptionalMark() {
  return <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>;
}

// Step 1 — who to assign to (athletes + groups)
function AssignTargetStep({ athletes, groups, selectedAthletes, setSelectedAthletes, athleteFilter, onNext }) {
  const [view, setView] = useState('athletes'); // 'athletes' | 'groups'
  const allEmails = athletes.map(a => a.email);
  const allSelected = athletes.length > 0 && selectedAthletes.length === athletes.length;

  const toggleAthlete = (email) => {
    setSelectedAthletes(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const toggleGroup = (group) => {
    const groupEmails = group.athlete_emails || [];
    const allInGroup = groupEmails.every(e => selectedAthletes.includes(e));
    if (allInGroup) {
      setSelectedAthletes(prev => prev.filter(e => !groupEmails.includes(e)));
    } else {
      setSelectedAthletes(prev => [...new Set([...prev, ...groupEmails])]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Who would you like to assign this workout to?</p>

      {/* Toggle athletes/groups */}
      {groups.length > 0 && (
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button type="button" onClick={() => setView('athletes')} className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-all', view === 'athletes' ? 'bg-card shadow text-foreground' : 'text-muted-foreground')}>
            Individual Athletes
          </button>
          <button type="button" onClick={() => setView('groups')} className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-all', view === 'groups' ? 'bg-card shadow text-foreground' : 'text-muted-foreground')}>
            Groups
          </button>
        </div>
      )}

      {view === 'athletes' && (
        <>
          {/* Select all */}
          <button
            type="button"
            onClick={() => setSelectedAthletes(allSelected ? [] : allEmails)}
            className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
              allSelected ? 'bg-primary/8 border-primary/40' : 'bg-muted/20 border-border hover:bg-muted/40')}
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', allSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">All Athletes</p>
              <p className="text-xs text-muted-foreground">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</p>
            </div>
            <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0', allSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          {athletes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Or pick specific athletes</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {athletes.map(a => {
                  const selected = selectedAthletes.includes(a.email);
                  return (
                    <button key={a.email} type="button" onClick={() => toggleAthlete(a.email)}
                      className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                        selected ? 'bg-primary/5 border-primary/30' : 'bg-muted/20 border-transparent hover:bg-muted/50')}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                        {(a.full_name || a.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.full_name || a.email}</p>
                        {a.full_name && <p className="text-xs text-muted-foreground truncate">{a.email}</p>}
                      </div>
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', selected ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                        {selected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {athletes.length === 0 && (
            <div className="space-y-1.5">
              <Label>Athlete Email</Label>
              <Input placeholder="athlete@email.com" type="email"
                onChange={e => setSelectedAthletes(e.target.value ? [e.target.value] : [])}
                value={selectedAthletes[0] || ''} />
            </div>
          )}
        </>
      )}

      {view === 'groups' && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {groups.map(g => {
            const cc = getGroupColorClasses(g.color);
            const groupEmails = g.athlete_emails || [];
            const allInGroup = groupEmails.length > 0 && groupEmails.every(e => selectedAthletes.includes(e));
            return (
              <button key={g.id} type="button" onClick={() => toggleGroup(g)}
                className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all',
                  allInGroup ? 'bg-primary/5 border-primary/30' : 'bg-muted/20 border-transparent hover:bg-muted/50')}
              >
                <Badge className={cn('text-xs shrink-0', cc.bg, cc.text, cc.border, 'border')}>{g.name}</Badge>
                <p className="text-xs text-muted-foreground flex-1">{groupEmails.length} athlete{groupEmails.length !== 1 ? 's' : ''}</p>
                <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', allInGroup ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                  {allInGroup && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedAthletes.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">
            {selectedAthletes.length === 1 ? 'Assigning to 1 athlete' : `Assigning to ${selectedAthletes.length} athletes`}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" onClick={onNext} disabled={selectedAthletes.length === 0} className="gap-1.5">
          Continue <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AssignWorkoutForm({ open, onClose, onSubmit, workout, defaultDate, athletes = [], athleteFilter = 'all', teamId }) {
  const { toDisplay, toKm, label, paceLabel } = useUnits();
  const [form, setForm] = useState(defaults);
  const [activeTab, setActiveTab] = useState('assign');
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [showSavedWorkouts, setShowSavedWorkouts] = useState(false);

  const prevOpenRef = useRef(false);

  // Load saved workouts from builder
  const { data: savedWorkouts = [] } = useQuery({
    queryKey: ['builder-workouts'],
    queryFn: () => base44.entities.Workout.list('-created_date', 100),
    enabled: open,
  });

  // Load groups for this team
  const { data: groups = [] } = useQuery({
    queryKey: ['athlete-groups', teamId],
    queryFn: () => base44.entities.AthleteGroup.filter({ team_id: teamId }),
    enabled: !!teamId && open,
  });

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!open) return;

    if (workout) {
      setForm({ ...defaults, ...workout, target_distance_km: workout.target_distance_km ? toDisplay(workout.target_distance_km) : '' });
      setSelectedAthletes(workout.assigned_to ? [workout.assigned_to] : []);
      setActiveTab('details');
    } else if (justOpened) {
      setForm({ ...defaults, scheduled_date: defaultDate || '' });
      if (athleteFilter && athleteFilter !== 'all') {
        setSelectedAthletes([athleteFilter]);
      } else if (athleteFilter === 'all' && athletes.length > 0) {
        setSelectedAthletes(athletes.map(a => a.email));
      } else {
        setSelectedAthletes([]);
      }
      setActiveTab('assign');
    } else {
      setForm(prev => ({ ...prev, scheduled_date: defaultDate || '' }));
    }
  }, [open, workout, defaultDate, athleteFilter]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const loadSavedWorkout = (w) => {
    setForm(prev => ({
      ...prev,
      title: w.title || '',
      sport: w.sport || 'run',
      run_type: w.run_type || 'easy',
      description: w.description || '',
      target_duration_minutes: w.duration_minutes || '',
      target_distance_km: w.distance_km ? toDisplay(w.distance_km) : '',
      warmup_description: w.warmup_description || '',
      main_set_description: w.main_set_description || '',
      cooldown_description: w.cooldown_description || '',
    }));
    setShowSavedWorkouts(false);
  };

  const isRequiredComplete = form.title && form.run_type && form.scheduled_date && form.warmup_description && form.main_set_description && form.cooldown_description;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedAthletes.length === 0 || !isRequiredComplete) return;

    const base = { ...form };
    if (base.target_duration_minutes) base.target_duration_minutes = Number(base.target_duration_minutes);
    if (base.target_distance_km) base.target_distance_km = toKm(Number(base.target_distance_km));

    if (selectedAthletes.length > 1) {
      onSubmit(selectedAthletes.map(email => ({ ...base, assigned_to: email })));
    } else {
      onSubmit({ ...base, assigned_to: selectedAthletes[0] });
    }
  };

  const workoutTabs = [{ id: 'details', label: 'Details' }, { id: 'structure', label: 'Structure' }];
  const isEditing = !!workout;

  const assigneeSummary = selectedAthletes.length === 0 ? null
    : selectedAthletes.length === 1
    ? athletes.find(a => a.email === selectedAthletes[0])?.full_name || selectedAthletes[0]
    : `${selectedAthletes.length} athletes`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Workout' : activeTab === 'assign' ? 'Assign Workout' : 'Workout Details'}
          </DialogTitle>
          {!isEditing && activeTab !== 'assign' && assigneeSummary && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground">For:</span>
              <button type="button" onClick={() => setActiveTab('assign')}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/8 border border-primary/20 px-2 py-0.5 rounded-full hover:bg-primary/15 transition-colors">
                <User className="w-3 h-3" /> {assigneeSummary}
              </button>
            </div>
          )}
        </DialogHeader>

        {(!isEditing && activeTab !== 'assign') && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
            {workoutTabs.map(t => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={cn('flex-1 text-sm py-1.5 rounded-md font-medium transition-all', activeTab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {isEditing && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
            {workoutTabs.map(t => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={cn('flex-1 text-sm py-1.5 rounded-md font-medium transition-all', activeTab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* STEP 1: Assign */}
          {activeTab === 'assign' && !isEditing && (
            <AssignTargetStep
              athletes={athletes}
              groups={groups}
              selectedAthletes={selectedAthletes}
              setSelectedAthletes={setSelectedAthletes}
              athleteFilter={athleteFilter}
              onNext={() => setActiveTab('details')}
            />
          )}

          {/* STEP 2: Details */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Load from saved workout */}
              {!isEditing && savedWorkouts.length > 0 && (
                <div>
                  <button type="button" onClick={() => setShowSavedWorkouts(p => !p)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-medium">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">Load from Saved Workout</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', showSavedWorkouts && 'rotate-180')} />
                  </button>
                  {showSavedWorkouts && (
                    <div className="mt-1.5 border border-border rounded-xl divide-y divide-border max-h-48 overflow-y-auto">
                      {savedWorkouts.map(w => (
                        <button key={w.id} type="button" onClick={() => loadSavedWorkout(w)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors">
                          <p className="text-sm font-medium">{w.title}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            {w.run_type && <span className="text-[10px] text-muted-foreground">{w.run_type.replace(/_/g, ' ')}</span>}
                            {w.duration_minutes && <span className="text-[10px] text-muted-foreground">· {w.duration_minutes}min</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Workout Title <RequiredMark /></Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Tempo Run – 8km" required />
              </div>

              <div>
                <Label>Run Type <RequiredMark /></Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Scheduled Date <RequiredMark /></Label>
                  <Input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} required />
                </div>
                <div>
                  <Label>Intensity <OptionalMark /></Label>
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
                  <Label>Target Distance ({label}) <OptionalMark /></Label>
                  <Input type="number" step="0.01" value={form.target_distance_km} onChange={e => set('target_distance_km', e.target.value)} placeholder={label === 'mi' ? '6.2' : '10'} />
                </div>
                <div>
                  <Label>Target Duration (min) <OptionalMark /></Label>
                  <Input type="number" value={form.target_duration_minutes} onChange={e => set('target_duration_minutes', e.target.value)} placeholder="55" />
                </div>
                <div className="col-span-2">
                  <Label>Target Pace ({paceLabel}) <OptionalMark /></Label>
                  <Input value={form.target_pace} onChange={e => set('target_pace', e.target.value)} placeholder={label === 'mi' ? '8:27' : '5:15'} />
                </div>
              </div>

              <div>
                <Label>General Description <OptionalMark /></Label>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Overview of what this workout is about..." rows={2} />
              </div>

              <div className="flex justify-between gap-3 pt-2 border-t">
                {!isEditing && <Button type="button" variant="outline" onClick={() => setActiveTab('assign')}>← Back</Button>}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="button" onClick={() => setActiveTab('structure')} className="gap-1.5">
                    Structure <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Structure */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div>
                <Label>Warm-Up <RequiredMark /></Label>
                <Textarea value={form.warmup_description} onChange={e => set('warmup_description', e.target.value)} placeholder="e.g. 10 min easy jog, dynamic stretches..." rows={3} />
              </div>
              <div>
                <Label>Main Set <RequiredMark /></Label>
                <Textarea value={form.main_set_description} onChange={e => set('main_set_description', e.target.value)} placeholder="e.g. 4 × 1km at threshold pace (4:30/km) with 90s recovery..." rows={4} />
              </div>
              <div>
                <Label>Cool-Down <RequiredMark /></Label>
                <Textarea value={form.cooldown_description} onChange={e => set('cooldown_description', e.target.value)} placeholder="e.g. 10 min easy jog, static stretches..." rows={3} />
              </div>
              <div>
                <Label>Coach Notes (private) <OptionalMark /></Label>
                <Textarea value={form.coach_notes} onChange={e => set('coach_notes', e.target.value)} placeholder="Notes only visible to you..." rows={2} />
              </div>

              {!isRequiredComplete && (
                <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  Please fill in all required fields (<span className="font-medium">*</span>) before assigning.
                </p>
              )}

              <div className="flex justify-between gap-3 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab('details')}>← Details</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="submit" disabled={selectedAthletes.length === 0 || !isRequiredComplete}>
                    {isEditing ? 'Update Workout'
                      : selectedAthletes.length > 1 ? `Assign to ${selectedAthletes.length} Athletes`
                      : 'Assign Workout'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}