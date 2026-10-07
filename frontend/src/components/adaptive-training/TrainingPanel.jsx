import { useState } from 'react'
import WorkoutGuidance from './WorkoutGuidance.jsx'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, exerciseNameFor } from '../../lib/i18n.js'
import { EXIDX } from '../../lib/exercises.js'
import { coachAvailable, hasConsent, appendChat, appendLog } from '../../lib/coach.js'
import { useCoachStatus, requestQuestion, requestActiveChange, resolvePending } from '../../lib/coach-api.js'
import { MOBILE } from '../../lib/mobile.js'
import { DEMO } from '../../lib/demo.js'
import { activeFingerprint, stateActiveSnapshot, applyActiveProposal, canUndoActive, undoActiveProposal, itemStatus, ACTIVE_PROTOCOL } from '../../../../api/coach/core/active-workout.js'
import { jointSignalsForState, setShoulderPain } from '../../../../api/coach/core/joint-signals.js'
import { ConversationMode, QuestionReplies } from './ConversationMode.jsx'
import { Button, TextArea } from '../ui.jsx'

const operationText = { replace_pending_exercise: 'Replace the pending exercise', continue_after_partial_exercise: 'Keep logged sets and continue with another exercise', add_active_exercise: 'Add an exercise to this session', adjust_pending_prescription: 'Adjust only the remaining sets', skip_pending_exercise: 'Skip the remaining work for this exercise', reorder_pending_exercise: 'Move a pending exercise', remove_pending_exercise: 'Remove an exercise with no logged work' }
export function ActiveProposalCard({ p, S, update, refresh = () => {} }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [applied, setApplied] = useState(false)
  const alreadyApplied = applied || !!(p.id && S.coach?.log?.some(item => item.kind === 'active' && item.proposalId === p.id))
  let stale = true
  try { stale = p.baseFingerprint !== activeFingerprint(stateActiveSnapshot(S)) } catch {}
  const operation = p.operations?.[0], original = p.evidence?.exerciseId ? { id:p.evidence.exerciseId, target:p.evidence.target, sets:Array(p.evidence.loggedSets).fill(null) } : S.active?.entries?.[operation?.index]
  const name = id => exerciseNameFor(EXIDX[id])
  const acknowledge = async () => {
    try { if (p.id) await resolvePending({ proposalId: p.id, accepted: ['active-operation'] }); setError(''); refresh() }
    catch { setError(t('The change is applied. Connection failed while acknowledging it; retry without applying it again.')) }
  }
  const apply = async () => {
    if (busy || alreadyApplied) return
    setBusy(true); setError('')
    try {
      update(s => {
        applyActiveProposal(s, p, { confirmed: true })
        appendLog(s, { kind: 'active', at: Date.now(), proposalId: p.id, summary: p.summary, decisions: p.operations })
        appendChat(s, { role: 'coach', kind: 'text', text: t('The confirmed change was applied only to this session.') })
      }, true)
      useUI.getState().stopWork?.(); useUI.getState().stopRest?.()
      setApplied(true)
    } catch {
      setError(t('The session changed or this proposal is incompatible. Request a fresh proposal.')); setBusy(false); return
    }
    await acknowledge(); setBusy(false)
  }
  const reject = async () => {
    setBusy(true); setError('')
    try { await resolvePending({ proposalId: p.id, dismissed: true }); refresh() }
    catch { setError(t('Could not ask the Coach')) }
    setBusy(false)
  }
  return <div className="item adaptive-controls">
    <b>{t('Proposed session change')}</b>
    <p>{p.summary}</p>
    {p.evidence && <p className="small">{t('Recorded sets preserved: {0}', p.evidence.loggedSets || 0)}</p>}
    <p className="small">{t('Scope: this session only. Your saved routine stays as it is.')}</p>
    <p>{t(operationText[operation?.type] || 'Unsupported change')}</p>
    {original && <p>{t('Before')}: {name(original.id)} · {original.target?.sets || original.sets.length} × {original.target?.sec || original.target?.reps || 0}</p>}
    <p>{t('After')}: {['skip_pending_exercise','remove_pending_exercise','reorder_pending_exercise'].includes(operation?.type) ? t(operationText[operation.type]) : operation?.exerciseId ? name(operation.exerciseId) : original ? name(original.id) : ''}{operation?.type === 'reorder_pending_exercise' && <> · {operation.index + 1} → {operation.position + 1}</>} {operation?.prescription && <>· {operation.prescription.sets} × {operation.prescription.sec || operation.prescription.reps} {operation.prescription.mode === 'time' ? t('seconds') : t('reps')}</>}</p>
    <p className="muted small">{t('Logged sets stay recorded. A replacement starts without transferred load; adjust it manually.')}</p>
    {stale && !alreadyApplied && <p role="alert">{t('The session changed. Request a fresh proposal.')}</p>}
    {alreadyApplied ? <><p>{t('The confirmed change was applied only to this session.')}</p>{p.id && <Button disabled={busy} onClick={acknowledge}>{t('Retry acknowledgement')}</Button>}</> : <>
      <Button disabled={stale || busy} onClick={apply}>{t('Confirm session change')}</Button>
      {!!p.id && <Button disabled={busy} variant="ghost" onClick={reject}>{t('Reject')}</Button>}
    </>}
    {!!error && <p role="alert">{error}</p>}
  </div>
}
export default function TrainingPanel() {
  const S = useStore(s => s.S), update = useStore(s => s.update)
  const config = useStore(s => s.config), user = useStore(s => s.user), coachLocal = useStore(s => s.coachLocal)
  const [open, setOpen] = useState(false), [text, setText] = useState(''), [mode, setMode] = useState('question')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [manual, setManual] = useState(null)
  const available = !DEMO && coachAvailable(config, user, { mobile: MOBILE, coachMode: coachLocal?.mode }) && hasConsent(S) && !!S.coach?.profile
  const { job, pending, last, lastError, refresh } = useCoachStatus(available && open)
  if (!S.active) return null
  const signals = jointSignalsForState(S), entry = S.active.entries[S.active.cur]
  let snapshot = null
  try { snapshot = stateActiveSnapshot(S) } catch {}
  const ask = async () => {
    if (!text.trim()) return
    setBusy(true); setError(''); setManual(null)
    try {
      await (mode === 'question' ? requestQuestion : requestActiveChange)(text.trim(), snapshot ? stateActiveSnapshot(S,text.trim()) : undefined)
      update(s => appendChat(s, { role: 'user', kind: 'text', text: text.trim() }))
      setText(''); refresh()
    } catch { setError(t('Could not ask the Coach')) }
    setBusy(false)
  }
  const skip = (remove = false) => {
    if (!snapshot) return
    setManual({ protocolVersion: ACTIVE_PROTOCOL, scope: 'active_workout', baseFingerprint: activeFingerprint(snapshot), candidateIds: [],
      reasonCode: 'user_request', summary: t(remove ? 'You asked to remove this unstarted exercise from this session.' : 'You asked to skip the remaining work while keeping anything already logged.'), operations: [{ type: remove ? 'remove_pending_exercise' : 'skip_pending_exercise', index: S.active.cur }] })
  }
  return <section className="sect adaptive-controls" style={{ margin: '12px 0' }}>
    <WorkoutGuidance S={S} update={update} />
    <Button size="sm" variant="tinted" onClick={() => setOpen(!open)}>{t('Ask or adapt this session')}</Button>
    {open && <>
      <p className="small">{t('Questions never change exercises. Adaptation always requires a proposal and your confirmation.')}</p>
      <QuestionReplies last={last} job={job} S={S} update={update} />
      <label className="adaptive-check"><input type="checkbox" checked={signals.some(s => s.region === 'shoulder' && s.type === 'pain')} onChange={event => {
        const checked = event.target.checked
        update(s => setShoulderPain(s,checked))
      }} />{t('I currently have shoulder pain')}</label>
      {!!snapshot?.trainerSignals.length && <p role="alert">{t('Pain blocks skill advancement and unclassified exercise alternatives. You can skip pending work or finish.')}</p>}
      {!snapshot && <p role="alert">{t('This session exceeds the AI context limit. Questions and manual logging remain available.')}</p>}
      {entry?.trainerSkipped && <p>{t('The remaining work was skipped. Logged sets are preserved.')}</p>}
      {available ? <>
        <ConversationMode mode={mode} onChange={setMode} scope="active" />
        <TextArea aria-label={t('Message the Coach')} value={text} maxLength={1000} onChange={event => setText(event.target.value)} />
        <Button disabled={busy || !!job || !text.trim() || (mode === 'active' && (!snapshot || !!pending))} onClick={ask}>{t('Send')}</Button>
        {job && <p>{t('Coach is thinking…')}</p>}
        {!!last?.reading && <p>{last.reading}</p>}
        {lastError && <p role="alert">{t('Could not ask the Coach')}</p>}
      </> : <p className="muted small">{t('Manual adjustments remain available while the AI is not configured.')}</p>}
      {pending?.kind === 'active' && <ActiveProposalCard p={pending} S={S} update={update} refresh={refresh} />}
      {snapshot && entry && !entry.trainerSkipped && itemStatus(entry) !== 'completed' && <Button variant="ghost" size="sm" onClick={() => skip()}>{t('Propose skipping this exercise')}</Button>}
      {snapshot && entry && !entry.sg && itemStatus(entry) === 'pending' && <Button variant="ghost" size="sm" onClick={() => skip(true)}>{t('Propose removing this exercise')}</Button>}
      {manual && <ActiveProposalCard p={manual} S={S} update={update} refresh={() => setManual(null)} />}
      {S.active.trainerUndo && <>
        <Button variant="ghost" size="sm" disabled={!canUndoActive(S)} onClick={() => update(s => { undoActiveProposal(s); appendChat(s, { role: 'coach', kind: 'text', text: t('The last session change was undone.') }) }, true)}>{t('Undo the last session change')}</Button>
        {!canUndoActive(S) && <p className="muted small">{t('New work was recorded. Keep it and adjust manually instead of restoring an old snapshot.')}</p>}
      </>}
      {!!error && <p role="alert">{error}</p>}
    </>}
  </section>
}
