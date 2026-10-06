import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { librarySlice, LIB_BY_ID } from './library.js';

const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-plan-quality.json', import.meta.url)));
const equipment = scenario.given.coachProfile.equipment;

test('bounded gym candidates retain conventional hinges and hamstring curls', () => {
  for (const max of scenario.when.candidateCaps) {
    const slice = librarySlice({}, equipment, { max, strictEquipment: true });
    assert.equal(slice.length, max);
    for (const id of scenario.when.posteriorCandidates) assert.ok(slice.some(e => e.id === id), 'missing posterior exercise ' + id + ' at cap ' + max);
    assert.equal(new Set(slice.map(e => e.id)).size, slice.length);
    assert.ok(slice.every(e => equipment.includes(e.eq)));
    assert.deepEqual(slice, librarySlice({}, equipment, { max, strictEquipment: true }));
  }
});

test('new candidates exclude stretches while existing stretches remain readable', () => {
  const stretch = [...LIB_BY_ID.values()].find(e => /\bstretch\b/i.test(e.n) && e.eq === 'body weight');
  assert.ok(stretch);
  const options = { max: 60, strictEquipment: true };
  assert.ok(!librarySlice({}, equipment, options).some(e => /\bstretch\b/i.test(LIB_BY_ID.get(e.id).n)));
  assert.equal(librarySlice({}, equipment, { ...options, keep: [stretch.id] })[0].id, stretch.id);
});

test('movement coverage does not invent equipment and small caps remain bounded', () => {
  for (const max of [0, 1, 8, 60]) {
    const slice = librarySlice({}, ['band'], { max, strictEquipment: true });
    assert.ok(slice.length <= max);
    assert.ok(slice.every(e => e.eq === 'band'));
  }
  assert.deepEqual(librarySlice({}, ['unknown'], { strictEquipment: true }), []);
  assert.ok(librarySlice({}, ['band'], { strictEquipment: true }).some(e => e.id === '1009' && e.pattern === 'hinge'));
  assert.ok(librarySlice({}, ['dumbbell'], { strictEquipment: true }).some(e => e.id === '1459'));
});
