import { describe, it, expect } from 'vitest'
import scenario from '../../../docs/adaptive-training/scenarios/coach-request-without-history.json'
import { canonicalPlan as serverPlan, build, isBw as serverIsBw } from '../../../api/coach/core/payload.js'
import { hashPlan as serverHash } from '../../../api/coach/core/plan-hash.js'
import { runPipeline } from '../../../api/coach/core/pipeline.js'
import { canonicalPlan, planHash, emptyCoach, markStale, applicable, applyChangeSet, revertLast } from './coach.js'
import { isBw } from './history.js'

const state = () => ({
  lang: 'es-AR', unit: 'kg', routines: structuredClone(scenario.given.routines),
  week: structuredClone(scenario.given.week), workouts: [], customEx: [], dayPlan: {},
  coach: { ...emptyCoach(), profile: structuredClone(scenario.given.coachProfile) }
})
async function review(S, spawns) {
  const payload = build(S, { handle: 'test', kind: 'review', note: scenario.when.message })
  const existing = new Set(S.routines[0].ex.map(e => e.id))
  const additions = payload.library.filter(e => !existing.has(e.id)).slice(0, 2)
  expect(additions).toHaveLength(2)
  const response = { coach_contract: 1, summary: 'Quito el ejercicio y agrego dos opciones.',
    evidence: scenario.expect.evidence, notes: [], changes: [
      { id: 'remove', type: 'remove-exercise', target: { routineId: 'r1', exId: '0991' }, after: null, why: 'Pedido del usuario.' },
      ...additions.map((e, i) => ({ id: 'add' + i, type: 'add-exercise', target: { routineId: 'r1' },
        after: { id: e.id, mode: 'reps', sets: 2, reps: 10 }, why: 'Pedido de ampliar la rutina.' }))
    ] }
  const result = await runPipeline({ kind: 'review', payload, cfg: {},
    adapter: { spawns, invoke: async () => ({ code: 0, text: JSON.stringify(response) }) } })
  expect(result.ok).toBe(true)
  return { id: 'p', kind: 'review', planHash: serverHash(serverPlan(S)),
    candidateIds: payload.library.map(e => e.id), equipmentContext: payload.equipmentContext, ...result.result }
}

describe('requested band plan changes reach confirmation', () => {
  it.each([true, false])('server proposal is usable, applies on confirmation and reverts (CLI: %s)', async spawns => {
    const S = state(), before = structuredClone(S)
    const p = await review(S, spawns)
    expect(S).toEqual(before)
    expect(serverPlan(S)).toEqual(canonicalPlan(S))
    expect(p.planHash).toBe(planHash(S))
    const marked = markStale(p, S)
    expect(marked.planMoved).toBe(false)
    expect(applicable(marked)).toHaveLength(3)
    const result = applyChangeSet(S, marked, marked.changes.map(c => c.id))
    expect(result.applied).toBe(3)
    expect(S.routines[0].ex.some(e => e.id === '0991')).toBe(false)
    expect(S.routines[0].ex).toHaveLength(before.routines[0].ex.length + 1)
    for (const e of before.routines[0].ex.filter(e => e.id !== '0991')) expect(S.routines[0].ex).toContainEqual(e)
    expect(S.workouts).toEqual(before.workouts)
    expect(revertLast(S)).toBe(true)
    expect(S.routines).toEqual(before.routines)
    expect(S.week).toEqual(before.week)
    expect(S.workouts).toEqual(before.workouts)
  })

  it('a real edit still invalidates the entire proposal without mutations', async () => {
    const S = state(), p = await review(S, true)
    S.routines[0].ex[0].reps++
    const edited = structuredClone(S)
    expect(applicable(markStale(p, S))).toHaveLength(0)
    expect(() => applyChangeSet(S, p, p.changes.map(c => c.id))).toThrow()
    expect(S).toEqual(edited)
  })

  it.each(['body weight', 'band', 'resistance band', 'barbell'])('custom %s and explicit flags have identical fingerprints', eq => {
    for (const flag of [undefined, true, false]) {
      const S = state(), cfg = { id: 'custom', sets: 2, reps: 10, ...(flag === undefined ? {} : { bodyweight: flag }) }
      S.customEx = [{ id: 'custom', n: 'Custom', eq, bp: 'back' }]
      S.routines[0].ex = [cfg]
      expect(serverIsBw(cfg, S.customEx[0])).toBe(isBw(cfg, S))
      expect(serverPlan(S)).toEqual(canonicalPlan(S))
      expect(serverHash(serverPlan(S))).toBe(planHash(S))
    }
  })
})
