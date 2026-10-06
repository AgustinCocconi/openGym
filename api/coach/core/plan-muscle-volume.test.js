import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assessMuscleVolume } from './plan-muscle-volume.js';
import { assessPlanQuality, planRequirements } from './plan-quality.js';
import { validatePlan } from './validate.js';
import { LIB_BY_ID } from './library.js';
import { routineTimeEstimate } from './plan-feasibility.js';

const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-muscle-volume.json', import.meta.url)));
const ex = (id, sets = 2, mode = 'reps') => ({ id, sets, reps: 10, mode });
const plan = () => ({ coach_contract: 1, name: 'Plan', week: { 1: 'a', 4: 'a' }, routines: [{ id: 'a', name: 'A', ex: ['0739', '1459', '0289', '0293'].map(id => ex(id)) }] });
const requirements = () => planRequirements({ coachProfile: { goal: 'muscle', planScope: 'general' } });
const context = () => ({ requirements: requirements(), candidateIds: [...LIB_BY_ID.keys()] });

test('scheduled muscle sets keep primary/support separate and count repeated days without mutation', () => {
  const p = plan(), before = structuredClone(p), report = assessMuscleVolume(p, context());
  assert.deepEqual(report.byMuscle.hamstring, { primarySets: 4, supportingSets: 4, days: 2, uncertain: false });
  assert.deepEqual(report.byMuscle.chest, { primarySets: 4, supportingSets: 0, days: 2, uncertain: false });
  assert.equal(report.byMuscle.gluteal.primarySets, 8);
  assert.equal(report.byMuscle.biceps.primarySets, 0);
  assert.equal(report.byMuscle.biceps.supportingSets, 8);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(p, before);
});

test('multiple routines on one day add sets but count the day once; unscheduled work supplies nothing', () => {
  const p = plan();
  p.week = { 1: ['a', 'b'] };
  p.routines.push({ id: 'b', name: 'B', ex: [ex('0289', 9)] }, { id: 'unused', ex: [ex('0586', 10)] });
  const report = assessMuscleVolume(p, context());
  assert.equal(report.byMuscle.chest.primarySets, 11);
  assert.equal(report.byMuscle.chest.days, 1);
  assert.equal(report.byMuscle.hamstring.primarySets, 2);
  assert.ok(report.issues.some(i => i.code === 'quality.muscle_concentration' && i.day === 1 && i.sets === 11));
});

test('overhead pushing and secondary hamstrings cannot conceal missing primary work in a general plan', () => {
  const p = plan();
  p.routines[0].ex = ['0739', '0405', '0293'].map(id => ex(id));
  const report = assessMuscleVolume(p, context());
  assert.equal(report.byMuscle.chest.primarySets, 0);
  assert.ok(report.byMuscle.chest.supportingSets > 0);
  for (const muscle of ['chest', 'hamstring']) assert.ok(report.issues.some(i => i.code === 'quality.muscle_primary_missing' && i.muscle === muscle));
  assert.ok(report.issues.every(i => i.severity === 'warning'));
});

test('low volume is readable without a universal minimum and imbalance stays advisory', () => {
  const p = plan();
  p.routines[0].ex.forEach(e => { e.sets = 1; });
  assert.deepEqual(assessMuscleVolume(p, context()).issues, []);
  p.routines[0].ex.find(e => e.id === '0293').sets = 3;
  const result = validatePlan(p, { planRequirements: requirements(), candidateIds: [...LIB_BY_ID.keys()], daysPerWeek: 2 });
  assert.equal(result.ok, true);
  assert.ok(result.bundle.quality.muscleVolume.issues.some(i => i.code === 'quality.muscle_distribution' && i.chest === 2 && i.back === 6));
});

test('focused requests, restrictions and unavailable equipment do not force primary work', () => {
  const p = plan(); p.routines[0].ex = ['0405', '0293', '0739'].map(id => ex(id));
  for (const profile of [{ goal: 'muscle', planScope: 'focused' }, { goal: 'muscle', planScope: 'general', limitations: 'Solo tren superior.' }]) {
    const report = assessMuscleVolume(p, { ...context(), requirements: planRequirements({ coachProfile: profile }) });
    assert.deepEqual(report.issues, []);
  }
  const report = assessMuscleVolume(p, { ...context(), candidateIds: p.routines[0].ex.map(e => e.id) });
  assert.deepEqual(report.issues, []);
});

