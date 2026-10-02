import { describe, expect, it } from 'vitest'
import { EXDB } from '../exercises.js'
import { rankCandidatesByRecency } from './recency.js'

const ROW_IDS = ['0027', '0293', '0861']

describe('recent-exercise-is-downranked-for-variety', () => {
  it('ranks equivalent candidates by the versioned recency bands', () => {
    expect(ROW_IDS.every(id => EXDB.some(exercise => exercise.id === id))).toBe(true)

    const ranked = rankCandidatesByRecency([
      { id: '0027', daysSinceLastExecution: 1 },
      { id: '0293', daysSinceLastExecution: 30 },
      { id: '0861', daysSinceLastExecution: null },
    ], 0.8)

    expect(ranked.map(candidate => candidate.id)).toEqual(['0861', '0293', '0027'])
    expect(Object.fromEntries(ranked.map(candidate => [candidate.id, candidate.recencyAdjustment]))).toEqual({
      '0027': -0.30,
      '0293': 0.05,
      '0861': 0.10,
    })
    expect(ranked[0].score).toBeCloseTo(0.90)
    expect(ranked[1].score).toBeCloseTo(0.85)
    expect(ranked[2].score).toBeCloseTo(0.50)
    expect(new Set(ranked.map(candidate => candidate.reasonCode))).toEqual(new Set([
      'candidate.variety_bonus',
      'candidate.repetition_penalty',
    ]))
  })

  it.each([
    [0, -0.30], [2, -0.30],
    [3, -0.15], [6, -0.15],
    [7, -0.05], [13, -0.05],
    [14, 0], [27, 0],
    [28, 0.05],
    [null, 0.10],
  ])('uses the expected adjustment at the %s-day boundary', (daysSinceLastExecution, expected) => {
    const [candidate] = rankCandidatesByRecency([
      { id: '0027', daysSinceLastExecution },
    ], 0.8)

    expect(candidate.recencyAdjustment).toBe(expected)
  })

  it('breaks equal scores by canonical exercise ID without mutating the input', () => {
    const candidates = [
      { id: '0861', daysSinceLastExecution: 14 },
      { id: '0027', daysSinceLastExecution: 14 },
    ]

    expect(rankCandidatesByRecency(candidates, 0.8).map(candidate => candidate.id)).toEqual(['0027', '0861'])
    expect(candidates.map(candidate => candidate.id)).toEqual(['0861', '0027'])
  })
})
