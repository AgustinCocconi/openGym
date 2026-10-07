import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it } from 'vitest'
import { setLang } from './i18n.js'
import { buildSessionEntries } from './session-start.js'
import { applyChangeSet, changeValues, planHash, revertLast } from './coach.js'
import { reviewQuality } from '../../../api/coach/core/review-quality.js'
import { planRequirements } from '../../../api/coach/core/plan-quality.js'
import { validateReview } from '../../../api/coach/core/validate.js'
import { hashPlan } from '../../../api/coach/core/plan-hash.js'
import { canonicalPlan } from '../../../api/coach/core/payload.js'
import WorkoutGuidance from '../components/adaptive-training/WorkoutGuidance.jsx'
import PlanQuality from '../components/adaptive-training/PlanQuality.jsx'

const state = () => ({
  lang: 'es-AR', unit: 'kg', customEx: [], exWeights: {}, dayPlan: {}, bodyweight: [],
  routines: [{ id: 'a', name: 'Día A', ex: [{ id: '0989', mode: 'reps', sets: 2, reps: 16, repsMin: 16, repsMax: 24, prog: 'double', weight: 10, inc: 2 }, { id: '1459', mode: 'reps', sets: 2, reps: 10, weight: 20 }] }],
  week: { 1: ['a'], 4: ['a'] },
  workouts: [{ id: 'old', d: '2026-09-01', entries: [{ id: '0989', sets: [{ w: 10, r: 16, done: true }] }] }],
  coach: { profile: { goal: 'muscle', sessionMin: 75 }, log: [], snapshots: [] }
})
const changes = [
  { id: 's', type: 'swap-exercise', target: { routineId: 'a', exId: '0989' }, after: { id: '0662', reps: 6 }, why: 'Cambio solicitado' },
  { id: 'w', type: 'warmupSets', target: { routineId: 'a', exId: '1459' }, after: 2, why: 'Preparar este ejercicio' }
]
afterEach(async () => { await setLang('en') })

it('confirmed swaps and warm-ups match preview, preserve logs and are reversible', () => {
  const S = state(), before = structuredClone(S)
  const validated = validateReview({ changes }, S, { planRequirements: planRequirements({ coachProfile: S.coach.profile }) })
  expect(validated.ok).toBe(true)
  const p = { id: 'p', kind: 'review', planHash: planHash(S), ...validated.proposal }
  const preview = reviewQuality(S, p.changes, { planRequirements: p.quality.requirements })
  applyChangeSet(S, p, ['s', 'w'])
  expect(S.routines).toEqual(preview.plan.routines)
  expect(S.routines[0].ex[0]).toMatchObject({ id: '0662', reps: 6, prog: 'off' })
  expect(S.routines[0].ex[0].repsMin).toBeUndefined()
  expect(S.routines[0].ex[0].weight).toBeUndefined()
  expect(S.workouts).toEqual(before.workouts)
  const loaded = buildSessionEntries(S, S.routines[0]).find(e => e.id === '1459')
  expect(loaded.sets.filter(row => row.phase === 'warmup')).toHaveLength(2)
  expect(loaded.sets.filter(row => row.phase !== 'warmup')).toHaveLength(2)
  expect(loaded.sets.slice(0, 2).every(row => row.w < loaded.sets[2].w)).toBe(true)
  expect(planHash(S)).toBe(hashPlan(canonicalPlan(S)))
  revertLast(S)
  expect(S.routines).toEqual(before.routines)
  expect(S.week).toEqual(before.week)
  expect(S.workouts).toEqual(before.workouts)
})

it('warm-up count participates in stale guards and invalid manual proposals cannot mutate state', () => {
  const S = state(), originalHash = planHash(S)
  S.routines[0].ex[1].warmupSets = 2
  expect(planHash(S)).not.toBe(originalHash)
  const before = structuredClone(S)
  expect(() => applyChangeSet(S, { id: 'w', changes: [{ ...changes[1], after: 6 }] }, ['w'])).toThrow()
  expect(S).toEqual(before)
})