test('unknown custom and legacy roles preserve lower counts without fabricating absent primary muscles', () => {
  const p = plan();
  p.routines[0].ex = [ex('1004'), ex('0405'), ex('0293')];
  let report = assessMuscleVolume(p, context());
  assert.equal(report.partialRows, 2);
  assert.equal(report.byMuscle.quadriceps.primarySets, 0);
  assert.equal(report.byMuscle.quadriceps.uncertain, true);
  assert.ok(!report.issues.some(i => i.muscle === 'quadriceps' || i.muscle === 'hamstring'));
  p.routines[0].ex.push({ ...ex('custom'), primaries: ['chest'], muscles: { primaries: ['chest'] } });
  report = assessMuscleVolume(p, context());
  assert.equal(report.byMuscle.chest.primarySets, 0);
  assert.equal(report.byMuscle.chest.uncertain, true);
  assert.deepEqual(report.issues, []);
  p.routines[0].ex = [ex('0989')];
  report = assessMuscleVolume(p, context());
  assert.equal(report.byMuscle.chest.primarySets, 4);
  assert.equal(report.byMuscle.deltoids.supportingSets, 4);
  assert.equal(report.byMuscle.deltoids.uncertain, true, 'legacy secondary roles may omit primary involvement outside the body part');
});

test('timed/cardio/stretch prescriptions are not converted to hypertrophy sets or absence', () => {
  const p = plan();
  const stretch = [...LIB_BY_ID.values()].find(e => /\bstretch\b/i.test(e.n));
  p.routines[0].ex = [ex('0289', 5, 'time'), { id: '1459', sets: 3, sec: 30 }, { id: '0739', sets: 4, min: 20, speed: 6 }, ex(stretch.id)];
  const report = assessMuscleVolume(p, context());
  assert.equal(report.unmeasuredRows, 8);
  assert.ok(Object.values(report.byMuscle).every(m => m.primarySets === 0 && m.supportingSets === 0));
  assert.ok(report.byMuscle.chest.uncertain);
  assert.equal(routineTimeEstimate({ ex: [{ id: 'cardio', sets: 1, min: 20, speed: 6 }] }).min, 20);
});

test('concentration warning follows goal and starts above ten primary sets per day', () => {
  const p = plan(); p.week = { 1: 'a' };
  p.routines[0].ex = [ex('0289', 10), ex('0293', 10)];
  assert.ok(!assessMuscleVolume(p, context()).issues.some(i => i.code === 'quality.muscle_concentration'));
  p.routines[0].ex.push(ex('0289', 1));
  assert.ok(assessMuscleVolume(p, context()).issues.some(i => i.code === 'quality.muscle_concentration' && i.muscle === 'chest'));
  assert.ok(!assessMuscleVolume(p, { ...context(), requirements: { ...requirements(), goal: 'strength' } }).issues.some(i => i.code === 'quality.muscle_concentration'));
});

test('canonical screenshot counts expose the distinction without overstating incomplete metadata', () => {
  const report = assessMuscleVolume(scenario.given.plan, context());
  for (const [muscle, expected] of Object.entries(scenario.then.recorded)) {
    assert.equal(report.byMuscle[muscle].primarySets, expected.primarySets);
    assert.equal(report.byMuscle[muscle].supportingSets, expected.supportingSets);
  }
  assert.ok(report.partialRows > 0);
  assert.ok(report.byMuscle.hamstring.uncertain);
});

test('the shared gate ignores model supplied volume and preserves trusted goal for client recomputation', () => {
  const p = plan(); p.quality = { muscleVolume: { byMuscle: { chest: { primarySets: 999 } } } };
  p.routines[0].ex.forEach(e => { e.primaries = ['chest']; });
  const result = validatePlan(p, { planRequirements: requirements(), candidateIds: [...LIB_BY_ID.keys()], daysPerWeek: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.bundle.quality.muscleVolume.byMuscle.chest.primarySets, 4);
  assert.equal(result.bundle.quality.requirements.goal, 'muscle');
  assert.equal(assessPlanQuality(result.bundle, { requirements: result.bundle.quality.requirements }).muscleVolume.byMuscle.chest.primarySets, 4);
  assert.equal(planRequirements({ coachProfile: { goal: 'invented' } }).goal, undefined);
});
