import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RotateCcw, Pencil, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useUnits } from '@/hooks/useUnits';

const DEFAULT_MAX_KM = 700;
const KM_TO_MI = 0.621371;

function ShoeForm({ shoe, onSubmit, onClose }) {
  const [form, setForm] = useState(shoe || {
    name: '', brand: '', color: '', mileage_km: 0, max_mileage_km: DEFAULT_MAX,
    start_date: new Date().toISOString().slice(0, 10), notes: '',
  });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{shoe ? 'Edit Shoe' : 'Add New Shoes'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Model Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Alphafly 3" />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Nike" />
            </div>
            <div>
              <Label>Color</Label>
              <Input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Black / Gold" />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Max km (before retire)</Label>
              <Input type="number" value={form.max_mileage_km} onChange={e => set('max_mileage_km', Number(e.target.value))} placeholder="700" />
            </div>
            {shoe && (
              <div className="col-span-2">
                <Label>Current Mileage (km)</Label>
                <Input type="number" step="0.1" value={form.mileage_km} onChange={e => set('mileage_km', Number(e.target.value))} />
              </div>
            )}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Race-day only, etc." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSubmit(form)} disabled={!form.name}>
              {shoe ? 'Save Changes' : 'Add Shoes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMileageDialog({ shoe, onClose, onAdd }) {
  const [km, setKm] = useState('');
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Log km on {shoe.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Distance (km)</Label>
            <Input type="number" step="0.1" value={km} onChange={e => setKm(e.target.value)} placeholder="10.5" autoFocus />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onAdd(Number(km))} disabled={!km || Number(km) <= 0}>Add km</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ShoeTracker() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addMileage, setAddMileage] = useState(null);
  const [confirmReset, setConfirmReset] = useState(null);
  const [showRetired, setShowRetired] = useState(false);

  const { data: shoes = [], isLoading } = useQuery({
    queryKey: ['shoes'],
    queryFn: () => base44.entities.Shoe.list('-created_date', 100),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Shoe.create({ ...d, status: 'active' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shoes'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shoe.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shoes'] }); setEditing(null); setAddMileage(null); },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Shoe.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shoes'] }),
  });

  const handleAddMileage = (shoe, km) => {
    updateMut.mutate({ id: shoe.id, data: { mileage_km: (shoe.mileage_km || 0) + km } });
  };

  const handleReset = (shoe) => {
    updateMut.mutate({
      id: shoe.id,
      data: {
        mileage_km: 0,
        start_date: new Date().toISOString().slice(0, 10),
      },
    });
    setConfirmReset(null);
  };

  const handleRetire = (shoe) => {
    updateMut.mutate({ id: shoe.id, data: { status: shoe.status === 'retired' ? 'active' : 'retired' } });
  };

  const active = shoes.filter(s => s.status !== 'retired');
  const retired = shoes.filter(s => s.status === 'retired');
  const displayed = showRetired ? shoes : active;

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Shoe Mileage Tracker">
        <Button variant="outline" size="sm" onClick={() => setShowRetired(v => !v)}>
          {showRetired ? 'Hide Retired' : `Show Retired (${retired.length})`}
        </Button>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Shoes
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && displayed.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <span className="text-5xl">👟</span>
            <p className="mt-4 text-muted-foreground">No shoes yet. Add your first pair!</p>
          </div>
        )}

        {displayed.map(shoe => {
          const pct = shoe.max_mileage_km ? Math.min(100, ((shoe.mileage_km || 0) / shoe.max_mileage_km) * 100) : 0;
          const remaining = shoe.max_mileage_km ? Math.max(0, shoe.max_mileage_km - (shoe.mileage_km || 0)) : null;
          const isWarning = pct >= 80 && pct < 100;
          const isOver = pct >= 100;
          const isRetired = shoe.status === 'retired';

          return (
            <Card key={shoe.id} className={`transition-all ${isRetired ? 'opacity-60' : 'hover:shadow-md'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">👟</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{shoe.name}</h3>
                        {shoe.brand && <span className="text-sm text-muted-foreground">{shoe.brand}</span>}
                        {shoe.color && <Badge variant="outline" className="text-xs">{shoe.color}</Badge>}
                        {isRetired && <Badge className="bg-muted text-muted-foreground text-xs">Retired</Badge>}
                        {isOver && !isRetired && <Badge className="bg-destructive/10 text-destructive text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Replace Soon</Badge>}
                        {isWarning && !isRetired && <Badge className="bg-accent/10 text-accent text-xs">Almost Done</Badge>}
                      </div>
                      {shoe.start_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">In service since {format(new Date(shoe.start_date), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {!isRetired && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setAddMileage(shoe)}>+ km</Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(shoe)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Reset mileage (new shoes)" onClick={() => setConfirmReset(shoe)}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" title={isRetired ? 'Re-activate' : 'Retire'} onClick={() => handleRetire(shoe)}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate(shoe.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{(shoe.mileage_km || 0).toLocaleString()} km logged</span>
                    {remaining !== null && (
                      <span className={`text-xs ${isOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {isOver ? `${Math.abs(remaining)} km over limit` : `${remaining} km remaining`}
                      </span>
                    )}
                  </div>
                  <Progress
                    value={pct}
                    className={`h-3 ${isOver ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-accent' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {shoe.max_mileage_km ? `Retire at ${shoe.max_mileage_km} km · ${Math.round(pct)}% used` : 'No max mileage set'}
                  </p>
                </div>

                {shoe.notes && <p className="text-xs text-muted-foreground mt-3 italic">{shoe.notes}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirm Reset Dialog */}
      {confirmReset && (
        <Dialog open onOpenChange={() => setConfirmReset(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Reset Mileage?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will reset <strong>{confirmReset.name}</strong>'s mileage to 0 km and update the start date to today. Use this when you get a new pair of the same model.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setConfirmReset(null)}>Cancel</Button>
              <Button onClick={() => handleReset(confirmReset)} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Reset to 0 km
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showForm && <ShoeForm onSubmit={d => createMut.mutate(d)} onClose={() => setShowForm(false)} />}
      {editing && <ShoeForm shoe={editing} onSubmit={d => updateMut.mutate({ id: editing.id, data: d })} onClose={() => setEditing(null)} />}
      {addMileage && <AddMileageDialog shoe={addMileage} onClose={() => setAddMileage(null)} onAdd={km => handleAddMileage(addMileage, km)} />}
    </div>
  );
}