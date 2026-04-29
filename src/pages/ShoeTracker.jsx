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

function ShoeForm({ shoe, onSubmit, onClose, units }) {
  const defaultMaxDisplay = units === 'mi' ? Math.round(DEFAULT_MAX_KM * KM_TO_MI) : DEFAULT_MAX_KM;
  const toDisplay = km => units === 'mi' ? Math.round(km * KM_TO_MI * 10) / 10 : km;
  const toKm = val => units === 'mi' ? Math.round(val / KM_TO_MI * 10) / 10 : val;

  const [form, setForm] = useState(() => {
    if (shoe) return { ...shoe, _display_mileage: toDisplay(shoe.mileage_km || 0), _display_max: toDisplay(shoe.max_mileage_km || DEFAULT_MAX_KM) };
    return { name: '', brand: '', color: '', _display_mileage: 0, _display_max: defaultMaxDisplay, start_date: new Date().toISOString().slice(0, 10), notes: '' };
  });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = () => {
    const { _display_mileage, _display_max, ...rest } = form;
    onSubmit({ ...rest, mileage_km: toKm(Number(_display_mileage)), max_mileage_km: toKm(Number(_display_max)) });
  };

  const unitLabel = units === 'mi' ? 'mi' : 'km';

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
              <Label>Max {unitLabel} (before retire)</Label>
              <Input type="number" value={form._display_max} onChange={e => set('_display_max', e.target.value)} />
            </div>
            {shoe && (
              <div className="col-span-2">
                <Label>Current Mileage ({unitLabel})</Label>
                <Input type="number" step="0.1" value={form._display_mileage} onChange={e => set('_display_mileage', e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Race-day only, etc." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>
              {shoe ? 'Save Changes' : 'Add Shoes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMileageDialog({ shoe, onClose, onAdd, units }) {
  const [val, setVal] = useState('');
  const unitLabel = units === 'mi' ? 'mi' : 'km';
  const handleAdd = () => {
    const km = units === 'mi' ? Number(val) / KM_TO_MI : Number(val);
    onAdd(km);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Log {unitLabel} on {shoe.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Distance ({unitLabel})</Label>
            <Input type="number" step="0.1" value={val} onChange={e => setVal(e.target.value)} placeholder="6.5" autoFocus />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!val || Number(val) <= 0}>Add {unitLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ShoeTracker() {
  const qc = useQueryClient();
  const { units, toDisplay, label } = useUnits();
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
      data: { mileage_km: 0, start_date: new Date().toISOString().slice(0, 10) },
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
      <TopBar title="My Shoes">
        <Button variant="outline" size="sm" onClick={() => setShowRetired(v => !v)} className="text-xs h-8 px-2 lg:px-3">
          {showRetired ? 'Hide' : 'Retired'}
        </Button>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1 h-8 px-2 lg:px-4">
          <Plus className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Add</span>
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4 pb-24 lg:pb-6">
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
          const remainingKm = shoe.max_mileage_km ? Math.max(0, shoe.max_mileage_km - (shoe.mileage_km || 0)) : null;
          const remaining = remainingKm !== null ? toDisplay(remainingKm) : null;
          const displayMileage = toDisplay(shoe.mileage_km || 0);
          const displayMax = toDisplay(shoe.max_mileage_km || 0);
          const isWarning = pct >= 80 && pct < 100;
          const isOver = pct >= 100;
          const isRetired = shoe.status === 'retired';

          return (
            <Card key={shoe.id} className={`transition-all ${isRetired ? 'opacity-60' : 'hover:shadow-md'}`}>
              <CardContent className="p-4 lg:p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl shrink-0 mt-0.5">👟</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="font-semibold leading-tight">{shoe.name}</h3>
                      {shoe.brand && <span className="text-sm text-muted-foreground">{shoe.brand}</span>}
                      {shoe.color && <Badge variant="outline" className="text-xs">{shoe.color}</Badge>}
                      {isRetired && <Badge className="bg-muted text-muted-foreground text-xs">Retired</Badge>}
                      {isOver && !isRetired && <Badge className="bg-destructive/10 text-destructive text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Replace</Badge>}
                      {isWarning && !isRetired && <Badge className="bg-accent/10 text-accent text-xs">Almost Done</Badge>}
                    </div>
                    {shoe.start_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">Since {format(new Date(shoe.start_date), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {!isRetired && (
                    <Button size="sm" variant="outline" onClick={() => setAddMileage(shoe)} className="text-xs h-7 px-2">+ {label}</Button>
                  )}
                  {!isRetired && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(shoe)}><Pencil className="w-3.5 h-3.5" /></Button>
                  )}
                  {!isRetired && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Reset mileage" onClick={() => setConfirmReset(shoe)}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title={isRetired ? 'Re-activate' : 'Retire'} onClick={() => handleRetire(shoe)}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(shoe.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-medium">{displayMileage.toLocaleString()} {label}</span>
                    {remaining !== null && (
                      <span className={`text-xs ${isOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {isOver ? `${Math.abs(remaining)} ${label} over` : `${remaining} ${label} left`}
                      </span>
                    )}
                  </div>
                  <Progress
                    value={pct}
                    className={`h-3 ${isOver ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-accent' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {shoe.max_mileage_km ? `Retire at ${displayMax} ${label} · ${Math.round(pct)}% used` : 'No max mileage set'}
                  </p>
                </div>

                {shoe.notes && <p className="text-xs text-muted-foreground mt-3 italic">{shoe.notes}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {confirmReset && (
        <Dialog open onOpenChange={() => setConfirmReset(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Reset Mileage?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will reset <strong>{confirmReset.name}</strong>'s mileage to 0 and update the start date to today.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setConfirmReset(null)}>Cancel</Button>
              <Button onClick={() => handleReset(confirmReset)} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Reset to 0
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showForm && <ShoeForm units={units} onSubmit={d => createMut.mutate(d)} onClose={() => setShowForm(false)} />}
      {editing && <ShoeForm units={units} shoe={editing} onSubmit={d => updateMut.mutate({ id: editing.id, data: d })} onClose={() => setEditing(null)} />}
      {addMileage && <AddMileageDialog units={units} shoe={addMileage} onClose={() => setAddMileage(null)} onAdd={km => handleAddMileage(addMileage, km)} />}
    </div>
  );
}