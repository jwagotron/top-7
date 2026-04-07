// Race Prediction Engine v3
// Multi-signal, conservative weighted model.

// Riegel formula: T2 = T1 * (D2/D1)^1.06
export function riegelProject(timeSecAtKnownDist, knownDistKm, targetDistKm) {
  if (!timeSecAtKnownDist || !knownDistKm || !targetDistKm) return null;
  return timeSecAtKnownDist * Math.pow(targetDistKm / knownDistKm, 1.06);
}

export const RACE_DISTANCES = {
  '1mi':           1.60934,
  '5K':            5,
  '10K':           10,
  'half_marathon': 21.0975,
  'marathon':      42.195,
};

export const DISTANCE_LABELS = {
  '1mi':           '1 Mile',
  '5K':            '5K',
  '10K':           '10K',
  'half_marathon': 'Half Marathon',
  'marathon':      'Marathon',
};

export function formatTime(totalSec) {
  if (!totalSec || isNaN(totalSec)) return '--';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPacePerKm(secPerKm) {
  if (!secPerKm) return '--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function daysAgo(dateStr, now) {
  if (!dateStr) return 9999;
  return (now - new Date(dateStr)) / 86400000;
}

function gatherEfforts(workouts, activities, benchmarks, now) {
  const efforts = [];

  workouts
    .filter(w => w.run_type === 'race' && w.distance_km > 0 && w.duration_minutes > 0)
    .forEach(w => {
      const age = daysAgo(w.date, now);
      const ageFactor = age < 30 ? 1.0 : age < 60 ? 0.92 : age < 120 ? 0.80 : age < 180 ? 0.65 : 0.45;
      efforts.push({ distKm: w.distance_km, timeSec: w.duration_minutes * 60, weight: 1.0 * ageFactor, sourceLabel: `Race — ${w.title}`, type: 'race', date: w.date });
    });

  benchmarks
    .filter(b => b.distance_km > 0 && b.time_sec > 0)
    .forEach(b => {
      const age = daysAgo(b.date, now);
      const ageFactor = age < 30 ? 1.0 : age < 60 ? 0.88 : age < 120 ? 0.72 : 0.50;
      const typeW = b.effort_type === 'race' ? 1.0 : b.effort_type === 'time_trial' ? 0.92 : 0.78;
      const confW = (b.confidence_score || 80) / 100;
      efforts.push({ distKm: b.distance_km, timeSec: b.time_sec, weight: typeW * ageFactor * confW, sourceLabel: `Benchmark (${b.distance_km}km)`, type: 'benchmark', date: b.date });
    });

  workouts
    .filter(w => w.run_type === 'tempo' && w.distance_km > 0 && w.duration_minutes > 0)
    .forEach(w => {
      const age = daysAgo(w.date, now);
      const ageFactor = age < 21 ? 0.88 : age < 42 ? 0.72 : age < 70 ? 0.55 : 0.35;
      efforts.push({ distKm: w.distance_km, timeSec: w.duration_minutes * 60 * 1.04, weight: 0.72 * ageFactor, sourceLabel: `Tempo run (${w.distance_km}km)`, type: 'tempo', date: w.date });
    });

  workouts
    .filter(w => w.run_type === 'interval' && w.distance_km >= 3 && w.duration_minutes > 0)
    .forEach(w => {
      const age = daysAgo(w.date, now);
      const ageFactor = age < 14 ? 0.80 : age < 42 ? 0.62 : age < 70 ? 0.45 : 0.25;
      efforts.push({ distKm: w.distance_km, timeSec: w.duration_minutes * 60 * 1.06, weight: 0.60 * ageFactor, sourceLabel: `Interval session (${w.distance_km}km)`, type: 'interval', date: w.date });
    });

  workouts
    .filter(w => w.run_type === 'long_run' && w.distance_km >= 14 && w.duration_minutes > 0)
    .forEach(w => {
      const age = daysAgo(w.date, now);
      const ageFactor = age < 21 ? 0.75 : age < 42 ? 0.60 : age < 70 ? 0.45 : 0.25;
      efforts.push({ distKm: w.distance_km, timeSec: w.duration_minutes * 60 * 1.22, weight: 0.55 * ageFactor, sourceLabel: `Long run (${w.distance_km}km)`, type: 'long_run', date: w.date });
    });

  activities
    .filter(a => a.sport === 'run' && a.distance_m >= 3000 && a.elapsed_sec > 0)
    .forEach(a => {
      const distKm = a.distance_m / 1000;
      const age = daysAgo(a.started_at, now);
      const ageFactor = age < 14 ? 0.65 : age < 42 ? 0.48 : age < 70 ? 0.32 : 0.15;
      efforts.push({ distKm, timeSec: a.elapsed_sec, weight: 0.45 * ageFactor, sourceLabel: `Activity: ${a.title || 'Run'}`, type: 'activity', date: a.started_at });
    });

  return efforts;
}

export function generatePredictions({ workouts = [], activities = [], benchmarks = [] }) {
  const now = new Date();
  const efforts = gatherEfforts(workouts, activities, benchmarks, now);
  if (efforts.length === 0) return null;

  const results = {};

  for (const [distLabel, targetKm] of Object.entries(RACE_DISTANCES)) {
    const projections = efforts
      .map(e => {
        const proj = riegelProject(e.timeSec, e.distKm, targetKm);
        if (!proj || proj <= 0) return null;
        return { projected: proj, weight: e.weight, sourceLabel: e.sourceLabel, type: e.type, date: e.date };
      })
      .filter(Boolean);

    if (projections.length === 0) { results[distLabel] = null; continue; }

    const sortedTimes = projections.map(p => p.projected).sort((a, b) => a - b);
    const q1 = sortedTimes[Math.floor(sortedTimes.length * 0.25)] || sortedTimes[0];
    const q3 = sortedTimes[Math.floor(sortedTimes.length * 0.75)] || sortedTimes[sortedTimes.length - 1];
    const iqr = q3 - q1;
    const filtered = projections.filter(p => p.projected >= q1 - 1.5 * iqr && p.projected <= q3 + 1.5 * iqr);
    const working = filtered.length > 0 ? filtered : projections;

    const totalWeight = working.reduce((s, p) => s + p.weight, 0);
    const weightedAvg = working.reduce((s, p) => s + p.projected * p.weight, 0) / totalWeight;
    const sorted = [...working].sort((a, b) => a.projected - b.projected);
    const median = sorted[Math.floor(sorted.length / 2)]?.projected || weightedAvg;
    const blended = weightedAvg * 0.60 + median * 0.40;

    const recentRaceOrBenchmark = working.filter(p => ['race', 'benchmark'].includes(p.type) && daysAgo(p.date, now) < 90).length;
    const recentHighQuality = working.filter(p => p.weight > 0.5).length;
    let confidence;
    if (recentRaceOrBenchmark >= 2 && recentHighQuality >= 3) confidence = 'high';
    else if (recentRaceOrBenchmark >= 1 || recentHighQuality >= 2) confidence = 'medium';
    else confidence = 'low';

    const flags = [];
    if (working.filter(p => daysAgo(p.date, now) < 56).length === 0) flags.push('No efforts in the last 8 weeks — predictions may be stale.');
    if (working.length === 1) flags.push('Only one data point found. Log more quality sessions for a reliable estimate.');
    if (distLabel === 'marathon' && !efforts.find(e => e.distKm >= 18 && e.type !== 'activity')) flags.push('No long run ≥18km logged — marathon estimate may be optimistic.');
    if (distLabel === 'half_marathon' && !efforts.find(e => e.distKm >= 12)) flags.push('No runs ≥12km in data — half marathon estimate is based on shorter efforts.');

    const topEvidence = [...working].sort((a, b) => b.weight - a.weight).slice(0, 3).map(p => p.sourceLabel);

    results[distLabel] = {
      predicted_time_sec: Math.round(blended),
      confidence,
      flags: flags.join(' '),
      topEvidence,
      projectionCount: working.length,
      paceSecPerKm: Math.round(blended / targetKm),
    };
  }

  return results;
}

export function generateExplanation(distLabel, newSec, oldSec, confidence, flags, topEvidence = []) {
  const lines = [];
  const label = DISTANCE_LABELS[distLabel] || distLabel;

  if (oldSec && newSec) {
    const diffSec = oldSec - newSec;
    if (Math.abs(diffSec) < 8) lines.push(`Your ${label} prediction is holding steady at ${formatTime(newSec)}.`);
    else if (diffSec > 0) lines.push(`Your ${label} prediction has improved by ${formatTime(Math.abs(diffSec))} since last calculation.`);
    else lines.push(`Your ${label} prediction has softened by ${formatTime(Math.abs(diffSec))}.`);
  } else {
    lines.push(`${label} prediction: ${formatTime(newSec)}, based on your logged training.`);
  }

  if (topEvidence.length > 0) lines.push(`Primary evidence: ${topEvidence.join(', ')}.`);

  if (confidence === 'high') lines.push('Confidence is high — supported by multiple recent race results or benchmark efforts.');
  else if (confidence === 'medium') lines.push('Confidence is moderate. A time trial or recent race result would sharpen this estimate significantly.');
  else lines.push('Confidence is low. Log a time trial, race, or several more quality sessions to improve accuracy.');

  if (flags) lines.push(flags);
  return lines.join(' ');
}

export function computeTrend(currentSec, previousSec) {
  if (!previousSec || !currentSec) return 'steady';
  const diff = previousSec - currentSec;
  if (diff > 15) return 'improving';
  if (diff < -15) return 'declining';
  return 'steady';
}

export function computeReadiness(workouts, targetDistKm) {
  const now = new Date();
  const last28 = workouts.filter(w => daysAgo(w.date, now) <= 28 && w.sport === 'run');
  const last7  = workouts.filter(w => daysAgo(w.date, now) <= 7  && w.sport === 'run');

  if (last28.length === 0) return 0;

  const freqScore = Math.min(100, (last28.length / 4) * 20);
  const weekVol = last7.reduce((s, w) => s + (w.distance_km || 0), 0);
  const volTarget = targetDistKm <= 1.7 ? 25 : targetDistKm <= 5 ? 30 : targetDistKm <= 10 ? 45 : targetDistKm <= 21 ? 60 : 80;
  const volScore = Math.min(100, (weekVol / volTarget) * 100);
  const qualityBonus = last28.some(w => ['tempo', 'interval', 'race'].includes(w.run_type)) ? 10 : 0;

  return Math.max(0, Math.min(100, Math.round(freqScore * 0.45 + volScore * 0.45 + qualityBonus)));
}