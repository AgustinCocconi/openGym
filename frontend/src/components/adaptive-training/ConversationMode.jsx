import { useEffect } from 'react'
import { t } from '../../lib/i18n.js'
import { requestQuestion, refinePlan, requestReview } from '../../lib/coach-api.js'
import { stateActiveSnapshot } from '../../../../api/coach/core/active-workout.js'
import { appendChat } from '../../lib/coach.js'
import { Segmented } from '../ui.jsx'
import './controls.css'
export function ConversationMode({ mode, onChange, pending, scope = 'plan' }) {
  return <div className="conversation-mode" role="group" aria-label={t('Conversation mode')}>
    <Segmented value={mode} onChange={onChange} options={[
      { value: 'question', label: t('Ask a question') },
      { value: scope, label: t(scope === 'active' ? 'Request a session change' : 'Request a plan change') }
    ]} />
    {scope === 'plan' && (mode === 'plan' || ['create','review'].includes(pending?.kind)) && <p className="muted small">{t('Plan changes affect saved routines and require confirmation. Session changes are available inside the workout.')}</p>}
  </div>
}
export function sendCoachMessage(S, pending, text, mode) {
  if (mode === 'question') {
    let snapshot
    try { if (S.active) snapshot = stateActiveSnapshot(S,text) } catch {}
    return requestQuestion(text, snapshot)
  }
  return pending?.kind === 'create' || !(S.routines || []).length ? refinePlan(text) : requestReview(text)
}
export function QuestionReplies({ last, job, S, update }) {
  useEffect(() => {
    if (job || (!last?.reading && !['question','active'].includes(last?.kind)) || !last.id || (!last.reading && last.outcome !== 'failed') || S.coach?.chat?.some(message => message.jobId === last.id)) return
    update(state => {
      if (!state.coach?.chat?.some(message => message.jobId === last.id)) appendChat(state, { role: 'coach', kind: last.reading ? 'text' : 'error', text: last.reading || t('Could not ask the Coach'), jobId: last.id })
    })
  }, [last?.id, last?.reading, !!job])
  return null
}
