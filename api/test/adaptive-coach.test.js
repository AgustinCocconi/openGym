import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempData, writeState, sampleState } from './helpers.mjs';
const DIR=tempData();
const cfg=await import('../coach/config.js');
const jobs=await import('../coach/jobs.js');
const {coachRoutes}=await import('../coach/routes.js');
const {forcePrivilegeVerdict}=await import('../coach/adapters/spawn.js');
cfg.save({enabled:true,provider:'fixture'});
forcePrivilegeVerdict({ok:true,dropped:false,why:'fixture test'});
const active=()=>({id:'live',d:'2026-10-04',cur:0,privateMarker:'never persisted',entries:[{id:'0652',target:{mode:'reps',sets:2,reps:4},sets:[{r:3,w:0,done:true},{r:4,w:0,done:false}]}]});
const stateFile=uid=>DIR+'/state-'+uid+'.json';
const recordFile=uid=>DIR+'/coach/'+uid+'.json';
const harness=uid=>coachRoutes({readSession:()=>({id:uid}),readBody:async req=>req.body||{},requireAdmin:()=>false,json:(res,status,body)=>Object.assign(res,{status,body})});
async function call(uid,key,body){const res={};await harness(uid)[key]({body},res);return res;}
async function settle(uid){for(let i=0;i<600;i++){const s=jobs.status(uid);if(!s.job)return s;await new Promise(r=>setTimeout(r,25));}throw new Error('job never settled');}
test('question jobs preserve the pending proposal and never persist or apply the active snapshot',async()=>{
  const uid='question';writeState(DIR,uid,sampleState());const before=fs.readFileSync(stateFile(uid),'utf8');
  jobs.enqueue(uid,{kind:'create'});const first=(await settle(uid)).pending;assert.ok(first);
  const r=await call(uid,'POST /api/coach/question',{note:'Como hago una dominada?',activeWorkoutSnapshot:active()});
  assert.equal(r.status,202);assert.ok(!fs.readFileSync(recordFile(uid),'utf8').includes('activeWorkoutSnapshot'));
  const result=await settle(uid);assert.deepEqual(result.pending,first);assert.equal(result.last.kind,'question');assert.ok(result.last.reading);
  assert.equal(fs.readFileSync(stateFile(uid),'utf8'),before);assert.ok(!fs.readFileSync(recordFile(uid),'utf8').includes('never persisted'));
});
test('a question carrying changes fails validation without discarding an existing proposal',async()=>{
  const uid='question-invalid';writeState(DIR,uid,sampleState());jobs.enqueue(uid,{kind:'create'});const first=(await settle(uid)).pending;
  process.env.FIXTURE_MODE='question-with-mutation';
  try {jobs.enqueue(uid,{kind:'question',note:'Pregunta'});const result=await settle(uid);assert.equal(result.last.outcome,'failed');assert.deepEqual(result.pending,first);}
  finally{delete process.env.FIXTURE_MODE;}
});
test('invalid active snapshots return 400 before reserving daily spending',async()=>{
  const uid='snapshot-invalid';writeState(DIR,uid,sampleState());
  for(const body of [{},{activeWorkoutSnapshot:{id:'x',entries:Array(41).fill({})}}]){
    const r=await call(uid,'POST /api/coach/active',body);assert.equal(r.status,400);assert.equal(r.body.code,'snapshot');assert.equal(jobs.capState(uid).used,0);
  }
});
test('live proposals wait for confirmation, preserve authoritative state, and resolve by proposal ID',async()=>{
  const uid='live';writeState(DIR,uid,sampleState());const before=fs.readFileSync(stateFile(uid),'utf8');
  const r=await call(uid,'POST /api/coach/active',{note:'Saltear lo pendiente',activeWorkoutSnapshot:active()});assert.equal(r.status,202);
  const {pending}=await settle(uid);assert.equal(pending.kind,'active');assert.equal(pending.confirmationState,'proposed');assert.equal(pending.evidence.loggedSets,1);
  assert.equal(fs.readFileSync(stateFile(uid),'utf8'),before);
  assert.deepEqual((await call(uid,'POST /api/coach/pending/resolve',{proposalId:'older',accepted:['active-operation']})).body,{ok:false,stale:true});
  assert.equal(jobs.status(uid).pending.id,pending.id);
  await call(uid,'POST /api/coach/pending/resolve',{proposalId:pending.id,accepted:['active-operation']});assert.equal(jobs.status(uid).pending,null);
});
test('the actual CLI fixture cannot bypass the active fingerprint',async()=>{
  const uid='stale';writeState(DIR,uid,sampleState());process.env.FIXTURE_MODE='stale-active';
  try{jobs.enqueue(uid,{kind:'active',activeWorkoutSnapshot:active()});const s=await settle(uid);assert.equal(s.last.outcome,'failed');assert.equal(s.pending,null);}
  finally{delete process.env.FIXTURE_MODE;}
});

test('expanded live and skill context requires current consent before reserving a run',()=>{
  const uid='old-consent',S=sampleState();S.coach.consent.version=1;writeState(DIR,uid,S);
  assert.throws(()=>jobs.enqueue(uid,{kind:'question',note:'Pregunta'}),error=>error.code==='consent');assert.equal(jobs.capState(uid).used,0);
});
