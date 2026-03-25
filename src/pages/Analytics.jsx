import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { useUnits } from '@/hooks/useUnits';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Analytics() {
  const [period, setPeriod] = useState('30');

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => base44.entities.Workout.list('-date', 500),
  });

  const cutoff = subDays(new Date(), Number(period));
  const filtered = workouts.filter(w => new Date(w.date) >= cutoff);

  // Weekly volume data
  const weeks = eachWeekOfInterval({ start: cutoff, end: new Date() }, { weekStartsOn: 1 });
  const weeklyData = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekWorkouts = filtered.filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d <= weekEnd;
    });
    return {
      week: format(weekStart, 'MMM d'),
      distance: Number(weekWorkouts.reduce((s, w) => s + (w.distance_km || 0), 0).toFixed(1)),
      duration: weekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0),
      count: weekWorkouts.length,
    };
  });

  // Sport distribution
  const sportDist = {};
  filtered.forEach(w => { sportDist[w.sport] = (sportDist[w.sport] || 0) + 1; });
  const pieData = Object.entries(sportDist).map(([name, value]) => ({ name, value }));

  // Heart rate trend
  const hrData = filtered
    .filter(w => w.avg_heart_rate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(w => ({
      date: format(new Date(w.date), 'MMM d'),
      avg: w.avg_heart_rate,
      max: w.max_heart_rate,
    }));

  // Effort distribution
  const effortDist = Array.from({ length: 10 }, (_, i) => ({
    rpe: i + 1,
    count: filtered.filter(w => w.perceived_effort === i + 1).length,
  }));

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    fontSize: '12px',
  };

  return (
    <div>
      <TopBar title="Analytics">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </TopBar>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-2xl border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Workouts</p>
              <p className="text-2xl font-bold mt-1">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Distance</p>
              <p className="text-2xl font-bold mt-1">{filtered.reduce((s, w) => s + (w.distance_km || 0), 0).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span></p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-2xl font-bold mt-1">{Math.round(filtered.reduce((s, w) => s + (w.duration_minutes || 0), 0) / 60)} <span className="text-sm font-normal text-muted-foreground">hrs</span></p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg Heart Rate</p>
              <p className="text-2xl font-bold mt-1">{filtered.filter(w => w.avg_heart_rate).length > 0 ? Math.round(filtered.filter(w => w.avg_heart_rate).reduce((s, w) => s + w.avg_heart_rate, 0) / filtered.filter(w => w.avg_heart_rate).length) : '—'} <span className="text-sm font-normal text-muted-foreground">bpm</span></p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="rounded-2xl border">
            <CardHeader className="pb-2"><CardTitle className="text-base">Weekly Volume</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis axisLine={false} tickLine={false} className="text-xs" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="distance" name="Distance (km)" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border">
            <CardHeader className="pb-2"><CardTitle className="text-base">Sport Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center">
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border">
            <CardHeader className="pb-2"><CardTitle className="text-base">Heart Rate Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {hrData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-20">No heart rate data</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hrData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs" domain={['auto', 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="avg" name="Avg HR" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="max" name="Max HR" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border">
            <CardHeader className="pb-2"><CardTitle className="text-base">Effort Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={effortDist}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="rpe" axisLine={false} tickLine={false} className="text-xs" label={{ value: 'RPE', position: 'bottom', offset: 0, fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} className="text-xs" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Workouts" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}