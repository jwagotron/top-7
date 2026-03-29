/**
 * Streak Engine
 * Evaluates training data and returns current streak statuses.
 * Modular — can be extended with coach overrides, grace logic, etc.
 */

export const STREAK_TYPES = {
  completed_planned_workouts: {
    label: 'Workout Consistency',
    description: 'Complete all planned workouts each week',
    icon: '🎯',
    unit: 'weeks',
  },
  hit_target_pace: {
    label: 'Pace Execution',
    description: 'Hit target pace in structured sessions',
    icon: '⚡',
    unit: 'sessions',
  },
  hit_heart_rate_zone: {
    label: 'Heart Rate Discipline',
    description: 'Stay in target HR zone during easy runs',
    icon: '❤️',
    unit: 'sessions',
  },
  long_run_completion: {
    label: 'Long Run Streak',
    description: 'Complete your weekly long run',
    icon: '🏃',
    unit: 'weeks',
  },
  weekly_consistency: {
    label: 'Weekly Consistency',
    description: 'Hit weekly training targets 3+ days',
    icon: '📅',
    unit: 'weeks',
  },
  recovery_discipline: {
    label: 'Recovery Discipline',
    description: 'Keep easy runs truly easy (low HR)',
    icon: '😌',
    unit: 'sessions',
  },
  coach_feedback_submission: {
    label: 'Coach Feedback',
    description: 'Submit workout feedback to your coach',
    icon: '💬',
    unit: 'sessions',
  },
  no_missed_key_workouts: {
    label: 'Key Workout Streak',
    description: 'Never miss a key (tempo/interval/race) session',
    icon: '🔑',
    unit: 'weeks',
  },
};

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90];

export function getMilestoneLabel(count) {
  if (count >= 90) return { emoji: '🏆', label: 'Legend' };
  if (count >= 60) return { emoji: '💎', label: 'Diamond' };
  if (count >= 30) return { emoji: '🥇', label: 'Gold' };
  if (count >= 21) return { emoji: '🥈', label: 'Silver' };
  if (count >= 14) return { emoji: '🥉', label: 'Bronze' };
  if (count >= 7) return { emoji: '⭐', label: '1 Week' };
  if (count >= 3) return { emoji: '🔥', label: 'Getting Started' };
  return { emoji: '🌱', label: 'New' };
}

export function getRiskLevel(streak, daysSinceLastQualified) {
  if (!streak.last_qualified_at) return 'high';
  const days = daysSinceLastQualified;
  const unit = STREAK_TYPES[streak.streak_type]?.unit;
  if (unit === 'weeks') {
    if (days > 14) return 'high';
    if (days > 7) return 'medium';
    if (days > 5) return 'low';
  } else {
    if (days > 10) return 'high';
    if (days > 5) return 'medium';
    if (days > 3) return 'low';
  }
  return 'none';
}

/**
 * Compute derived streak statuses from raw workout data.
 * Returns map of streak_type -> { current_count, status, risk_level, last_qualified_at, explanation }
 */
export function computeStreaksFromWorkouts(workouts = [], plannedWorkouts = [], existingStreaks = []) {
  const now = new Date();
  const results = {};

  for (const [type, meta] of Object.entries(STREAK_TYPES)) {
    const existing = existingStreaks.find(s => s.streak_type === type);
    results[type] = computeSingleStreak(type, workouts, plannedWorkouts, existing, now);
  }

  return results;
}

