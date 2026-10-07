import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewResult, swapPrescription } from './review-result.js';
import { librarySlice } from './library.js';
import { build, canonicalPlan } from './payload.js';
import { runPipeline } from './pipeline.js';
import { validatePlan, validateReview } from './validate.js';
import { SCHEMAS } from './schemas.js';

const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-gym-calibration.json', import.meta.url)));
const state = lang => ({ ...structuredClone(scenario.given), lang, unit: 'kg', customEx: [], workouts: [], bodyweight: [],
  coach: { profile: structuredClone(scenario.given.coachProfile), chat: [] } });

test('swap dose cannot inherit an incompatible range or another movement load', () => {
  const S = state('es'), before = structuredClone(S);
  const next = swapPrescription(S.routines[0].ex[0], scenario.when.swap.after);
  for (const [key, value] of Object.entries(scenario.expect.swap)) assert.equal(next[key], value);
  for (const key of scenario.expect.removedFields) assert.equal(next[key], undefined);
  const unchangedDose = swapPrescription(S.routines[0].ex[0], { id: '0289' });
  assert.equal(unchangedDose.reps, 16); assert.equal(unchangedDose.repsMin, 16);
  assert.deepEqual(S, before);
});

test('focused leg press variants fit the active cap despite pinned exercises in both locales', () => {
  const equipment = scenario.given.coachProfile.equipment;
  const keep = librarySlice({}, equipment, { max: 40, strictEquipment: true }).map(e => e.id);
  for (const locale of ['es', 'es-AR']) {
    const options = { max: scenario.when.candidateCap, strictEquipment: true, keep: [...keep, scenario.when.focused], focusId: scenario.when.focused, locale };
    const slice = librarySlice({}, equipment, options);
    assert.ok(slice.some(e => e.id === scenario.when.requiredAlternative));
    const S = state(locale);
    const activeWorkoutSnapshot = { id: 'live', cur: 0, entries: [{ id: '1425', target: { mode: 'reps', sets: 2, reps: 12 }, sets: [{ r: 12, w: 0, done: false }] }] };
    const payload = build(S, { handle: 'test', kind: 'active', note: 'El mismo ejercicio con dos piernas', activeWorkoutSnapshot });
    assert.ok(payload.library.some(e => e.id === '0739'));
    assert.ok(payload.library.length <= 60);
    assert.equal(slice.length, 60); assert.equal(new Set(slice.map(e => e.id)).size, 60);
    assert.ok(slice.every(e => equipment.includes(e.eq)));
    assert.deepEqual(slice, librarySlice({}, equipment, options));
    assert.ok(!librarySlice({}, ['body weight'], options).some(e => e.id === scenario.when.requiredAlternative));
  }
});

test('review quality, initial feedback and warm-up validation are shared across CLI/HTTP', async () => {
  for (const lang of ['es', 'es-AR']) for (const spawns of [false, true]) {
    const S = state(lang), before = structuredClone(S);
    const payload = build(S, { handle: 'synthetic', kind: 'review', note: scenario.when.feedback });
    assert.ok(payload.planAssessment.sessions[0].max < payload.coachProfile.sessionMin);
    const legacy = state(lang); legacy.routines[0].ex[0].reps = 6;
    assert.ok(build(legacy, { handle: 'test', kind: 'review' }).planAssessment.issues.some(i => i.code === 'quality.rep_range'));
    let calls = 0;
    const adapter = { spawns, invoke: async options => {
      calls++;
      const prompt = options.system || options.prompt;
      assert.match(prompt, /actionable feedback/);
      assert.match(prompt, /available time budget/);
      return { code: 0, text: JSON.stringify({ coach_contract: 1, summary: 'Calibrar esfuerzo y dosis.', changes: [
        { ...scenario.when.swap, after: { ...scenario.when.swap.after, id: '0289' } },
        { id: 'warm', type: 'warmupSets', target: { routineId: 'a', exId: '1425' }, after: 2, why: 'Calentamiento separado del trabajo.' }
      ] }) };
    } };
    const response = await runPipeline({ adapter, cfg: {}, kind: 'review', payload });
    assert.equal(response.ok, true, JSON.stringify(response.errors || response)); assert.equal(calls, 1);
    assert.equal(response.result.quality.requirements.enforceCoverage, false);
    const result = reviewResult(payload.plan, response.result.changes);
    assert.deepEqual(result.errors, []);
    assert.equal(result.plan.routines[0].ex[1].warmupSets, 2);
    assert.equal(result.plan.routines[0].ex[0].repsMin, undefined);
    assert.deepEqual(S, before);
  }
});

test('warm-up counts survive creation and additions; invalid counts are rejected', () => {
  const exercise = { id: '1459', sets: 2, reps: 10, warmupSets: 2 };
  assert.ok(SCHEMAS.create.properties.routines.items.properties.ex.items.properties.warmupSets);
  assert.equal(validatePlan({ routines: [{ id: 'r', name: 'A', ex: [exercise] }] }).bundle.routines[0].ex[0].warmupSets, 2);
  for (const warmupSets of [-1, 6, 1.5, '2']) {
    assert.equal(validatePlan({ routines: [{ id: 'r', name: 'A', ex: [{ ...exercise, warmupSets }] }] }).ok, false);
    assert.equal(validateReview({ changes: [{ id: 'w', type: 'warmupSets', target: { routineId: 'a', exId: '1425' }, after: warmupSets, why: 'Requested warm-up' }] }, state('es')).ok, false);
  }
  const change = { type: 'add-exercise', target: { routineId: 'a' }, after: exercise, why: 'Requested addition' };
  assert.equal(validateReview({ changes: [change] }, state('es')).proposal.changes[0].after.warmupSets, 2);
  assert.equal(validateReview({ changes: [{ ...change, after: { ...exercise, warmupSets: 6 } }] }, state('es')).ok, false);
  const baseline = canonicalPlan(state('es'));
  assert.equal(baseline.routines[0].ex[0].warmupSets, 0);
});

test('usage facts reach questions without granting mutations in either provider', async () => {
  for (const spawns of [false, true]) {
    const S = state('es-AR'), before = structuredClone(S);
    const payload = build(S, { handle: 'synthetic', kind: 'question', note: scenario.when.loadQuestion });
    assert.match(payload.appGuidance.facts.find(f => f.topic === 'loads').text, /two 12 kg dumbbells = 12 kg/);
    assert.ok(JSON.stringify(payload.appGuidance).length < 2500);
    const adapter = { spawns, invoke: async () => ({ code: 0, text: JSON.stringify({ coach_contract: 1, answer: 'Recomendamos 12 kg por mancuerna. La app no duplica el valor.' }) }) };
    assert.equal((await runPipeline({ adapter, cfg: {}, kind: 'question', payload })).nochange, true);
    adapter.invoke = async () => ({ code: 0, text: JSON.stringify({ answer: 'Cambiar peso', changes: [scenario.when.swap] }) });
    assert.equal((await runPipeline({ adapter, cfg: {}, kind: 'question', payload })).ok, false);
    assert.deepEqual(S, before);
  }
});
