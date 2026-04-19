import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const GROUP_COLORS = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  { value: 'green', label: 'Green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  { value: 'red', label: 'Red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
];

export function getGroupColorClasses(color) {
  return GROUP_COLORS.find(c => c.value === color) || GROUP_COLORS[0];
}

function GroupForm({ group, athletes, onSave, onClose }) {
  const [name, setName] = useState(group?.name || '');
  const [color, setColor] = useState(group?.color || 'blue');
  const [selectedEmails, setSelectedEmails] = useState(group?.athlete_emails || []);

  const toggle = (email) => {
    setSelectedEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label>Group Name <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sprinters, Distance, Beginners" />
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {GROUP_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                c.bg,
                color === c.value ? 'border-foreground scale-110' : 'border-transparent'
              )}
            >
              {color === c.value && <Check className={cn('w-3.5 h-3.5', c.text)} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Athletes in this group</Label>
        {athletes.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-1">No active athletes on the team yet.</p>
        ) : (
          <div className="space-y-1.5 mt-1.5 max-h-52 overflow-y-auto">
            {athletes.map(a => {
              const sel = selectedEmails.includes(a.athlete_email);
              return (
                <button
                  key={a.athlete_email}
                  type="button"
                  onClick={() => toggle(a.athlete_email)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                    sel ? 'bg-primary/5 border-primary/30' : 'bg-muted/20 border-transparent hover:bg-muted/50'
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', sel ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                    {(a.athlete_name || a.athlete_email)[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-medium flex-1 truncate">{a.athlete_name || a.athlete_email}</p>
                  <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', sel ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                    {sel && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ name, color, athlete_emails: selectedEmails })} disabled={!name.trim()}>
          {group ? 'Update Group' : 'Create Group'}
        </Button>
      </div>
    </div>
  );
}

export default function AthleteGroupManager({ teamId, coachEmail, members = [] }) {
  const qc = useQueryClient();
  const [editingGroup, setEditingGroup] = useState(null); // null=closed, {}=new, {...}=existing
  const activeMembers = members.filter(m => m.status === 'active');

  const { data: groups = [] } = useQuery({
    queryKey: ['athlete-groups', teamId],
    queryFn: () => base44.entities.AthleteGroup.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const saveMut = useMutation({
    mutationFn: (data) => editingGroup?.id
      ? base44.entities.AthleteGroup.update(editingGroup.id, data)
      : base44.entities.AthleteGroup.create({ ...data, team_id: teamId, coach_email: coachEmail }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['athlete-groups', teamId] });
      setEditingGroup(null);
      toast.success(editingGroup?.id ? 'Group updated' : 'Group created');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.AthleteGroup.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['athlete-groups', teamId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Athlete Groups ({groups.length})</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditingGroup({})}>
          <Plus className="w-3 h-3" /> New Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
          No groups yet. Create a group to assign workouts to multiple athletes at once.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const cc = getGroupColorClasses(g.color);
            const athleteCount = (g.athlete_emails || []).length;
            return (
              <div key={g.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={cn('text-xs shrink-0', cc.bg, cc.text, cc.border, 'border')}>
                    {g.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{athleteCount} athlete{athleteCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingGroup(g)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(g.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup?.id ? 'Edit Group' : 'New Group'}</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <GroupForm
              group={editingGroup?.id ? editingGroup : null}
              athletes={activeMembers}
              onSave={(data) => saveMut.mutate(data)}
              onClose={() => setEditingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}