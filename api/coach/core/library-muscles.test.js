import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE } from '../../../frontend/src/lib/exercises.js';
import { MUSCLES, musclesOf, hasExplicitMuscleMetadata } from '../../../frontend/src/lib/muscles.js';
import { MUSCLE_GROUPS, MUSCLE_METADATA_VERSION } from './library-data.js';
import { LIB_BY_ID, librarySlice } from './library.js';

test('Coach muscle roles match the canonical catalogue overlays and alias normalization', () => {
  assert.equal(MUSCLE_METADATA_VERSION, 'coach-muscle-metadata/v1');
  assert.deepEqual(MUSCLE_GROUPS, MUSCLES);
  for (const exercise of CATALOGUE) {
    const stored = LIB_BY_ID.get(exercise.id);
    assert.equal(stored.bp, exercise.bp);
    const weights = hasExplicitMuscleMetadata(exercise) ? Object.entries(musclesOf(exercise)).filter(([m]) => MUSCLES.includes(m)) : [];
    if (!weights.length) { assert.equal(stored.muscles, undefined); continue; }
    assert.deepEqual(stored.muscles.primaries, weights.filter(([, w]) => w === 1).map(([m]) => m), exercise.id);
    assert.deepEqual(stored.muscles.secondaries, weights.filter(([, w]) => w > 0 && w < 1).map(([m]) => m), exercise.id);
    assert.equal(stored.muscles.source, Array.isArray(exercise.primaries) && Array.isArray(exercise.secondaries) ? 'explicit' : 'legacy');
    assert.equal(new Set([...stored.muscles.primaries, ...stored.muscles.secondaries]).size, weights.length);
  }
  assert.deepEqual(LIB_BY_ID.get('1459').muscles.primaries, ['gluteal', 'hamstring']);
  assert.deepEqual(LIB_BY_ID.get('0739').muscles.primaries, ['quadriceps', 'gluteal', 'adductors']);
});

test('bounded candidates send only canonical primary roles and preserve custom uncertainty', () => {
  for (const max of [60, 160]) {
    const slice = librarySlice({}, [], { max });
    assert.equal(slice.length, max);
    for (const exercise of slice) {
      assert.equal(exercise.secondaries, undefined);
      assert.equal(exercise.muscles, undefined);
      if (exercise.primaries) {
        assert.deepEqual(exercise.primaries, LIB_BY_ID.get(exercise.id).muscles.primaries);
        assert.ok(exercise.primaries.every(m => MUSCLE_GROUPS.includes(m)));
        exercise.primaries.push('invented');
        assert.ok(!LIB_BY_ID.get(exercise.id).muscles.primaries.includes('invented'), 'payload cannot mutate shared metadata');
      }
    }
  }
  const custom = librarySlice({ customEx: [{ id: 'own', n: 'Mi ejercicio', bp: 'back', primaries: ['chest'] }] }, [])[0];
  assert.equal(custom.custom, true);
  assert.equal(custom.primaries, undefined);
  assert.equal(custom.muscleMetadata, undefined);
});
