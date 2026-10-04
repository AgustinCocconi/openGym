import test from 'node:test';
import assert from 'node:assert/strict';
import {activeSnapshot,activeFingerprint,validateActiveProposal,applyActiveProposal,undoActiveProposal,canUndoActive,ACTIVE_PROTOCOL,ACTIVE_DOSE_POLICY} from './active-workout.js';
const state=()=>({coach:{},active:{id:'session',d:'2026-10-04',cur:0,entries:[{id:'0652',target:{mode:'reps',sets:3,reps:4},sets:[{r:3,w:0,done:false},{r:4,w:0,done:false},{r:4,w:0,done:false}]}]}});
const proposal=(s,type,extra={})=>({protocolVersion:ACTIVE_PROTOCOL,scope:'active_workout',baseFingerprint:activeFingerprint(s.active),summary:'Cambio explicado',reasonCode:'user_request',candidateIds:['1326','0662'],operations:[{type,index:0,...extra}]});
test('confirmation, known candidates, exact occurrence and current fingerprint are required',()=>{
  const s=state(),p=proposal(s,'replace_pending_exercise',{exerciseId:'1326',prescription:{mode:'reps',sets:2,reps:3}}),before=structuredClone(s);
  assert.throws(()=>applyActiveProposal(s,p)); assert.deepEqual(s,before);
  s.active.entries[0].sets[0].done=true;
  assert.throws(()=>applyActiveProposal(s,p,{confirmed:true}));
  const missing=proposal(state(),'replace_pending_exercise',{exerciseId:'0023',prescription:{sets:2,reps:3}});
  assert.equal(validateActiveProposal(missing,state().active,missing.candidateIds).ok,false);
});
test('replacement does not transfer load and is reversible before further work',()=>{
  const s=state(); s.active.entries[0].sets[0].w=40;
  const p=proposal(s,'replace_pending_exercise',{exerciseId:'1326',prescription:{mode:'reps',sets:2,reps:3}}),before=structuredClone(s.active);
  applyActiveProposal(s,p,{confirmed:true});
  assert.equal(s.active.entries[0].id,'1326'); assert.equal(s.active.entries[0].sets[0].w,0); assert.equal(canUndoActive(s),true);
  undoActiveProposal(s); assert.deepEqual(s.active,before);
});
test('partial continuation preserves rows and original prescription, including a completed side',()=>{
  const s=state(); s.active.entries[0].sets[0]={sides:{L:{r:2,w:0,done:true},R:{r:0,w:0,done:false}},r:2,w:0,done:false};
  const original=structuredClone(s.active.entries[0]);
  const p=proposal(s,'continue_after_partial_exercise',{exerciseId:'1326',prescription:{mode:'reps',sets:2,reps:3}});
  applyActiveProposal(s,p,{confirmed:true});
  assert.deepEqual(s.active.entries[0].sets,original.sets); assert.deepEqual(s.active.entries[0].target,original.target);
  assert.equal(s.active.entries[1].id,'1326'); assert.equal(s.active.entries[1].noProg,false);
  s.active.entries[1].sets[0].done=true; const after=structuredClone(s);
  assert.equal(canUndoActive(s),false); assert.throws(()=>undoActiveProposal(s)); assert.deepEqual(s,after);
});
test('reported shoulder pain cannot be ignored by a proposal and still permits skipping',()=>{
  const s=state(); s.active.trainerSignals=[{region:'shoulder',type:'pain'}];
  const p=proposal(s,'replace_pending_exercise',{exerciseId:'1326',prescription:{sets:2,reps:3}});
  assert.equal(validateActiveProposal(p,s.active,p.candidateIds).ok,false);
  applyActiveProposal(s,proposal(s,'skip_pending_exercise'),{confirmed:true});
  assert.equal(s.active.entries[0].trainerSkipped,true); assert.equal(s.active.entries[0].noProg,true);
});
test('dose reduction is versioned and rejects increases, partial work and complex sets',()=>{
  const s=state(),p={...proposal(s,'adjust_pending_prescription',{prescription:{mode:'reps',sets:2,reps:3}}),dosePolicyVersion:ACTIVE_DOSE_POLICY};
  assert.equal(validateActiveProposal(p,s.active,[]).ok,true);
  assert.equal(validateActiveProposal({...p,dosePolicyVersion:'unknown'},s.active,[]).ok,false);
  assert.equal(validateActiveProposal({...p,operations:[{type:'adjust_pending_prescription',index:0,prescription:{sets:4,reps:4}}]},s.active,[]).ok,false);
  applyActiveProposal(s,p,{confirmed:true}); assert.equal(s.active.entries[0].sets.length,2);
  const partial=state(); partial.active.entries[0].sets[0].done=true;
  const partialProposal={...proposal(partial,'adjust_pending_prescription',{prescription:{sets:2,reps:3}}),dosePolicyVersion:ACTIVE_DOSE_POLICY};
  assert.equal(validateActiveProposal(partialProposal,partial.active,[]).ok,false);
});
test('completed exercises, duplicates, generic state patches and cross-plan writes are rejected',()=>{
  const s=state(); s.active.entries[0].sets.forEach(row=>row.done=true);
  assert.equal(validateActiveProposal(proposal(s,'skip_pending_exercise'),s.active,[]).ok,false);
  const fresh=state();
  assert.equal(validateActiveProposal(proposal(fresh,'add_active_exercise',{exerciseId:'0652',prescription:{sets:1,reps:3}}),fresh.active,['0652']).ok,false);
  assert.equal(validateActiveProposal(proposal(fresh,'patch_state'),fresh.active,[]).ok,false);
  assert.equal(validateActiveProposal({...proposal(fresh,'skip_pending_exercise'),week:{}},fresh.active,[]).ok,false);
});
test('the snapshot strips secrets and is bounded without touching the source state',()=>{
  const s=state(); s.active.secret='private'; s.active.entries[0].sets[0].password='private';
  const before=structuredClone(s); const snapshot=activeSnapshot(s.active);
  assert.ok(!JSON.stringify(snapshot).includes('private')); assert.deepEqual(s,before);
  s.active.entries[0].sets=Array.from({length:31},()=>({done:false})); assert.throws(()=>activeSnapshot(s.active));
});

