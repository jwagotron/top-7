/**
 * Race Prediction Engine
 * Rules-based, weighted model. Modular so a smarter model can be swapped in.
 * 
 * All distances stored in KM, times in seconds.
 */

// Riegel formula: T2 = T1 * (D2/D1)^1.06
export function riegelProject(timeSecAtKnownDist, knownDistKm, targetDistKm) {
  if (!timeSecAtKnownDist || !knownDistKm || !targetDistKm) return null;
  return timeSecAtKnownDist * Math.pow(targetDistKm / knownDistKm, 1.06);
}

// Distances in km
export const RACE_DISTANCES = {
  '1mi':           1.60934,
  '5K':            5,
  '10K':           10,
  'half_marathon': 21.0975,
  'marathon':      42.195,
};

export function formatTime(totalSec) {
  if (!totalSec) return '--';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function secToMinPerKm(sec, distKm) {
  if (!sec || !distKm) return null;
  return sec / distKm;
}

/**
 * Core prediction function.
 * Returns array of predictions for all distances.
 */
export function generatePredictions({ workouts = [], activities = [], raceGoals = [], benchmarks = [] }) {
  const now = new Date();
  const daysAgo = (d) => (now - new Date(d)) / (1000 * 86400);

  // --- Gather candidate efforts with weights ---
  const efforts = [];

  // Recent race results – highest weight
  workouts
    .filter(w => w.run_type === 'race' && w.distance_km && w.duration_minutes)
    .forEach(w => {
      const age = daysAgo(w.date);
      const ageFactor = age < 30 ? 1.0 : age < 60 ? 0.85 : age < 90 ? 0.7 : 0.5;
      efforts.push({
        distKm: w.distance_km,
        timeSec: w.duration_minutes * 60,
        weight: 1.0 * ageFactor,
        source: `Race: ${w.title}`,
        date: w.date,
      });
    });

  // Time trials
  workouts
    .filter(w => (w.run_type === 'interval' || w.title?.toLowerCase().includes('time trial')) && w.distance_km && w.duration_minutes)
    .forEach(w => {
      const age = daysAgo(w.date);
      const ageFactor = age < 14 ? 0.9 : age < 42 ? 0.75 : 0.5;
      efforts.push({
        distKm: w.distance_km,
        timeSec: w.duration_minutes * 60,
        weight: 0.85 * ageFactor,
        source: `Time Trial / Interval: ${w.title}`,
        date: w.date,
      });
    });

  // Benchmark efforts
  benchmarks.forEach(b => {
    if (!b.distance_km || !b.time_sec) return;
    const age = daysAgo(b.date);
    const ageFactor = age < 30 ? 1.0 : age < 60 ? 0.8 : 0.6;
    efforts.push({
      distKm: b.distance_km,
      timeSec: b.time_sec,
      weight: (b.effort_type === 'race' ? 1.0 : 0.8) * ageFactor * ((b.confidence_score || 75) / 100),
      source: `Benchmark: ${b.effort_type}`,
      date: b.date,
    });
  });

  // Tempo / threshold workouts — derive via pace
  workouts
    .filter(w => w.run_type === 'tempo' && w.distance_km && w.duration_minutes)
    .forEach(w => {
      const age = daysAgo(w.date);
      const ageFactor = age < 21 ? 0.85 : age < 42 ? 0.7 : 0.5;
      // Tempo pace ~approx 10K effort; project outward
      efforts.push({
        distKm: w.distance_km,
        timeSec: w.duration_minutes * 60 * 1.04, // slight penalty – not a true race
        weight: 0.75 * ageFactor,
        source: `Tempo: ${w.title}`,
        date: w.date,
      });
    });

  // Activities from Garmin
  activities
    .filter(a => a.sport === 'run' && a.distance_m && a.elapsed_sec)
    .forEach(a => {
      const distKm = a.distance_m / 1000;
      const age = daysAgo(a.started_at);
      const ageFactor = age < 14 ? 0.7 : age < 42 ? 0.55 : 0.35;
      efforts.push({
        distKm,
        timeSec: a.elapsed_sec,
        weight: 0.6 * ageFactor,
        source: `Activity: ${a.title || 'Garmin Run'}`,
        date: a.started_at,
      });
    });

  if (efforts.length === 0) return null;

  // --- For each target distance, project from all efforts ---
  const results = {};

  for (const [distLabel, targetKm] of Object.entries(RACE_DISTANCES)) {
    const projections = efforts
      .map(e => {
        const proj = riegelProject(e.timeSec, e.distKm, targetKm);
        if (!proj) return null;
        return { projected: proj, weight: e.weight, source: e.source, date: e.date };
      })
      .filter(Boolean);

    if (projections.length === 0) {
      results[distLabel] = null;
      continue;
    }

    // Weighted average, then smooth against median to avoid outliers
    const totalWeight = projections.reduce((s, p) => s + p.weight, 0);
    const weightedAvg = projections.reduce((s, p) => s + p.projected * p.weight, 0) / totalWeight;

    const sorted = [...projections].sort((a, b) => a.projected - b.projected);
    const median = sorted[Math.floor(sorted.length / 2)]?.projected || weightedAvg;

    // Blend weighted avg (70%) with median (30%) to dampen outliers
    const blended = weightedAvg * 0.7 + median * 0.3;

    // Confidence
    const recentHighWeight = projections.filter(p => p.weight > 0.6).length;
    let confidence = 'low';
    if (recentHighWeight >= 3) confidence = 'high';
    else if (recentHighWeight >= 1) confidence = 'medium';

    // Data quality
    const flags = [];
    if (projections.length < 2) flags.push('Limited data — only one effort found.');
    if (projections.filter(p => new Date(p.date) > new Date(Date.now() - 42 * 86400000)).length === 0)
      flags.push('No recent (6-week) efforts found.');
    if (distLabel === 'marathon' && !efforts.find(e => e.distKm >= 16))
      flags.push('No long run data ≥16 km — marathon prediction may be optimistic.');

    // Best evidence
    const bestEvidence = projections
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map(p => p.source)
      .join('; ');

    results[distLabel] = {
      predicted_time_sec: Math.round(blended),
      confidence,
      flags: flags.join(' '),
      best_evidence: bestEvidence,
      projection_count: projections.length,
    };
  }

  return results;
}

/**
 * Generate a human-language explanation comparing new vs old predictions.
 */
export function generateExplanation(distLabel, newSec, oldSec, confidence, flags, bestEvidence) {
  const lines = [];
  if (oldSec && newSec) {
    const diffSec = oldSec - newSec; // positive = improvement
    if (Math.abs(diffSec) < 5) {
      lines.push(`Your ${distLabel} prediction is holding steady.`);
    } else if (diffSec > 0) {
      lines.push(`Your ${distLabel} prediction improved by ${formatTime(Math.abs(diffSec))} this week.`);
    } else {
      lines.push(`Your ${distLabel} prediction slipped by ${formatTime(Math.abs(diffSec))} — this may reflect increased fatigue or less quality data.`);
    }
  } else {
    lines.push(`First ${distLabel} prediction generated based on your recent training.`);
  }
  if (bestEvidence) lines.push(`Best supporting data: ${bestEvidence}.`);
  if (flags) lines.push(`⚠️ ${flags}`);
  if (confidence === 'high') lines.push('Confidence is high — strong recent data supports this estimate.');
  else if (confidence === 'medium') lines.push('Confidence is medium — a few more quality sessions will sharpen this.');
  else lines.push('Confidence is low — log more structured workouts or a time trial to improve accuracy.');
  return lines.join(' ');
}

/**
 * Compute trend across recent predictions.
 */
export function computeTrend(currentSec, previousSec) {
  if (!previousSec || !currentSec) return 'steady';
  const diff = previousSec - currentSec;
  if (diff > 10) return 'improving';
  if (diff < -10) return 'declining';
  return 'steady';
}

/**
 * Readiness score 0-100 based on recent volume, consistency, and recency.
 */
export function computeReadiness(workouts, targetDistKm) {
  const now = new Date();
  const last28 = workouts.filter(w => (now - new Date(w.date)) / 86400000 < 28 && w.sport === 'run');
  const last7 = workouts.filter(w => (now - new Date(w.date)) / 86400000 < 7 && w.sport === 'run');

  const weeklyCount = last28.length / 4;
  const consistencyScore = Math.min(100, weeklyCount * 20); // 5 runs/week = 100

  const weekVol = last7.reduce((s, w) => s + (w.distance_km || 0), 0);
  // Rough target weekly volume by distance
  const volTarget = targetDistKm < 5 ? 20 : targetDistKm < 10 ? 30 : targetDistKm < 21 ? 50 : 70;
  const volScore = Math.min(100, (weekVol / volTarget) * 100);

  const hasSomeData = last28.length > 0 ? 1 : 0;
  const readiness = hasSomeData ? Math.round(consistencyScore * 0.5 + volScore * 0.5) : 0;
  return Math.max(0, Math.min(100, readiness));
}