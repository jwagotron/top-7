import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, CheckCircle2, AlertCircle, Loader2, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useUnits } from '@/hooks/useUnits';
import { format } from 'date-fns';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── GPX Parser ───────────────────────────────────────────────────────────────
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

// ─── TCX Parser ───────────────────────────────────────────────────────────────
function parseTcx(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const activity = xml.querySelector('Activity');
  if (!activity) return null;
  const startTime = activity.querySelector('Id')?.textContent?.trim() || '';
  const date = startTime ? startTime.split('T')[0] : new Date().toISOString().split('T')[0];
  const sportAttr = (activity.getAttribute('Sport') || 'Running').toLowerCase();
  const sport = sportAttr === 'biking' ? 'bike' : sportAttr === 'swimming' ? 'swim' : 'run';
  const title = activity.querySelector('Notes')?.textContent?.trim() || `Imported ${sport.charAt(0).toUpperCase() + sport.slice(1)}`;
  const laps = Array.from(activity.querySelectorAll('Lap'));
  let totalTimeSeconds = 0, totalDistanceMeters = 0, totalCalories = 0;
  laps.forEach(lap => {
    totalTimeSeconds += parseFloat(lap.querySelector('TotalTimeSeconds')?.textContent || 0);
    totalDistanceMeters += parseFloat(lap.querySelector('DistanceMeters')?.textContent || 0);
    totalCalories += parseInt(lap.querySelector('Calories')?.textContent || 0);
  });
  const duration_minutes = totalTimeSeconds > 0 ? Math.round(totalTimeSeconds / 60) : null;
  const distance_km = totalDistanceMeters > 0 ? Math.round(totalDistanceMeters / 10) / 100 : null;
  let avg_pace = '';
  if (duration_minutes && distance_km > 0) {
    const p = duration_minutes / distance_km;
    avg_pace = `${Math.floor(p)}:${String(Math.round((p - Math.floor(p)) * 60)).padStart(2, '0')}`;
  }
  const trackpoints = Array.from(activity.querySelectorAll('Trackpoint'));
  const hrValues = trackpoints.map(tp => { const hr = tp.querySelector('HeartRateBpm Value'); return hr ? parseInt(hr.textContent) : null; }).filter(v => v && v > 0);
  const avg_heart_rate = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b) / hrValues.length) : null;
  const max_heart_rate = hrValues.length ? Math.max(...hrValues) : null;
  const cadValues = laps.map(l => { const c = l.querySelector('Cadence'); return c ? parseInt(c.textContent) * 2 : null; }).filter(v => v && v > 0);
  const cadence = cadValues.length ? Math.round(cadValues.reduce((a, b) => a + b) / cadValues.length) : null;
  const elevations = trackpoints.map(tp => { const e = tp.querySelector('AltitudeMeters'); return e ? parseFloat(e.textContent) : null; }).filter(v => v !== null);
  let elevation_gain = 0;
  for (let i = 1; i < elevations.length; i++) { const diff = elevations[i] - elevations[i - 1]; if (diff > 0) elevation_gain += diff; }
  return { title, sport, date, duration_minutes, distance_km, avg_pace, avg_heart_rate, max_heart_rate, cadence, calories: totalCalories || null, elevation_gain: Math.round(elevation_gain) || null };
}

