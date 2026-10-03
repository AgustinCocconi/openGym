// Upstream e637a9e's occurrence lookup, extended with progression's routine scope.
// Legacy entries without provenance remain readable; exclusions belong to each consumer.
export function entriesForExercise(workout, exId, routineId) {
  return (workout?.entries || []).filter(e => {
    if (e?.id !== exId) return false
    const rid = e.rid ?? (workout.routineIds?.length > 1 ? null : workout.routineId)
    return !routineId || !rid || rid === routineId
  })
}
