import { jointSignalsForState } from './joint-signals.js';
import { skillExerciseAllowed } from './skills.js';
/* Shared server/mobile/client check for exercises introduced by a proposal. */
export function proposalCandidateErrors(data, candidateIds, state=null) {
  if (candidateIds == null) return [];
  if (!Array.isArray(candidateIds) || candidateIds.some(id => typeof id !== 'string' || !id)) return ['invalid candidate allowlist'];
  const allowed = new Set(state ? candidateIds.filter(id=>skillExerciseAllowed(state.coach?.skillGoals||[],id,jointSignalsForState(state))) : candidateIds);
  const ids = [];
  const bundle = data?.bundle || data;
  const list = value => Array.isArray(value) ? value : [];
  for (const routine of list(bundle?.routines)) for (const exercise of list(routine?.ex)) ids.push(exercise?.id);
  for (const exercise of list(bundle?.customEx)) ids.push(exercise?.id);
  for (const change of list(data?.changes)) {
    if (!change) continue;
    if (['add-exercise', 'swap-exercise'].includes(change.type)) ids.push(change.after?.id);
    if (change.type === 'add-routine') for (const exercise of list(change.after?.ex)) ids.push(exercise?.id);
  }
  return [...new Set(ids)].filter(id => !allowed.has(id)).map(id =>
    'exercise "' + String(id) + '" is not an allowed candidate for this request');
}

export function planJointSignalErrors(data, signals=[]) {
  if (!signals.length || (Array.isArray(data?.changes) && data.changes.every(change=>['remove-exercise','remove-routine'].includes(change?.type)))) return [];
  return ['joint symptoms allow only removing saved exercises or routines; use a read-only answer for other changes'];
}
