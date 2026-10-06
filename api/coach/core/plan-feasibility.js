import { movementOf, isMainMovement } from './movement-patterns.js';

// Advisory relationships, not inferred anatomy, safety or a mandatory exercise order.
const FATIGUES = {
  elbow_flexion: ['horizontal_pull', 'vertical_pull'],
  elbow_extension: ['horizontal_push', 'vertical_push'],
  wrist_flexion: ['horizontal_pull', 'vertical_pull', 'hinge'],
  shoulder_isolation: ['horizontal_push', 'vertical_push'],
  knee_flexion: ['hinge', 'hip_extension'],
  core: ['squat', 'lunge', 'hinge']
};
export function orderConcern(routine) {
  const accessories = [];
  for (const exercise of routine.ex || []) {
    const pattern = movementOf(exercise.id);
    if (isMainMovement(exercise.id)) {
      const earlier = accessories.find(e => FATIGUES[movementOf(e.id)]?.includes(pattern));
      if (earlier) return { accessoryId: earlier.id, mainId: exercise.id };
    } else if (FATIGUES[pattern]) accessories.push(exercise);
  }
  return null;
}

/** Same 2–3 minute straight-set heuristic as create.md. Not a promise of session length.
 * Superset rest/transition timing is unknown; do not fabricate a time saving from sg.
 * Time/cardio prescriptions have explicit active duration; upper bound adds 1 min per timed set.
 * Warm-up, equipment waits and transitions are not included. */
export function routineTimeEstimate(routine) {
  if ((routine.ex || []).some(e => e.sg)) return { min: null, max: null, supersets: true };
  let min = 0, max = 0;
  for (const exercise of routine.ex || []) {
    const sets = Number.isInteger(exercise.sets) && exercise.sets > 0 ? exercise.sets : 0;
    if (exercise.mode === 'cardio' || (!exercise.mode && (exercise.min != null || exercise.speed != null))) {
      if (!(exercise.min > 0)) return { min: null, max: null, incomplete: true };
      min += sets * exercise.min; max += sets * exercise.min;
    } else if (exercise.mode === 'time') {
      if (!(exercise.sec > 0)) return { min: null, max: null, incomplete: true };
      min += sets * exercise.sec / 60; max += sets * (exercise.sec / 60 + 1);
    } else {
      min += sets * 2; max += sets * 3;
    }
  }
  return { min: Math.ceil(min), max: Math.ceil(max) };
}
