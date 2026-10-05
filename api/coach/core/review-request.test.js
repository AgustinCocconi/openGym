import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from './payload.js';
import { runPipeline } from './pipeline.js';
import { SCHEMAS } from './schemas.js';

const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-request-without-history.json', import.meta.url)));
const state = (lang = scenario.given.locale) => ({
  lang, unit: 'kg', routines: structuredClone(scenario.given.routines),
  week: structuredClone(scenario.given.week), workouts: [], bodyweight: [],
  coach: { profile: structuredClone(scenario.given.coachProfile), chat: [] }
});
const request = S => build(S, { handle: 'test', kind: 'review', note: scenario.when.message });
function proposal(payload) {
  const existing = new Set(payload.plan.routines[0].ex.map(e => e.id));
  const additions = payload.library.filter(e => !existing.has(e.id)).slice(0, scenario.expect.minimumAdditions);
  assert.equal(additions.length, scenario.expect.minimumAdditions);
  return {
    coach_contract: 1, summary: 'Quito el ejercicio que pediste y agrego dos opciones con una dosis inicial moderada.',
    evidence: scenario.expect.evidence,
    changes: [
      { id: 'remove', type: 'remove-exercise', target: { routineId: 'r1', exId: '0991' }, after: null, why: 'Pediste quitar este ejercicio.' },
      ...additions.map((e, i) => ({ id: 'add' + i, type: 'add-exercise', target: { routineId: 'r1' },
        after: { id: e.id, mode: 'reps', sets: 2, reps: 10 }, why: 'Pediste ampliar la rutina; empiezo con dos series por ejercicio.' }))
    ], notes: []
  };
}
const adapterFor = (response, spawns = false) => ({ spawns, invoke: async () => ({ code: 0, text: JSON.stringify(response) }) });

test('requested removals and additions need no logged sessions across CLI/HTTP and Spanish locales', async () => {
  for (const lang of ['es', 'es-AR']) for (const spawns of [true, false]) {
    const S = state(lang), before = structuredClone(S), payload = request(S), response = proposal(payload);
    assert.deepEqual(payload.window.workouts, []);
    assert.equal(payload.userNote, scenario.when.message);
    let calls = 0;
    const adapter = { spawns, invoke: async options => {
      calls++;
      if (!spawns) assert.equal(options.schema, SCHEMAS.review);
      assert.ok(/explicit training request.*sufficient reason/s.test(options.system || options.prompt), 'the review prompt must honour requested edits without history');
      return { code: 0, text: JSON.stringify(response) };
    } };
    const result = await runPipeline({ adapter, cfg: {}, kind: 'review', payload });
    assert.equal(result.ok, true); assert.ok(!result.nochange); assert.equal(calls, 1);
    assert.deepEqual(result.result.evidence, scenario.expect.evidence);
    assert.equal(result.result.changes[0].target.exId, scenario.expect.removeExerciseId);
    assert.equal(result.result.changes.filter(c => c.type === 'add-exercise').length, 2);
    assert.equal(result.result.changes[0].after, null);
    assert.equal(result.result.changes[0].routineName, payload.plan.routines[0].name);
    assert.deepEqual(S, before);
  }
});

test('a follow-up carries the unresolved request and prior refusal without treating either as logged evidence', async () => {
  const S = state();
  S.coach.chat = [
    { role: 'user', kind: 'text', text: scenario.when.message },
    { role: 'coach', kind: 'nochange', text: scenario.when.previousRefusal }
  ];
  const payload = build(S, { handle: 'test', kind: 'review', note: scenario.when.followUp });
  assert.equal(payload.userNote, scenario.when.followUp);
  assert.deepEqual(payload.conversation.map(m => m.text), [scenario.when.message, scenario.when.previousRefusal]);
  const result = await runPipeline({ adapter: adapterFor(proposal(payload)), cfg: {}, kind: 'review', payload });
  assert.equal(result.ok, true); assert.ok(result.result.changes.length); assert.equal(result.result.evidence.sessions, 0);
});

test('the HTTP review schema permits absent training dates without fabricated evidence', () => {
  for (const key of ['from', 'to']) assert.deepEqual(SCHEMAS.review.properties.evidence.properties[key].type, ['string', 'null']);
});

test('a review without a requested edit can still return nochange before the first session', async () => {
  const S = state(), before = structuredClone(S), payload = build(S, { handle: 'test', kind: 'review' });
  assert.equal(payload.userNote, undefined);
  const reading = 'Todavía no hay sesiones registradas para evaluar tendencias.';
  const result = await runPipeline({ adapter: adapterFor({ coach_contract: 1, nochange: true, reading }), cfg: {}, kind: 'review', payload });
  assert.deepEqual(result, { ok: true, nochange: true, reading }); assert.deepEqual(S, before);
});

test('an explicit request cannot bypass candidates or joint blockers', async () => {
  const payload = request(state()), response = proposal(payload);
  for (const blocked of [{ ...payload, library: payload.library.filter(e => e.id !== response.changes[1].after.id) },
    { ...payload, jointSignals: [{ region: 'shoulder', symptom: 'pain' }] }]) {
    const result = await runPipeline({ adapter: adapterFor(response), cfg: {}, kind: 'review', payload: blocked });
    assert.equal(result.ok, false); assert.equal(result.errorClass, 'unusable');
  }
});

test('the same training request in question mode cannot produce a plan mutation', async () => {
  const S = state(), before = structuredClone(S), response = proposal(request(S));
  const payload = build(S, { handle: 'test', kind: 'question', note: scenario.when.message });
  const result = await runPipeline({ adapter: adapterFor(response), cfg: {}, kind: 'question', payload });
  assert.equal(result.ok, false); assert.match(result.errors.join(' '), /cannot carry/); assert.deepEqual(S, before);
});
