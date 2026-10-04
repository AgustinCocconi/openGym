import test from 'node:test';
import assert from 'node:assert/strict';
import { librarySlice, LIB_BY_ID, equipmentContext } from './library.js';
import { build } from './payload.js';
test('strict candidates never fall back to unavailable equipment or pin an incompatible exercise',()=>{
  assert.deepEqual(librarySlice({},['unknown'],{strictEquipment:true}),[]);
  const ids=librarySlice({},['body weight'],{strictEquipment:true,keep:['0023'],max:20});
  assert.equal(ids.length,20); assert.ok(ids.every(e=>LIB_BY_ID.get(e.id).eq==='body weight'));
  assert.equal(equipmentContext(['body weight','dumbbell']),equipmentContext(['Dumbbell','body weight','dumbbell']));
});
test('existing exercises stay readable while proposal candidates remain strictly filtered',()=>{
  const S={lang:'es-AR',coach:{profile:{equipment:['unknown']}},routines:[{id:'r',ex:[{id:'0652',sets:3,reps:4}]}]};
  for(const kind of ['review','create','question']) {
    const p=build(S,{kind,handle:'fixture'}); assert.deepEqual(p.library,[]); assert.equal(p.plan.routines[0].ex[0].id,'0652');
  }
  const p=build(S,{kind:'question',handle:'fixture'}); assert.equal(p.exerciseDetails[0].name,'Dominadas');
  assert.ok(p.exerciseDetails[0].instructions.length); assert.equal(p.meta.lang,'es-AR');
});

test('a live question can read documented instructions for a mentioned next exercise',()=>{
  const S={lang:'es-AR',coach:{profile:{equipment:['body weight']}},routines:[]};
  const activeWorkoutSnapshot={id:'live',cur:0,entries:[{id:'0652',target:{sets:2,reps:4},sets:[{r:3,done:true},{r:4,done:false}]}]};
  const p=build(S,{kind:'question',handle:'fixture',note:'Como hago las flexiones?',activeWorkoutSnapshot});
  const details=p.exerciseDetails.find(ex=>ex.id==='0662');assert.ok(details.instructions.length);assert.equal(details.name,'Flexiones');
  assert.equal(p.activeWorkoutSnapshot.entries[0].sets[0].r,3);
});
