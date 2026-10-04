import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runPipeline } from './pipeline.js';
import { validatePlan, validateReview } from './validate.js';
const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-candidate-allowlist.json', import.meta.url)));
const response = scenario.when.modelResponse;
const payload = { coach_contract: 1, meta: { lang: 'es' }, library: scenario.given.library,
  coachProfile: scenario.given.coachProfile, plan: { routines: [], week: {} } };
test('every provider uses request candidates, including the single repair round', async () => {
  for (const spawns of [true, false]) {
    let calls = 0;
    const adapter = { spawns, invoke: async () => { calls++; return { code: 0, text: JSON.stringify(response) }; } };
    const result = await runPipeline({ adapter, cfg: {}, kind: 'create', payload });
    assert.equal(result.ok, false);
    assert.equal(result.errorClass, 'unusable');
    assert.equal(calls, 2);
    assert.match(result.errors.join(' '), /allowed candidate/);
  }
});
test('creation rejects unoffered existing and invented custom exercises', () => {
  assert.equal(validatePlan(response, { candidateIds: ['0001'] }).ok, false);
  const own = { routines: [{ id: 'r1', name: 'A', ex: [{ id: 'own', sets: 3 }] }], customEx: [{ id: 'own', n: 'Own' }] };
  assert.equal(validatePlan(own, { candidateIds: ['0001'] }).ok, false);
  assert.equal(validatePlan(own, { candidateIds: ['own'], customIds: ['own'] }).ok, true);
});
test('all review insertion types obey the allowlist while existing targets remain editable', () => {
  const plan = { routines: [{ id: 'r1', name: 'A', ex: [{ id: '0001', sets: 3 }] }] };
  for (const type of ['add-exercise', 'swap-exercise', 'add-routine']) {
    const after = type === 'add-routine' ? { name: 'B', ex: [{ id: '0023', sets: 3 }] } : { id: '0023', sets: 3 };
    assert.equal(validateReview({ changes: [{ type, target: { routineId: 'r1', exId: '0001' }, after, why: 'Fixture' }] }, plan, { candidateIds: ['0001'] }).ok, false);
  }
  assert.equal(validateReview({ changes: [{ type: 'sets', target: { routineId: 'r1', exId: '0001' }, after: 4, why: 'Fixture' }] }, plan, { candidateIds: [] }).ok, true);
});

test('joint signals allow saved-plan removal but refuse substitutions and mixed mutations across providers', async()=>{
  const fixture=JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/reported-pain-plan-removal.json',import.meta.url)));
  const {plan,jointSignals:signals}=fixture.given, {removal,unsafeMutation:addition}=fixture.when;
  assert.equal(validateReview({changes:[removal]},plan,{candidateIds:[],jointSignals:signals}).ok,true);
  assert.equal(validateReview({changes:[removal,addition]},plan,{candidateIds:[],jointSignals:signals}).ok,false);
  for(const spawns of [true,false]){
    const adapter={spawns,invoke:async()=>({code:0,text:JSON.stringify({coach_contract:1,changes:[removal]})})};
    const result=await runPipeline({adapter,cfg:{},kind:'review',payload:{coach_contract:1,meta:{lang:'es'},library:[],plan,jointSignals:signals}});
    assert.equal(result.ok,true);assert.equal(result.result.changes[0].type,'remove-exercise');
  }
});
