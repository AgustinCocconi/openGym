import { LIB_BY_ID, equipmentContext } from './library.js';
import { skillExerciseAllowed } from './skills.js';
import { jointSignalsForState } from './joint-signals.js';
export const ACTIVE_PROTOCOL = 'active-workout/v1';
export const ACTIVE_DOSE_POLICY = 'pending-volume-reduction/v1';
export const ACTIVE_REASONS = ['user_request','difficulty','equipment','joint_signal','time_limit'];
export const ACTIVE_OPERATIONS = ['replace_pending_exercise','continue_after_partial_exercise','add_active_exercise','adjust_pending_prescription','skip_pending_exercise','remove_pending_exercise','reorder_pending_exercise'];
const copy = value => JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : [];
const fields = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] != null && ['string','number','boolean'].includes(typeof value[key])).map(key=>[key,value[key]]));
const TARGET_FIELDS = ['mode','sets','reps','sec','min','speed','weight','bodyweight','side','repsMin','repsMax','prog','inc'];
function row(value, depth=0) {
  if (depth > 3) throw new Error('set nesting is too deep');
  const out = fields(value,['w','r','sec','min','speed','done','phase','type','rir','rpe']);
  for (const key of ['drops','clusters']) if (Array.isArray(value?.[key])) {
    if (value[key].length > 10) throw new Error('too many set details');
    out[key] = value[key].map(v=>row(v,depth+1));
  }
  if (value?.sides) out.sides = { L:row(value.sides.L,depth+1), R:row(value.sides.R,depth+1) };
  return out;
}
export const hasLoggedWork = value => value?.done === true || [value?.sides?.L,value?.sides?.R,...list(value?.drops),...list(value?.clusters)].some(child => child && hasLoggedWork(child));
export const itemStatus = entry => list(entry?.sets).length && entry.sets.every(s=>s.done===true) ? 'completed' : list(entry?.sets).some(hasLoggedWork) ? 'partial' : 'pending';
export function activeSnapshot(active) {
  if (!active || typeof active.id !== 'string' || !Array.isArray(active.entries) || active.entries.length > 40) throw new Error('invalid active workout');
  const entries = active.entries.map((entry,index)=>{
    if (typeof entry?.id !== 'string' || entry.id.length > 80 || !Array.isArray(entry.sets) || entry.sets.length > 30) throw new Error('invalid active exercise');
    return { index, ...fields(entry,['id','rid','sg','noProg','trainerSkipped']), target:fields(entry.target,TARGET_FIELDS), sets:entry.sets.map(s=>row(s)) };
  });
  const signals = list(active.trainerSignals).map(signal=>fields(signal,['region','type']));
  if (signals.length > 10 || signals.some(s=>!['pain','pinching','locking','instability'].includes(s.type) || !['shoulder','elbow','wrist','back','hip','knee','ankle','full_body'].includes(s.region))) throw new Error('invalid joint signals');
  const out = { unit:active.unit === 'lb' ? 'lb' : 'kg', id:active.id.slice(0,80), d:String(active.d||'').slice(0,10), cur:Number.isInteger(active.cur)?active.cur:0, entries, trainerSignals:signals };
  if (JSON.stringify(out).length > 40000) throw new Error('active context exceeds its budget');
  return out;
}
export function stateActiveSnapshot(state, note='') {
  const active=state.active;
  const signals=jointSignalsForState(state,{note});
  const unique=[...new Map(signals.map(s=>[s.region+':'+s.type,s])).values()];
  return activeSnapshot({...active,unit:state.unit||'kg',trainerSignals:unique});
}
export function activeFingerprint(active) {
  const text = JSON.stringify(activeSnapshot(active));
  let hash = 0x811c9dc5;
  for (let i=0;i<text.length;i++) hash=Math.imul(hash^text.charCodeAt(i),0x01000193)>>>0;
  return hash.toString(16).padStart(8,'0');
}
export function validateActiveProposal(data, snapshot, candidateIds, reportedSignals=[]) {
  const errors = [];
  try {
    const base=activeSnapshot(snapshot);
    if (data?.protocolVersion !== ACTIVE_PROTOCOL || data?.scope !== 'active_workout') errors.push('invalid active protocol or scope');
    if (data?.baseFingerprint !== activeFingerprint(base)) errors.push('stale active workout');
    if (typeof data?.summary !== 'string' || !data.summary.trim() || data.summary.length > 1200) errors.push('a short explanation is required');
    if (!Array.isArray(data?.operations) || data.operations.length !== 1) errors.push('propose exactly one active operation');
    if (['changes','bundle','week','routines','customEx'].some(key=>Object.hasOwn(data||{},key))) errors.push('active proposals cannot mutate the plan');
    if (!ACTIVE_REASONS.includes(data?.reasonCode)) errors.push('a known reason code is required');
    const operation=data?.operations?.[0];
    if (!ACTIVE_OPERATIONS.includes(operation?.type)) errors.push('unknown active operation');
    const entry=operation?.type!=='add_active_exercise' && Number.isInteger(operation?.index) ? base.entries[operation.index] : null;
    if (!entry && operation?.type !== 'add_active_exercise') errors.push('target occurrence does not exist');
    if (entry && itemStatus(entry)==='completed') errors.push('completed exercises are immutable');
    if ((base.trainerSignals.length || reportedSignals.length) && !['skip_pending_exercise','remove_pending_exercise'].includes(operation?.type)) errors.push('joint symptoms allow only skipping pending work; no compatible classified candidates');
    if (operation?.type==='replace_pending_exercise' && itemStatus(entry)!=='pending') errors.push('partial exercise must be continued, not replaced');
    if (operation?.type==='continue_after_partial_exercise' && itemStatus(entry)!=='partial') errors.push('continuation requires recorded work');
    if (['replace_pending_exercise','continue_after_partial_exercise','add_active_exercise'].includes(operation?.type)) {
      if (operation.type==='add_active_exercise' && base.entries.length>=40) errors.push('the active workout is at its entry limit');
      const id=operation.exerciseId;
      if (!list(candidateIds).includes(id) || !LIB_BY_ID.has(id)) errors.push('exercise is not an allowed candidate');
      if (base.entries.some(e=>e.id===id)) errors.push('the candidate is already in the workout');
      if (operation.prescription?.weight != null) errors.push('never carry load between exercises');
    }
    if (operation?.type==='remove_pending_exercise' && (itemStatus(entry)!=='pending' || entry?.sg)) errors.push('only an ungrouped exercise without logged work can be removed; skip partial work instead');
    if (operation?.type==='reorder_pending_exercise') {
      const target=base.entries[operation.position];
      if (!Number.isInteger(operation.position) || !target || itemStatus(entry)!=='pending' || itemStatus(target)!=='pending' || entry.sg || target.sg) errors.push('reorder only ungrouped pending occurrences');
    }
    if (['replace_pending_exercise','continue_after_partial_exercise','add_active_exercise','adjust_pending_prescription'].includes(operation?.type)) {
      const prescription=operation.prescription;
      if (!prescription || typeof prescription!=='object' || Array.isArray(prescription)) errors.push('a bounded prescription is required');
      else {
        if (Object.keys(prescription).some(key=>!['sets','reps','sec','mode'].includes(key))) errors.push('unknown prescription field');
        if (!Number.isInteger(prescription.sets) || prescription.sets<1 || prescription.sets>10) errors.push('sets must be 1..10');
        const mode=prescription.mode || entry?.target.mode || (entry?.target.sec>0 && !entry?.target.reps ? 'time' : 'reps');
        if ((mode==='reps' && prescription.sec != null) || (mode==='time' && prescription.reps != null)) errors.push('prescription fields must match the mode');
        if (!['reps','time'].includes(mode)) errors.push('only reps and time are supported');
        if (mode==='reps' && (!Number.isInteger(prescription.reps)||prescription.reps<1||prescription.reps>100)) errors.push('reps must be 1..100');
        if (mode==='time' && (!Number.isInteger(prescription.sec)||prescription.sec<5||prescription.sec>3600)) errors.push('time must be 5..3600 seconds');
        if (operation.type==='adjust_pending_prescription' && (entry?.target.side || entry?.sets.some(s=>s.sides||s.drops?.length||s.clusters?.length||s.type||s.phase==='warmup'))) errors.push('per-side prescriptions need a dedicated policy; use manual adjustment');
        if (operation.type==='adjust_pending_prescription') {
          if (data.dosePolicyVersion!==ACTIVE_DOSE_POLICY || itemStatus(entry)!=='pending') errors.push('dose policy only reduces entirely pending work');
          if (prescription.sets>Math.min(entry?.target.sets || entry?.sets.length,entry?.sets.length) || (mode==='time'?prescription.sec>entry?.target.sec||entry?.sets.some(s=>prescription.sec>s.sec):prescription.reps>entry?.target.reps||entry?.sets.some(s=>prescription.reps>s.r))) errors.push('this dose policy does not increase volume');
        }
        if (operation.type==='adjust_pending_prescription' && mode!==(entry?.target.mode||(entry?.target.sec>0&&!entry?.target.reps?'time':'reps'))) errors.push('do not change the mode of an existing exercise');
        if (operation.type==='adjust_pending_prescription' && prescription.sets<=entry?.sets.reduce((last,row,index)=>hasLoggedWork(row)?index:last,-1)) errors.push('cannot remove logged sets');
      }
    }
    if (errors.length) return {ok:false,errors};
    const clean={ type:operation.type, ...(entry?{index:operation.index}:{}), ...(operation.exerciseId?{exerciseId:operation.exerciseId}:{}), ...(operation.prescription?{prescription:{...fields(operation.prescription,['mode','sets','reps','sec']),mode:operation.prescription.mode||entry?.target.mode||(entry?.target.sec>0&&!entry?.target.reps?'time':'reps')}}:{}), ...(operation.type==='reorder_pending_exercise'?{position:operation.position}:{}) };
    return {ok:true,proposal:{protocolVersion:ACTIVE_PROTOCOL,scope:'active_workout',baseFingerprint:data.baseFingerprint,summary:data.summary.trim(),reasonCode:data.reasonCode,confirmationState:'proposed',
      evidence:{workoutId:base.id,...(entry?{exerciseId:entry.id,index:operation.index,status:itemStatus(entry),loggedSets:entry.sets.filter(hasLoggedWork).length,target:entry.target}:{})},...(operation.type==='adjust_pending_prescription'?{dosePolicyVersion:ACTIVE_DOSE_POLICY}:{}),operations:[clean]}};
  } catch (error) { return {ok:false,errors:[String(error.message)]}; }
}
function replacement(operation, original) {
  const target={...operation.prescription,bodyweight:LIB_BY_ID.get(operation.exerciseId)?.eq==='body weight',prog:'off'};
  return {id:operation.exerciseId,target,sets:Array.from({length:target.sets},()=>target.mode==='time'?{sec:target.sec,w:0,done:false}:{r:target.reps,w:0,done:false}),...(original?.rid?{rid:original.rid}:{}),noProg:original?.noProg===true};
}
export function applyActiveProposal(state, proposal, {confirmed=false}={}) {
  if (!confirmed) throw new Error('explicit confirmation required');
  const active=state.active;
  if (proposal.equipmentContext != null && proposal.equipmentContext !== equipmentContext(state.coach?.profile?.equipment)) throw new Error('equipment changed; request a fresh proposal');
  const checked=validateActiveProposal(proposal,stateActiveSnapshot(state),list(proposal.candidateIds).filter(id=>skillExerciseAllowed(state.coach?.skillGoals||[],id,jointSignalsForState(state))),proposal.jointSignals||[]);
  if (!checked.ok) throw new Error(checked.errors.join('; '));
  const before=copy(active); delete before.trainerUndo;
  const next=copy(before), op=checked.proposal.operations[0], entry=next.entries[op.index];
  if (op.type==='replace_pending_exercise') next.entries[op.index]={...replacement(op,entry),...(entry.sg?{sg:entry.sg}:{})};
  if (op.type==='continue_after_partial_exercise') {
    // Original rows stay byte-for-byte, including a completed unilateral side.
    const wasNoProg=entry.noProg; entry.noProg=true; entry.trainerSkipped=true;
    const last=entry.sg?next.entries.reduce((n,e,i)=>e.sg===entry.sg?i:n,op.index):op.index;
    next.entries.splice(last+1,0,replacement(op,{...entry,noProg:wasNoProg})); next.cur=last+1;
  }
  if (op.type==='add_active_exercise') { next.entries.push(replacement(op)); next.cur=next.entries.length-1; }
  if (op.type==='skip_pending_exercise') { entry.trainerSkipped=true; entry.noProg=true; next.cur=Math.min(op.index+1,next.entries.length-1); }
  if (op.type==='remove_pending_exercise') { next.entries.splice(op.index,1); next.cur=Math.max(0,Math.min(op.index,next.entries.length-1)); }
  if (op.type==='adjust_pending_prescription') {
    const original=entry.sets;
    const p=op.prescription;
    entry.target={...entry.target,...p}; entry.plan=null;
    entry.sets=Array.from({length:p.sets},(_,i)=>hasLoggedWork(original[i])?original[i]:({...original[i],w:original[i]?.w||0,...(p.mode==='time'?{sec:p.sec}:{r:p.reps}),done:false}));
  }
  if (op.type==='reorder_pending_exercise') { const [moved]=next.entries.splice(op.index,1); next.entries.splice(op.position,0,moved); next.cur=op.position; }
  if (proposal.jointSignals?.length) next.trainerSignals=[...new Map([...(next.trainerSignals||[]),...proposal.jointSignals].map(s=>[s.region+':'+s.type,s])).values()];
  next.trainerUndo={before,afterFingerprint:activeFingerprint({...stateActiveSnapshot({...state,active:next}),cur:0})};
  state.active=next;
  return checked.proposal;
}
export function canUndoActive(state) { try { return !!state.active?.trainerUndo && state.active.trainerUndo.afterFingerprint===activeFingerprint({...stateActiveSnapshot(state),cur:0}); } catch { return false; } }
export function undoActiveProposal(state) {
  if (!canUndoActive(state)) throw new Error('new work was recorded; preserve it and adjust manually');
  state.active=copy(state.active.trainerUndo.before);
}
