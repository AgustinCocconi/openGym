import { LIB_BY_ID } from './library.js';
import { COVERAGE_GROUPS, coverageOf, movementOf } from './movement-patterns.js';
import { orderConcern, routineTimeEstimate } from './plan-feasibility.js';
import { assessMuscleVolume } from './plan-muscle-volume.js';

export const PLAN_QUALITY_VERSION = 'coach-plan-quality/v1';
export function planRequirements(payload) {
  const profile = payload.coachProfile || {};
  // Explicit general scope distinguishes ordinary preferences from an unknown split.
  // Restrictions, notes and refinements retain their authority over general coverage.
  const hasText = values => values.some(value => typeof value === 'string' && value.trim());
  const scoped = profile.planScope === 'focused' || !!payload.refine ||
    hasText([payload.userNote, profile.limitations, profile.notes]) ||
    (profile.planScope !== 'general' && hasText([profile.likes, profile.dislikes]));
  return {
    version: PLAN_QUALITY_VERSION,
    enforceCoverage: ['strength', 'muscle', 'general', 'fatloss'].includes(profile.goal) && !scoped,
    groups: [...COVERAGE_GROUPS],
    ...(['strength', 'muscle', 'general', 'fatloss', 'endurance'].includes(profile.goal) ? { goal: profile.goal } : {}),
    ...(Number.isInteger(profile.sessionMin) && profile.sessionMin >= 10 && profile.sessionMin <= 240 ? { sessionMin: profile.sessionMin } : {})
  };
}
const uncertainParts = {
  knee_dominant: ['upper legs'], posterior: ['upper legs', 'back'],
  push: ['chest', 'shoulders', 'upper arms'], pull: ['back', 'upper arms']
};

/** Work-set counts describe the scheduled week, not physiological equivalence or safety.
 * Missing classified work is an error only for unrestricted general plans, when compatible
 * options exist and no unknown exercise could supply it. Everything else is advisory. */
export function assessPlanQuality(plan, { requirements, candidateIds } = {}) {
  if (requirements?.version !== PLAN_QUALITY_VERSION) return null;
  const routines = new Map((plan.routines || []).map(r => [r.id, r]));
  const weeklySets = Object.fromEntries(COVERAGE_GROUPS.map(group => [group, 0]));
  const scheduled = Object.values(plan.week || {}).flatMap(value => [].concat(value || [])).map(id => routines.get(id)).filter(Boolean);
  const unknown = new Set();
  for (const routine of scheduled) for (const exercise of routine.ex || []) {
    const sets = Number.isInteger(exercise.sets) && exercise.sets > 0 ? exercise.sets : 0;
    const group = coverageOf(exercise.id);
    if (group) weeklySets[group] += sets;
    if (!movementOf(exercise.id)) unknown.add(exercise.id);
  }
  const candidates = candidateIds || [...LIB_BY_ID.keys()];
  const available = new Set(candidates.map(coverageOf).filter(Boolean));
  const issues = [];
  for (const group of COVERAGE_GROUPS) {
    if (weeklySets[group]) continue;
    const uncertain = [...unknown].some(id => !LIB_BY_ID.has(id) || uncertainParts[group].includes(LIB_BY_ID.get(id).bp));
    const status = uncertain ? 'unknown' : available.has(group) ? 'missing' : 'unavailable';
    issues.push({ code: 'quality.coverage_' + status, group, severity: status === 'missing' && requirements.enforceCoverage ? 'error' : 'warning' });
  }
  if (unknown.size) issues.push({ code: 'quality.unclassified', count: unknown.size, severity: 'warning' });
  // A two-to-one difference is a review prompt, never a rule that rejects specialization.
  if (weeklySets.push && weeklySets.pull && Math.max(weeklySets.push, weeklySets.pull) > Math.min(weeklySets.push, weeklySets.pull) * 2) {
    issues.push({ code: 'quality.upper_balance', push: weeklySets.push, pull: weeklySets.pull, severity: 'warning' });
  }
  const sessions = [];
  for (const routine of new Set(scheduled)) {
    const order = orderConcern(routine);
    if (order) issues.push({ code: 'quality.exercise_order', routineId: routine.id, ...order, severity: 'warning' });
    const time = routineTimeEstimate(routine);
    sessions.push({ routineId: routine.id, ...time });
    if (time.min != null && time.min > requirements.sessionMin) {
      issues.push({ code: 'quality.session_time', routineId: routine.id, estimatedMin: time.min, estimatedMax: time.max, requestedMin: requirements.sessionMin, severity: 'warning' });
    }
  }
  const errors = issues.filter(issue => issue.severity === 'error').map(issue =>
    'Plan coverage: missing ' + issue.group + ' work in the scheduled week; choose a compatible exercise from library for this unrestricted general plan');
  return {
    version: PLAN_QUALITY_VERSION, requirements: { version: PLAN_QUALITY_VERSION, enforceCoverage: !!requirements.enforceCoverage, groups: [...COVERAGE_GROUPS], ...(['strength', 'muscle', 'general', 'fatloss', 'endurance'].includes(requirements.goal) ? { goal: requirements.goal } : {}), ...(requirements.sessionMin ? { sessionMin: requirements.sessionMin } : {}) },
    weeklySets, sessions, issues, errors,
    muscleVolume: assessMuscleVolume(plan, { requirements, candidateIds: candidates })
  };
}
