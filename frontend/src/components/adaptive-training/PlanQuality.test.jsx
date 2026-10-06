import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { setLang } from '../../lib/i18n.js'
import PlanQuality from './PlanQuality.jsx'
import { PLAN_QUALITY_VERSION } from '../../../../api/coach/core/plan-quality.js'

const quality = {
  version: PLAN_QUALITY_VERSION,
  requirements: { enforceCoverage: false },
  weeklySets: { knee_dominant: 8, posterior: 0, push: 4, pull: 10 },
  issues: [
    { code: 'quality.coverage_missing', group: 'posterior' },
    { code: 'quality.upper_balance', push: 4, pull: 10 },
    { code: 'quality.exercise_order', routineId: 'a' },
    { code: 'quality.session_time', routineId: 'a', estimatedMin: 40, estimatedMax: 60, requestedMin: 30 },
    { code: 'quality.unclassified', count: 1 },
    { code: 'quality.coverage_unknown', group: 'push' },
    { code: 'quality.coverage_unavailable', group: 'pull' }
  ]
}
afterEach(async () => { await setLang('en') })
describe('plan assessment before confirmation', () => {
  for (const locale of ['es', 'es-AR']) it('shows counts, scope and uncertainty in ' + locale, async () => {
    await setLang(locale)
    const html = renderToStaticMarkup(<PlanQuality quality={quality} routines={[{ id: 'a', name: 'Día A' }]} />)
    expect(html).toContain('Equilibrio semanal del entrenamiento')
    expect(html).toContain('Bisagras de cadera e isquiotibiales')
    expect(html).toContain('Empuje: 4 series; tirón: 10')
    expect(html).toContain('Revisá el orden en Día A')
    expect(html).toContain('40–60 minutos sin contar la entrada en calor, para una sesión de 30 minutos')
    expect(html).toContain('recuentos están incompletos')
    expect(html).toContain('tu objetivo y tus restricciones')
    expect(html).not.toMatch(/quality\.|Weekly training|could not|knee_dominant|posterior/)
    expect(html).not.toContain('<button')
  })
  it('keeps legacy plans readable without an invented assessment', () => {
    expect(renderToStaticMarkup(<PlanQuality />)).toBe('')
  })
})
