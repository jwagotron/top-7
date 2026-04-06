import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Plus } from 'lucide-react';

export default function AssignmentSelector({ value, onChange }) {
  const { user } = useAuth();
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selected, setSelected] = useState(value.type === 'multiple' ? value.athletes : []);

  // Fetch active athletes linked to current coach (exclude self)
  const { data: relationships = [], refetch: refetchRelationships } = useQuery({
    queryKey: ['coach-athletes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.CoachAthleteRelationship.list();
      return all.filter(r => 
        r.coach_email === user.email && 
        r.status === 'active' &&
        r.athlete_email !== user.email  // Exclude self
      );
    },
    enabled: !!user?.email,
  });

  const athletes = relationships.map(r => ({ email: r.athlete_email, name: r.athlete_name }));

  const handleSelectChange = (v) => {
    if (v === 'all') {
      onChange({ type: 'all', athletes: [] });
      setSelected([]);
    } else if (v === 'multiple') {
      setShowMultiSelect(true);
    }
  };

  const handleMultiSelectChange = (email, checked) => {
    const newSelected = checked ? [...selected, email] : selected.filter(e => e !== email);
    setSelected(newSelected);
  };

  const handleMultiSelectSave = () => {
    onChange({ type: 'multiple', athletes: selected });
    setShowMultiSelect(false);
  };

  const handleInviteAthlete = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !user?.email) return;

    // Prevent self-invite
    if (email === user.email) {
      alert('You cannot invite yourself as an athlete.');
      return;
    }

    // Create pending invitation (not active relationship yet)
    await base44.entities.AthleteInvitation.create({
      coach_email: user.email,
      athlete_email: email,
      athlete_name: inviteName.trim() || email.split('@')[0],
      status: 'pending',
      invited_at: new Date().toISOString()
    });

    setInviteEmail('');
    setInviteName('');
    setShowInvite(false);
    refetchRelationships();
  };

  const getDisplayLabel = () => {
    if (value.type === 'all') return 'All Athletes';
    if (value.type === 'multiple') {
      return value.athletes.length === 1 ? '1 Athlete' : `${value.athletes.length} Athletes`;
    }
    return 'Assign To';
  };

  return (
    <>
      <Select value={value.type === 'multiple' ? 'multiple' : 'all'} onValueChange={handleSelectChange}>
        <SelectTrigger className="h-8 px-2 text-xs sm:text-sm border-0 bg-muted hover:bg-muted/80">
          <SelectValue placeholder="Assign" />
        </SelectTrigger>
        <SelectContent className="min-w-40">
          <SelectItem value="all">All Athletes</SelectItem>
          <SelectItem value="multiple">Select Athletes...</SelectItem>
        </SelectContent>
      </Select>

      {showMultiSelect && (
        <Dialog open onOpenChange={() => setShowMultiSelect(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign to Athletes</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {athletes.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">No athletes yet</p>
                  <p className="text-xs text-muted-foreground">Invite athletes to assign plans</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setShowMultiSelect(false); setShowInvite(true); }}
                    className="gap-1 mt-4"
                  >
                    <Plus className="w-4 h-4" /> Invite Athlete
                  </Button>
                </div>
              ) : (
                athletes.map(athlete => (
                  <div key={athlete.email} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.includes(athlete.email)}
                      onCheckedChange={(checked) => handleMultiSelectChange(athlete.email, checked)}
                      id={athlete.email}
                    />
                    <label htmlFor={athlete.email} className="text-sm cursor-pointer flex-1">
                      {athlete.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInvite(true)}
                className="gap-1"
              >
                <Plus className="w-4 h-4" /> Invite
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowMultiSelect(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleMultiSelectSave} disabled={selected.length === 0}>
                  Save ({selected.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showInvite && (
        <Dialog open onOpenChange={() => setShowInvite(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Invite Athlete</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="athlete@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Name (optional)</Label>
                <Input
                  placeholder="Athlete Name"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleInviteAthlete}
                disabled={!inviteEmail.trim()}
              >
                Add Athlete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}