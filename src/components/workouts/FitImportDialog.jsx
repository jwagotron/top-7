import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle2, AlertCircle, Loader2, Watch, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useUnits } from '@/hooks/useUnits';

// Parse GPX inline (no backend needed)
function parseGpx(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  const timeEl = xml.querySelector('metadata > time') || xml.querySelector('trkpt > time');
  const date = timeEl ? new Date(timeEl.textContent).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const nameEl = xml.querySelector('trk > name');
  const title = nameEl ? nameEl.textContent.trim() : 'Imported Run';

  const trkpts = Array.from(xml.querySelectorAll('trkpt'));
  if (trkpts.length === 0) return null;

  const times = trkpts.map(p => { const t = p.querySelector('time'); return t ? new Date(t.textContent).getTime() : null; }).filter(Boolean);
  const duration_minutes = times.length >= 2 ? Math.round((times[times.length - 1] - times[0]) / 60000) : null;

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  let distance_km = 0;
  for (let i = 1; i < trkpts.length; i++) {
    distance_km += haversine(parseFloat(trkpts[i-1].getAttribute('lat')), parseFloat(trkpts[i-1].getAttribute('lon')), parseFloat(trkpts[i].getAttribute('lat')), parseFloat(trkpts[i].getAttribute('lon')));
  }
  distance_km = Math.round(distance_km * 100) / 100;

  let avg_pace = '';
  if (duration_minutes && distance_km > 0) {
    const p = duration_minutes / distance_km;
    avg_pace = `${Math.floor(p)}:${String(Math.round((p - Math.floor(p)) * 60)).padStart(2, '0')}`;
  }

  const hrValues = trkpts.map(p => { const hr = p.querySelector('hr, HeartRateBpm Value, extensions hr'); return hr ? parseInt(hr.textContent) : null; }).filter(v => v && v > 0);
  const avg_heart_rate = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b) / hrValues.length) : null;
  const max_heart_rate = hrValues.length ? Math.max(...hrValues) : null;

  const cadValues = trkpts.map(p => { const c = p.querySelector('cad, RunCadence, extensions cad'); return c ? parseInt(c.textContent) * 2 : null; }).filter(v => v && v > 0);
  const cadence = cadValues.length ? Math.round(cadValues.reduce((a, b) => a + b) / cadValues.length) : null;

  const elevations = trkpts.map(p => { const e = p.querySelector('ele'); return e ? parseFloat(e.textContent) : null; }).filter(v => v !== null);
  let elevation_gain = 0;
  for (let i = 1; i < elevations.length; i++) { const diff = elevations[i] - elevations[i - 1]; if (diff > 0) elevation_gain += diff; }

  const splits = [];
  if (trkpts.length > 1 && times.length === trkpts.length) {
    let kmDist = 0, kmStart = 0, kmStartTime = times[0];
    for (let i = 1; i < trkpts.length; i++) {
      kmDist += haversine(parseFloat(trkpts[i-1].getAttribute('lat')), parseFloat(trkpts[i-1].getAttribute('lon')), parseFloat(trkpts[i].getAttribute('lat')), parseFloat(trkpts[i].getAttribute('lon')));
      if (kmDist >= 1) {
        const segMin = (times[i] - kmStartTime) / 60000;
        const pMin = Math.floor(segMin), pSec = Math.round((segMin - pMin) * 60);
        const hrSlice = hrValues.slice(kmStart, i);
        splits.push({ km: splits.length + 1, pace: `${pMin}:${String(pSec).padStart(2, '0')}`, heart_rate: hrSlice.length ? Math.round(hrSlice.reduce((a, b) => a + b) / hrSlice.length) : undefined });
        kmDist = 0; kmStartTime = times[i]; kmStart = i;
      }
    }
  }

  return { title, sport: 'run', date, duration_minutes, distance_km, avg_pace, avg_heart_rate, max_heart_rate, cadence, elevation_gain: Math.round(elevation_gain) || null, splits: splits.length ? splits : undefined };
}

const SOURCE_OPTIONS = [
  { value: 'garmin', label: 'Garmin Device', icon: Navigation, desc: 'Export .fit or .gpx from Garmin Connect', accepts: '.fit,.gpx', color: 'text-chart-2' },
  { value: 'apple', label: 'Apple Watch', icon: Watch, desc: 'Export workout .fit file from the Health app', accepts: '.fit', color: 'text-primary' },
];

