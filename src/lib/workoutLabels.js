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

// Color mapping for workout types - soft, premium palette
export const WORKOUT_COLORS = {
  easy: 'bg-emerald-500 text-white',
  long_run: 'bg-blue-500 text-white',
  tempo: 'bg-cyan-500 text-white',
  interval: 'bg-orange-500 text-white',
  fartlek: 'bg-purple-500 text-white',
  hill_repeats: 'bg-orange-600 text-white',
  race: 'bg-red-500 text-white',
  recovery: 'bg-slate-500 text-white',
  progression: 'bg-teal-500 text-white',
};

// Fallback color for non-run workouts
export const DEFAULT_SPORT_COLORS = {
  run: 'bg-blue-500 text-white',
  bike: 'bg-purple-500 text-white',
  swim: 'bg-cyan-500 text-white',
  strength: 'bg-amber-600 text-white',
  other: 'bg-slate-500 text-white',
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