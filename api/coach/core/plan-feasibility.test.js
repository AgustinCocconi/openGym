import test from 'node:test';
import assert from 'node:assert/strict';
import { orderConcern, routineTimeEstimate } from './plan-feasibility.js';

const ex = (id, sets = 2, extra = {}) => ({ id, sets, mode: 'reps', reps: 10, ...extra });
test('unrelated hamstring isolation before a shoulder press is not a fatigue warning', () => {
  assert.equal(orderConcern({ ex: [ex('0739'), ex('0577'), ex('0861'), ex('0599'), ex('0603')] }), null);
});
test('only a curated related accessory before a main lift receives an advisory concern', () => {
  assert.deepEqual(orderConcern({ ex: [ex('1016'), ex('1344')] }), { accessoryId: '1016', mainId: '1344' });
  assert.deepEqual(orderConcern({ ex: [ex('0285'), ex('0198')] }), { accessoryId: '0285', mainId: '0198' });
  assert.deepEqual(orderConcern({ ex: [ex('1748'), ex('0289')] }), { accessoryId: '1748', mainId: '0289' });
  assert.deepEqual(orderConcern({ ex: [ex('0599'), ex('1459')] }), { accessoryId: '0599', mainId: '1459' });
  assert.equal(orderConcern({ ex: [ex('1459'), ex('0599')] }), null);
  assert.equal(orderConcern({ ex: [ex('unclassified'), ex('1459')] }), null);
});
test('straight-set estimates include heuristic rests, not warm-up or unilateral doubling', () => {
  assert.deepEqual(routineTimeEstimate({ ex: [ex('0336', 2, { side: true }), ex('0289', 3)] }), { min: 10, max: 15 });
});
test('explicit time and cardio duration contribute to the session estimate', () => {
  assert.deepEqual(routineTimeEstimate({ ex: [ex('0001', 2, { mode: 'time', sec: 45 }), ex('3220', 1, { mode: 'cardio', min: 20 })] }), { min: 22, max: 24 });
});
test('supersets and incomplete timed prescriptions do not get fabricated savings', () => {
  assert.deepEqual(routineTimeEstimate({ ex: [ex('0289', 2, { sg: 'a' }), ex('0293', 2, { sg: 'a' })] }), { min: null, max: null, supersets: true });
  assert.deepEqual(routineTimeEstimate({ ex: [ex('0001', 2, { mode: 'time' })] }), { min: null, max: null, incomplete: true });
});