export default function FitImportDialog({ open, onClose, onImport }) {
  const { units, toDisplay, label: distLabel, paceLabel, toDisplayElevation, elevationLabel, convertPaceLabel } = useUnits();
  const [source, setSource] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const reset = () => { setParsed(null); setError(''); setSource(null); };
  const handleClose = () => { onClose(); reset(); };

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setLoading(true);

    try {
      if (file.name.toLowerCase().endsWith('.gpx')) {
        const text = await file.text();
        const result = parseGpx(text);
        if (!result) throw new Error('Could not parse GPX file. Make sure it contains track points.');
        setParsed({ ...result, _filename: file.name });

      } else if (file.name.toLowerCase().endsWith('.fit')) {
        const arrayBuffer = await file.arrayBuffer();
        const res = await base44.functions.invoke('parseFitFile', {
          fileData: Array.from(new Uint8Array(arrayBuffer)),
          fileName: file.name,
        });
        if (res.data?.error) throw new Error(res.data.error);
        setParsed({ ...res.data.data, _filename: file.name });

      } else {
        throw new Error('Please upload a .fit or .gpx file.');
      }
    } catch (e) {
      setError(e.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleImport = () => {
    const { _filename, ...data } = parsed;
    onImport(data);
    reset();
  };

  const currentSource = SOURCE_OPTIONS.find(s => s.value === source);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Activity File
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose source */}
        {!source && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Where is your workout from?</p>
            {SOURCE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSource(opt.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${opt.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
            <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border/50">
              <strong>Note:</strong> Direct device sync is coming soon. For now, export your workout file from the device's companion app and upload it here.
            </div>
          </div>
        )}

        {/* Step 2: Upload file */}
        {source && !parsed && (
          <div className="space-y-4">
            <button onClick={() => setSource(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              ← Change source
            </button>

            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground border border-border/50">
              {source === 'garmin' ? (
                <><strong>Garmin Connect:</strong> Open the activity → tap ••• → Export to FIT or GPX</>
              ) : (
                <><strong>Apple Watch:</strong> In the <em>Health</em> app → Browse → Activity → Workouts → select workout → Export</>
              )}
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !loading && fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                loading && 'pointer-events-none opacity-60'
              )}
            >
              {loading ? (
                <><Loader2 className="w-8 h-8 text-primary animate-spin" /><p className="text-sm font-medium">Parsing file…</p></>
              ) : (
                <><Upload className="w-8 h-8 text-muted-foreground" /><p className="text-sm font-medium">Drop your file here</p><p className="text-xs text-muted-foreground">Accepts: {currentSource?.accepts}</p></>
              )}
              <input ref={fileRef} type="file" accept={currentSource?.accepts} className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm & edit */}
        {parsed && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-secondary text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Parsed: <span className="text-muted-foreground font-normal">{parsed._filename}</span>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input value={parsed.title} onChange={e => setParsed(p => ({ ...p, title: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sport</Label>
                <Select value={parsed.sport} onValueChange={v => setParsed(p => ({ ...p, sport: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="run">Run</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="swim">Swim</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <div><span className="text-muted-foreground text-xs block">Date</span><span className="font-medium">{parsed.date}</span></div>
              {parsed.distance_km && <div><span className="text-muted-foreground text-xs block">Distance</span><span className="font-medium">{toDisplay(parsed.distance_km).toFixed(2)} {distLabel}</span></div>}
              {parsed.duration_minutes && <div><span className="text-muted-foreground text-xs block">Duration</span><span className="font-medium">{parsed.duration_minutes} min</span></div>}
              {parsed.avg_pace && <div><span className="text-muted-foreground text-xs block">Avg Pace</span><span className="font-medium">{convertPaceLabel(parsed.avg_pace)} {paceLabel}</span></div>}
              {parsed.avg_heart_rate && <div><span className="text-muted-foreground text-xs block">Avg HR</span><span className="font-medium">{parsed.avg_heart_rate} bpm</span></div>}
              {parsed.max_heart_rate && <div><span className="text-muted-foreground text-xs block">Max HR</span><span className="font-medium">{parsed.max_heart_rate} bpm</span></div>}
              {parsed.cadence && <div><span className="text-muted-foreground text-xs block">Cadence</span><span className="font-medium">{parsed.cadence} spm</span></div>}
              {parsed.elevation_gain && <div><span className="text-muted-foreground text-xs block">Elevation</span><span className="font-medium">+{toDisplayElevation(parsed.elevation_gain)} {elevationLabel}</span></div>}
              {parsed.calories && <div><span className="text-muted-foreground text-xs block">Calories</span><span className="font-medium">{parsed.calories} kcal</span></div>}
              {parsed.stride_length_cm && <div><span className="text-muted-foreground text-xs block">Stride Length</span><span className="font-medium">{parsed.stride_length_cm.toFixed(1)} cm</span></div>}
              {parsed.vertical_oscillation_mm && <div><span className="text-muted-foreground text-xs block">Vert. Oscillation</span><span className="font-medium">{parsed.vertical_oscillation_mm.toFixed(1)} mm</span></div>}
              {parsed.ground_contact_ms && <div><span className="text-muted-foreground text-xs block">Ground Contact</span><span className="font-medium">{Math.round(parsed.ground_contact_ms)} ms</span></div>}
              {parsed.vertical_ratio && <div><span className="text-muted-foreground text-xs block">Vertical Ratio</span><span className="font-medium">{parsed.vertical_ratio.toFixed(1)}%</span></div>}
              {parsed.splits?.length > 0 && <div><span className="text-muted-foreground text-xs block">Splits</span><span className="font-medium">{parsed.splits.length} laps</span></div>}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setParsed(null)}>Use Different File</Button>
              <Button className="flex-1" onClick={handleImport}>Save Activity</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}