import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnits } from '@/hooks/useUnits';

export default function WeeklyChart({ workouts }) {
  const { toDisplay, label } = useUnits();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const data = days.map((day, i) => {
    const dayWorkouts = workouts.filter(w => {
      const d = new Date(w.date);
      return d.getDay() === (i + 1) % 7;
    });
    return {
      day,
      duration: dayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0),
      distance: toDisplay(dayWorkouts.reduce((sum, w) => sum + (w.distance_km || 0), 0)),
    };
  });

  return (
    <Card className="rounded-2xl bg-muted/40 border border-border/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold tracking-tight">Weekly Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={30} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="duration" name="Minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="distance" name={`Distance (${label})`} fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}