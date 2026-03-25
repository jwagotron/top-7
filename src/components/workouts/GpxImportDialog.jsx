import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function parseGpx(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  // Date
  const timeEl = xml.querySelector('metadata > time') || xml.querySelector('trkpt > time');
  const date = timeEl ? format(new Date(timeEl.textContent), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  // Track name
  const nameEl = xml.querySelector('trk > name');
  const title = nameEl ? nameEl.textContent.trim() : 'Imported Run';

  // Track points
  const trkpts = Array.from(xml.querySelectorAll('trkpt'));
  if (trkpts.length === 0) return null;

  // Duration
  const times = trkpts.map(p => {
    const t = p.querySelector('time');
    return t ? new Date(t.textContent).getTime() : null;
  }).filter(Boolean);
  const duration_minutes = times.length >= 2
    ? Math.round((times[times.length - 1] - times[0]) / 60000)
    : null;

  // Distance (Haversine)
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  let distance_km = 0;
  for (let i = 1; i < trkpts.length; i++) {
    const a = trkpts[i - 1], b = trkpts[i];
    distance_km += haversine(
      parseFloat(a.getAttribute('lat')), parseFloat(a.getAttribute('lon')),
      parseFloat(b.getAttribute('lat')), parseFloat(b.getAttribute('lon'))
    );
  }
  distance_km = Math.round(distance_km * 100) / 100;

  // Average pace (min/km)
  let avg_pace = '';
  if (duration_minutes && distance_km > 0) {
    const paceDecimal = duration_minutes / distance_km;
    const paceMin = Math.floor(paceDecimal);
    const paceSec = Math.round((paceDecimal - paceMin) * 60);
    avg_pace = `${paceMin}:${String(paceSec).padStart(2, '0')}`;
  }

  // Heart rate
  const hrValues = trkpts.map(p => {
    const hr = p.querySelector('hr, HeartRateBpm Value, extensions hr');
    return hr ? parseInt(hr.textContent) : null;
  }).filter(v => v && v > 0);
  const avg_heart_rate = hrValues.length
    ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
    : null;
  const max_heart_rate = hrValues.length ? Math.max(...hrValues) : null;

  // Cadence
  const cadValues = trkpts.map(p => {
    const cad = p.querySelector('cad, RunCadence, extensions cad');
    return cad ? parseInt(cad.textContent) * 2 : null; // GPX stores steps/min per foot
  }).filter(v => v && v > 0);
  const cadence = cadValues.length
    ? Math.round(cadValues.reduce((a, b) => a + b, 0) / cadValues.length)
    : null;

  // Elevation gain
  const elevations = trkpts.map(p => {
    const el = p.querySelector('ele');
    return el ? parseFloat(el.textContent) : null;
  }).filter(v => v !== null);
  let elevation_gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) elevation_gain += diff;
  }
  elevation_gain = Math.round(elevation_gain);

  // Per-km splits
  const splits = [];
  if (trkpts.length > 1 && times.length === trkpts.length) {
    let kmDist = 0, kmStart = 0, kmStartTime = times[0];
    for (let i = 1; i < trkpts.length; i++) {
      const seg = haversine(
        parseFloat(trkpts[i - 1].getAttribute('lat')), parseFloat(trkpts[i - 1].getAttribute('lon')),
        parseFloat(trkpts[i].getAttribute('lat')), parseFloat(trkpts[i].getAttribute('lon'))
      );
      kmDist += seg;
      if (kmDist >= 1) {
        const segMin = (times[i] - kmStartTime) / 60000;
        const pMin = Math.floor(segMin); const pSec = Math.round((segMin - pMin) * 60);
        const hrSlice = hrValues.slice(kmStart, i);
        splits.push({
          km: splits.length + 1,
          pace: `${pMin}:${String(pSec).padStart(2, '0')}`,
          heart_rate: hrSlice.length ? Math.round(hrSlice.reduce((a, b) => a + b) / hrSlice.length) : undefined,
        });
        kmDist = 0; kmStartTime = times[i]; kmStart = i;
      }
    }
  }

  return {
    title,
    sport: 'run',
    date,
    duration_minutes,
    distance_km,
    avg_pace,
    avg_heart_rate,
    max_heart_rate,
    cadence,
    elevation_gain: elevation_gain || null,
    splits: splits.length ? splits : undefined,
  };
}

export default function GpxImportDialog({ open, onClose, onImport }) {
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const reset = () => { setParsed(null); setError(''); };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.gpx')) { setError('Please upload a .gpx file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseGpx(e.target.result);
      if (!result) { setError('Could not parse GPX file. Make sure it contains track points.'); return; }
      setParsed(result);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = () => {
    onImport(parsed);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Garmin_logo.svg/200px-Garmin_logo.svg.png" alt="Garmin" className="h-5 opacity-70" />
            Import from Garmin (GPX)
          </DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your activity from <strong>Garmin Connect</strong> as a <code className="bg-muted px-1 rounded">.gpx</code> file, then upload it here.
            </p>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop your .gpx file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
              <input ref={fileRef} type="file" accept=".gpx" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              In Garmin Connect: Activity → ••• → Export to GPX
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-secondary text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> GPX parsed successfully
            </div>

            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input value={parsed.title} onChange={e => setParsed(p => ({ ...p, title: e.target.value }))} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Date</span><p className="font-medium">{parsed.date}</p></div>
                <div><span className="text-muted-foreground text-xs">Distance</span><p className="font-medium">{parsed.distance_km} km</p></div>
                <div><span className="text-muted-foreground text-xs">Duration</span><p className="font-medium">{parsed.duration_minutes} min</p></div>
                <div><span className="text-muted-foreground text-xs">Avg Pace</span><p className="font-medium">{parsed.avg_pace || '—'} /km</p></div>
                {parsed.avg_heart_rate && <div><span className="text-muted-foreground text-xs">Avg HR</span><p className="font-medium">{parsed.avg_heart_rate} bpm</p></div>}
                {parsed.elevation_gain && <div><span className="text-muted-foreground text-xs">Elevation</span><p className="font-medium">+{parsed.elevation_gain} m</p></div>}
                {parsed.cadence && <div><span className="text-muted-foreground text-xs">Cadence</span><p className="font-medium">{parsed.cadence} spm</p></div>}
                {parsed.splits?.length > 0 && <div><span className="text-muted-foreground text-xs">Splits</span><p className="font-medium">{parsed.splits.length} km splits</p></div>}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>Use Different File</Button>
              <Button className="flex-1" onClick={handleImport}>Import Run</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}