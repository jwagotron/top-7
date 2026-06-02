import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trophy, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const DISTANCES = [
  { key: '400m',          label: '400m' },
  { key: '800m',          label: '800m' },
  { key: '1600m',         label: '1,600m' },
  { key: '1mile',         label: '1 Mile' },
  { key: '3200m',         label: '3,200m / 2 Mile' },
  { key: '5k',            label: '5K' },
  { key: '10k',           label: '10K' },
  { key: 'half_marathon', label: 'Half Marathon' },
  { key: 'marathon',      label: 'Marathon' },
];

// Format seconds → H:MM:SS or M:SS
export function formatTime(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Parse "H:MM:SS" or "M:SS" → seconds
function parseTime(str) {
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function PRDialog({ record, distanceKey, athleteEmail, onClose }) {
  const qc = useQueryClient();
  const isNew = !record?.id;

  const [selectedKey, setSelectedKey] = useState(distanceKey || DISTANCES[0].key);
  const [timeStr, setTimeStr]         = useState(record?.time_seconds ? formatTime(record.time_seconds) : '');
  const [dateStr, setDateStr]         = useState(record?.date_set || new Date().toISOString().slice(0, 10));
  const [location, setLocation]       = useState(record?.notes || '');
  const [error, setError]             = useState('');

  const distLabel = DISTANCES.find(d => d.key === selectedKey)?.label ?? selectedKey;

  const saveMut = useMutation({
    mutationFn: (data) =>
      record?.id
        ? base44.entities.PersonalRecord.update(record.id, data)
        : base44.entities.PersonalRecord.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-records', athleteEmail] });
      onClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => base44.entities.PersonalRecord.delete(record.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-records', athleteEmail] });
      onClose();
    },
  });

  const handleSave = () => {
    const sec = parseTime(timeStr);
    if (!sec) { setError('Enter time as M:SS or H:MM:SS  (e.g. 22:30 or 1:45:00)'); return; }
    saveMut.mutate({
      athlete_email: athleteEmail,
      distance_key: selectedKey,
      time_seconds: sec,
      date_set: dateStr,
      notes: location,
      source: 'manual',
      is_override: true,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Record' : `Edit PR — ${distLabel}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Distance — only shown when adding new */}
          {isNew && (
            <div>
              <Label>Event / Distance</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCES.map(d => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Time (M:SS or H:MM:SS)</Label>
            <Input
              value={timeStr}
              onChange={e => { setTimeStr(e.target.value); setError(''); }}
              placeholder="22:30"
              autoFocus={!isNew}
              className="mt-1"
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>

          <div>
            <Label>Date Achieved</Label>
            <Input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Meet / Location / Notes <span className="text-muted-foreground/50">(optional)</span></Label>
            <Textarea
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. State Championships, Central Park 5K…"
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {!isNew && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMut.isPending}>
                {isNew ? 'Add Record' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PersonalRecords({ athleteEmail }) {
  const [dialog, setDialog] = useState(null); // null | { distanceKey, record? }

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['personal-records', athleteEmail],
    queryFn: () => base44.entities.PersonalRecord.filter({ athlete_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  const recordMap = Object.fromEntries(records.map(r => [r.distance_key, r]));

  // Only show distances that have a record, plus all standard distances (blank = never set)
  const allKeys = DISTANCES.map(d => d.key);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" /> Personal Records
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manually track your best times by event.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ distanceKey: null, record: null })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
        </Button>
      </div>

      {/* Records grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allKeys.map(key => {
            const rec = recordMap[key];
            const distLabel = DISTANCES.find(d => d.key === key)?.label ?? key;
            return (
              <Card
                key={key}
                className={cn(
                  'rounded-2xl border transition-all',
                  rec
                    ? 'bg-card border-border/50 shadow-sm'
                    : 'bg-muted/20 border-dashed border-border/30'
                )}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    rec ? 'bg-accent/10' : 'bg-muted'
                  )}>
                    <Trophy className={cn('w-4 h-4', rec ? 'text-accent' : 'text-muted-foreground/30')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{distLabel}</p>
                      {rec && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">Manual</Badge>
                      )}
                    </div>
                    <p className={cn('text-xl font-bold leading-tight mt-0.5', !rec && 'text-muted-foreground/25')}>
                      {rec ? formatTime(rec.time_seconds) : '—'}
                    </p>
                    {rec?.date_set && (
                      <p className="text-[10px] text-muted-foreground/50 truncate">
                        {format(new Date(rec.date_set), 'MMM d, yyyy')}
                        {rec.notes ? ` · ${rec.notes}` : ''}
                      </p>
                    )}
                  </div>
                  {rec ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setDialog({ distanceKey: key, record: rec })}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs text-muted-foreground/50 hover:text-foreground"
                      onClick={() => setDialog({ distanceKey: key, record: null })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Coming soon note */}
      <p className="text-[11px] text-muted-foreground/40 text-center pt-1">
        Auto-import from Garmin / Strava — <span className="font-medium">Coming Soon</span>
      </p>

      {dialog !== null && (
        <PRDialog
          record={dialog.record}
          distanceKey={dialog.distanceKey}
          athleteEmail={athleteEmail}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}