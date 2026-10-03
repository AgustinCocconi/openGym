import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewResultErrors } from './review-result.js';

const plan = () => ({ routines: [{ id: 'r', ex: [{ id: '0001', repsMin: 5, repsMax: 10 }] }] });
const change = (type, after, exId = '0001') => ({ id: type, type, target: { routineId: 'r', exId }, after });

test('paired rep ranges are validated as a result, with order-independent bounds', () => {
  const p = plan(), before = structuredClone(p);
  const edits = [change('repsMin', 12), change('repsMax', 15)];
  assert.deepEqual(reviewResultErrors(p, edits), []);
  assert.deepEqual(reviewResultErrors(p, [...edits].reverse()), []);
  assert.ok(reviewResultErrors(p, edits.slice(0, 1)).length);
  assert.deepEqual(p, before);
});

test('structural dependencies cannot leave an accepted change targeting a deleted slot', () => {
  assert.ok(reviewResultErrors(plan(), [change('remove-exercise'), change('repsMax', 12)]).length);
  assert.ok(reviewResultErrors(plan(), [change('swap-exercise', { id: '0002' }), change('repsMax', 12)]).length);
});
