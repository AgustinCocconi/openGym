/* Conservative explicit symptom reports; narrative never clears a stored signal. */
const REGIONS={shoulder:'hombro|shoulder',elbow:'codo|elbow',wrist:'muneca|wrist',back:'espalda|back',hip:'cadera|hip',knee:'rodilla|knee',ankle:'tobillo|ankle'};
const TYPES={pain:'me duele(?:n)?|dolor|pain',pinching:'pinzamiento|pinching',locking:'bloqueo|locking',instability:'inestabilidad|instability'};
export function reportedJointSignals(text) {
  const input=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const signals=[];
  for(const [region,words] of Object.entries(REGIONS)) for(const [type,symptom] of Object.entries(TYPES)) {
    const expression=new RegExp('(?:'+symptom+')[^.!?]{0,35}\\b(?:'+words+')\\b|\\b(?:'+words+')[^.!?]{0,20}(?:'+symptom+')','g');
    for(const match of input.matchAll(expression)) {
      const prefix=input.slice(Math.max(0,match.index-30),match.index);
      if (/\b(?:no(?: tengo| hay| siento)?|sin|without|no current|si|if)\s*$/.test(prefix)) continue;
      if (/\b(?:tuve|antes tenia|historial de|used to have)\s*$/.test(prefix)) continue;
      signals.push({region,type}); break;
    }
  }
  return signals;
}

const list=value=>Array.isArray(value)?value:[];
// Reading a conversation may restrict a later proposal; it never edits the workout.
export function jointSignalsForState(state, {note='',extra=[]}={}) {
  const coach=state.coach||{}, cleared=coach.clearedJointSignals||{}, limits=String(coach.profile?.limitations||'');
  const signals=[...list(coach.jointSignals),...list(state.active?.trainerSignals),...list(extra)];
  for(const signal of reportedJointSignals(limits)) if(cleared[signal.region]?.limitations!==limits) signals.push(signal);
  for(const message of list(coach.chat).slice(-40)) {
    const text=String(message?.text||'').slice(0,2000);
    if(message?.role!=='user' || !/\b(?:tengo|siento|me duele|me duelen|i have)\b/i.test(text)) continue;
    for(const signal of reportedJointSignals(text)) if(Number(message.at)>Number(cleared[signal.region]?.at||0)) signals.push(signal);
  }
  signals.push(...reportedJointSignals(note));
  return [...new Map(signals.map(signal=>[signal.region+':'+signal.type,{region:signal.region,type:signal.type}])).values()]
    .sort((a,b)=>(a.region+':'+a.type).localeCompare(b.region+':'+b.type)).slice(0,10);
}
export function setShoulderPain(state, present, at=Date.now()) {
  state.coach ||= {};
  const others=list(state.coach.jointSignals).filter(signal=>signal.region!=='shoulder');
  state.coach.jointSignals=present?[...others,{region:'shoulder',type:'pain'}]:others;
  if(!present) {
    state.coach.clearedJointSignals ||= {};
    state.coach.clearedJointSignals.shoulder={at,limitations:String(state.coach.profile?.limitations||'')};
    if(Array.isArray(state.active?.trainerSignals)) state.active.trainerSignals=state.active.trainerSignals.filter(signal=>signal.region!=='shoulder');
  }
}
