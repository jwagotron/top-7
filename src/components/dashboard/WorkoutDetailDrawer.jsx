import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useUnits } from '@/hooks/useUnits';
import {
  Heart, Clock, MapPin, Zap, Activity, TrendingUp, Footprints, Wind, ArrowUpDown, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import WorkoutComments from '@/components/workouts/WorkoutComments';
import { useRole } from '@/lib/RoleContext';

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
  const { toDisplay, label: distLabel, convertPaceLabel, paceLabel, toDisplayElevation, elevationLabel } = useUnits();
  const { role } = useRole();

  const splitData = workout?.splits || [];
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '11px',
  };

  if (!workout) return null;

  const splitChart = splitData.map((s, i) => ({
    lap: `${i + 1}`,
    hr: s.heart_rate || null,
    pace: s.pace ? (() => {
      const m = s.pace.match(/(\d+):(\d+)/);
      return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
    })() : null,
    elevation: s.elevation_change != null ? s.elevation_change : null,
    cadence: s.cadence || null,
  })).filter(d => d.pace || d.hr);

  // Planned vs actual comparison
  const plannedVsActual = workout.planned_workout_id ? [
    workout.target_distance_km && workout.distance_km ? {
      label: 'Distance',
      planned: toDisplay(workout.target_distance_km).toFixed(1),
      actual: toDisplay(workout.distance_km).toFixed(1),
      unit: distLabel,
    } : null,
    workout.target_duration_minutes && workout.duration_minutes ? {
      label: 'Duration',
      planned: workout.target_duration_minutes,
      actual: workout.duration_minutes,
      unit: 'min',
    } : null,
  ].filter(Boolean) : [];

  const displayPace = (paceStr) => {
    if (!paceStr) return null;
    return convertPaceLabel(paceStr);
  };

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
          {/* Core metrics */}
          <div className="grid grid-cols-2 gap-2">
            <MetricTile icon={MapPin} label="Distance" value={workout.distance_km ? toDisplay(workout.distance_km).toFixed(2) : null} unit={distLabel} color="text-primary" bg="bg-primary/10" />
            <MetricTile icon={Clock} label="Duration" value={workout.duration_minutes} unit="min" color="text-secondary" bg="bg-secondary/10" />
            <MetricTile icon={Zap} label="Avg Pace" value={displayPace(workout.avg_pace)} unit={paceLabel} color="text-accent" bg="bg-accent/10" />
            <MetricTile icon={Zap} label="Best Pace" value={displayPace(workout.best_pace)} unit={paceLabel} color="text-chart-5" bg="bg-chart-5/10" />
            <MetricTile icon={Heart} label="Avg HR" value={workout.avg_heart_rate} unit="bpm" color="text-destructive" bg="bg-destructive/10" />
            <MetricTile icon={Heart} label="Max HR" value={workout.max_heart_rate} unit="bpm" color="text-chart-5" bg="bg-chart-5/10" />
            <MetricTile icon={Activity} label="Cadence" value={workout.cadence} unit="spm" color="text-chart-4" bg="bg-chart-4/10" />
            <MetricTile icon={TrendingUp} label="Elevation Gain" value={workout.elevation_gain ? toDisplayElevation(workout.elevation_gain) : null} unit={elevationLabel} color="text-secondary" bg="bg-secondary/10" />
            <MetricTile icon={Footprints} label="Calories" value={workout.calories} unit="kcal" color="text-accent" bg="bg-accent/10" />
            {workout.perceived_effort && (
              <MetricTile icon={Activity} label="Effort (RPE)" value={`${workout.perceived_effort}/10`} unit="" color="text-destructive" bg="bg-destructive/10" />
            )}
            {/* Advanced running dynamics */}
            {workout.stride_length_cm && (
              <MetricTile icon={Footprints} label="Stride Length" value={(workout.stride_length_cm / 100).toFixed(2)} unit="m" color="text-chart-3" bg="bg-chart-3/10" />
            )}
            {workout.vertical_oscillation_mm && (
              <MetricTile icon={ArrowUpDown} label="Vert. Oscillation" value={(workout.vertical_oscillation_mm / 10).toFixed(1)} unit="cm" color="text-chart-4" bg="bg-chart-4/10" />
            )}
            {workout.ground_contact_ms && (
              <MetricTile icon={Target} label="Ground Contact" value={workout.ground_contact_ms} unit="ms" color="text-chart-2" bg="bg-chart-2/10" />
            )}
            {workout.vertical_ratio && (
              <MetricTile icon={Wind} label="Vertical Ratio" value={workout.vertical_ratio?.toFixed(1)} unit="%" color="text-primary" bg="bg-primary/10" />
            )}
          </div>

          {/* Planned vs Actual */}
          {plannedVsActual.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Planned vs Actual</p>
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Metric</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Planned</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Actual</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {plannedVsActual.map(row => {
                      const diff = (parseFloat(row.actual) - parseFloat(row.planned)).toFixed(1);
                      const isOver = parseFloat(diff) > 0;
                      return (
                        <tr key={row.label} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-semibold">{row.label}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{row.planned} {row.unit}</td>
                          <td className="px-3 py-2 text-right font-semibold">{row.actual} {row.unit}</td>
                          <td className={cn('px-3 py-2 text-right font-semibold', isOver ? 'text-secondary' : 'text-destructive')}>
                            {isOver ? '+' : ''}{diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Workout Structure */}
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

          {/* Split charts */}
          {splitChart.length > 1 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Split Analysis</p>
              <div className="bg-card border border-border/30 rounded-xl p-3">
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={splitChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="lap" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="pace" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} reversed />
                      <YAxis yAxisId="hr" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => n === 'hr' ? [`${v} bpm`, 'HR'] : [`${Math.floor(v/60)}:${String(v%60).padStart(2,'0')} ${paceLabel}`, 'Pace']} />
                      {splitChart.some(d => d.pace) && <Line yAxisId="pace" type="monotone" dataKey="pace" name="pace" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />}
                      {splitChart.some(d => d.hr) && <Line yAxisId="hr" type="monotone" dataKey="hr" name="hr" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--destructive))' }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center mt-2">
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-primary inline-block rounded-full" /> Pace ({paceLabel})</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-destructive inline-block rounded-full" /> Heart Rate</span>
                </div>
              </div>
            </div>
          )}

          {/* Per-lap splits table */}
          {splitData.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Lap Splits</p>
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[340px]">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Lap</th>
                        <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Pace</th>
                        <th className="px-2 py-2 text-right font-semibold text-muted-foreground">HR</th>
                        {splitData.some(s => s.cadence) && <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Cad.</th>}
                        {splitData.some(s => s.elevation_change != null) && <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Elev.</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {splitData.map((s, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-2 py-2 font-semibold">{i + 1}</td>
                          <td className="px-2 py-2 text-right">{s.pace ? `${convertPaceLabel(s.pace)} ${paceLabel}` : '—'}</td>
                          <td className="px-2 py-2 text-right">{s.heart_rate ? `${s.heart_rate}bpm` : '—'}</td>
                          {splitData.some(s => s.cadence) && <td className="px-2 py-2 text-right">{s.cadence ? `${s.cadence}spm` : '—'}</td>}
                          {splitData.some(s => s.elevation_change != null) && (
                            <td className={cn('px-2 py-2 text-right', s.elevation_change > 0 ? 'text-secondary' : s.elevation_change < 0 ? 'text-destructive' : '')}>
                              {s.elevation_change != null ? `${s.elevation_change > 0 ? '+' : ''}${toDisplayElevation(s.elevation_change)}${elevationLabel}` : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cadence per interval chart */}
          {splitData.some(s => s.cadence) && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Cadence by Lap</p>
              <div className="bg-card border border-border/30 rounded-xl p-3 h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={splitData.map((s, i) => ({ lap: `${i+1}`, cadence: s.cadence || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="lap" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} spm`, 'Cadence']} />
                    <Bar dataKey="cadence" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Notes */}
          {(workout.notes || workout.feeling || workout.shoes) && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/30 space-y-1.5">
              {workout.feeling && <p className="text-xs text-muted-foreground capitalize"><span className="font-semibold">Feeling:</span> {workout.feeling}</p>}
              {workout.shoes && <p className="text-xs text-muted-foreground"><span className="font-semibold">Shoes:</span> {workout.shoes}</p>}
              {workout.notes && <p className="text-xs text-muted-foreground italic">"{workout.notes}"</p>}
            </div>
          )}

          {/* Coach/Athlete Messaging */}
          <WorkoutComments workoutId={workout.id} role={role === 'coach' ? 'coach' : 'athlete'} />
        </div>
      </DialogContent>
    </Dialog>
  );
}