// ─── Manual Entry Form ────────────────────────────────────────────────────────
function ManualRunForm({ data, setData }) {
  const set = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input className="mt-1" value={data.title} onChange={e => set('title', e.target.value)} placeholder="Morning Run" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input className="mt-1" type="date" value={data.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Sport</Label>
          <Select value={data.sport} onValueChange={v => set('sport', v)}>
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Distance (km)</Label>
          <Input className="mt-1" type="number" step="0.01" value={data.distance_km} onChange={e => set('distance_km', e.target.value)} placeholder="5.0" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Duration (min)</Label>
          <Input className="mt-1" type="number" value={data.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} placeholder="30" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea className="mt-1 h-16 resize-none" value={data.notes} onChange={e => set('notes', e.target.value)} placeholder="How did it go?" />
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function FitImportDialog({ open, onClose, onImport }) {
  const { toDisplay, label: distLabel, convertPaceLabel, paceLabel, toDisplayElevation, elevationLabel } = useUnits();
  // stage: idle | parsing | parsed | manual_fallback | manual_entry
  const [stage, setStage] = useState('idle');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [parseError, setParseError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [manualData, setManualData] = useState({
    title: '', date: format(new Date(), 'yyyy-MM-dd'), sport: 'run', distance_km: '', duration_minutes: '', notes: '',
  });
  const fileRef = useRef();

  const reset = () => { setStage('idle'); setParsed(null); setError(''); setParseError(''); };
  const handleClose = () => { onClose(); reset(); };

  const handleFile = async (file) => {
    if (!file) return;
    console.log('[UploadRun] upload started', { fileName: file.name, size: file.size });

    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large (max 50 MB). Please export a smaller activity.');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    console.log('[UploadRun] file type detected', ext);
    setError('');
    setStage('parsing');

    try {
      let result = null;

      if (ext === 'gpx') {
        const text = await file.text();
        result = parseGpx(text);
        if (!result) throw new Error('No track points found in GPX file.');

      } else if (ext === 'tcx') {
        const text = await file.text();
        result = parseTcx(text);
        if (!result) throw new Error('No activity data found in TCX file.');

      } else if (ext === 'fit') {
        const arrayBuffer = await file.arrayBuffer();
        const res = await base44.functions.invoke('parseFitFile', {
          fileData: Array.from(new Uint8Array(arrayBuffer)),
          fileName: file.name,
        });
        if (res.data?.error) throw new Error(res.data.error);
        result = res.data?.data;
        if (!result) throw new Error('FIT file parsing returned no data.');

      } else {
        throw new Error(`Unsupported file type: .${ext}. Please use .gpx, .fit, or .tcx`);
      }

      console.log('[UploadRun] parse success', {
        distance_km: result.distance_km,
        duration_minutes: result.duration_minutes,
        avg_heart_rate: result.avg_heart_rate,
        cadence: result.cadence,
        elevation_gain: result.elevation_gain,
        calories: result.calories,
        splits_count: result.splits?.length ?? 0,
      });
      setParsed({ ...result, _filename: file.name });
      setStage('parsed');

    } catch (e) {
      console.error('[UploadRun] parse failure', e.message);
      setParseError(e.message || 'Failed to parse file.');
      setStage('manual_fallback');
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleImport = () => {
    const { _filename, ...data } = parsed;
    console.log('[UploadRun] saving parsed run', { title: data.title, date: data.date, distance_km: data.distance_km, sport: data.sport });
    onImport(data);
    reset();
  };

  const handleManualSave = () => {
    const data = {
      title: manualData.title || 'Manual Run',
      date: manualData.date,
      sport: manualData.sport,
      ...(manualData.distance_km && { distance_km: parseFloat(manualData.distance_km) }),
      ...(manualData.duration_minutes && { duration_minutes: parseInt(manualData.duration_minutes) }),
      ...(manualData.notes && { notes: manualData.notes }),
    };
    console.log('[UploadRun] saving manual run', data);
    onImport(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Run
          </DialogTitle>
        </DialogHeader>

        {/* ── Idle / Parsing ── */}
        {(stage === 'idle' || stage === 'parsing') && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload runs directly from <strong>Garmin, Strava, Coros, Apple Watch, Polar, Suunto,</strong> and more.
              </p>
              <p className="text-xs text-muted-foreground mt-1">Supports .gpx · .fit · .tcx — max 50 MB</p>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => stage === 'idle' && fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 transition-colors',
                stage === 'idle' ? 'cursor-pointer' : 'pointer-events-none opacity-70',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              {stage === 'parsing' ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium">Parsing file…</p>
                  <p className="text-xs text-muted-foreground">This may take a moment</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop your file here</p>
                  <p className="text-xs text-muted-foreground">or tap to browse · .gpx · .fit · .tcx</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".gpx,.fit,.tcx" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={() => setStage('manual_entry')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors"
            >
              <PenLine className="w-3 h-3" /> Enter run manually instead
            </button>
          </div>
        )}

        {/* ── Parse failure → manual fallback ── */}
        {stage === 'manual_fallback' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Couldn't parse file automatically</p>
                <p className="text-xs text-muted-foreground mt-0.5">{parseError}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Enter your run details manually:</p>
            <ManualRunForm data={manualData} setData={setManualData} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStage('idle')}>← Try Another File</Button>
              <Button className="flex-1" onClick={handleManualSave}>Save Run</Button>
            </div>
          </div>
        )}

        {/* ── Manual entry (chosen by user) ── */}
        {stage === 'manual_entry' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">Enter your run details:</p>
            <ManualRunForm data={manualData} setData={setManualData} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStage('idle')}>← Upload File</Button>
              <Button className="flex-1" onClick={handleManualSave}>Save Run</Button>
            </div>
          </div>
        )}

        {/* ── Parsed preview ── */}
        {stage === 'parsed' && parsed && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-secondary text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Parsed successfully</span>
              <span className="text-muted-foreground font-normal text-xs truncate">— {parsed._filename}</span>
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
              {parsed.distance_km > 0 && <div><span className="text-muted-foreground text-xs block">Distance</span><span className="font-medium">{toDisplay(parsed.distance_km).toFixed(2)} {distLabel}</span></div>}
              {parsed.duration_minutes && <div><span className="text-muted-foreground text-xs block">Duration</span><span className="font-medium">{parsed.duration_minutes} min</span></div>}
              {parsed.avg_pace && <div><span className="text-muted-foreground text-xs block">Avg Pace</span><span className="font-medium">{convertPaceLabel(parsed.avg_pace)} {paceLabel}</span></div>}
              {parsed.avg_heart_rate && <div><span className="text-muted-foreground text-xs block">Avg HR</span><span className="font-medium">{parsed.avg_heart_rate} bpm</span></div>}
              {parsed.max_heart_rate && <div><span className="text-muted-foreground text-xs block">Max HR</span><span className="font-medium">{parsed.max_heart_rate} bpm</span></div>}
              {parsed.cadence && <div><span className="text-muted-foreground text-xs block">Cadence</span><span className="font-medium">{parsed.cadence} spm</span></div>}
              {parsed.elevation_gain && <div><span className="text-muted-foreground text-xs block">Elevation</span><span className="font-medium">+{toDisplayElevation(parsed.elevation_gain)} {elevationLabel}</span></div>}
              {parsed.calories && <div><span className="text-muted-foreground text-xs block">Calories</span><span className="font-medium">{parsed.calories} kcal</span></div>}
              {parsed.stride_length_cm && <div><span className="text-muted-foreground text-xs block">Stride</span><span className="font-medium">{parsed.stride_length_cm.toFixed(1)} cm</span></div>}
              {parsed.ground_contact_ms && <div><span className="text-muted-foreground text-xs block">Ground Contact</span><span className="font-medium">{Math.round(parsed.ground_contact_ms)} ms</span></div>}
              {parsed.splits?.length > 0 && <div><span className="text-muted-foreground text-xs block">Splits</span><span className="font-medium">{parsed.splits.length} km splits</span></div>}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStage('idle')}>Use Different File</Button>
              <Button className="flex-1" onClick={handleImport}>Save Activity</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}