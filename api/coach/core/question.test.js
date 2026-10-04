import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from './question.js';
import { runPipeline } from './pipeline.js';
test('an informative answer is kept without any proposal', () => {
  assert.deepEqual(validateQuestion({ answer: 'Consulta sin cambios.' }), {ok:true,nochange:true,reading:'Consulta sin cambios.'});
});
test('all mutation shapes are rejected even alongside a valid answer', () => {
  for (const field of ['changes','operations','bundle','routines','week','customEx','nochange']) assert.equal(validateQuestion({answer:'Consulta.',[field]:[]}).ok,false);
});
test('questions use the same read-only validator for HTTP and CLI providers', async () => {
  for (const spawns of [false,true]) {
    const payload={meta:{lang:'es'},library:[],plan:{},coachProfile:{}};
    const good={spawns,invoke:async()=>({code:0,text:JSON.stringify({answer:'No hay evidencia suficiente.'})})};
    assert.equal((await runPipeline({adapter:good,cfg:{},kind:'question',payload})).nochange,true);
    const bad={spawns,invoke:async()=>({code:0,text:JSON.stringify({answer:'Consulta.',changes:[]})})};
    assert.equal((await runPipeline({adapter:bad,cfg:{},kind:'question',payload})).ok,false);
  }
});
