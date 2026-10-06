import { LIB_BY_ID, isStretch } from './library.js';
import { MUSCLE_GROUPS } from './library-data.js';

export const MUSCLE_VOLUME_VERSION = 'coach-muscle-volume/v1';
// Body parts only bound uncertainty. They never award muscle sets.
const POSSIBLE = {
  chest: ['chest'], back: ['upper-back', 'lower-back', 'trapezius'],
  shoulders: ['deltoids', 'trapezius'],
  'upper arms': ['biceps', 'triceps', 'chest', 'upper-back'],
  'lower arms': ['forearm'], 'lower legs': ['calves', 'tibialis'],
  'upper legs': ['quadriceps', 'hamstring', 'gluteal', 'adductors', 'hip-flexors', 'lower-back'],
  waist: ['abs', 'obliques', 'hip-flexors', 'lower-back'], neck: ['trapezius'], cardio: []
};
const MAJOR = ['chest', 'upper-back', 'quadriceps', 'hamstring', 'gluteal'];
const hasRepSets = row => {
  if (row.mode) return row.mode === 'reps';
  return row.sec == null && row.min == null && row.speed == null;
};

/** Scheduled prescribed sets, not effective sets or a physiological dose.
 * Primary/supporting counts stay separate; legacy targets can omit primary roles.
 * Unknown/custom/timed work cannot prove absence. No universal weekly minimum. */
export function assessMuscleVolume(plan, { requirements = {}, candidateIds = [] } = {}) {
  const byMuscle = Object.fromEntries(MUSCLE_GROUPS.map(m => [m, { primarySets: 0, supportingSets: 0, days: 0, uncertain: false }]));
  const days = Object.fromEntries(MUSCLE_GROUPS.map(m => [m, new Set()]));
  const byDay = {};
  const routines = new Map((plan.routines || []).map(r => [r.id, r]));
  let partialRows = 0, unmeasuredRows = 0;
  for (const [day, ids] of Object.entries(plan.week || {})) {
    if (!/^[0-6]$/.test(day)) continue;
    byDay[day] = {};
    for (const id of [].concat(ids || [])) for (const row of routines.get(id)?.ex || []) {
      const exercise = LIB_BY_ID.get(row.id), roles = exercise?.muscles;
      const primaries = roles?.primaries || [], secondaries = roles?.secondaries || [];
      const sets = Number.isInteger(row.sets) && row.sets > 0 ? row.sets : 0;
      const measured = hasRepSets(row) && !isStretch(exercise) && sets > 0;
      if (!measured) unmeasuredRows++;
      if (!roles || roles.source !== 'explicit') partialRows++;
      if (!measured || !roles || roles.source !== 'explicit') {
        const possible = exercise ? (POSSIBLE[exercise.bp] || MUSCLE_GROUPS) : MUSCLE_GROUPS;
        const uncertain = measured ? [...new Set([...possible, ...secondaries])].filter(m => !primaries.includes(m)) : [...new Set([...possible, ...primaries, ...secondaries])];
        for (const m of uncertain) byMuscle[m].uncertain = true;
      }
      if (!measured || !roles) continue;
      for (const m of primaries) {
        byMuscle[m].primarySets += sets;
        days[m].add(day);
        byDay[day][m] = (byDay[day][m] || 0) + sets;
      }
      for (const m of secondaries) {
        byMuscle[m].supportingSets += sets;
        days[m].add(day);
      }
    }
  }
  for (const m of MUSCLE_GROUPS) byMuscle[m].days = days[m].size;
  const issues = [];
  if (requirements.enforceCoverage) {
    const available = new Set(candidateIds.flatMap(id => LIB_BY_ID.get(id)?.muscles?.primaries || []));
    for (const muscle of MAJOR) {
      const stats = byMuscle[muscle];
      if (!stats.primarySets && !stats.uncertain && available.has(muscle)) {
        issues.push({ code: 'quality.muscle_primary_missing', muscle, supportingSets: stats.supportingSets, severity: 'warning' });
      }
    }
    const chest = byMuscle.chest, back = byMuscle['upper-back'];
    // Product review heuristic, not a compulsory anatomical or push/pull ratio.
    if (!chest.uncertain && !back.uncertain && chest.primarySets && back.primarySets &&
        Math.max(chest.primarySets, back.primarySets) > Math.min(chest.primarySets, back.primarySets) * 2) {
      issues.push({ code: 'quality.muscle_distribution', chest: chest.primarySets, back: back.primarySets, severity: 'warning' });
    }
  }
  // IUSCA's tentative ~10/session guidance prompts review only for a hypertrophy goal.
  // Aggregate routines sharing a day; never reject or automatically redistribute them.
  if (requirements.goal === 'muscle') for (const [day, counts] of Object.entries(byDay)) {
    for (const [muscle, sets] of Object.entries(counts)) if (sets > 10) {
      issues.push({ code: 'quality.muscle_concentration', muscle, day: Number(day), sets, severity: 'warning' });
    }
  }
  return { version: MUSCLE_VOLUME_VERSION, byMuscle, partialRows, unmeasuredRows, issues };
}
