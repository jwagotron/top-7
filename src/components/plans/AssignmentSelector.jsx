import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown } from 'lucide-react';

export default function AssignmentSelector({ value, onChange }) {
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [selected, setSelected] = useState(value.type === 'multiple' ? value.athletes : []);

  const { data: relationships = [] } = useQuery({
    queryKey: ['coach-athletes'],
    queryFn: () => base44.entities.CoachAthleteRelationship.list('athlete_name', 100),
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
        <SelectTrigger className="w-40 h-8 text-sm">
          <SelectValue placeholder="Assign To" />
        </SelectTrigger>
        <SelectContent>
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
                <p className="text-sm text-muted-foreground py-4">No athletes found</p>
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
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowMultiSelect(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleMultiSelectSave} disabled={selected.length === 0}>
                Save ({selected.length})
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}