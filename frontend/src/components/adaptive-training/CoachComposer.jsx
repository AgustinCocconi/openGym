import { t } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'
import { ConversationMode } from './ConversationMode.jsx'
import { useComposerLayout } from './useComposerLayout.js'

export default function CoachComposer({ mode, onModeChange, pending, text, onTextChange, placeholder, job, busy, onSend, cap, children }) {
  const { composerRef, textRef } = useComposerLayout(text)
  return <div className="composer" ref={composerRef}>
    <ConversationMode mode={mode} onChange={onModeChange} pending={pending} />
    {children}
    <div className="composer-in">
      <textarea ref={textRef} rows={2} aria-label={t('Message the Coach')} value={text} maxLength={1000}
        placeholder={mode === 'question' ? t('Ask about an exercise or your technique') : placeholder} disabled={!!job}
        onChange={event => onTextChange(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onSend() } }} />
      <button className="send" onClick={onSend} disabled={!text.trim() || busy || !!job} aria-label={t('Send')}><Icon name="arrowUp" /></button>
    </div>
    {cap?.limit > 0 && <div className="composer-cap">{t('{0} of {1} Coach runs used today', cap.used, cap.limit)}</div>}
  </div>
}
