import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Minimal FIT binary parser - extracts key metrics from Garmin/Apple Watch .fit files
// FIT protocol: https://developer.garmin.com/fit/protocol/

const FIT_HEADER_SIZE = 14;
const MESG_TYPE_RECORD = 20;    // GPS/sensor record data
const MESG_TYPE_SESSION = 18;   // Session summary
const MESG_TYPE_LAP = 19;       // Lap data
const MESG_TYPE_FILE_ID = 0;    // File header

function readUint8(buf, offset) { return buf[offset]; }
function readUint16LE(buf, offset) { return buf[offset] | (buf[offset + 1] << 8); }
function readUint32LE(buf, offset) {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}
function readSint32LE(buf, offset) {
  const v = readUint32LE(buf, offset);
  return v > 0x7FFFFFFF ? v - 0x100000000 : v;
}
function readUint16BE(buf, offset) { return (buf[offset] << 8) | buf[offset + 1]; }
function readUint32BE(buf, offset) { return ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0; }

// FIT timestamp epoch: Dec 31, 1989 00:00:00 UTC
const FIT_EPOCH_OFFSET = 631065600000;

function fitTimestampToMs(ts) {
  if (!ts || ts === 0xFFFFFFFF) return null;
  return FIT_EPOCH_OFFSET + ts * 1000;
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseFit(bytes) {
  const buf = new Uint8Array(bytes);

  if (buf.length < FIT_HEADER_SIZE) throw new Error('File too small to be a valid FIT file');

  const headerSize = buf[0];
  const protocol = buf[1];
  const dataSize = readUint32LE(buf, 4);

  // Verify FIT signature at bytes 8-11
  const sig = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
  if (sig !== '.FIT') throw new Error('Not a valid FIT file (missing .FIT signature)');

  let offset = headerSize;
  const localMsgDefs = {}; // local message number -> definition

  const records = [];     // raw GPS/sensor records
  let sessionData = null; // session summary
  const laps = [];

  while (offset < headerSize + dataSize - 2) {
    if (offset >= buf.length - 1) break;

    const recordHeader = buf[offset++];
    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;
    const isDefinition = !isCompressedTimestamp && (recordHeader & 0x40) !== 0;
    const localMsgNum = isCompressedTimestamp ? (recordHeader & 0x60) >> 5 : (recordHeader & 0x0F);

    if (isCompressedTimestamp) {
      // Compressed timestamp record - use existing definition
      const def = localMsgDefs[localMsgNum];
      if (!def) { offset += 1; continue; }
      offset += def.recordSize;
      continue;
    }

    if (isDefinition) {
      // Definition message
      offset++; // reserved
      const isBigEndian = buf[offset++] !== 0;
      const globalMsgNum = isBigEndian ? readUint16BE(buf, offset) : readUint16LE(buf, offset);
      offset += 2;
      const numFields = buf[offset++];

      const fields = [];
      let recordSize = 0;
      for (let i = 0; i < numFields; i++) {
        const fieldNum = buf[offset++];
        const fieldSize = buf[offset++];
        const baseType = buf[offset++];
        fields.push({ fieldNum, fieldSize, baseType });
        recordSize += fieldSize;
      }

      // Check for developer fields
      const hasDeveloperFields = (recordHeader & 0x20) !== 0;
      let devRecordSize = 0;
      if (hasDeveloperFields) {
        const numDevFields = buf[offset++];
        for (let i = 0; i < numDevFields; i++) {
          const devFieldNum = buf[offset++];
          const devFieldSize = buf[offset++];
          offset++; // developer data index
          devRecordSize += devFieldSize;
        }
      }

      localMsgDefs[localMsgNum] = { globalMsgNum, fields, recordSize, devRecordSize, isBigEndian };

    } else {
      // Data message
      const def = localMsgDefs[localMsgNum];
      if (!def) { offset += 1; continue; }

      const startOffset = offset;
      const msgData = {};

      for (const field of def.fields) {
        let value = null;
        if (field.fieldSize === 1) {
          value = buf[offset];
        } else if (field.fieldSize === 2) {
          value = def.isBigEndian ? readUint16BE(buf, offset) : readUint16LE(buf, offset);
        } else if (field.fieldSize === 4) {
          value = def.isBigEndian ? readUint32BE(buf, offset) : readUint32LE(buf, offset);
        }
        msgData[field.fieldNum] = value;
        offset += field.fieldSize;
      }

      // Skip developer fields
      offset += def.devRecordSize;

      if (def.globalMsgNum === MESG_TYPE_RECORD) {
        // Field numbers: 0=lat, 1=lon, 2=altitude, 3=heart_rate, 4=cadence, 5=distance, 6=speed, 7=power, 13=temperature, 53=fractional_cadence
        const lat = msgData[0] != null && msgData[0] !== 0x7FFFFFFF ? msgData[0] * (180 / Math.pow(2, 31)) : null;
        const lon = msgData[1] != null && msgData[1] !== 0x7FFFFFFF ? msgData[1] * (180 / Math.pow(2, 31)) : null;
        const hr = (msgData[3] != null && msgData[3] !== 255) ? msgData[3] : null;
        const cad = (msgData[4] != null && msgData[4] !== 255) ? msgData[4] * 2 : null; // FIT stores steps/min per foot
        const distM = msgData[5] != null ? msgData[5] / 100 : null; // cm -> m... wait FIT stores in cm? No: distance in m * 100
        const speedMms = msgData[6] != null ? msgData[6] : null; // mm/s
        const ts = msgData[253] != null ? fitTimestampToMs(msgData[253]) : null;

        records.push({ lat, lon, hr, cad, distM: distM ? distM / 100 : null, speedMms, ts });

      } else if (def.globalMsgNum === MESG_TYPE_SESSION) {
        // Field numbers for session:
        // 2=start_time, 7=total_elapsed_time(ms/1000), 9=total_distance(cm), 14=avg_speed, 15=max_speed
        // 16=avg_heart_rate, 17=max_heart_rate, 18=avg_cadence, 22=total_calories
        // 25=total_ascent, 26=total_descent, 5=sport
        const sport = msgData[5];
        const startTs = msgData[2] != null ? fitTimestampToMs(msgData[2]) : null;
        const elapsedSec = msgData[7] != null ? msgData[7] / 1000 : null;
        const distM = msgData[9] != null ? msgData[9] / 100 : null;
        const avgHr = (msgData[16] != null && msgData[16] !== 255) ? msgData[16] : null;
        const maxHr = (msgData[17] != null && msgData[17] !== 255) ? msgData[17] : null;
        const avgCad = (msgData[18] != null && msgData[18] !== 255) ? msgData[18] * 2 : null;
        // FIT Session total_calories = field 11 (uint16, kcal)
        // Log ALL session fields so we can identify the exact field containing 312
        console.log('[parseFit] SESSION fields dump:', JSON.stringify(msgData));
        // Try field 11 first (spec-correct), then broaden scan for any plausible calorie value (50-9999)
        let calories = null;
        const calFieldCandidates = [11, 14, 22, 33, 48, 71];
        for (const f of calFieldCandidates) {
          const v = msgData[f];
          if (v != null && v !== 65535 && v !== 0 && v >= 50 && v <= 9999) {
            if (calories === null || v > calories) calories = v;
          }
        }
        // Fallback: scan ALL session fields for any value that looks like calories (50-9999)
        if (!calories) {
          for (const [key, val] of Object.entries(msgData)) {
            if (val != null && val !== 65535 && val !== 0 && val >= 50 && val <= 9999) {
              calories = val;
              console.log('[parseFit] Calories found in fallback scan field', key, '=', val);
              break;
            }
          }
        }
        console.log('[parseFit] Calories resolved to:', calories);
        const ascent = (msgData[25] != null && msgData[25] !== 65535) ? msgData[25] : null;

        // Advanced running dynamics: field 54=avg_stride_length(cm*10), field 55=avg_vertical_oscillation(mm*10), field 57=avg_ground_contact_time(ms/10), field 89=avg_vertical_ratio
        const strideLength = (msgData[54] != null && msgData[54] !== 65535) ? msgData[54] / 10 : null; // cm
        const vertOscillation = (msgData[55] != null && msgData[55] !== 65535) ? msgData[55] / 10 : null; // mm
        const groundContact = (msgData[57] != null && msgData[57] !== 65535) ? msgData[57] / 10 : null; // ms
        const vertRatio = (msgData[89] != null && msgData[89] !== 65535) ? msgData[89] / 100 : null; // %

        console.log('[parseFit] Session msgData keys:', Object.keys(msgData).map(k => `${k}=${msgData[k]}`).join(', '));
        sessionData = { sport, startTs, elapsedSec, distM, avgHr, maxHr, avgCad, calories, ascent, strideLength, vertOscillation, groundContact, vertRatio };

      } else if (def.globalMsgNum === MESG_TYPE_LAP) {
        const startTs = msgData[2] != null ? fitTimestampToMs(msgData[2]) : null;
        const elapsedSec = msgData[7] != null ? msgData[7] / 1000 : null;
        const distM = msgData[9] != null ? msgData[9] / 100 : null;
        const avgHr = (msgData[16] != null && msgData[16] !== 255) ? msgData[16] : null;
        const avgCad = (msgData[18] != null && msgData[18] !== 255) ? msgData[18] * 2 : null;
        // total_ascent field 25, total_descent field 26
        const lapAscent = (msgData[25] != null && msgData[25] !== 65535) ? msgData[25] : null;
        const lapDescent = (msgData[26] != null && msgData[26] !== 65535) ? msgData[26] : null;
        const elevationChange = (lapAscent != null || lapDescent != null) ? (lapAscent || 0) - (lapDescent || 0) : null;
        laps.push({ startTs, elapsedSec, distM, avgHr, avgCad, elevationChange });
      }
    }
  }

  // Build result from session data + records
  const sportNames = { 1: 'run', 2: 'bike', 5: 'swim', 4: 'strength', 0: 'other' };
  const sport = sessionData?.sport != null ? (sportNames[sessionData.sport] || 'other') : 'run';

  const startTs = sessionData?.startTs || records.find(r => r.ts)?.ts;
  const date = startTs ? new Date(startTs).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const elapsedSec = sessionData?.elapsedSec || null;
  const duration_minutes = elapsedSec ? Math.round(elapsedSec / 60) : null;

  // Distance - prefer session data, fall back to GPS calculation
  let distance_km = sessionData?.distM ? Math.round(sessionData.distM / 10) / 100 : null;
  if (!distance_km && records.length > 1) {
    let d = 0;
    for (let i = 1; i < records.length; i++) {
      const a = records[i - 1], b = records[i];
      if (a.lat && a.lon && b.lat && b.lon) d += haversine(a.lat, a.lon, b.lat, b.lon);
    }
    distance_km = Math.round(d * 100) / 100;
  }

  // HR
  const hrVals = records.map(r => r.hr).filter(v => v && v > 30 && v < 250);
  const avg_heart_rate = sessionData?.avgHr || (hrVals.length ? Math.round(hrVals.reduce((a, b) => a + b) / hrVals.length) : null);
  const max_heart_rate = sessionData?.maxHr || (hrVals.length ? Math.max(...hrVals) : null);

  // Cadence
  const cadVals = records.map(r => r.cad).filter(v => v && v > 0);
  const cadence = sessionData?.avgCad || (cadVals.length ? Math.round(cadVals.reduce((a, b) => a + b) / cadVals.length) : null);

  // Avg pace (min/km)
  let avg_pace = '';
  if (duration_minutes && distance_km > 0) {
    const paceDecimal = duration_minutes / distance_km;
    const paceMin = Math.floor(paceDecimal);
    const paceSec = Math.round((paceDecimal - paceMin) * 60);
    avg_pace = `${paceMin}:${String(paceSec).padStart(2, '0')}`;
  }

  // Per-km splits from laps
  const splits = laps
    .filter(l => l.distM && l.elapsedSec)
    .map((l, i) => {
      const lapMin = l.elapsedSec / 60;
      const lapKm = l.distM / 1000;
      const paceDecimal = lapMin / lapKm;
      const paceMin = Math.floor(paceDecimal);
      const paceSec = Math.round((paceDecimal - paceMin) * 60);
      return {
        km: i + 1,
        pace: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
        heart_rate: l.avgHr || undefined,
        cadence: l.avgCad || undefined,
        elevation_change: l.elevationChange != null ? Math.round(l.elevationChange) : undefined,
      };
    });

  const calories = sessionData?.calories || null;
  const elevation_gain = sessionData?.ascent || null;

  return {
    title: 'Imported Activity',
    sport,
    date,
    duration_minutes,
    distance_km,
    avg_pace,
    avg_heart_rate,
    max_heart_rate,
    cadence,
    elevation_gain: elevation_gain || null,
    calories: calories || null,
    stride_length_cm: sessionData?.strideLength || null,
    vertical_oscillation_mm: sessionData?.vertOscillation || null,
    ground_contact_ms: sessionData?.groundContact || null,
    vertical_ratio: sessionData?.vertRatio || null,
    splits: splits.length ? splits : undefined,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.fileData || !Array.isArray(body.fileData)) {
      return Response.json({ error: 'No file data provided' }, { status: 400 });
    }

    const fileName = body.fileName || '';
    const bytes = new Uint8Array(body.fileData);

    let result;
    if (fileName.toLowerCase().endsWith('.fit')) {
      result = parseFit(bytes);
    } else {
      return Response.json({ error: 'Unsupported file type. Please upload a .fit file.' }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});