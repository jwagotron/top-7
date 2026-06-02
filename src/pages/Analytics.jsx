import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, Line
} from 'recharts';
import { format, subDays, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { useUnits } from '@/hooks/useUnits';
import { useAuth } from '@/lib/AuthContext';
import { Zap, TrendingUp, Activity, Flame, Flag } from 'lucide-react';
import PersonalRecords from '@/components/analytics/PersonalRecords';
import RacePredictor from '@/components/predictor/RacePredictor';
import { cn } from '@/lib/utils';

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
};

function MetricCard({ icon: Icon, label, value, unit, color = 'text-primary', bg = 'bg-primary/10', sub }) {
  return (
    <Card className="rounded-2xl bg-muted/40 border border-border/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1 leading-none">{value ?? '—'}
          {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState('30');
  const { toDisplay, label } = useUnits();
  const { user } = useAuth();

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts-analytics', user?.email],
    queryFn: () => base44.entities.Workout.filter({ created_by: user?.email }, '-date', 500),
    enabled: !!user?.email,
  });

  const cutoff = subDays(new Date(), Number(period));
  const filtered = workouts.filter(w => w.date && parseDateOnly(w.date) >= cutoff);

  const isDaily = period === '7';

  const volumeData = isDaily
    ? Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const ww = filtered.filter(w => w.date && w.date.slice(0, 10) === dayStr);
        return {
          week: format(day, 'EEE'),
          distance: Number(toDisplay(ww.reduce((s, w) => s + (w.distance_km || 0), 0)).toFixed(1)),
          duration: Math.round(ww.reduce((s, w) => s + (w.duration_minutes || 0), 0)),
          count: ww.length,
        };
      })
    : eachWeekOfInterval({ start: cutoff, end: new Date() }, { weekStartsOn: 1 }).map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const ww = filtered.filter(w => {
          const d = parseDateOnly(w.date);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          week: format(weekStart, 'MMM d'),
          distance: Number(toDisplay(ww.reduce((s, w) => s + (w.distance_km || 0), 0)).toFixed(1)),
          duration: Math.round(ww.reduce((s, w) => s + (w.duration_minutes || 0), 0)),
          count: ww.length,
        };
      });

  const totalDist = toDisplay(filtered.reduce((s, w) => s + (w.distance_km || 0), 0));
  const totalHrs = Math.round(filtered.reduce((s, w) => s + (w.duration_minutes || 0), 0) / 60 * 10) / 10;
  const totalCalories = Math.round(filtered.reduce((s, w) => s + (w.calories || 0), 0));
  const longestRun = filtered.filter(w => w.distance_km).reduce((max, w) =>
    w.distance_km > (max || 0) ? w.distance_km : max, null);

  return (
    <div>
      <TopBar title="Analytics" />

      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6 pb-24 lg:pb-8">

        {/* Period selector */}
        <div className="flex items-center justify-between gap-3 bg-muted/40 border border-border/30 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Time Period</p>
            <p className="text-xs text-muted-foreground">All charts and stats below reflect this window</p>
          </div>
          <div className="flex items-center gap-2">
            {['7', '30', '90', '365'].map(v => (
              <button
                key={v}
                onClick={() => setPeriod(v)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  period === v
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                )}
              >
                {v === '365' ? '1 yr' : `${v}d`}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="performance">
          <div className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-x-auto mb-1">
            <TabsList className="flex w-max h-9">
              <TabsTrigger value="performance" className="text-xs px-4 whitespace-nowrap"><Zap className="w-3 h-3 mr-1" />Performance</TabsTrigger>
              <TabsTrigger value="trends" className="text-xs px-4 whitespace-nowrap"><TrendingUp className="w-3 h-3 mr-1" />Trends</TabsTrigger>
              <TabsTrigger value="records" className="text-xs px-4 whitespace-nowrap"><Activity className="w-3 h-3 mr-1" />Records</TabsTrigger>
              <TabsTrigger value="predictor" className="text-xs px-4 whitespace-nowrap"><Flag className="w-3 h-3 mr-1" />Race Predictor</TabsTrigger>
            </TabsList>
          </div>

          {/* === PERFORMANCE TAB === */}
          <TabsContent value="performance" className="space-y-5 mt-0">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard icon={Activity} label="Workouts" value={filtered.length} color="text-primary" bg="bg-primary/10" />
              <MetricCard icon={TrendingUp} label="Distance" value={totalDist.toFixed(1)} unit={label} color="text-secondary" bg="bg-secondary/10" />
              <MetricCard icon={Zap} label="Total Hours" value={totalHrs} unit="hrs" color="text-accent" bg="bg-accent/10" />
              <MetricCard icon={Flame} label="Calories" value={totalCalories > 0 ? totalCalories.toLocaleString() : null} unit="kcal" color="text-destructive" bg="bg-destructive/10" sub="Manually logged" />
            </div>

            {/* Best effort */}
            {longestRun && (
              <div className="grid grid-cols-1 gap-3">
                <MetricCard icon={TrendingUp} label="Longest Run" value={toDisplay(longestRun).toFixed(2)} unit={label} color="text-primary" bg="bg-primary/10" sub="Single run distance" />
              </div>
            )}

            {/* Weekly volume chart */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">{isDaily ? 'Daily Volume (Last 7 Days)' : 'Weekly Volume'}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis yAxisId="dist" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                      <YAxis yAxisId="count" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={22} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar yAxisId="dist" dataKey="distance" name={`Distance (${label})`} fill="hsl(var(--primary))" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="count" type="monotone" dataKey="count" name="Workouts" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TRENDS TAB === */}
          <TabsContent value="trends" className="space-y-5 mt-0">
            {/* Effort distribution */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-bold">How Hard Were Your Workouts?</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Based on Perceived Effort (RPE) — how hard each workout felt on a scale of 1–10</p>
              </CardHeader>
              <CardContent className="space-y-2 pb-5">
                {(() => {
                  const zones = [
                    { label: 'Very Easy', range: [1, 2], color: 'bg-secondary', textColor: 'text-secondary', emoji: '😴' },
                    { label: 'Easy', range: [3, 4], color: 'bg-primary', textColor: 'text-primary', emoji: '🚶' },
                    { label: 'Moderate', range: [5, 6], color: 'bg-accent', textColor: 'text-accent', emoji: '🏃' },
                    { label: 'Hard', range: [7, 8], color: 'bg-orange-500', textColor: 'text-orange-500', emoji: '💪' },
                    { label: 'Maximum', range: [9, 10], color: 'bg-destructive', textColor: 'text-destructive', emoji: '🔥' },
                  ];
                  const total = filtered.filter(w => w.perceived_effort).length;
                  return zones.map(({ label: zoneLabel, range, color, textColor, emoji }) => {
                    const count = filtered.filter(w => w.perceived_effort >= range[0] && w.perceived_effort <= range[1]).length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={zoneLabel} className="flex items-center gap-3">
                        <span className="text-base w-6 text-center shrink-0">{emoji}</span>
                        <span className="text-xs font-medium w-20 shrink-0">{zoneLabel}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div className={cn('h-2 rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={cn('text-xs font-bold w-10 text-right shrink-0', count > 0 ? textColor : 'text-muted-foreground/40')}>
                          {count > 0 ? `${count}` : '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 w-8 text-right shrink-0">{count > 0 ? `${pct}%` : ''}</span>
                      </div>
                    );
                  });
                })()}
                {filtered.filter(w => w.perceived_effort).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No effort data logged yet. Log RPE when completing workouts.</p>
                )}
              </CardContent>
            </Card>

            {/* Weekly duration */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">{isDaily ? 'Daily Training Time' : 'Weekly Training Time'}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={35} tickFormatter={v => `${v}m`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} min`, 'Duration']} />
                      <Bar dataKey="duration" name="Duration (min)" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === RECORDS TAB === */}
          <TabsContent value="records" className="space-y-5 mt-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div>
                <h2 className="text-base font-bold mb-3">Personal Records</h2>
                <PersonalRecords athleteEmail={user?.email} />
              </div>
            </div>
          </TabsContent>

          {/* === RACE PREDICTOR TAB === */}
          <TabsContent value="predictor" className="space-y-5 mt-0">
            <RacePredictor userEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}