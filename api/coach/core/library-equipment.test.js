import test from 'node:test';
import assert from 'node:assert/strict';
import {LIBRARY, LIB_BY_ID, librarySlice, isStretch} from './library.js';

const equipment = ['body weight', 'band', 'dumbbell', 'barbell', 'cable', 'leverage machine', 'kettlebell'];
const bandIds = LIBRARY.filter(e => e.eq === 'band').slice(0, 12).map(e => e.id);
const S = {routines:[{id:'r1',ex:bandIds.map(id=>({id,sets:2,reps:10}))}],workouts:[],customEx:[]};
const options = {keep:bandIds,max:60,strictEquipment:true,locale:'es-AR'};

test('bounded review candidates cover available weights despite a pinned band plan', () => {
  const before=structuredClone(S), slice=librarySlice(S,equipment,options);
  assert.equal(slice.length,60);
  assert.equal(new Set(slice.map(e=>e.id)).size,slice.length);
  for(const id of bandIds)assert.ok(slice.some(e=>e.id===id));
  for(const eq of equipment)assert.ok(slice.some(e=>e.eq===eq),'missing '+eq);
  const parts=new Set(LIBRARY.filter(e=>equipment.includes(e.eq) && !isStretch(e)).map(e=>e.bp));
  assert.deepEqual(new Set(slice.map(e=>e.bp)),parts);
  assert.deepEqual(slice,librarySlice(S,equipment,options));
  assert.deepEqual(S,before);
  for(const e of slice){assert.ok(equipment.includes(e.eq));assert.equal(e.eq,LIB_BY_ID.get(e.id).eq);}
});

test('equipment balance never adds weights when only bands and bodyweight are declared', () => {
  const allowed=['band','body weight'], slice=librarySlice(S,allowed,options);
  assert.ok(slice.length<=60);
  assert.ok(slice.some(e=>e.eq==='band'));
  assert.ok(slice.some(e=>e.eq==='body weight'));
  assert.ok(slice.every(e=>allowed.includes(e.eq)));
});
