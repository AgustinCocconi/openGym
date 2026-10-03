import { describe, it, expect } from 'vitest'
import { sessionsFor, nextPrescription, stallCount } from './progression.js'
import { lastEntryFor } from './history.js'
import { e1rmSeries } from './onerm.js'
import { buildSessionEntries } from './session-start.js'

const cfg = { id: '0025', mode: 'reps', sets: 1, reps: 5, weight: 60, prog: 'linear', inc: 2.5 }
const entry = (rid, w, r = 5, noProg = false) => ({ id: cfg.id, rid, noProg, target: { ...cfg, weight: w }, sets: [{ w, r, done: true }] })
const state = entries => ({ unit: 'kg', exWeights: {}, workouts: [{ d: '2026-10-01', start: 1, routineIds: ['a', 'b'], entries }] })

describe('repeated exercises in combined workouts', () => {
  it.each([false, true])('ignores each noProg occurrence without hiding later work (reverse=%s)', reverse => {
    const entries = [entry('a', 20, 5, true), entry('b', 60)]
    const S = state(reverse ? entries.reverse() : entries)
    expect(sessionsFor(S, cfg.id, cfg)).toHaveLength(1)
    expect(nextPrescription(S, cfg, { id: 'b' })).toMatchObject({ kind: 'up', weight: 62.5 })
    expect(lastEntryFor(S, cfg.id).sets.map(s => s.w)).toEqual([60])
    expect(e1rmSeries(S, cfg.id)).toMatchObject([{ w: 60 }])
  })
  it('keeps different routine loads on separate lines and counts one stall per workout', () => {
    const S = state([entry('a', 40, 3), entry('b', 60, 3)])
    expect(sessionsFor(S, cfg.id, cfg)).toHaveLength(1)
    expect(stallCount(sessionsFor(S, cfg.id, cfg), 'linear')).toBe(1)
    expect(sessionsFor(S, cfg.id, cfg, 'a')[0].weight).toBe(40)
    expect(sessionsFor(S, cfg.id, cfg, 'b')[0].weight).toBe(60)
    const r = { id: 'a', ex: [cfg], prog: 'linear' }
    expect(buildSessionEntries(S, r)[0].sets[0].w).toBe(40)
    expect(e1rmSeries(S, cfg.id)).toHaveLength(1)
    expect(e1rmSeries(S, cfg.id)[0].w).toBe(60)
  })
  it('reads unscoped legacy workouts for a routine and aggregates all completed rows', () => {
    const S = state([entry(undefined, 40), entry(undefined, 60)])
    expect(sessionsFor(S, cfg.id, cfg, 'a')).toHaveLength(1)
    expect(lastEntryFor(S, cfg.id).sets).toHaveLength(2)
    expect(lastEntryFor(S, cfg.id, 'a').sets).toHaveLength(2)
  })
  it('keeps distinct modes readable without multiplying the stall count for either mode', () => {
    const S = state([entry('a', 60), { id: cfg.id, rid: 'b', target: { mode: 'time', sets: 1, sec: 30 }, sets: [{ sec: 30, done: true }] }])
    expect(sessionsFor(S, cfg.id).map(s => s.mode)).toEqual(['reps', 'time'])
    expect(sessionsFor(S, cfg.id, cfg)).toHaveLength(1)
  })
})