test('new equipment and nested logged work cannot bypass confirmation guards',()=>{
  const s=state();s.coach.profile={equipment:['body weight']};
  const p={...proposal(s,'replace_pending_exercise',{exerciseId:'1326',prescription:{sets:2,reps:3}}),equipmentContext:'["body weight"]'};
  s.coach.profile.equipment=['dumbbell'];const before=structuredClone(s);assert.throws(()=>applyActiveProposal(s,p,{confirmed:true}));assert.deepEqual(s,before);
  const nested=state();nested.active.entries[0].sets[0].clusters=[{done:true,r:2}];
  assert.equal(validateActiveProposal(proposal(nested,'replace_pending_exercise',{exerciseId:'1326',prescription:{sets:2,reps:3}}),nested.active,['1326']).ok,false);
});

test('changed skill prerequisites are rechecked when confirming an active replacement',()=>{
  const s=state();s.coach.skillGoals=[{id:'base',name:'Base',exerciseId:'0652',mode:'reps',target:4,prerequisiteIds:[],attempts:[]},{id:'next',name:'Next',exerciseId:'3296',mode:'time',target:10,prerequisiteIds:['base'],attempts:[]}];
  const p={...proposal(s,'replace_pending_exercise',{exerciseId:'3296',prescription:{mode:'time',sets:1,sec:10}}),candidateIds:['3296']};const before=structuredClone(s);
  assert.throws(()=>applyActiveProposal(s,p,{confirmed:true}));assert.deepEqual(s,before);
});

test('changing unit invalidates pending proposals and undo even for unloaded bodyweight work',()=>{
  const s=state();s.unit='kg';s.active.bw=80;
  const p=proposal(s,'skip_pending_exercise');applyActiveProposal(s,p,{confirmed:true});assert.equal(canUndoActive(s),true);
  s.unit='lb';s.active.bw=176.37;const before=structuredClone(s);
  assert.equal(canUndoActive(s),false);assert.throws(()=>undoActiveProposal(s));assert.deepEqual(s,before);
});

test('addition and removal change only the active session and never erase partial records',()=>{
  const s=state();s.routines=[{id:'r',ex:[{id:'0652',sets:3,reps:4}]}];s.workouts=[{id:'history'}];const saved=structuredClone({routines:s.routines,workouts:s.workouts});
  applyActiveProposal(s,proposal(s,'add_active_exercise',{exerciseId:'0662',prescription:{mode:'reps',sets:2,reps:5}}),{confirmed:true});
  assert.equal(s.active.entries.length,2);assert.equal(s.active.entries[1].id,'0662');assert.equal(s.active.entries[1].sets[0].w,0);
  const remove=proposal(s,'remove_pending_exercise');remove.operations[0].index=1;applyActiveProposal(s,remove,{confirmed:true});assert.equal(s.active.entries.length,1);
  assert.deepEqual({routines:s.routines,workouts:s.workouts},saved);
  s.active.entries[0].sets[0].done=true;const before=structuredClone(s);
  assert.throws(()=>applyActiveProposal(s,proposal(s,'remove_pending_exercise'),{confirmed:true}));assert.deepEqual(s,before);
});

test('adding after a completed exercise preserves it, and navigation alone does not prevent undo',()=>{
  const s=state();s.active.entries[0].sets.forEach(row=>row.done=true);const original=structuredClone(s.active.entries[0]);
  const p=proposal(s,'add_active_exercise',{exerciseId:'0662',prescription:{mode:'reps',sets:1,reps:5}});
  applyActiveProposal(s,p,{confirmed:true});assert.deepEqual(s.active.entries[0],original);
  s.active.cur=0;assert.equal(canUndoActive(s),true);undoActiveProposal(s);assert.equal(s.active.entries.length,1);
});
test('a current pain report in chat blocks a later substitution and its snapshot remains current after sending',async()=>{
  const {stateActiveSnapshot}=await import('./active-workout.js');
  const s=state(),snapshot=stateActiveSnapshot(s,'Me duele el hombro');
  s.coach.chat=[{role:'user',at:Date.now(),text:'Me duele el hombro'}];assert.equal(activeFingerprint(stateActiveSnapshot(s)),activeFingerprint(snapshot));
  const p={...proposal(s,'replace_pending_exercise',{exerciseId:'1326',prescription:{mode:'reps',sets:1,reps:3}}),baseFingerprint:activeFingerprint(snapshot)},before=structuredClone(s);
  assert.throws(()=>applyActiveProposal(s,p,{confirmed:true}));assert.deepEqual(s,before);
});

test('canonical live-management scenario distinguishes unstarted and partial exercises',async()=>{
  const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('../../../docs/adaptive-training/scenarios/calisthenics-live-management.json',import.meta.url),'utf8'));
  for(const item of fixture.cases){const p={protocolVersion:ACTIVE_PROTOCOL,scope:'active_workout',reasonCode:'user_request',summary:'Cambio solicitado',baseFingerprint:activeFingerprint(fixture.given.active),operations:[item.operation]};assert.equal(validateActiveProposal(p,fixture.given.active,fixture.given.candidateIds).ok,item.ok,item.operation.type)}
});
