import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import UpcomingWorkouts from '@/components/dashboard/UpcomingWorkouts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Activity, MapPin, Clock, Flame } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => base44.entities.Workout.list('-date', 100),
  });

  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('-scheduled_date', 50),
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  const thisWeekWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const totalDistance = thisWeekWorkouts.reduce((s, w) => s + (w.distance_km || 0), 0);
  const totalDuration = thisWeekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const totalCalories = thisWeekWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
  const totalWorkouts = thisWeekWorkouts.length;

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Workouts This Week" value={totalWorkouts} icon={Activity} color="primary" />
          <StatCard title="Distance This Week" value={totalDistance.toFixed(1)} unit="km" icon={MapPin} color="secondary" />
          <StatCard title="Active Time" value={totalDuration} unit="min" icon={Clock} color="accent" />
          <StatCard title="Calories Burned" value={totalCalories} unit="kcal" icon={Flame} color="destructive" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <WeeklyChart workouts={thisWeekWorkouts} />
          <UpcomingWorkouts plannedWorkouts={plannedWorkouts} />
        </div>

        <RecentActivity workouts={workouts} />
      </div>
    </div>
  );
}