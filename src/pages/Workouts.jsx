import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import WorkoutForm from '@/components/workouts/WorkoutForm';
import WorkoutCard from '@/components/workouts/WorkoutCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter } from 'lucide-react';

export default function Workouts() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sportFilter, setSportFilter] = useState('all');
  const qc = useQueryClient();

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => base44.entities.Workout.list('-date', 200),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Workout.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Workout.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Workout.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });

  const filtered = sportFilter === 'all' ? workouts : workouts.filter(w => w.sport === sportFilter);

  return (
    <div>
      <TopBar title="Workouts">
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Log Workout
        </Button>
      </TopBar>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="run">Run</SelectItem>
              <SelectItem value="bike">Bike</SelectItem>
              <SelectItem value="swim">Swim</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} workouts</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No workouts yet. Log your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(w => (
              <WorkoutCard
                key={w.id}
                workout={w}
                onEdit={(w) => setEditing(w)}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      <WorkoutForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => createMut.mutate(data)}
      />
      {editing && (
        <WorkoutForm
          open={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          workout={editing}
        />
      )}
    </div>
  );
}