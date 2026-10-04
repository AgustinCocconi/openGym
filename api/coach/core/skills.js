import { LIB_BY_ID } from './library.js';
import { jointSignalsForState } from './joint-signals.js';
export const SKILL_PROTOCOL = 'skill-progression/v1';
export function validateSkillGoals(goals) {
  if (!Array.isArray(goals) || goals.length>20) throw new Error('invalid skill goals');
  const ids=new Set();
  for (const goal of goals) {
    if (typeof goal?.id!=='string' || !goal.id || goal.id.length>80 || ids.has(goal.id)) throw new Error('skill ids must be unique');
    ids.add(goal.id);
    if (typeof goal.name!=='string' || !goal.name.trim() || goal.name.length>80 || !LIB_BY_ID.has(goal.exerciseId)) throw new Error('invalid skill exercise or name');
    if (!['reps','time'].includes(goal.mode) || !Number.isInteger(goal.target) || goal.target<1 || goal.target>(goal.mode==='time'?3600:100)) throw new Error('invalid skill test');
    if (!Array.isArray(goal.prerequisiteIds) || new Set(goal.prerequisiteIds).size!==goal.prerequisiteIds.length) throw new Error('invalid prerequisites');
    if (!Array.isArray(goal.attempts) || goal.attempts.length>20) throw new Error('too many skill attempts');
  }
  const visited=new Set(), visiting=new Set(), byId=new Map(goals.map(g=>[g.id,g]));
  const visit=id=>{
    if (!byId.has(id)) throw new Error('missing prerequisite');
    if (visiting.has(id)) throw new Error('skill prerequisites must be acyclic');
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id).prerequisiteIds.forEach(visit); visiting.delete(id); visited.add(id);
  };
  goals.forEach(g=>visit(g.id));
  return goals;
}
export function skillProgression(goals, jointSignals=[]) {
  validateSkillGoals(goals);
  const mastered=new Set();
  const passed=g=>g.attempts.some(a=>a?.result==='passed' && a.confirmedBy==='athlete' && a.formConfirmed===true && a.painFree===true && Number.isFinite(a.value) && a.value>=g.target && typeof a.workoutId==='string');
  let changed=true;
  while(changed) { changed=false; for(const g of goals) if(!mastered.has(g.id)&&g.prerequisiteIds.every(id=>mastered.has(id))&&passed(g)) {mastered.add(g.id);changed=true;} }
  return goals.map(goal=>({id:goal.id,name:goal.name,exerciseId:goal.exerciseId,mode:goal.mode,target:goal.target,
    status:mastered.has(goal.id)?'mastered':jointSignals.length?'blocked':goal.prerequisiteIds.every(id=>mastered.has(id))?'active':'locked',
    available:jointSignals.length===0,
    missingPrerequisiteIds:goal.prerequisiteIds.filter(id=>!mastered.has(id)),
    bestRecorded:goal.attempts.reduce((best,a)=>a.confirmedBy==='athlete'&&Number.isFinite(a.value)?Math.max(best,a.value):best,0)}));
}
export function recordSkillAttempt(state, skillId, {workoutId,entryIndex,formConfirmed=false,painFree=false}={}) {
  const coach=state.coach||{}, goals=coach.skillGoals||[];
  validateSkillGoals(goals);
  if (jointSignalsForState(state).length) throw new Error('joint signal blocks skill progression');
  const goal=goals.find(g=>g.id===skillId);
  const status=skillProgression(goals).find(g=>g.id===skillId)?.status;
  if (!goal || status==='locked') throw new Error('prerequisites are not mastered');
  const workout=(state.workouts||[]).find(w=>w.id===workoutId), entry=workout?.entries?.[entryIndex];
  if (!entry || entry.id!==goal.exerciseId || entry.noProg || !Number.isInteger(entryIndex)) throw new Error('no matching completed evidence');
  const rows=(entry.sets||[]).filter(s=>s.done===true&&!s.sides&&!s.drops?.length&&!s.clusters?.length&&!s.type&&s.phase!=='warmup');
  if (!rows.length) throw new Error('no completed sets to assess');
  const value=Math.max(...rows.map(s=>Number(goal.mode==='time'?s.sec:s.r)||0));
  const passed=value>=goal.target && formConfirmed===true && painFree===true;
  const attempt={workoutId,entryIndex,value,formConfirmed:formConfirmed===true,painFree:painFree===true,result:passed?'passed':'not_passed',confirmedBy:'athlete'};
  goal.attempts=[...goal.attempts.filter(a=>a.workoutId!==workoutId||a.entryIndex!==entryIndex),attempt].slice(-20);
  return attempt;
}

export function skillExerciseAllowed(goals, exerciseId, jointSignals=[]) {
  const matching=skillProgression(goals,jointSignals).filter(goal=>goal.exerciseId===exerciseId);
  return !matching.length || matching.some(goal=>goal.available && ['active','mastered'].includes(goal.status));
}
