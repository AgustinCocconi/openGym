/* Curated movement metadata, independent of names, locale and joint-safety classification.
 * The catalogue's "glutes" target alone cannot distinguish a squat from a hinge.
 * These ids are a bounded foundation set, not a classification of the whole catalogue. */
export const MOVEMENT_VERSION = 'coach-movements/v1';
const IDS = {
  squat: ['0534', '0739', '0043', '1004', '1425'],
  lunge: ['0336'],
  hinge: ['0085', '1459', '1009', '0032', '0549'],
  knee_flexion: ['0586', '0599', '1417', '0696', '0795'],
  horizontal_push: ['0289', '0577', '0025', '1254', '0662', '0989', '0576'],
  horizontal_pull: ['0293', '0861', '0027', '0988', '1344', '1350'],
  vertical_pull: ['0017', '0198', '0652', '0970'],
  vertical_push: ['0405', '0603', '0426', '0997'],
  hip_extension: ['1408', '3645'],
  shoulder_isolation: ['0334'],
  rear_shoulder_isolation: ['0154'],
  elbow_flexion: ['0285', '0447'],
  elbow_extension: ['1748'],
  wrist_flexion: ['1016'],
  calf_raise: ['1373'],
  core: ['0006', '0001', '0003']
};
const BY_ID = new Map(Object.entries(IDS).flatMap(([pattern, ids]) => ids.map(id => [id, pattern])));
export const movementOf = id => BY_ID.get(id) || null;
export const classifiedIds = () => [...BY_ID.keys()];
export const FOUNDATION_PATTERNS = ['squat', 'lunge', 'hinge', 'knee_flexion', 'horizontal_push', 'horizontal_pull', 'vertical_pull', 'vertical_push'];
export function foundationIds(pattern) {
  // Assisted floor curls and swings remain classified, but are not seeded as basic choices.
  const limit = pattern === 'hinge' ? 3 : pattern === 'knee_flexion' ? 2 : Infinity;
  return (IDS[pattern] || []).slice(0, limit);
}
export const COVERAGE_GROUPS = ['knee_dominant', 'posterior', 'push', 'pull'];
const GROUP = {
  squat: 'knee_dominant', lunge: 'knee_dominant', hinge: 'posterior', knee_flexion: 'posterior',
  horizontal_push: 'push', vertical_push: 'push', horizontal_pull: 'pull', vertical_pull: 'pull'
};
export const coverageOf = id => GROUP[movementOf(id)] || null;
export const isMainMovement = id => ['squat', 'lunge', 'hinge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'hip_extension'].includes(movementOf(id));
