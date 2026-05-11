import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, ReferenceLine
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, parseISO } from 'date-fns';
import { useUnits } from '@/hooks/useUnits';
import { useAuth } from '@/lib/AuthContext';
import { Heart, Wind, Moon, Brain, Zap, TrendingUp, Activity, Flame } from 'lucide-react';
import PersonalRecords from '@/components/analytics/PersonalRecords';
import { cn } from '@/lib/utils';

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
};

function MetricCard({ icon: Icon, label, value, unit, trend, color = 'text-primary', bg = 'bg-primary/10', sub }) {
  return (
    <Card className="rounded-2xl bg-muted/40 border border-border/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          {trend != null && (
            <span className={cn('text-xs font-semibold', trend > 0 ? 'text-secondary' : trend < 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
            </span>
          )}
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
  const { toDisplay, label, formatPace } = useUnits();
  const { user } = useAuth();

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts-analytics', user?.email],
    queryFn: () => base44.entities.Workout.filter({ created_by: user?.email }, '-date', 500),
    enabled: !!user?.email,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-analytics', user?.email],
    queryFn: () => base44.entities.Activity.filter({ user_email: user?.email }, '-started_at', 500),
    enabled: !!user?.email,
  });

  const cutoff = subDays(new Date(), Number(period));
  const filtered = workouts.filter(w => w.date && new Date(w.date) >= cutoff);
  const filteredActivities = activities.filter(a => a.started_at && new Date(a.started_at) >= cutoff);

  // Volume chart data — daily for 7d, weekly otherwise
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
          avgHR: ww.filter(w => w.avg_heart_rate).length > 0
            ? Math.round(ww.filter(w => w.avg_heart_rate).reduce((s, w) => s + w.avg_heart_rate, 0) / ww.filter(w => w.avg_heart_rate).length)
            : null,
          calories: ww.reduce((s, w) => s + (w.calories || 0), 0),
        };
      })
    : eachWeekOfInterval({ start: cutoff, end: new Date() }, { weekStartsOn: 1 }).map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const ww = filtered.filter(w => {
          const d = new Date(w.date);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          week: format(weekStart, 'MMM d'),
          distance: Number(toDisplay(ww.reduce((s, w) => s + (w.distance_km || 0), 0)).toFixed(1)),
          duration: Math.round(ww.reduce((s, w) => s + (w.duration_minutes || 0), 0)),
          count: ww.length,
          avgHR: ww.filter(w => w.avg_heart_rate).length > 0
            ? Math.round(ww.filter(w => w.avg_heart_rate).reduce((s, w) => s + w.avg_heart_rate, 0) / ww.filter(w => w.avg_heart_rate).length)
            : null,
        };
      });

  const weeklyData = volumeData;

  // HR trend
  const hrTrend = filtered
    .filter(w => w.avg_heart_rate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(w => ({
      date: format(new Date(w.date), 'MMM d'),
      avg: w.avg_heart_rate,
      max: w.max_heart_rate,
      resting: null,
    }));

  // Pace trend
  const paceTrend = filteredActivities
    .filter(a => a.avg_pace_sec_per_km)
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    .map(a => ({
      date: format(new Date(a.started_at), 'MMM d'),
      pace: a.avg_pace_sec_per_km,
      distance: a.distance_m ? toDisplay(a.distance_m / 1000).toFixed(1) : null,
    }));

  // Cadence trend
  const cadenceTrend = filteredActivities
    .filter(a => a.avg_cadence)
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    .map(a => ({
      date: format(new Date(a.started_at), 'MMM d'),
      cadence: a.avg_cadence,
    }));

  // Summary stats
  const totalDist = toDisplay(filtered.reduce((s, w) => s + (w.distance_km || 0), 0));
  const totalHrs = Math.round(filtered.reduce((s, w) => s + (w.duration_minutes || 0), 0) / 60 * 10) / 10;
  const avgHR = filtered.filter(w => w.avg_heart_rate).length > 0
    ? Math.round(filtered.filter(w => w.avg_heart_rate).reduce((s, w) => s + w.avg_heart_rate, 0) / filtered.filter(w => w.avg_heart_rate).length)
    : null;
  const avgCadence = filteredActivities.filter(a => a.avg_cadence).length > 0
    ? Math.round(filteredActivities.filter(a => a.avg_cadence).reduce((s, a) => s + a.avg_cadence, 0) / filteredActivities.filter(a => a.avg_cadence).length)
    : null;
  const totalCalories = Math.round(filtered.reduce((s, w) => s + (w.calories || 0), 0));
  const avgElevation = filteredActivities.filter(a => a.elevation_gain_m).length > 0
    ? Math.round(filteredActivities.filter(a => a.elevation_gain_m).reduce((s, a) => s + a.elevation_gain_m, 0) / filteredActivities.filter(a => a.elevation_gain_m).length)
    : null;

  // Best efforts
  const bestPace = filteredActivities.filter(a => a.avg_pace_sec_per_km).reduce((best, a) => {
    return (!best || a.avg_pace_sec_per_km < best) ? a.avg_pace_sec_per_km : best;
  }, null);
  const maxElevation = filteredActivities.filter(a => a.elevation_gain_m).reduce((max, a) =>
    a.elevation_gain_m > (max || 0) ? a.elevation_gain_m : max, null);
  const longestRun = filtered.filter(w => w.distance_km).reduce((max, w) =>
    w.distance_km > (max || 0) ? w.distance_km : max, null);

  return (
    <div>
      <TopBar title="Analytics" />

      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6 pb-24 lg:pb-8">

        {/* Period selector — prominent, full-width */}
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
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <TabsList className="h-9 mb-1 flex w-max min-w-full">
              <TabsTrigger value="performance" className="text-xs px-3 whitespace-nowrap">Performance</TabsTrigger>
              <TabsTrigger value="health" className="text-xs px-3 whitespace-nowrap">Health & Fitness</TabsTrigger>
              <TabsTrigger value="trends" className="text-xs px-3 whitespace-nowrap">Trends</TabsTrigger>
              <TabsTrigger value="records" className="text-xs px-3 whitespace-nowrap">🏆 Records</TabsTrigger>
            </TabsList>
          </div>

          {/* === PERFORMANCE TAB === */}
          <TabsContent value="performance" className="space-y-5 mt-0">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard icon={Activity} label="Workouts" value={filtered.length} color="text-primary" bg="bg-primary/10" />
              <MetricCard icon={TrendingUp} label="Distance" value={totalDist.toFixed(1)} unit={label} color="text-secondary" bg="bg-secondary/10" />
              <MetricCard icon={Zap} label="Total Hours" value={totalHrs} unit="hrs" color="text-accent" bg="bg-accent/10" />
              <MetricCard icon={Flame} label="Calories" value={totalCalories > 0 ? totalCalories.toLocaleString() : null} unit="kcal" color="text-destructive" bg="bg-destructive/10" />
            </div>

            {/* Best efforts */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard icon={Zap} label="Best Pace" value={bestPace ? formatPace(bestPace) : null} color="text-accent" bg="bg-accent/10" sub="Fastest avg pace" />
              <MetricCard icon={TrendingUp} label="Longest Run" value={longestRun ? toDisplay(longestRun).toFixed(2) : null} unit={label} color="text-primary" bg="bg-primary/10" sub="Single run distance" />
              <MetricCard icon={Activity} label="Max Elevation" value={maxElevation} unit="m" color="text-secondary" bg="bg-secondary/10" sub="Single run gain" />
            </div>

            {/* Weekly volume chart */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">{isDaily ? 'Daily Volume (Last 7 Days)' : 'Weekly Volume'}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyData}>
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

            {/* Pace trend */}
            {paceTrend.length > 1 && (
              <Card className="rounded-2xl bg-muted/40 border border-border/30">
                <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">Pace Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={paceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={40} reversed
                          tickFormatter={v => `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [`${Math.floor(v/60)}:${String(v%60).padStart(2,'0')} /km`, 'Avg Pace']} />
                        <Line type="monotone" dataKey="pace" name="Avg Pace" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Lower = faster pace</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === HEALTH & FITNESS TAB === */}
          <TabsContent value="health" className="space-y-5 mt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard icon={Heart} label="Avg Heart Rate" value={avgHR} unit="bpm" color="text-destructive" bg="bg-destructive/10" sub="All activities" />
              <MetricCard icon={Activity} label="Avg Cadence" value={avgCadence} unit="spm" color="text-chart-4" bg="bg-chart-4/10" sub="Steps per min" />
              <MetricCard icon={TrendingUp} label="Avg Elevation" value={avgElevation} unit="m" color="text-secondary" bg="bg-secondary/10" sub="Per run gain" />
              <MetricCard icon={Flame} label="Total Calories" value={totalCalories > 0 ? totalCalories.toLocaleString() : null} unit="kcal" color="text-accent" bg="bg-accent/10" />
            </div>

            {/* Garmin wellness note */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardContent className="p-5">
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">Garmin Health Metrics</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Advanced health metrics including <strong>HRV (Heart Rate Variability)</strong>, 
                      <strong> sleep score</strong>, <strong>VO₂ Max</strong>, <strong>training load</strong>, 
                      <strong> body battery</strong>, and <strong>stress score</strong> are sourced directly from 
                      Garmin Connect. These appear here automatically as your device syncs data after each activity and overnight.
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      Ensure your Garmin device is connected in Settings → Garmin Connect to unlock all metrics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HR zone chart */}
            {hrTrend.length > 1 && (
              <Card className="rounded-2xl bg-muted/40 border border-border/30">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-base font-bold">Heart Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hrTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={38} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="avg" name="Avg HR" stroke="hsl(var(--destructive))" strokeWidth={2.5} dot={false} />
                        {hrTrend.some(d => d.max) && (
                          <Line type="monotone" dataKey="max" name="Max HR" stroke="hsl(var(--chart-5))" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 justify-center mt-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-destructive inline-block rounded-full" /> Avg HR</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-chart-5 inline-block rounded-full" /> Max HR</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cadence chart */}
            {cadenceTrend.length > 1 && (
              <Card className="rounded-2xl bg-muted/40 border border-border/30">
                <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">Running Cadence</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cadenceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={38} domain={[150, 200]} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <ReferenceLine y={180} stroke="hsl(var(--secondary))" strokeDasharray="4 4" label={{ value: 'Optimal 180', fontSize: 9, fill: 'hsl(var(--secondary))' }} />
                        <Line type="monotone" dataKey="cadence" name="Cadence (spm)" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 text-center mt-1">180 spm is the widely recommended target for distance runners</p>
                </CardContent>
              </Card>
            )}

            {/* Garmin wellness metrics — computed from workout records */}
            {(() => {
              const latest = filtered.length > 0 ? [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
              const withHRV = filtered.filter(w => w.hrv_score);
              const withSleep = filtered.filter(w => w.sleep_score);
              const withLoad = filtered.filter(w => w.training_load);
              const withStress = filtered.filter(w => w.stress_score);
              const avgHRV = withHRV.length > 0 ? Math.round(withHRV.reduce((s, w) => s + w.hrv_score, 0) / withHRV.length) : null;
              const avgSleep = withSleep.length > 0 ? Math.round(withSleep.reduce((s, w) => s + w.sleep_score, 0) / withSleep.length) : null;
              const latestVO2 = latest?.vo2_max ?? null;
              const avgLoad = withLoad.length > 0 ? Math.round(withLoad.reduce((s, w) => s + w.training_load, 0) / withLoad.length) : null;
              const latestBattery = latest?.body_battery ?? null;
              const avgStress = withStress.length > 0 ? Math.round(withStress.reduce((s, w) => s + w.stress_score, 0) / withStress.length) : null;
              const metrics = [
                { icon: Brain, label: 'HRV Score', value: avgHRV, unit: 'ms', color: 'text-chart-4', bg: 'bg-chart-4/10', desc: 'Avg heart rate variability' },
                { icon: Moon, label: 'Sleep Score', value: avgSleep, unit: '/100', color: 'text-chart-4', bg: 'bg-chart-4/10', desc: 'Avg nightly sleep quality' },
                { icon: Wind, label: 'VO₂ Max', value: latestVO2, unit: 'mL/kg/min', color: 'text-primary', bg: 'bg-primary/10', desc: 'Aerobic fitness estimate' },
                { icon: Zap, label: 'Training Load', value: avgLoad, unit: 'TSS', color: 'text-accent', bg: 'bg-accent/10', desc: 'Avg training stress score' },
                { icon: Activity, label: 'Body Battery', value: latestBattery, unit: '/100', color: 'text-secondary', bg: 'bg-secondary/10', desc: 'Latest energy reserves' },
                { icon: Heart, label: 'Stress Score', value: avgStress, unit: '/100', color: 'text-destructive', bg: 'bg-destructive/10', desc: 'Avg daily stress level' },
              ];
              return (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.map(({ icon: Icon, label: lbl, value, unit, color, bg, desc }) => (
                    <Card key={lbl} className="rounded-2xl bg-muted/40 border border-border/30">
                      <CardContent className="p-4">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', bg)}>
                          <Icon className={cn('w-4 h-4', color)} />
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{lbl}</p>
                        {value != null ? (
                          <p className="text-xl font-bold mt-1">{value}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></p>
                        ) : (
                          <p className="text-xl font-bold mt-1 text-muted-foreground/30">—</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* === TRENDS TAB === */}
          <TabsContent value="trends" className="space-y-5 mt-0">
            {/* Weekly HR avg trend */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">{isDaily ? 'Daily Avg Heart Rate' : 'Weekly Avg Heart Rate'}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {weeklyData.some(d => d.avgHR) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={38} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="avgHR" name="Avg HR" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">No heart rate data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  return zones.map(({ label, range, color, textColor, emoji }) => {
                    const count = filtered.filter(w => w.perceived_effort >= range[0] && w.perceived_effort <= range[1]).length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-base w-6 text-center shrink-0">{emoji}</span>
                        <span className="text-xs font-medium w-20 shrink-0">{label}</span>
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
                  <p className="text-sm text-muted-foreground text-center py-4">No effort data logged yet</p>
                )}
              </CardContent>
            </Card>

            {/* Weekly duration */}
            <Card className="rounded-2xl bg-muted/40 border border-border/30">
              <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-base font-bold">{isDaily ? 'Daily Training Time' : 'Weekly Training Time'}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
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
            <PersonalRecords athleteEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}