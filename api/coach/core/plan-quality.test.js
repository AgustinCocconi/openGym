import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from './payload.js';
import { LIB_BY_ID } from './library.js';
import { classifiedIds } from './movement-patterns.js';
import esNames from '../../../frontend/src/exercise-names/es.js';
import { assessPlanQuality, planRequirements } from './plan-quality.js';
import { validatePlan } from './validate.js';
import { runPipeline } from './pipeline.js';

const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-plan-quality.json', import.meta.url)));
const state = () => ({ lang: 'es-AR', unit: 'kg', routines: [], workouts: [], coach: { profile: structuredClone(scenario.given.coachProfile) } });
const payloadFor = (S = state(), opts = {}) => build(S, { handle: 'quality-test', kind: 'create', ...opts });
const ex = (id, sets = 2) => ({ id, sets, reps: 10, mode: 'reps' });
const balanced = () => ({
  coach_contract: 1, name: 'Cuerpo completo', summary: 'Dos dias con trabajo de piernas, empuje y tiron.',
  week: { 1: 'a', 4: 'a' }, routines: [{ id: 'a', name: 'Dia A', ex: ['0739', '1459', '0289', '0293'].map(id => ex(id)) }]
});
const capture = () => ({ coach_contract: 1, name: 'Capturas', week: structuredClone(scenario.given.week), routines: structuredClone(scenario.given.visibleRoutines) });
const context = p => ({ candidateIds: p.library.map(e => e.id), planRequirements: p.planRequirements, daysPerWeek: p.coachProfile.daysPerWeek });

test('curated movement ids resolve without classifying names or joint safety', () => {
  for (const id of classifiedIds()) {
    assert.ok(LIB_BY_ID.has(id), 'invalid curated id ' + id);
    assert.ok(esNames[id], 'missing Spanish name ' + id);
    assert.equal(LIB_BY_ID.get(id).labels.es, esNames[id]);
  }
  const plan = balanced(), before = structuredClone(plan);
  const quality = assessPlanQuality(plan, { requirements: planRequirements(payloadFor()) });
  assert.deepEqual(quality.weeklySets, { knee_dominant: 4, posterior: 4, push: 4, pull: 4 });
  assert.deepEqual(quality.errors, []);
  assert.deepEqual(plan, before);
});

test('the screenshot scenario cannot pass as an unrestricted general plan without posterior work', () => {
  const S = state(); S.routines = capture().routines; S.week = capture().week;
  const p = payloadFor(S);
  const result = validatePlan(capture(), context(p));
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /missing posterior/);
});

test('an abs-only plan is rejected even when ids, doses and schedule are valid', () => {
  const p = payloadFor(), plan = balanced();
  plan.routines[0].ex = ['0001', '0003', '0006'].map(id => ex(id));
  const result = validatePlan(plan, { ...context(p), candidateIds: ['0001', '0003', '0006', ...p.library.map(e => e.id)] });
  assert.equal(result.ok, false);
  for (const group of ['knee_dominant', 'posterior', 'push', 'pull']) assert.match(result.errors.join(' '), new RegExp('missing ' + group));
});

test('counts follow the scheduled week and unscheduled routines cannot conceal omissions', () => {
  const plan = balanced();
  plan.week[6] = 'a';
  plan.routines.push({ id: 'unused', name: 'Sin agendar', ex: [ex('0085', 10)] });
  let quality = assessPlanQuality(plan, { requirements: planRequirements(payloadFor()) });
  assert.equal(quality.weeklySets.posterior, 6);
  plan.routines[0].ex = plan.routines[0].ex.filter(e => e.id !== '1459');
  quality = assessPlanQuality(plan, { requirements: planRequirements(payloadFor()) });
  assert.equal(quality.weeklySets.posterior, 0);
  assert.match(quality.errors.join(' '), /posterior/);
});

test('specialization, restrictions, refinement and endurance receive advisory coverage', () => {
  for (const field of ['limitations', 'likes', 'dislikes', 'notes']) {
    const S = state(); S.coach.profile[field] = 'Solo tren superior por mi deporte.';
    const p = payloadFor(S), quality = assessPlanQuality(capture(), { requirements: p.planRequirements, candidateIds: p.library.map(e => e.id) });
    assert.equal(p.planRequirements.enforceCoverage, false);
    assert.deepEqual(quality.errors, []);
    assert.ok(quality.issues.some(issue => issue.code === 'quality.coverage_missing' && issue.group === 'posterior'));
  }
  const S = state(); S.coach.profile.goal = 'endurance';
  assert.equal(payloadFor(S).planRequirements.enforceCoverage, false);
  assert.equal(payloadFor(state(), { refine: 'Quiero solo abdominales.', previous: balanced() }).planRequirements.enforceCoverage, false);
  assert.equal(payloadFor(state(), { refine: 'Solo espalda.' }).planRequirements.enforceCoverage, false);
});

test('missing equipment or unclassified exercises do not become a fabricated omission', () => {
  const plan = balanced(), requirements = planRequirements(payloadFor());
  plan.routines[0].ex = [ex('0289'), ex('0293'), ex('0006')];
  let quality = assessPlanQuality(plan, { requirements, candidateIds: ['0289', '0293', '0006'] });
  assert.deepEqual(quality.errors, []);
  assert.ok(quality.issues.some(issue => issue.code === 'quality.coverage_unavailable'));
  plan.routines[0].ex.push(ex('custom-leg'));
  quality = assessPlanQuality(plan, { requirements });
  assert.deepEqual(quality.errors, []);
  assert.ok(quality.issues.some(issue => issue.code === 'quality.coverage_unknown'));
  assert.ok(quality.issues.some(issue => issue.code === 'quality.unclassified'));
});

