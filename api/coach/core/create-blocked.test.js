import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from './payload.js';
import { runPipeline } from './pipeline.js';
import { SCHEMAS } from './schemas.js';
const scenario = JSON.parse(fs.readFileSync(new URL('../../../docs/adaptive-training/scenarios/coach-create-blocked.json', import.meta.url)));
const response = scenario.when.modelResponse;
const state = () => ({ lang:'es-AR', routines:[], workouts:[{entries:[{id:'0652',sets:scenario.given.loggedSets}]}], coach:{profile:scenario.given.coachProfile} });

test('blocked creation and refinement use the read-only contract across CLI and HTTP providers', async () => {
  for (const spawns of [true,false]) for (const refine of [null,'Cambiar el plan']) for (const lang of ['es','es-AR']) {
    const S = state(); S.lang = lang;
    const before = structuredClone(S), payload = build(S,{handle:'test',kind:'create',refine});
    assert.deepEqual(payload.library,[]); assert.ok(payload.jointSignals.length);
    let calls = 0;
    const adapter = {spawns,invoke:async options=>{
      calls++; if (!spawns) assert.deepEqual(options.schema,SCHEMAS.question);
      assert.match(options.system || options.prompt,/When no exercise candidates/);
      return {code:0,text:JSON.stringify(response)};
    }};
    assert.deepEqual(await runPipeline({adapter,cfg:{},kind:'create',payload}),{ok:true,nochange:true,reading:response.answer,preservePending:true});
    assert.equal(calls,1); assert.deepEqual(S,before);
  }
});

test('empty equipment candidates also request clarification without prescribing a plan', async () => {
  const payload = {library:[],meta:{lang:'es-AR'},jointSignals:[]};
  const adapter = {spawns:false,invoke:async()=>({code:0,text:JSON.stringify({coach_contract:1,answer:'¿Con qué equipo contás?'})})};
  const result = await runPipeline({adapter,cfg:{},kind:'create',payload});
  assert.equal(result.ok,true); assert.equal(result.preservePending,true);
});

test('a blocked answer cannot smuggle plan changes through either attempt', async () => {
  for (const spawns of [true,false]) for (const field of scenario.when.mixedResponseFields) {
    let calls = 0;
    const adapter = {spawns,invoke:async()=>{calls++;return {code:0,text:JSON.stringify({...response,[field]:[]})};}};
    const result = await runPipeline({adapter,cfg:{},kind:'create',payload:build(state(),{handle:'test',kind:'create'})});
    assert.equal(result.ok,false); assert.equal(result.errorClass,'unusable'); assert.equal(calls,2);
    assert.match(result.errors.join(' '),/cannot carry/);
  }
});

test('the single repair can replace an impossible plan with a validated explanation', async () => {
  let calls = 0;
  const adapter = {spawns:true,invoke:async()=>({code:0,text:JSON.stringify(++calls===1?{coach_contract:1,routines:[],week:{}}:response)})};
  const result = await runPipeline({adapter,cfg:{},kind:'create',payload:build(state(),{handle:'test',kind:'create'})});
  assert.equal(result.ok,true); assert.equal(result.reading,response.answer); assert.equal(calls,2);
});
