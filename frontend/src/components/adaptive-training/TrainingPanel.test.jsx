import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {parseHTML} from 'linkedom'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import TrainingPanel,{ActiveProposalCard} from './TrainingPanel.jsx'
import SkillsPanel from './SkillsPanel.jsx'
import {activeFingerprint} from '../../../../api/coach/core/active-workout.js'
import {skillProgression} from '../../../../api/coach/core/skills.js'
import {requestQuestion,requestActiveChange,resolvePending} from '../../lib/coach-api.js'
const mocks=vi.hoisted(()=>({S:null,pending:null,available:false,refresh:vi.fn()}))
vi.mock('../../store/useStore.js',()=>{
  const snapshot=()=>({S:mocks.S,user:{id:'u'},config:{coach:{enabled:mocks.available}},coachLocal:null,update:mut=>{const next=structuredClone(mocks.S);mut(next);mocks.S=next}})
  const useStore=selector=>selector(snapshot());useStore.getState=snapshot;return {useStore}
})
vi.mock('../../store/useUI.js',()=>({useUI:{getState:()=>({stopWork:()=>{},stopRest:()=>{}})}}))
vi.mock('../../lib/coach-api.js',()=>({useCoachStatus:()=>({job:null,pending:mocks.pending,last:null,lastError:null,refresh:mocks.refresh}),requestQuestion:vi.fn(async()=>({})),requestActiveChange:vi.fn(async()=>({})),resolvePending:vi.fn(async()=>({ok:true}))}))
vi.mock('../../lib/mobile.js',()=>({MOBILE:false}))
vi.mock('../../lib/demo.js',()=>({DEMO:false}))
let root,container,dom
const state=()=>({unit:'kg',routines:[{id:'r',ex:[{id:'0652',sets:2,reps:4}]}],week:{},workouts:[],coach:{consent:{version: 2,agreedAt:'today'},profile:{equipment:['body weight']},chat:[],log:[]},active:{id:'live',cur:0,entries:[{id:'0652',target:{mode:'reps',sets:2,reps:4},sets:[{r:3,w:0,done:true},{r:4,w:0,done:false}]}]}})
const props=element=>element[Object.keys(element).find(key=>key.startsWith('__reactProps$'))]
const button=text=>[...container.querySelectorAll('button')].find(element=>element.textContent===text)
const click=async element=>{expect(element).toBeTruthy();await act(async()=>element.dispatchEvent(new dom.Event('click',{bubbles:true})))}
async function mount(Component=TrainingPanel,extra={}){
  await act(async()=>root.render(React.createElement(Component,{S:mocks.S,update:mut=>{const next=structuredClone(mocks.S);mut(next);mocks.S=next},...extra})))
}
beforeEach(()=>{
  vi.clearAllMocks();mocks.S=state();mocks.pending=null;mocks.available=false;resolvePending.mockResolvedValue({ok:true})
  dom=parseHTML('<html><body><div id="root"></div></body></html>').window
  globalThis.window=dom;globalThis.document=dom.document;Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.navigator})
  for(const key of ['HTMLElement','Node','Element','Event'])globalThis[key]=dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;container=document.getElementById('root');root=createRoot(container)
})
afterEach(async()=>{await act(async()=>root.unmount())})
it('manual skipping needs confirmation, preserves partial records and can be undone without AI',async()=>{
  const before=structuredClone(mocks.S)
  await mount();await click(button('Ask or adapt this session'));await click(button('Propose skipping this exercise'))
  expect(mocks.S).toEqual(before)
  await click(button('Confirm session change'))
  expect(mocks.S.active.entries[0].sets).toEqual(before.active.entries[0].sets);expect(mocks.S.active.entries[0].trainerSkipped).toBe(true)
  expect(mocks.S.routines).toEqual(before.routines);expect(resolvePending).not.toHaveBeenCalled()
  await click(button('Undo the last session change'));expect(mocks.S.active).toEqual(before.active)
})
it('acknowledgement failure never reapplies an already confirmed operation',async()=>{
  const p={id:'p',kind:'active',protocolVersion:'active-workout/v1',scope:'active_workout',reasonCode:'user_request',summary:'Saltear',candidateIds:[],baseFingerprint:activeFingerprint(mocks.S.active),operations:[{type:'skip_pending_exercise',index:0}]}
  resolvePending.mockRejectedValueOnce(new Error('offline'))
  await mount(ActiveProposalCard,{p});await click(button('Confirm session change'))
  expect(container.textContent).toContain('The change is applied. Connection failed')
  expect(button('Confirm session change')).toBeUndefined();expect(mocks.S.coach.log).toHaveLength(1)
  await click(button('Retry acknowledgement'));expect(mocks.S.coach.log).toHaveLength(1)
  expect(resolvePending).toHaveBeenLastCalledWith({proposalId:'p',accepted:['active-operation']})
})
it('oversized session context keeps the workout usable and disables AI adaptation',async()=>{
  mocks.S.active.entries[0].sets=Array(31).fill({r:3,done:false});const before=structuredClone(mocks.S)
  await mount();await click(button('Ask or adapt this session'))
  expect(container.textContent).toContain('exceeds the AI context limit');expect(button('Propose skipping this exercise')).toBeUndefined();expect(mocks.S).toEqual(before)
})
it('questions remain available during a session with a pending plan',async()=>{
  mocks.available=true;mocks.pending={kind:'create',id:'plan'}
  await mount();await click(button('Ask or adapt this session'))
  await act(async()=>props(container.querySelector('textarea')).onChange({target:{value:'Como hago este ejercicio?'}}))
  expect(button('Send').hasAttribute('disabled')).toBe(false);await click(button('Send'))
  expect(requestQuestion).toHaveBeenCalledWith('Como hago este ejercicio?',expect.objectContaining({id:'live'}));expect(requestActiveChange).not.toHaveBeenCalled()
})
it('a beginner cannot unlock the next goal with three reps or with reported pain',async()=>{
  const goal={id:'base',name:'Dominadas',exerciseId:'0652',mode:'reps',target:4,prerequisiteIds:[],attempts:[]}
  mocks.S.coach.skillGoals=[goal,{...structuredClone(goal),id:'next',name:'Siguiente',prerequisiteIds:['base']}]
  mocks.S.workouts=[{id:'w',d:'2026-10-04',entries:[{id:'0652',sets:[{r:3,done:true}]}]}];mocks.S.active=null
  await mount(SkillsPanel)
  const checkboxes=container.querySelectorAll('input[type="checkbox"]')
  await act(async()=>{props(checkboxes[1]).onChange({target:{checked:true}});props(checkboxes[2]).onChange({target:{checked:true}})})
  await click(button('Record skill evidence'))
  expect(skillProgression(mocks.S.coach.skillGoals).map(g=>g.status)).toEqual(['active','locked'])
  await act(async()=>props(container.querySelector('input[type="checkbox"]')).onChange({target:{checked:true}}))
  await mount(SkillsPanel)
  expect([...container.querySelectorAll('button')].filter(b=>b.textContent==='Record skill evidence').every(b=>b.hasAttribute('disabled'))).toBe(true)
})

it('removing an unstarted exercise waits for confirmation and preserves the saved routine',async()=>{
  mocks.S.active.entries[0].sets.forEach(row=>row.done=false);const before=structuredClone(mocks.S)
  await mount();await click(button('Ask or adapt this session'));await click(button('Propose removing this exercise'));expect(mocks.S).toEqual(before)
  await click(button('Confirm session change'));expect(mocks.S.active.entries).toHaveLength(0);expect(mocks.S.routines).toEqual(before.routines)
})

it('effort logging can be enabled manually from help without changing training records', async () => {
  const before = structuredClone(mocks.S)
  await mount()
  expect(container.textContent).toContain('Loads, effort and warm-up: how to log')
  await click(button('Enable RIR logging'))
  expect(mocks.S.effort).toBe('rir')
  expect(mocks.S.routines).toEqual(before.routines)
  expect(mocks.S.active).toEqual(before.active)
})
