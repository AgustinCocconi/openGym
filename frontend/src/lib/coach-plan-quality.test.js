import { describe, expect, it } from 'vitest'
import { applyCreatedPlan, planHash, revertLast } from './coach.js'
import { assessPlanQuality, planRequirements } from '../../../api/coach/core/plan-quality.js'

const state = () => ({
  routines: [{ id: 'old', name: 'Rutina existente', ex: [{ id: '0001', sets: 2, reps: 10 }] }],
  week: { 1: 'old' }, workouts: [{ d: '2026-10-01', entries: [{ id: '0001', sets: [{ r: 10, done: true }] }] }],
  customEx: [], exWeights: {}, dayPlan: {}, unit: 'kg',
  coach: { profile: { goal: 'muscle' }, log: [], snapshots: [] }
})
const proposal = S => {
  const bundle = {
    opengym_plan: 1, name: 'Cuerpo completo', week: { 1: 'a', 4: 'a' },
    routines: [{ id: 'a', name: 'Día A', ex: ['0739', '1459', '0289', '0293', '0006'].map(id => ({ id, sets: 2, reps: 10, mode: 'reps' })) }],
    customEx: []
  }
  const candidateIds = bundle.routines[0].ex.map(e => e.id)
  bundle.quality = assessPlanQuality(bundle, { requirements: planRequirements({ coachProfile: S.coach.profile }), candidateIds })
  return { id: 'quality-proposal', kind: 'create', planHash: planHash(S), candidateIds, bundle }
}
describe('quality rechecked when importing a new plan', () => {
  it('rejects missing work despite a copied success report before taking any snapshot', () => {
    const S = state(), before = structuredClone(S), p = proposal(S)
    p.bundle.routines[0].ex = p.bundle.routines[0].ex.filter(e => e.id !== '1459')
    expect(() => applyCreatedPlan(S, p, { schedule: true })).toThrow()
    expect(S).toEqual(before)
  })
  it('imports a confirmed balanced plan, preserves logs and permits undo', () => {
    const S = state(), before = structuredClone(S), p = proposal(S)
    applyCreatedPlan(S, p, { schedule: true })
    expect(S.routines[0]).toEqual(before.routines[0])
    expect(S.workouts).toEqual(before.workouts)
    expect(S.routines).toHaveLength(2)
    revertLast(S)
    expect(S.routines).toEqual(before.routines)
    expect(S.week).toEqual(before.week)
    expect(S.workouts).toEqual(before.workouts)
  })
})
