/**
 * Streak Engine — Discipline & Execution Tracking
 * Tracks meaningful training behaviors, not arbitrary activity counts.
 * Philosophy: streaks must reflect real discipline, not just showing up.
 */

export const STREAK_TYPES = {
  no_missed_key_workouts: {
    label: 'Key Session Execution',
    description: 'Never skip a scheduled tempo, interval, or race workout.',
    unit: 'weeks',
    weight: 2.5,
  },
  completed_planned_workouts: {
    label: 'Plan Adherence',
    description: 'Complete every workout on your weekly plan.',
    unit: 'weeks',
    weight: 2.0,
  },
  weekly_consistency: {
    label: 'Training Frequency',
    description: 'Run at least 4 days in the week.',
    unit: 'weeks',
    weight: 1.5,
  },
  hit_target_pace: {
    label: 'Pace Execution',
    description: 'Hit prescribed effort in all structured sessions (RPE ≤ 7).',
    unit: 'sessions',
    weight: 1.5,
  },
  long_run_completion: {
    label: 'Long Run',
    description: 'Complete your scheduled long run each week.',
    unit: 'weeks',
    weight: 1.5,
  },
  recovery_discipline: {
    label: 'Recovery Control',
    description: 'Keep all easy and recovery runs genuinely easy (RPE ≤ 4, HR < 150).',
    unit: 'sessions',
    weight: 1.5,
  },
  hit_heart_rate_zone: {
    label: 'Zone Discipline',
    description: 'Maintain aerobic zone HR during easy runs.',
    unit: 'sessions',
    weight: 1.0,
  },
  coach_feedback_submission: {
    label: 'Feedback Submission',
    description: 'Submit post-workout notes to your coach after every session.',
    unit: 'sessions',
    weight: 0.5,
  },
};

// How many consecutive units = each milestone tier
export const MILESTONE_TIERS = [
  { threshold: 52, label: 'Year Streak', rank: 6 },
  { threshold: 26, label: '6 Months',    rank: 5 },
  { threshold: 12, label: '3 Months',    rank: 4 },
  { threshold: 8,  label: '2 Months',    rank: 3 },
  { threshold: 4,  label: '1 Month',     rank: 2 },
  { threshold: 1,  label: 'Active',      rank: 1 },
];

export function getMilestoneTier(count) {
  for (const t of MILESTONE_TIERS) {
    if (count >= t.threshold) return t;
  }
  return { threshold: 0, label: 'Not started', rank: 0 };
}

export function getRiskLevel(lastQualifiedAt, unit) {
  if (!lastQualifiedAt) return 'high';
  const days = (new Date() - new Date(lastQualifiedAt)) / 86400000;
  if (unit === 'weeks') {
    if (days > 14) return 'high';
    if (days > 9)  return 'medium';
    if (days > 6)  return 'low';
  } else {
    if (days > 12) return 'high';
    if (days > 7)  return 'medium';
    if (days > 4)  return 'low';
  }
  return 'none';
}

function daysDiff(now, dateStr) {
  if (!dateStr) return 9999;
  return Math.abs((now - new Date(dateStr)) / 86400000);
}

/**
 * Compute all streak statuses from raw training data.
 * Returns map of streak_type → computed status object.
 */
export function computeStreaksFromWorkouts(workouts = [], plannedWorkouts = [], existingStreaks = []) {
  const now = new Date();
  const results = {};
  for (const type of Object.keys(STREAK_TYPES)) {
    const existing = existingStreaks.find(s => s.streak_type === type);
    results[type] = computeSingleStreak(type, workouts, plannedWorkouts, existing, now);
  }
  return results;
}

