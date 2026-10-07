import { t } from '../../lib/i18n.js'
import { effortOf } from '../../lib/history.js'
import { EXIDX } from '../../lib/exercises.js'
import { APP_GUIDANCE } from '../../../../api/coach/core/app-guidance.js'
import { Button } from '../ui.jsx'

export default function WorkoutGuidance({ S, update }) {
  const entry = S?.active?.entries[S.active.cur]
  const equipment = EXIDX[entry?.id]?.eq
  const needsLoad = equipment && !['body weight', 'band', 'resistance band'].includes(equipment) &&
    entry.sets.length && !entry.sets.some(row => row.done || row.w > 0 || row.sides)
  return <>
    {needsLoad && <p className="small">{t('Load to calibrate: enter a manageable working load and record the reps you actually complete.')}</p>}
    <details className="small" style={{ marginBottom: 12 }}>
      <summary>{t('Loads, effort and warm-up: how to log')}</summary>
      {APP_GUIDANCE.map(fact => <p key={fact.topic}>{t(fact.text)}</p>)}
      {S && update && effortOf(S) === 'none' && <Button size="sm" onClick={() => update(s => { s.effort = 'rir'; delete s.showRir })}>{t('Enable RIR logging')}</Button>}
    </details>
  </>
}
