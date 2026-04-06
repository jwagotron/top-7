import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import PlanForm from '@/components/plans/PlanForm';
import PlannedWorkoutForm from '@/components/plans/PlannedWorkoutForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronDown, ChevronUp, Calendar, Trash2, Pencil, Bike, Footprints, Waves, Dumbbell, CircleDot } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import { useAuth } from '@/lib/AuthContext';

const sportIcons = { run: Footprints, bike: Bike, swim: Waves, strength: Dumbbell, other: CircleDot, triathlon: Activity, general: CircleDot };
import { Activity } from 'lucide-react';

const statusColors = {
  active: "bg-secondary/10 text-secondary border-secondary/20",
  draft: "bg-muted text-muted-foreground border-border",
  paused: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-primary/10 text-primary border-primary/20",
};

export default function TrainingPlans() {
  const { toDisplay, label } = useUnits();
  const { role } = useRole();
  const { user } = useAuth();
  const canCreate = role === 'coach' || role === 'admin';
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [showWorkoutForm, setShowWorkoutForm] = useState(null);
  const qc = useQueryClient();

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.TrainingPlan.list('-created_date', 50),
  });

  // Athletes only see plans assigned to them
  const plans = canCreate
    ? allPlans
    : allPlans.filter(p => !p.assigned_to || p.assigned_to === user?.email);

  const { data: allPlannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts'],
    queryFn: () => base44.entities.PlannedWorkout.list('scheduled_date', 500),
  });

  const createPlanMut = useMutation({
    mutationFn: (d) => base44.entities.TrainingPlan.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); setShowPlanForm(false); },
  });
  const updatePlanMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingPlan.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); setEditingPlan(null); },
  });
  const deletePlanMut = useMutation({
    mutationFn: (id) => base44.entities.TrainingPlan.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
  const createWorkoutMut = useMutation({
    mutationFn: (d) => base44.entities.PlannedWorkout.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planned-workouts'] }); setShowWorkoutForm(null); },
  });
  const deleteWorkoutMut = useMutation({
    mutationFn: (id) => base44.entities.PlannedWorkout.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planned-workouts'] }),
  });

  return (
    <div>
      <TopBar title={canCreate ? "Training Plans" : "My Plans"}>
        {canCreate && (
          <Button onClick={() => setShowPlanForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Plan
          </Button>
        )}
      </TopBar>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5 pb-24 lg:pb-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {canCreate ? 'No training plans yet. Create your first one!' : 'No plans have been assigned to you yet.'}
            </p>
          </div>
        ) : plans.map(plan => {
          const isExpanded = expandedPlan === plan.id;
          const planWorkouts = allPlannedWorkouts.filter(w => w.plan_id === plan.id);
          return (
            <Card key={plan.id} className="rounded-2xl overflow-hidden bg-muted/30 border border-border/30 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="cursor-pointer p-4 lg:p-6" onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base font-bold tracking-tight">{plan.name}</CardTitle>
                      <Badge variant="outline" className={cn("text-[10px] capitalize", statusColors[plan.status])}>
                        {plan.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{plan.sport}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{planWorkouts.length}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>}
                {(plan.duration_weeks || plan.goal_event || plan.difficulty) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border/20 text-[11px] text-muted-foreground/50 font-medium tracking-wide">
                    {plan.duration_weeks && <span><span className="uppercase">Weeks</span> · {plan.duration_weeks}</span>}
                    {plan.goal_event && <span><span className="uppercase">Goal</span> · {plan.goal_event}</span>}
                    {plan.difficulty && <span><span className="uppercase">Level</span> · <span className="capitalize">{plan.difficulty}</span></span>}
                  </div>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0 space-y-3 px-4 lg:px-6 pb-5">
                  {canCreate && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowWorkoutForm(plan.id); }} className="gap-1">
                        <Plus className="w-3 h-3" /> Add Workout
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }} className="gap-1">
                        <Pencil className="w-3 h-3" /> Edit Plan
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); deletePlanMut.mutate(plan.id); }} className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  )}
                  {planWorkouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No workouts scheduled for this plan</p>
                  ) : planWorkouts.map(w => (
                    <div key={w.id} className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/30 group">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{w.title}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{w.intensity?.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className={cn("text-[10px]", w.status === 'completed' ? 'bg-secondary/10 text-secondary' : w.status === 'skipped' ? 'bg-destructive/10 text-destructive' : '')}>
                            {w.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(w.scheduled_date), 'EEE, MMM d')}
                          {w.target_distance_km ? ` · ${toDisplay(w.target_distance_km)} ${label}` : ''}
                          {w.target_duration_minutes ? ` · ${w.target_duration_minutes} min` : ''}
                        </p>
                      </div>
                      {canCreate && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteWorkoutMut.mutate(w.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {canCreate && (
        <>
          <PlanForm open={showPlanForm} onClose={() => setShowPlanForm(false)} onSubmit={(d) => createPlanMut.mutate(d)} />
          {editingPlan && (
            <PlanForm open={!!editingPlan} onClose={() => setEditingPlan(null)} onSubmit={(d) => updatePlanMut.mutate({ id: editingPlan.id, data: d })} plan={editingPlan} />
          )}
          {showWorkoutForm && (
            <PlannedWorkoutForm open={!!showWorkoutForm} onClose={() => setShowWorkoutForm(null)} onSubmit={(d) => createWorkoutMut.mutate(d)} planId={showWorkoutForm} />
          )}
        </>
      )}
    </div>
  );
}