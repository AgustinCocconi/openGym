import { describe, it, expect } from 'vitest'
import { planHash, applicable, markStale, applyChangeSet, applyCreatedPlan, revertLast } from './coach.js'

const state = () => ({
  unit: 'kg', workouts: [], dayPlan: {},
  routines: [{ id: 'r1', name: 'A', ex: [
    { id: '0001', sets: 3, reps: 10, weight: 20 },
    { id: '0007', sets: 3, sec: 45, mode: 'time' },
    { id: '0009', sets: 3, reps: 12 },
  ] }, { id: 'r2', name: 'B', ex: [{ id: '0002', sets: 4, reps: 6 }] }],
  week: { 1: 'r1', 3: 'r2' }, coach: { log: [], snapshots: [] },
})
const change = over => ({ id: 'c1', type: 'sets', target: { routineId: 'r1', exId: '0001' }, before: 3, after: 4, ...over })
const proposal = (changes, over = {}) => ({ id: 'p', kind: 'review', changes, ...over })
const apply = (S, p, ids) => { const s = structuredClone(S); applyChangeSet(s, p, ids); return s }

describe('Coach confirmation guards', () => {
  it.each(['remove-exercise', 'remove-routine', 'reorder'])('blocks a stale structural %s at display and application', type => {
    const s = state()
    const p = proposal([change({ type, after: type === 'reorder' ? ['0009', '0007', '0001'] : null })], { planHash: planHash(s) })
    s.routines[0].ex[0].sets = 5
    const before = structuredClone(s)
    expect(applicable(markStale(p, s))).toHaveLength(0)
    expect(() => applyChangeSet(s, p, ['c1'])).toThrow()
    expect(s).toEqual(before)
  })

  it('checks a created plan fingerprint against the draft at confirmation', () => {
    const s = state()
    const p = { id: 'p', kind: 'create', planHash: planHash(s), bundle: { routines: [{ id: 'new', ex: [{ id: '0001', sets: 3 }] }] } }
    s.week[1] = ['r2']
    const before = structuredClone(s)
    expect(() => applyCreatedPlan(s, p, { schedule: true })).toThrow()
    expect(s).toEqual(before)
  })
})

describe('Coach combined week deletion', () => {
  const c = { id: 'c1', type: 'remove-routine', target: { routineId: 'r2' } }
  it('removes only that id from combined days and restores every shape on revert', () => {
    const S = { ...state(), week: { 1: ['r1', 'r2', 'r1'], 3: ['r2'], 4: 'r2', 5: 'r1' } }
    const s = apply(S, proposal([c]), ['c1'])
    expect(s.week).toEqual({ 1: ['r1', 'r1'], 5: 'r1' })
    revertLast(s)
    expect(s.week).toEqual(S.week)
  })

})

describe('resulting Coach rep ranges', () => {
  const ranged = () => {
    const s = state()
    Object.assign(s.routines[0].ex[0], { repsMin: 5, repsMax: 10 })
    return s
  }
  const ranges = (min, max) => proposal([
    change({ id: 'min', type: 'repsMin', before: 5, after: min }),
    change({ id: 'max', type: 'repsMax', before: 10, after: max }),
  ])

  it('rejects two individually valid edits that invert the result before taking a snapshot', () => {
    const s = ranged(), before = structuredClone(s)
    expect(() => applyChangeSet(s, ranges(9, 7), ['min', 'max'])).toThrow()
    expect(s).toEqual(before)
  })
  it('accepts a paired move beyond the old ceiling but rejects the incomplete selection', () => {
    const s = ranged()
    expect(() => applyChangeSet(s, ranges(12, 15), ['min'])).toThrow()
    expect(s.coach.snapshots).toHaveLength(0)
    expect(applyChangeSet(s, ranges(12, 15), ['min', 'max']).applied).toBe(2)
    expect(s.routines[0].ex[0]).toMatchObject({ repsMin: 12, repsMax: 15 })
  })
})
