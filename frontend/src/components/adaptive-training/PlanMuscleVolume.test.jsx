import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { setLang } from '../../lib/i18n.js'
import PlanQuality from './PlanQuality.jsx'
import PlanMuscleVolume from './PlanMuscleVolume.jsx'
import { assessPlanQuality, planRequirements } from '../../../../api/coach/core/plan-quality.js'
import { MUSCLE_VOLUME_VERSION } from '../../../../api/coach/core/plan-muscle-volume.js'

const quality = () => assessPlanQuality({
  week: { 1: 'a', 4: 'a' },
  routines: [{ id: 'a', name: 'Día A', ex: ['0739', '1459', '0289', '0293'].map(id => ({ id, sets: 2, reps: 10, mode: 'reps' })) }]
}, { requirements: planRequirements({ coachProfile: { goal: 'muscle', planScope: 'general' } }) })

afterEach(async () => { await setLang('en') })
describe('weekly muscle report before confirmation', () => {
  for (const locale of ['es', 'es-AR']) it('renders distinct counts and every review message in ' + locale, async () => {
    await setLang(locale)
    const report = quality()
    report.muscleVolume.partialRows = 1
    report.muscleVolume.unmeasuredRows = 1
    report.muscleVolume.byMuscle.hamstring.uncertain = true
    report.muscleVolume.issues = [
      { code: 'quality.muscle_primary_missing', muscle: 'chest', supportingSets: 4 },
      { code: 'quality.muscle_distribution', chest: 4, back: 12 },
      { code: 'quality.muscle_concentration', muscle: 'chest', day: 1, sets: 12 }
    ]
    const html = renderToStaticMarkup(<PlanQuality quality={report} />)
    expect(html).toContain('Volumen muscular semanal')
    expect(html).toContain('Principales')
    expect(html).toContain('De apoyo')
    expect(html).toContain('Días')
    expect(html).toContain('recuentos con * están incompletos')
    expect(html).toContain('ejercicios por tiempo, el cardio y los estiramientos')
    expect(html).toContain('No hay trabajo principal registrado para Pecho; hay 4 series secundarias')
    expect(html).toContain('Pecho: 4 series principales; espalda alta: 12')
    expect(html).toContain('Pecho: 12 series principales el Lunes')
    expect(html).toContain('open=""')
    expect(html).not.toMatch(/quality[.]|coach-muscle|primarySets|Supporting sets|Timed work|Chest:|upper-back/)
    expect(html).not.toContain('<button')
  })
  it('keeps a complete report compact and shows canonical separate counts', () => {
    const report = quality()
    expect(report.muscleVolume.version).toBe(MUSCLE_VOLUME_VERSION)
    expect(report.muscleVolume.byMuscle.hamstring).toEqual({ primarySets: 4, supportingSets: 4, days: 2, uncertain: false })
    const html = renderToStaticMarkup(<PlanMuscleVolume volume={report.muscleVolume} />)
    expect(html).toContain('<summary')
    expect(html).not.toContain('open=""')
    expect(html).toContain('scope="row"')
    expect(html).toContain('scope="col"')
  })
  it('keeps prior proposals readable without adding an invented muscle assessment', () => {
    expect(renderToStaticMarkup(<PlanMuscleVolume />)).toBe('')
    const report = quality(); delete report.muscleVolume
    expect(renderToStaticMarkup(<PlanQuality quality={report} />)).not.toContain('Weekly muscle volume')
  })
})
