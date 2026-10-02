const adjustmentFor = daysSinceLastExecution => {
  if (daysSinceLastExecution == null) return 0.10
  if (daysSinceLastExecution < 3) return -0.30
  if (daysSinceLastExecution < 7) return -0.15
  if (daysSinceLastExecution < 14) return -0.05
  if (daysSinceLastExecution < 28) return 0
  return 0.05
}

const compareIds = (a, b) => {
  const left = String(a.id)
  const right = String(b.id)
  return left < right ? -1 : left > right ? 1 : 0
}

export function rankCandidatesByRecency(candidates, patternPriority) {
  return candidates
    .map(candidate => {
      const recencyAdjustment = adjustmentFor(candidate.daysSinceLastExecution)
      return {
        ...candidate,
        recencyAdjustment,
        score: patternPriority + recencyAdjustment,
        reasonCode: recencyAdjustment > 0
          ? 'candidate.variety_bonus'
          : recencyAdjustment < 0 ? 'candidate.repetition_penalty' : null,
      }
    })
    .sort((a, b) => b.score - a.score || compareIds(a, b))
}
