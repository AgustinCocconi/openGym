import { useEffect } from 'react'
import { t } from '../../lib/i18n.js'
import { requestQuestion, refinePlan, requestReview } from '../../lib/coach-api.js'
import { stateActiveSnapshot } from '../../../../api/coach/core/active-workout.js'
import { appendChat } from '../../lib/coach.js'
export function ConversationMode({ mode, onChange, pending }) {
  return <div><label>{t('Conversation mode')}<select value={mode} onChange={event => onChange(event.target.value)}><option value="question">{t('Ask a question')}</option><option value="plan">{t('Request a plan change')}</option></select></label>{(mode === 'plan' || ['create','review'].includes(pending?.kind)) && <p className="small">{t('Plan changes affect saved routines and require confirmation. Session changes are available inside the workout.')}</p>}</div>
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
    if (job || !['question','active'].includes(last?.kind) || !last.id || (!last.reading && last.outcome !== 'failed') || S.coach?.chat?.some(message => message.jobId === last.id)) return
    update(state => {
      if (!state.coach?.chat?.some(message => message.jobId === last.id)) appendChat(state, { role: 'coach', kind: last.reading ? 'text' : 'error', text: last.reading || t('Could not ask the Coach'), jobId: last.id })
    })
  }, [last?.id, last?.reading, !!job])
  return null
}
