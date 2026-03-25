import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const stepTypeColors = {
  warmup: 'bg-secondary/10 border-secondary/30 text-secondary',
  active: 'bg-primary/10 border-primary/30 text-primary',
  rest: 'bg-muted border-border text-muted-foreground',
  cooldown: 'bg-chart-4/10 border-chart-4/30 text-chart-4',
  repeat: 'bg-accent/10 border-accent/30 text-accent',
};

const defaultStep = () => ({
  id: Math.random().toString(36).slice(2),
  step_type: 'active',
  name: '',
  duration_type: 'time',
  duration_value: 300,
  target_type: 'pace',
  target_min: null,
  target_max: null,
  repeat_count: null,
  notes: '',
});

export default function WorkoutStepEditor({ steps = [], onChange }) {
  const addStep = () => onChange([...steps, defaultStep()]);
  const removeStep = (id) => onChange(steps.filter(s => s.id !== id));
  const updateStep = (id, field, value) => onChange(steps.map(s => s.id === id ? { ...s, [field]: value } : s));

  const formatDuration = (type, value) => {
    if (!value) return '';
    if (type === 'time') {
      const min = Math.floor(value / 60);
      const sec = value % 60;
      return min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}s`;
    }
    return `${value}m`;
  };

  return (
    <div className="space-y-2">
      {steps.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No steps yet. Add a warmup, intervals, or cooldown.
        </div>
      )}

      {steps.map((step, idx) => (
        <div key={step.id} className={`border rounded-xl p-3 ${stepTypeColors[step.step_type] || 'bg-muted border-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <GripVertical className="w-4 h-4 opacity-40 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide w-5 opacity-60">{idx + 1}</span>

            <Select value={step.step_type} onValueChange={v => updateStep(step.id, 'step_type', v)}>
              <SelectTrigger className="h-7 w-28 text-xs bg-background/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="warmup">Warmup</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rest">Rest</SelectItem>
                <SelectItem value="cooldown">Cooldown</SelectItem>
                <SelectItem value="repeat">Repeat</SelectItem>
              </SelectContent>
            </Select>

            <Input
              className="h-7 text-xs flex-1 bg-background/60"
              placeholder="Step name (optional)"
              value={step.name}
              onChange={e => updateStep(step.id, 'name', e.target.value)}
            />

            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeStep(step.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pl-9">
            <div>
              <p className="text-[10px] opacity-70 mb-1">Duration type</p>
              <Select value={step.duration_type} onValueChange={v => updateStep(step.id, 'duration_type', v)}>
                <SelectTrigger className="h-7 text-xs bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] opacity-70 mb-1">{step.duration_type === 'time' ? 'Seconds' : step.duration_type === 'distance' ? 'Meters' : 'N/A'}</p>
              <Input
                className="h-7 text-xs bg-background/60"
                type="number"
                value={step.duration_value || ''}
                onChange={e => updateStep(step.id, 'duration_value', Number(e.target.value))}
                placeholder={step.duration_type === 'time' ? '300' : '1000'}
                disabled={step.duration_type === 'open'}
              />
            </div>
            <div>
              <p className="text-[10px] opacity-70 mb-1">Target</p>
              <Select value={step.target_type} onValueChange={v => updateStep(step.id, 'target_type', v)}>
                <SelectTrigger className="h-7 text-xs bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pace">Pace</SelectItem>
                  <SelectItem value="heart_rate">Heart Rate</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="cadence">Cadence</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] opacity-70 mb-1">Min / Max</p>
              <div className="flex gap-1">
                <Input className="h-7 text-xs bg-background/60" type="number" placeholder="min" value={step.target_min || ''} onChange={e => updateStep(step.id, 'target_min', Number(e.target.value))} />
                <Input className="h-7 text-xs bg-background/60" type="number" placeholder="max" value={step.target_max || ''} onChange={e => updateStep(step.id, 'target_max', Number(e.target.value))} />
              </div>
            </div>
            {step.step_type === 'repeat' && (
              <div>
                <p className="text-[10px] opacity-70 mb-1">Repeat count</p>
                <Input className="h-7 text-xs bg-background/60" type="number" placeholder="e.g. 5" value={step.repeat_count || ''} onChange={e => updateStep(step.id, 'repeat_count', Number(e.target.value))} />
              </div>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addStep}>
        <Plus className="w-4 h-4" /> Add Step
      </Button>
    </div>
  );
}