test('model-supplied patterns and assessment cannot invent coverage', () => {
  const plan = balanced(), p = payloadFor();
  plan.quality = { weeklySets: { posterior: 1000 } };
  plan.routines[0].ex = ['0739', '0289', '0293', '0006'].map(id => ({ ...ex(id), pattern: 'hinge' }));
  const result = validatePlan(plan, context(p));
  assert.equal(result.ok, false); assert.match(result.errors.join(' '), /missing posterior/);
});

test('imbalance and order are review warnings, not rigid training prescriptions', () => {
  const plan = balanced(); plan.routines[0].ex.unshift(ex('1016')); plan.routines[0].ex.find(e => e.id === '0293').sets = 6;
  const p = payloadFor(), result = validatePlan(plan, { ...context(p), candidateIds: [...p.library.map(e => e.id), '1016'] });
  assert.equal(result.ok, true);
  assert.ok(result.bundle.quality.issues.some(issue => issue.code === 'quality.upper_balance'));
  assert.ok(result.bundle.quality.issues.some(issue => issue.code === 'quality.exercise_order'));
});

test('CLI and HTTP providers repair the same missing movement once, in es and es-AR', async () => {
  for (const spawns of [true, false]) for (const lang of ['es', 'es-AR']) {
    const S = state(); S.lang = lang;
    const before = structuredClone(S), payload = payloadFor(S), bad = balanced();
    bad.routines[0].ex = bad.routines[0].ex.filter(e => e.id !== '1459');
    let calls = 0;
    const adapter = { spawns, invoke: async options => {
      calls++;
      assert.match(options.system || options.prompt, /planRequirements/);
      if (calls === 2) assert.match(options.prompt, /missing posterior/);
      return { code: 0, text: JSON.stringify(calls === 1 ? bad : balanced()) };
    } };
    const result = await runPipeline({ adapter, cfg: {}, kind: 'create', payload });
    assert.equal(result.ok, true); assert.equal(calls, 2);
    assert.deepEqual(result.result.bundle.quality.weeklySets, { knee_dominant: 4, posterior: 4, push: 4, pull: 4 });
    assert.equal(result.result.bundle.quality.muscleVolume.byMuscle.hamstring.primarySets, 4);
    assert.equal(result.result.bundle.quality.muscleVolume.byMuscle.hamstring.supportingSets, 4);
    assert.equal(result.result.bundle.quality.requirements.goal, 'muscle');
    assert.deepEqual(S, before);
  }
});

test('two insufficient answers fail without changing state or approving a plan', async () => {
  const S = state(), before = structuredClone(S), payload = payloadFor(S), bad = balanced();
  bad.routines[0].ex = bad.routines[0].ex.filter(e => e.id !== '1459');
  let calls = 0;
  const adapter = { spawns: false, invoke: async () => { calls++; return { code: 0, text: JSON.stringify(bad) }; } };
  const result = await runPipeline({ adapter, cfg: {}, kind: 'create', payload });
  assert.equal(result.ok, false); assert.equal(calls, 2); assert.equal(result.errorClass, 'unusable');
  assert.deepEqual(S, before);
});

test('explicit general scope preserves coverage with ordinary preferences, while legacy scope remains conservative', () => {
  const S = state(); S.coach.profile.likes = 'Prefiero maquinas.'; S.coach.profile.dislikes = 'No me gustan las zancadas.';
  assert.equal(payloadFor(S).planRequirements.enforceCoverage, false);
  S.coach.profile.planScope = 'general';
  const p = payloadFor(S), result = validatePlan(capture(), context(p));
  assert.equal(p.coachProfile.planScope, 'general');
  assert.equal(p.planRequirements.enforceCoverage, true);
  assert.match(result.errors.join(' '), /missing posterior/);
  S.coach.profile.planScope = 'focused';
  assert.equal(payloadFor(S).planRequirements.enforceCoverage, false);
  S.coach.profile.planScope = { invalid: 'general' };
  assert.equal(payloadFor(S).coachProfile.planScope, null);
});
test('notes, restrictions and refinement retain authority over explicit general scope', () => {
  for (const field of ['notes', 'limitations']) {
    const S = state(); S.coach.profile.planScope = 'general'; S.coach.profile[field] = 'Solo tren superior.';
    assert.equal(payloadFor(S).planRequirements.enforceCoverage, false);
  }
  const S = state(); S.coach.profile.planScope = 'general';
  assert.equal(payloadFor(S, { refine: 'Deja solo tren superior.' }).planRequirements.enforceCoverage, false);
  assert.equal(payloadFor(S, { intake: { ...S.coach.profile, planScope: 'focused' } }).coachProfile.planScope, 'focused');
});
test('session overflow is advisory, follows scheduled routines and survives validation', () => {
  const S = state(); S.coach.profile.sessionMin = 30;
  const p = payloadFor(S), plan = balanced();
  plan.routines[0].ex.forEach(e => { e.sets = 5; });
  plan.routines.push({ id: 'unused', name: 'Sin agendar', ex: [ex('0006', 20)] });
  const result = validatePlan(plan, { ...context(p), candidateIds: [...p.library.map(e => e.id), '0006'] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.bundle.quality.sessions, [{ routineId: 'a', min: 40, max: 60 }]);
  assert.equal(result.bundle.quality.requirements.sessionMin, 30);
  const issue = result.bundle.quality.issues.find(i => i.code === 'quality.session_time');
  assert.deepEqual(issue, { code: 'quality.session_time', routineId: 'a', estimatedMin: 40, estimatedMax: 60, requestedMin: 30, severity: 'warning' });
});