function computeSingleStreak(type, workouts, plannedWorkouts, existing, now) {
  const base = {
    current_count: existing?.current_count || 0,
    best_count: existing?.best_count || 0,
    status: existing?.status || 'active',
    last_qualified_at: existing?.last_qualified_at || null,
    risk_level: 'none',
    explanation: '',
  };

  const last28 = workouts.filter(w => daysDiff(now, w.date) <= 28);
  const last7 = workouts.filter(w => daysDiff(now, w.date) <= 7);
  const daysSinceLast = base.last_qualified_at ? daysDiff(now, base.last_qualified_at) : 999;

  switch (type) {
    case 'completed_planned_workouts': {
      const planned = plannedWorkouts.filter(p => p.scheduled_date && daysDiff(now, p.scheduled_date) <= 7);
      const completed = planned.filter(p => p.status === 'completed').length;
      const total = planned.length;
      const qualified = total > 0 && completed === total;
      base.explanation = total === 0
        ? 'No planned workouts this week.'
        : qualified
          ? `Completed all ${total} planned workout${total > 1 ? 's' : ''} this week! Streak continues.`
          : `${completed}/${total} planned workouts completed this week. Finish the rest to extend your streak.`;
      if (qualified) {
        base.last_qualified_at = now.toISOString().slice(0, 10);
        base.current_count = (base.current_count || 0) + 1;
      }
      break;
    }

    case 'hit_target_pace': {
      const structured = last7.filter(w => ['tempo', 'interval', 'fartlek'].includes(w.run_type));
      const onTarget = structured.filter(w => w.perceived_effort && w.perceived_effort <= 7).length;
      const qualified = structured.length > 0 && onTarget === structured.length;
      base.explanation = structured.length === 0
        ? 'No structured sessions this week.'
        : qualified
          ? `Hit pace targets in all ${structured.length} structured session${structured.length > 1 ? 's' : ''}.`
          : `Pace targets met in ${onTarget}/${structured.length} sessions.`;
      break;
    }

    case 'hit_heart_rate_zone': {
      const easyRuns = last7.filter(w => w.run_type === 'easy' && w.avg_heart_rate);
      const disciplined = easyRuns.filter(w => w.avg_heart_rate < 155).length;
      const qualified = easyRuns.length > 0 && disciplined === easyRuns.length;
      base.explanation = easyRuns.length === 0
        ? 'No easy runs with HR data this week.'
        : qualified
          ? `Kept HR disciplined in all ${easyRuns.length} easy runs.`
          : `${disciplined}/${easyRuns.length} easy runs had controlled HR.`;
      break;
    }

    case 'long_run_completion': {
      const longRun = last7.find(w => w.run_type === 'long_run');
      const qualified = !!longRun;
      base.explanation = qualified
        ? `Long run completed: ${longRun.title}.`
        : 'No long run logged this week.';
      break;
    }

    case 'weekly_consistency': {
      const runDays = new Set(last7.filter(w => w.sport === 'run').map(w => w.date)).size;
      const qualified = runDays >= 3;
      base.explanation = `${runDays}/7 days with a run this week. Need 3+ to qualify.`;
      if (qualified) base.explanation = `Strong week — ${runDays} run days logged.`;
      break;
    }

    case 'recovery_discipline': {
      const easy = last7.filter(w => w.run_type === 'easy' || w.run_type === 'recovery');
      const lowEffort = easy.filter(w => (!w.perceived_effort || w.perceived_effort <= 4) && (!w.avg_heart_rate || w.avg_heart_rate < 150));
      const qualified = easy.length > 0 && lowEffort.length === easy.length;
      base.explanation = easy.length === 0
        ? 'No easy/recovery runs this week.'
        : qualified
          ? `All ${easy.length} recovery runs kept truly easy.`
          : `${lowEffort.length}/${easy.length} recovery sessions were truly easy.`;
      break;
    }

    case 'coach_feedback_submission': {
      const withFeedback = last7.filter(w => w.notes && w.notes.length > 10);
      const qualified = withFeedback.length > 0;
      base.explanation = qualified
        ? `Submitted feedback on ${withFeedback.length} workout${withFeedback.length > 1 ? 's' : ''} this week.`
        : 'No workout feedback submitted this week. Add notes to your runs.';
      break;
    }

    case 'no_missed_key_workouts': {
      const keyPlanned = plannedWorkouts.filter(p =>
        ['tempo', 'interval', 'race'].includes(p.run_type) && daysDiff(now, p.scheduled_date) <= 7
      );
      const missed = keyPlanned.filter(p => p.status === 'skipped').length;
      const qualified = keyPlanned.length > 0 && missed === 0;
      base.explanation = keyPlanned.length === 0
        ? 'No key workouts scheduled this week.'
        : qualified
          ? `All ${keyPlanned.length} key workouts executed — streak protected.`
          : `${missed} key workout${missed > 1 ? 's' : ''} missed this week — streak reset.`;
      if (missed > 0) {
        base.current_count = 0;
        base.status = 'broken';
      }
      break;
    }

    default:
      break;
  }

  base.risk_level = getRiskLevel(base, daysSinceLast);
  if (base.current_count > base.best_count) base.best_count = base.current_count;

  return base;
}

function daysDiff(now, dateStr) {
  return Math.abs((now - new Date(dateStr)) / 86400000);
}

export function computeDisciplineScore(streakData) {
  const types = Object.keys(STREAK_TYPES);
  if (types.length === 0) return 0;
  const weights = {
    no_missed_key_workouts: 2,
    completed_planned_workouts: 2,
    weekly_consistency: 1.5,
    hit_target_pace: 1.5,
    long_run_completion: 1,
    recovery_discipline: 1,
    hit_heart_rate_zone: 1,
    coach_feedback_submission: 0.5,
  };
  let totalWeight = 0, score = 0;
  for (const [type, s] of Object.entries(streakData)) {
    const w = weights[type] || 1;
    totalWeight += w;
    const active = s.status !== 'broken';
    const streak = Math.min(s.current_count || 0, 10);
    score += active ? w * (0.5 + streak * 0.05) : 0;
  }
  return Math.round((score / totalWeight) * 100);
}