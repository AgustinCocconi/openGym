import { describe, it, expect } from 'vitest'
import { convertWeight, convertStateUnit } from './units.js'
import { applyChangeSet, revertLast } from './coach.js'

describe('convertWeight', () => {
  it('rounds lb to a half and kg to a quarter', () => {
    expect(convertWeight(60, 'kg', 'lb')).toBe(132.5)
    expect(convertWeight(135, 'lb', 'kg')).toBe(61.25)
    expect(convertWeight(2.5, 'kg', 'lb')).toBe(5.5)
  })
  it('leaves the value alone for the same unit, nothing, or garbage', () => {
    expect(convertWeight(60, 'kg', 'kg')).toBe(60)
    expect(convertWeight(null, 'kg', 'lb')).toBe(null)
    expect(convertWeight('', 'kg', 'lb')).toBe('')
    expect(convertWeight('abc', 'kg', 'lb')).toBe('abc')
  })
  it('round-trips plate-loadable numbers', () => {
    for (const kg of [20, 42.5, 60, 100, 142.5]) {
      expect(convertWeight(convertWeight(kg, 'kg', 'lb'), 'lb', 'kg')).toBe(kg)
    }
  })
})

describe('convertStateUnit', () => {
  const S = {
    unit: 'kg', targetW: 80, bodyweight: [{ d: '2026-01-01', w: 82.4, t: 1 }],
    exWeights: { '0025': { w: 80, d: '2026-01-01' }, legacy: 100 }, barWeights: { '0025': 20 },
    routines: [{ id: 'r', ex: [{ id: '0025', sets: 3, reps: 5, weight: 80, inc: 2.5, warmup: [{ weight: 40, reps: 8 }] }, { id: 'plank', mode: 'time', sec: 30, inc: 5 }] }],
    workouts: [{ id: 'w', entries: [{ id: '0025', topW: 80, target: { weight: 80 }, sets: [{ w: 80, r: 5, done: true, drops: [{ w: 60, r: 5 }] }] }] }],
    active: { id: 'a', entries: [{ id: '0025', sets: [{ w: 82.5, r: 5, done: false }] }] },
    workoutView: 'list',
  }
  it('converts every stored weight and keeps everything else', () => {
    const out = convertStateUnit(S, 'lb')
    expect(out.unit).toBe('lb')
    expect(out.targetW).toBe(176.4)
    expect(out.bodyweight[0]).toEqual({ d: '2026-01-01', w: 181.7, t: 1 })
    expect(out.exWeights['0025'].w).toBe(176.5)
    expect(out.exWeights.legacy).toBe(220.5)
    expect(out.barWeights['0025']).toBe(44)
    expect(out.routines[0].ex[0]).toMatchObject({ weight: 176.5, inc: 5.5, warmup: [{ weight: 88, reps: 8 }] })
    expect(out.routines[0].ex[1]).toEqual({ id: 'plank', mode: 'time', sec: 30, inc: 5 })   // seconds stay seconds
    expect(out.workouts[0].entries[0]).toMatchObject({ topW: 176.5, target: { weight: 176.5 } })
    expect(out.workouts[0].entries[0].sets[0]).toMatchObject({ w: 176.5, done: true, drops: [{ w: 132.5, r: 5 }] })
    expect(out.active.entries[0].sets[0].w).toBe(182)
    expect(out.workoutView).toBe('list')
    expect(S.unit).toBe('kg')                       // the input is not mutated
    expect(S.workouts[0].entries[0].sets[0].w).toBe(80)
  })
  it('is a no-op for the unit already in use', () => {
    expect(convertStateUnit(S, 'kg')).toBe(S)
  })

  it.each(['kg', 'lb'])('converts session mass, volume and active guide from %s', from => {
    const to = from === 'kg' ? 'lb' : 'kg'
    const source = {
      unit: from, workouts: [{ bw: 80, vol: 300, entries: [{ sets: [{ w: 60, r: 5, done: true }] }] }],
      active: { bw: 80, entries: [{ plan: { weight: 60, inc: 2.5, warmup: [{ weight: 20 }] }, sets: [] }] },
    }
    const out = convertStateUnit(source, to)
    expect(out.workouts[0].bw).toBeCloseTo(from === 'kg' ? 176.4 : 36.3)
    expect(out.active.bw).toBe(out.workouts[0].bw)
    expect(out.workouts[0].vol).toBe(convertWeight(60, from, to) * 5)
    expect(out.active.entries[0].plan.weight).toBe(convertWeight(60, from, to))
    expect(out.active.entries[0].plan.inc).toBe(convertWeight(2.5, from, to))
    expect(out.active.entries[0].plan.warmup[0].weight).toBe(convertWeight(20, from, to))
    expect(source.active.bw).toBe(80)
  })

  it.each(['kg', 'lb'])('reverts a Coach change in the converted unit from %s', from => {
    const s = { unit: from, routines: [{ id: 'r', ex: [{ id: '0025', sets: 3, weight: 60 }] }], week: {} }
    applyChangeSet(s, { id: 'p', kind: 'review', changes: [{ id: 'c', type: 'sets', target: { routineId: 'r', exId: '0025' }, after: 5 }] }, ['c'])
    s.routines[0].ex[0].weight = 70
    const out = convertStateUnit(s, from === 'kg' ? 'lb' : 'kg')
    expect(out.routines[0].ex[0].weight).toBe(convertWeight(70, from, out.unit))
    expect(revertLast(out)).toBe(true)
    expect(out.routines[0].ex[0]).toMatchObject({ sets: 3, weight: convertWeight(60, from, out.unit) })
    expect(s.coach.snapshots[0].routines[0].ex[0].weight).toBe(60)
  })
})
