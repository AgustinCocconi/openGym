import { swapPrescription } from '../../../api/coach/core/review-result.js'
import { isBw } from './history.js'
import { t } from './i18n.js'

export function swapChangeValues(c, S, title) {
  const old = (c.before && typeof c.before === 'object' ? c.before : null) || S?.routines?.find(r => r.id === c.target?.routineId)?.ex?.find(e => e.id === c.target?.exId)
  if (!old || typeof old !== 'object') return null
  const describe = e => [title(e.id),
    e.mode === 'time' ? `${e.sets || 0} × ${e.sec || 0} s` : e.mode === 'cardio' ? `${e.sets || 0} × ${e.min || 0} min` : `${e.sets || 0} × ${e.reps || 0}`,
    e.repsMin > 0 && e.repsMax > 0 ? `${e.repsMin}–${e.repsMax}` : e.mode === 'reps' || !e.mode ? t('Fixed reps') : null,
    e.prog === 'off' ? t('Manual progression') : null,
    e.weight > 0 ? `${e.weight} ${S?.unit || 'kg'}` : isBw(e, S) ? t('Body weight') : t('Load to calibrate')].filter(Boolean).join(' · ')
  return { before: describe(old), after: describe(swapPrescription(old, c.after || {})) }
}
