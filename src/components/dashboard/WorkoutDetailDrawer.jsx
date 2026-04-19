import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useUnits } from '@/hooks/useUnits';
import {
  Heart, Clock, MapPin, Zap, Activity, TrendingUp, Footprints
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function MetricTile({ icon: Icon, label, value, unit, color = 'text-primary', bg = 'bg-primary/10' }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/30">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold leading-tight">{value}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></p>
      </div>
    </div>
  );
}

export default function WorkoutDetailDrawer({ workout, onClose }) {
  const { toDisplay, label: distLabel } = useUnits();

  const splitData = workout?.splits || [];
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '11px',
  };

  if (!workout) return null;

  const splitChart = splitData.map((s, i) => ({
    km: `${i + 1}`,
    hr: s.heart_rate || null,
    pace: s.pace ? (() => {
      const m = s.pace.match(/(\d+):(\d+)/);
      return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
    })() : null,
  })).filter(d => d.pace || d.hr);

  return (
    <Dialog open={!!workout} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{workout.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {workout.date ? format(new Date(workout.date), 'EEEE, MMMM d, yyyy') : ''}
            {workout.run_type ? ` · ${workout.run_type.replace(/_/g, ' ')}` : ''}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-2">
            <MetricTile icon={MapPin} label="Distance" value={workout.distance_km ? toDisplay(workout.distance_km).toFixed(2) : null} unit={distLabel} color="text-primary" bg="bg-primary/10" />
            <MetricTile icon={Clock} label="Duration" value={workout.duration_minutes} unit="min" color="text-secondary" bg="bg-secondary/10" />
            <MetricTile icon={Zap} label="Avg Pace" value={workout.avg_pace} unit="" color="text-accent" bg="bg-accent/10" />
            <MetricTile icon={Zap} label="Best Pace" value={workout.best_pace} unit="" color="text-chart-5" bg="bg-chart-5/10" />
            <MetricTile icon={Heart} label="Avg HR" value={workout.avg_heart_rate} unit="bpm" color="text-destructive" bg="bg-destructive/10" />
            <MetricTile icon={Heart} label="Max HR" value={workout.max_heart_rate} unit="bpm" color="text-chart-5" bg="bg-chart-5/10" />
            <MetricTile icon={Activity} label="Cadence" value={workout.cadence} unit="spm" color="text-chart-4" bg="bg-chart-4/10" />
            <MetricTile icon={TrendingUp} label="Elevation" value={workout.elevation_gain} unit="m" color="text-secondary" bg="bg-secondary/10" />
            <MetricTile icon={Footprints} label="Calories" value={workout.calories} unit="kcal" color="text-accent" bg="bg-accent/10" />
            {workout.perceived_effort && (
              <MetricTile icon={Activity} label="Effort (RPE)" value={`${workout.perceived_effort}/10`} unit="" color="text-destructive" bg="bg-destructive/10" />
            )}
          </div>

          {(workout.warmup_description || workout.main_set_description || workout.cooldown_description) && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Workout Structure</p>
              {workout.warmup_description && (
                <div className="p-3 rounded-xl bg-secondary/5 border border-secondary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary/70 mb-1">Warm-Up</p>
                  <p className="text-sm text-foreground/80">{workout.warmup_description}</p>
                </div>
              )}
              {workout.main_set_description && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1">Main Set</p>
                  <p className="text-sm text-foreground/80">{workout.main_set_description}</p>
                </div>
              )}
              {workout.cooldown_description && (
                <div className="p-3 rounded-xl bg-muted border border-border/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Cool-Down</p>
                  <p className="text-sm text-foreground/80">{workout.cooldown_description}</p>
                </div>
              )}
            </div>
          )}

          {splitChart.length > 1 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Split Analysis</p>
              <div className="bg-card border border-border/30 rounded-xl p-3">
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={splitChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="km" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="pace" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} reversed />
                      <YAxis yAxisId="hr" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => n === 'hr' ? [`${v} bpm`, 'HR'] : [`${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`, 'Pace']} />
                      {splitChart.some(d => d.pace) && <Line yAxisId="pace" type="monotone" dataKey="pace" name="pace" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />}
                      {splitChart.some(d => d.hr) && <Line yAxisId="hr" type="monotone" dataKey="hr" name="hr" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--destructive))' }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center mt-2">
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-primary inline-block rounded-full" /> Pace</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-destructive inline-block rounded-full" /> Heart Rate</span>
                </div>
              </div>
            </div>
          )}

          {splitData.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Per-{distLabel} Splits</p>
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{distLabel}</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pace</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">HR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {splitData.map((s, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 font-semibold">{i + 1}</td>
                        <td className="px-3 py-2 text-right">{s.pace || '—'}</td>
                        <td className="px-3 py-2 text-right">{s.heart_rate ? `${s.heart_rate} bpm` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(workout.notes || workout.feeling || workout.shoes) && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/30 space-y-1.5">
              {workout.feeling && <p className="text-xs text-muted-foreground capitalize"><span className="font-semibold">Feeling:</span> {workout.feeling}</p>}
              {workout.shoes && <p className="text-xs text-muted-foreground"><span className="font-semibold">Shoes:</span> {workout.shoes}</p>}
              {workout.notes && <p className="text-xs text-muted-foreground italic">"{workout.notes}"</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}