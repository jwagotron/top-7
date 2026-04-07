// Map run types to readable short labels for calendar display
export const RUN_TYPE_LABELS = {
  easy: 'Easy',
  long_run: 'Long',
  tempo: 'Tempo',
  interval: 'Intervals',
  fartlek: 'Fartlek',
  hill_repeats: 'Hills',
  race: 'Race',
  recovery: 'Recovery',
  progression: 'Progression',
};

// Map intensities to readable short labels
export const INTENSITY_LABELS = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  race_pace: 'Race',
  recovery: 'Recovery',
};

// Color mapping for workout types - subtle for dark mode
export const WORKOUT_COLORS = {
  easy: 'bg-green-500/75 text-white hover:bg-green-600',
  long_run: 'bg-blue-500/75 text-white hover:bg-blue-600',
  tempo: 'bg-cyan-500/75 text-white hover:bg-cyan-600',
  interval: 'bg-orange-500/75 text-white hover:bg-orange-600',
  fartlek: 'bg-purple-500/75 text-white hover:bg-purple-600',
  hill_repeats: 'bg-orange-600/75 text-white hover:bg-orange-700',
  race: 'bg-red-500/75 text-white hover:bg-red-600',
  recovery: 'bg-slate-500/75 text-white hover:bg-slate-600',
  progression: 'bg-teal-500/75 text-white hover:bg-teal-600',
};

// Fallback color for non-run workouts
export const DEFAULT_SPORT_COLORS = {
  run: 'bg-blue-500/75 text-white hover:bg-blue-600',
  bike: 'bg-purple-500/75 text-white hover:bg-purple-600',
  swim: 'bg-cyan-500/75 text-white hover:bg-cyan-600',
  strength: 'bg-amber-600/75 text-white hover:bg-amber-700',
  other: 'bg-slate-500/75 text-white hover:bg-slate-600',
};

export function getWorkoutLabel(workout) {
  // Prefer run_type label first
  if (workout.run_type && RUN_TYPE_LABELS[workout.run_type]) {
    return RUN_TYPE_LABELS[workout.run_type];
  }
  // Fall back to intensity label
  if (workout.intensity && INTENSITY_LABELS[workout.intensity]) {
    return INTENSITY_LABELS[workout.intensity];
  }
  // Fall back to sport name
  if (workout.sport === 'run') return 'Run';
  if (workout.sport === 'bike') return 'Bike';
  if (workout.sport === 'swim') return 'Swim';
  if (workout.sport === 'strength') return 'Strength';
  return 'Workout';
}

export function getWorkoutColor(workout) {
  if (workout.run_type && WORKOUT_COLORS[workout.run_type]) {
    return WORKOUT_COLORS[workout.run_type];
  }
  if (workout.sport && DEFAULT_SPORT_COLORS[workout.sport]) {
    return DEFAULT_SPORT_COLORS[workout.sport];
  }
  return 'bg-slate-500/75 text-white hover:bg-slate-600';
}