for (const lang of ['es', 'es-AR']) it('usage help and complete swap diff are Spanish in ' + lang, async () => {
  await setLang(lang)
  const S = state(), c = validateReview({ changes }, S).proposal.changes[0]
  const diff = changeValues(c, S)
  expect(diff.before).toContain('16–24')
  expect(diff.after).toContain('2 × 6')
  expect(diff.after).toContain('Peso corporal')
  expect(diff.after).toContain('Progresión manual')
  expect(diff.after).not.toContain('16–24')
  const html = renderToStaticMarkup(<WorkoutGuidance />)
  expect(html).toContain('dos de 12 kg = 12 kg')
  expect(html).toContain('asistencia, no peso levantado')
  expect(html).toContain('RIR')
  expect(html).toContain('series de calentamiento')
  expect(html).not.toMatch(/The app|Load to|Questions only/)
})

it('partial selections show their own work sets, duration and coverage', () => {
  const S = state(), requirements = planRequirements({ coachProfile: S.coach.profile })
  const remove = { id: 'remove', type: 'remove-exercise', target: { routineId: 'a', exId: '0989' } }
  const before = structuredClone(S)
  const preview = reviewQuality(S, [remove], { planRequirements: requirements })
  expect(preview.quality.weeklySets.push).toBe(0)
  expect(preview.quality.weeklySets.posterior).toBe(4)
  expect(preview.quality.sessions[0]).toMatchObject({ min: 4, max: 6 })
  expect(preview.quality.errors).toEqual([])
  expect(renderToStaticMarkup(<PlanQuality quality={preview.quality} routines={preview.plan.routines} />)).toContain('4–6')
  expect(S).toEqual(before)
})

it('a confirmed added routine retains its separate warm-up prescription', () => {
  const S = state(), before = structuredClone(S.workouts)
  const c = { id: 'new', type: 'add-routine', after: { name: 'Nueva', ex: [{ id: '1459', sets: 2, reps: 10, warmupSets: 2 }] }, why: 'Rutina solicitada' }
  const validated = validateReview({ changes: [c] }, S)
  expect(validated.ok).toBe(true)
  applyChangeSet(S, { id: 'new', ...validated.proposal }, ['new'])
  expect(S.routines.at(-1).ex[0].warmupSets).toBe(2)
  expect(S.workouts).toEqual(before)
})

it('preview retains adjacency, accessory order and timing after superset changes', () => {
  for (const type of ['superset', 'remove-exercise', 'reorder']) {
    const S = state()
    S.routines[0].ex = [{ id: '0285', sets: 2, reps: 10, sg: 'pair' }, { id: '0293', sets: 2, reps: 10, sg: 'pair' }, { id: '0739', sets: 2, reps: 10 }]
    const c = { id: 'group', type, target: { routineId: 'a', ...(type !== 'reorder' ? { exId: '0285' } : {}) }, after: type === 'superset' ? { link: true, with: '0739' } : type === 'reorder' ? ['0285', '0739', '0293'] : null, why: 'Ajuste solicitado' }
    const requirements = planRequirements({ coachProfile: S.coach.profile })
    const preview = reviewQuality(S, [c], { planRequirements: requirements })
    applyChangeSet(S, { id: 'group', changes: [c] }, ['group'])
    const actual = reviewQuality(S, [], { planRequirements: requirements })
    expect(preview.plan.routines[0].ex.map(e => e.id)).toEqual(S.routines[0].ex.map(e => e.id))
    expect(preview.quality.sessions).toEqual(actual.quality.sessions)
    expect(preview.quality.issues).toEqual(actual.quality.issues)
  }
})

it('invalid superset proposals fail before saving a snapshot', () => {
  const S = state(), before = structuredClone(S)
  const c = { id: 'invalid', type: 'superset', target: { routineId: 'a', exId: '0989' }, after: { link: true, with: '0989' } }
  expect(() => applyChangeSet(S, { id: 'invalid', changes: [c] }, ['invalid'])).toThrow()
  expect(S).toEqual(before)
})