function computeSingleStreak(type, workouts, plannedWorkouts, existing, now) {
  const state = {
    current_count: existing?.current_count || 0,
    best_count:    existing?.best_count    || 0,
    status:        existing?.status        || 'active',
    last_qualified_at: existing?.last_qualified_at || null,
    risk_level: 'none',
    explanation: '',
    this_week_status: null, // 'pass' | 'fail' | 'pending'
  };

  const meta = STREAK_TYPES[type];
  const last7  = workouts.filter(w => daysDiff(now, w.date) <= 7);

  switch (type) {

    case 'no_missed_key_workouts': {
      const keyPlanned = plannedWorkouts.filter(p =>
        ['tempo', 'interval', 'race'].includes(p.run_type) && daysDiff(now, p.scheduled_date) <= 7
      );
      const missed = keyPlanned.filter(p => p.status === 'skipped').length;
      const upcoming = keyPlanned.filter(p => p.status === 'upcoming').length;

      if (keyPlanned.length === 0) {
        state.explanation = 'No key sessions scheduled this week.';
        state.this_week_status = 'pending';
      } else if (missed > 0) {
        state.explanation = `${missed} key session${missed > 1 ? 's' : ''} skipped this week — streak broken.`;
        state.this_week_status = 'fail';
        state.status = 'broken';
        state.current_count = 0;
      } else if (upcoming > 0) {
        state.explanation = `${keyPlanned.length - upcoming}/${keyPlanned.length} key sessions done. ${upcoming} remaining this week.`;
        state.this_week_status = 'pending';
      } else {
        state.explanation = `All ${keyPlanned.length} key session${keyPlanned.length > 1 ? 's' : ''} completed.`;
        state.this_week_status = 'pass';
      }
      break;
    }

    case 'completed_planned_workouts': {
      const planned = plannedWorkouts.filter(p => p.scheduled_date && daysDiff(now, p.scheduled_date) <= 7);
      const completed = planned.filter(p => p.status === 'completed').length;
      const total = planned.length;
      const remaining = planned.filter(p => p.status === 'upcoming').length;

      if (total === 0) {
        state.explanation = 'No workouts planned this week.';
        state.this_week_status = 'pending';
      } else if (remaining > 0) {
        state.explanation = `${completed}/${total} completed. ${remaining} remaining to protect the streak.`;
        state.this_week_status = 'pending';
      } else if (completed === total) {
        state.explanation = `All ${total} planned sessions completed this week.`;
        state.this_week_status = 'pass';
      } else {
        state.explanation = `${completed}/${total} completed — ${total - completed} missed this week.`;
        state.this_week_status = 'fail';
      }
      break;
    }

    case 'weekly_consistency': {
      const runDays = new Set(last7.filter(w => w.sport === 'run').map(w => w.date.slice(0, 10))).size;
      const target = 4;
      if (runDays >= target) {
        state.explanation = `${runDays} run days this week — consistency maintained.`;
        state.this_week_status = 'pass';
      } else {
        state.explanation = `${runDays}/${target} run days logged. ${target - runDays} more needed to qualify.`;
        state.this_week_status = runDays === 0 ? 'fail' : 'pending';
      }
      break;
    }

    case 'hit_target_pace': {
      const structured = last7.filter(w => ['tempo', 'interval', 'fartlek'].includes(w.run_type));
      if (structured.length === 0) {
        state.explanation = 'No structured sessions this week.';
        state.this_week_status = 'pending';
      } else {
        const onTarget = structured.filter(w => w.perceived_effort && w.perceived_effort >= 6 && w.perceived_effort <= 8).length;
        if (onTarget === structured.length) {
          state.explanation = `Executed all ${structured.length} structured session${structured.length > 1 ? 's' : ''} at prescribed effort.`;
          state.this_week_status = 'pass';
        } else {
          state.explanation = `${onTarget}/${structured.length} sessions hit target effort (RPE 6–8). Log RPE to qualify.`;
          state.this_week_status = 'pending';
        }
      }
      break;
    }

    case 'long_run_completion': {
      const longRun = last7.find(w => w.run_type === 'long_run');
      if (longRun) {
        state.explanation = `Long run completed: ${longRun.title}${longRun.distance_km ? ` (${longRun.distance_km}km)` : ''}.`;
        state.this_week_status = 'pass';
      } else {
        const plannedLong = plannedWorkouts.find(p => p.run_type === 'long_run' && daysDiff(now, p.scheduled_date) <= 7 && p.status === 'upcoming');
        state.explanation = plannedLong
          ? `Long run scheduled for ${plannedLong.scheduled_date} — not yet completed.`
          : 'No long run logged or scheduled this week.';
        state.this_week_status = plannedLong ? 'pending' : 'fail';
      }
      break;
    }

    case 'recovery_discipline': {
      const easyRuns = last7.filter(w => w.run_type === 'easy' || w.run_type === 'recovery');
      if (easyRuns.length === 0) {
        state.explanation = 'No easy or recovery runs this week.';
        state.this_week_status = 'pending';
      } else {
        const controlled = easyRuns.filter(w =>
          (!w.perceived_effort || w.perceived_effort <= 4) &&
          (!w.avg_heart_rate   || w.avg_heart_rate   < 150)
        ).length;
        if (controlled === easyRuns.length) {
          state.explanation = `All ${easyRuns.length} easy run${easyRuns.length > 1 ? 's' : ''} kept genuinely easy.`;
          state.this_week_status = 'pass';
        } else {
          state.explanation = `${controlled}/${easyRuns.length} easy sessions were genuinely easy. Log RPE and HR to track.`;
          state.this_week_status = 'pending';
        }
      }
      break;
    }

    case 'hit_heart_rate_zone': {
      const easyWithHR = last7.filter(w => (w.run_type === 'easy' || w.run_type === 'recovery') && w.avg_heart_rate);
      if (easyWithHR.length === 0) {
        state.explanation = 'No easy runs with HR data logged this week.';
        state.this_week_status = 'pending';
      } else {
        const inZone = easyWithHR.filter(w => w.avg_heart_rate < 152).length;
        if (inZone === easyWithHR.length) {
          state.explanation = `HR stayed aerobic across all ${easyWithHR.length} easy session${easyWithHR.length > 1 ? 's' : ''}.`;
          state.this_week_status = 'pass';
        } else {
          state.explanation = `${inZone}/${easyWithHR.length} easy runs kept HR below aerobic threshold (152 bpm).`;
          state.this_week_status = 'pending';
        }
      }
      break;
    }

    case 'coach_feedback_submission': {
      const logged = last7.filter(w => w.notes && w.notes.trim().length > 15);
      const total7 = last7.length;
      if (total7 === 0) {
        state.explanation = 'No workouts logged this week.';
        state.this_week_status = 'pending';
      } else if (logged.length === total7) {
        state.explanation = `Feedback submitted on all ${total7} workout${total7 > 1 ? 's' : ''} this week.`;
        state.this_week_status = 'pass';
      } else {
        state.explanation = `${logged.length}/${total7} workouts have notes. Add feedback to remaining sessions.`;
        state.this_week_status = 'pending';
      }
      break;
    }

    default:
      break;
  }

  state.risk_level = getRiskLevel(state.last_qualified_at, meta.unit);
  if (state.current_count > state.best_count) state.best_count = state.current_count;

  return state;
}

