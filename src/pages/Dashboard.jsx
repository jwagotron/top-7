import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import UpcomingWorkouts from '@/components/dashboard/UpcomingWorkouts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import RacePredictor from '@/components/predictor/RacePredictor';
import { Activity, MapPin, Clock, Flame } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { DEFAULT_ROUTE } from '@/lib/roleConfig';
import { useAssignedPlan } from '@/hooks/useAssignedPlan';
import { useCompletions } from '@/hooks/useCompletions';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';

export default function Dashboard() {
  const { role } = useRole();
  const navigate = useNavigate();
  const { athleteEmail, plannedWorkouts, activePlan, isLoading } = useAssignedPlan();
  const { completions } = useCompletions(athleteEmail);

  useEffect(() => {
    if (!role) return;
    if (role !== 'athlete') {
      navigate(DEFAULT_ROUTE[role] || '/coach', { replace: true });
    }
  }, [role, navigate]);

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', athleteEmail],
    queryFn: () => base44.entities.Workout.filter({ created_by: athleteEmail }, '-date', 100),
    enabled: !!athleteEmail,
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekWorkouts = workouts.filter(w => {
    const d = parseDateOnly(w.date);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const { toDisplay, label } = useUnits();
  const totalDistanceKm = thisWeekWorkouts.reduce((s, w) => s + (w.distance_km || 0), 0);
  const totalDistance = toDisplay(totalDistanceKm);
  const totalDuration = thisWeekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const totalCalories = thisWeekWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
  const totalWorkouts = thisWeekWorkouts.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="My Progress" />
        <div className="flex justify-center py-24">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="My Progress" />
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5 lg:space-y-7 pb-24 lg:pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard title="Workouts" value={totalWorkouts} icon={Activity} color="primary" />
          <StatCard title="Distance" value={totalDistance.toFixed(1)} unit={label} icon={MapPin} color="secondary" />
          <StatCard title="Time" value={totalDuration} unit="min" icon={Clock} color="accent" />
          <StatCard title="Calories" value={totalCalories} unit="kcal" icon={Flame} color="destructive" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 lg:gap-5">
          <WeeklyChart workouts={thisWeekWorkouts} />
          <UpcomingWorkouts plannedWorkouts={plannedWorkouts} completions={completions} />
        </div>

        <RecentActivity workouts={workouts} />

        <RacePredictor userEmail={athleteEmail} />
      </div>
    </div>
  );
}