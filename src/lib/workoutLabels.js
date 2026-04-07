// Map run types to short codes for calendar display
export const RUN_TYPE_CODES = {
  easy: 'E',
  long_run: 'LR',
  tempo: 'T',
  interval: 'I',
  fartlek: 'FK',
  hill_repeats: 'H',
  race: 'R',
  recovery: 'REC',
  progression: 'P',
};

// Map intensities to short codes
export const INTENSITY_CODES = {
  easy: 'E',
  moderate: 'M',
  hard: 'HD',
  race_pace: 'RP',
  recovery: 'REC',
};

// Color mapping for workout types
export const WORKOUT_COLORS = {
  easy: 'bg-green-500/80 text-white',
  long_run: 'bg-blue-500/80 text-white',
  tempo: 'bg-orange-500/80 text-white',
  interval: 'bg-red-500/80 text-white',
  fartlek: 'bg-purple-500/80 text-white',
  hill_repeats: 'bg-orange-600/80 text-white',
  race: 'bg-red-600/80 text-white',
  recovery: 'bg-slate-400/80 text-white',
  progression: 'bg-teal-500/80 text-white',
};

// Fallback color for non-run workouts
export const DEFAULT_SPORT_COLORS = {
  run: 'bg-blue-500/80 text-white',
  bike: 'bg-purple-500/80 text-white',
  swim: 'bg-cyan-500/80 text-white',
  strength: 'bg-amber-600/80 text-white',
  other: 'bg-slate-500/80 text-white',
};

export function getWorkoutLabel(workout) {
  if (workout.run_type && RUN_TYPE_CODES[workout.run_type]) {
    return RUN_TYPE_CODES[workout.run_type];
  }
  if (workout.intensity && INTENSITY_CODES[workout.intensity]) {
    return INTENSITY_CODES[workout.intensity];
  }
  return workout.sport?.charAt(0).toUpperCase() || '●';
}

export function getWorkoutColor(workout) {
  if (workout.run_type && WORKOUT_COLORS[workout.run_type]) {
    return WORKOUT_COLORS[workout.run_type];
  }
  if (workout.sport && DEFAULT_SPORT_COLORS[workout.sport]) {
    return DEFAULT_SPORT_COLORS[workout.sport];
  }
  return 'bg-slate-500/80 text-white';
}