/**
 * Discipline score 0–100 for an athlete based on their computed streaks.
 * Weighted by importance of each streak type.
 */
export function computeDisciplineScore(streakData) {
  let totalWeight = 0;
  let score = 0;

  for (const [type, s] of Object.entries(streakData)) {
    const w = STREAK_TYPES[type]?.weight || 1;
    totalWeight += w;

    if (s.status === 'broken') {
      score += 0; // broken = zero contribution
    } else if (s.this_week_status === 'pass') {
      score += w * 1.0;
    } else if (s.this_week_status === 'pending') {
      score += w * 0.6;
    } else {
      // fallback: use streak length as proxy
      const streakProxy = Math.min(s.current_count || 0, 12) / 12;
      score += w * (0.4 + streakProxy * 0.4);
    }
  }

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Produce a compact athlete status for the coach roster view.
 * Returns: { disciplineScore, atRisk: string[], passing: string[], totalStreaks }
 */
export function getAthleteRosterStatus(streakData) {
  const atRisk = [];
  const passing = [];

  for (const [type, s] of Object.entries(streakData)) {
    const label = STREAK_TYPES[type]?.label || type;
    if (s.status === 'broken' || s.risk_level === 'high' || s.this_week_status === 'fail') {
      atRisk.push(label);
    } else if (s.this_week_status === 'pass') {
      passing.push(label);
    }
  }

  return {
    disciplineScore: computeDisciplineScore(streakData),
    atRisk,
    passing,
    totalStreaks: Object.keys(streakData).length,
  };
}