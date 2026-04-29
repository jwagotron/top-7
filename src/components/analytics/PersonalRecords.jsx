import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trophy, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const DISTANCES = [
  { key: '400m',          label: '400m',          distKm: 0.4 },
  { key: '800m',          label: '800m',          distKm: 0.8 },
  { key: '1600m',         label: '1,600m',        distKm: 1.6 },
  { key: '1mile',         label: '1 Mile',        distKm: 1.609 },
  { key: '5k',            label: '5K',            distKm: 5 },
  { key: '8k',            label: '8K',            distKm: 8 },
  { key: '10k',           label: '10K',           distKm: 10 },
  { key: '10mile',        label: '10 Mile',       distKm: 16.09 },
  { key: 'half_marathon', label: 'Half Marathon', distKm: 21.0975 },
  { key: 'marathon',      label: 'Marathon',      distKm: 42.195 },
];

// Format seconds → H:MM:SS or M:SS
function formatTime(sec) {
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

// Estimate PR from a base 5K time using Riegel formula
function estimateFromBase(base5kSec, distKm) {
  // Riegel: T2 = T1 * (D2/D1)^1.06
  return Math.round(base5kSec * Math.pow(distKm / 5, 1.06));
}

// Derive mock PRs for Daniel: 5K ~22:30 (based on ~5:07/km avg pace)
const MOCK_BASE_5K = 22 * 60 + 30; // 22:30
const MOCK_PRS = {
  '400m':          Math.round(MOCK_BASE_5K * Math.pow(0.4 / 5, 1.06)),
  '800m':          Math.round(MOCK_BASE_5K * Math.pow(0.8 / 5, 1.06)),
  '1600m':         Math.round(MOCK_BASE_5K * Math.pow(1.6 / 5, 1.06)),
  '1mile':         Math.round(MOCK_BASE_5K * Math.pow(1.609 / 5, 1.06)),
  '5k':            MOCK_BASE_5K,
  '8k':            Math.round(MOCK_BASE_5K * Math.pow(8 / 5, 1.06)),
  '10k':           Math.round(MOCK_BASE_5K * Math.pow(10 / 5, 1.06)),
  '10mile':        Math.round(MOCK_BASE_5K * Math.pow(16.09 / 5, 1.06)),
  'half_marathon': Math.round(MOCK_BASE_5K * Math.pow(21.0975 / 5, 1.06)),
  'marathon':      Math.round(MOCK_BASE_5K * Math.pow(42.195 / 5, 1.06)),
};

function EditPRDialog({ record, distanceLabel, athleteEmail, onClose }) {
  const qc = useQueryClient();
  const [timeStr, setTimeStr] = useState(record?.time_seconds ? formatTime(record.time_seconds) : '');
  const [dateStr, setDateStr] = useState(record?.date_set || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(record?.notes || '');
  const [error, setError] = useState('');

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (record?.id) {
        return base44.entities.PersonalRecord.update(record.id, data);
      }
      return base44.entities.PersonalRecord.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-records', athleteEmail] });
      onClose();
    },
  });

  const handleSave = () => {
    const sec = parseTime(timeStr);
    if (!sec) { setError('Enter time as M:SS or H:MM:SS'); return; }
    saveMut.mutate({
      athlete_email: athleteEmail,
      distance_key: record?.distance_key,
      time_seconds: sec,
      date_set: dateStr,
      notes,
      source: 'manual',
      is_override: true,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit PR — {distanceLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Time (M:SS or H:MM:SS)</Label>
            <Input
              value={timeStr}
              onChange={e => { setTimeStr(e.target.value); setError(''); }}
              placeholder="22:30"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>
          <div>
            <Label>Date Achieved</Label>
            <Input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Race name, location, etc." />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending}>Save PR</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PersonalRecords({ athleteEmail }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // { distance_key, label, record? }

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['personal-records', athleteEmail],
    queryFn: () => base44.entities.PersonalRecord.filter({ athlete_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  // Seed mock Garmin PRs if none exist yet
  const seedMut = useMutation({
    mutationFn: async () => {
      const existing = records.map(r => r.distance_key);
      const toCreate = DISTANCES
        .filter(d => !existing.includes(d.key))
        .map(d => ({
          athlete_email: athleteEmail,
          distance_key: d.key,
          time_seconds: MOCK_PRS[d.key],
          date_set: '2025-10-12',
          source: 'garmin',
          is_override: false,
          notes: 'Auto-populated from Garmin activity data',
        }));
      if (toCreate.length > 0) {
        await base44.entities.PersonalRecord.bulkCreate(toCreate);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-records', athleteEmail] }),
  });

  // Seed on first load if empty
  useEffect(() => {
    if (!isLoading && records.length === 0 && athleteEmail) {
      seedMut.mutate();
    }
  }, [isLoading, records.length, athleteEmail]);

  const recordMap = Object.fromEntries(records.map(r => [r.distance_key, r]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2"><Trophy className="w-4 h-4 text-accent" /> Personal Records</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-populated from Garmin data. Click the edit icon to override any time manually.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DISTANCES.map(({ key, label: distLabel }) => {
          const rec = recordMap[key];
          const isManual = rec?.is_override || rec?.source === 'manual';
          return (
            <Card key={key} className="rounded-2xl bg-muted/40 border border-border/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{distLabel}</p>
                    {isManual && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">Manual</Badge>
                    )}
                    {rec && !isManual && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-secondary/30 text-secondary flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />Garmin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-bold leading-tight mt-0.5">
                    {rec ? formatTime(rec.time_seconds) : <span className="text-muted-foreground/30">—</span>}
                  </p>
                  {rec?.date_set && (
                    <p className="text-[10px] text-muted-foreground/50">{format(new Date(rec.date_set), 'MMM d, yyyy')}{rec.notes ? ` · ${rec.notes}` : ''}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing({ distance_key: key, label: distLabel, record: rec })}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <EditPRDialog
          record={{ distance_key: editing.distance_key, ...editing.record }}
          distanceLabel={editing.label}
          athleteEmail={athleteEmail}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}