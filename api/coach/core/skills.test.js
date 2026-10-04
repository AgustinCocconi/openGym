import test from 'node:test';
import assert from 'node:assert/strict';
import { skillProgression, validateSkillGoals, recordSkillAttempt } from './skills.js';
const goal=(id='base',prerequisiteIds=[])=>({id,name:'Dominadas',exerciseId:'0652',mode:'reps',target:4,prerequisiteIds,attempts:[]});
const evidence={workoutId:'w',value:4,result:'passed',confirmedBy:'athlete',formConfirmed:true,painFree:true};
test('a struggling beginner remains active without being promoted by the assistant',()=>{
  const base=goal(),advanced=goal('advanced',['base']);
  base.attempts=[{...evidence,confirmedBy:'assistant'}];
  assert.deepEqual(skillProgression([base,advanced]).map(g=>g.status),['active','locked']);
  base.attempts=[{...evidence,value:3}];
  assert.equal(skillProgression([base,advanced])[1].status,'locked');
});
test('complete athlete-confirmed evidence unlocks a declared prerequisite graph',()=>{
  const base={...goal(),attempts:[evidence]};
  assert.deepEqual(skillProgression([base,goal('next',['base'])]).map(g=>g.status),['mastered','active']);
  assert.deepEqual(skillProgression([base,goal('next',['base'])],[{region:'shoulder',type:'pain'}]).map(g=>g.status),['mastered','blocked']);
});
test('missing prerequisites, cycles, unknown exercises and malformed targets fail closed',()=>{
  assert.throws(()=>validateSkillGoals([goal('a',['missing'])]));
  assert.throws(()=>validateSkillGoals([goal('a',['b']),goal('b',['a'])]));
  assert.throws(()=>validateSkillGoals([{...goal(),exerciseId:'imaginary'}]));
  assert.throws(()=>validateSkillGoals([{...goal(),target:0}]));
});
test('attempts come from logged work, need technique and pain-free confirmation, and cannot bypass pain',()=>{
  const state={coach:{skillGoals:[goal()]},workouts:[{id:'w',entries:[{id:'0652',sets:[{r:4,done:true},{r:20,done:false}]}]}]};
  assert.equal(recordSkillAttempt(state,'base',{workoutId:'w',entryIndex:0}).result,'not_passed');
  assert.equal(recordSkillAttempt(state,'base',{workoutId:'w',entryIndex:0,formConfirmed:true,painFree:true}).result,'passed');
  assert.equal(state.coach.skillGoals[0].attempts.length,1);
  const before=structuredClone(state); state.coach.jointSignals=[{region:'shoulder',type:'pain'}];
  assert.throws(()=>recordSkillAttempt(state,'base',{workoutId:'w',entryIndex:0,formConfirmed:true,painFree:true}));
  assert.deepEqual(state.coach.skillGoals[0],before.coach.skillGoals[0]);
});

test('the candidate gate excludes locked variants and preserves an attainable foundation',async()=>{
  const {skillExerciseAllowed}=await import('./skills.js');
  const base=goal(),next={...goal('next',['base']),exerciseId:'3296'};
  assert.equal(skillExerciseAllowed([base,next],'0652'),true);assert.equal(skillExerciseAllowed([base,next],'3296'),false);
  base.attempts=[evidence];assert.equal(skillExerciseAllowed([base,next],'3296'),true);
});

test('canonical novice scenario keeps the foundation attainable and the next variant locked',async()=>{
  const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('../../../docs/adaptive-training/scenarios/novice-pullup-foundation.json',import.meta.url),'utf8'));
  const base=fixture.given.goal,next=fixture.given.nextGoal; base.attempts=[{...evidence,value:fixture.given.loggedReps}];
  assert.deepEqual(skillProgression([base,next]).map(goal=>goal.status),['active','locked']);assert.deepEqual(skillProgression([base,next],[{region:'shoulder',type:'pain'}]).map(goal=>goal.status),['blocked','blocked']);
});
