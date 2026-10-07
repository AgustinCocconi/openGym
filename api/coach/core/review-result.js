// Shared, deterministic projection for validation and the selected-change preview.
export function swapPrescription(old, after) {
  // Loads, increments and flags describe the previous movement. Never transfer them.
  const { bodyweight, side, weight, inc, name, ...keep } = old
  const next = { ...keep, id: after.id }
  for (const key of ['sets', 'reps', 'weight']) if (after[key] > 0) next[key] = after[key]
  if ((next.repsMin > 0 && next.reps < next.repsMin) ||
      (next.repsMax > 0 && next.reps > next.repsMax)) {
    delete next.repsMin; delete next.repsMax
    next.prog = 'off' // A fixed new dose is not an inherited double-progression range.
  }
  return next
}

const cleanupGroups = exercises => exercises.forEach((e, i) => {
  if (e.sg && !(exercises[i - 1]?.sg === e.sg || exercises[i + 1]?.sg === e.sg)) delete e.sg
})

export function reviewResult(plan, changes) {
  const result = { routines: structuredClone(plan?.routines || []), week: structuredClone(plan?.week || {}) }
  const routines = result.routines ||= [], errors = []
  result.week ||= {}
  for (const c of changes) {
    const r = routines.find(r => r.id === c.target?.routineId)
    const e = r?.ex?.find(e => e.id === c.target?.exId)
    if (!['add-routine', 'week'].includes(c.type) && !r) {
      errors.push('change targets a removed routine'); continue
    }
    if (c.target?.exId && !e) { errors.push('change targets a removed exercise'); continue }
    switch (c.type) {
      case 'add-routine': routines.push({ ...structuredClone(c.after), id: 'new:' + c.id }); break
      case 'remove-routine':
        routines.splice(routines.indexOf(r), 1)
        for (const [day, ids] of Object.entries(result.week)) {
          if (![].concat(ids || []).includes(r.id)) continue
          const next = [].concat(ids || []).filter(id => id !== r.id)
          if (next.length) result.week[day] = next; else delete result.week[day]
        }
        break
      case 'add-exercise': r.ex.splice(c.after.position ?? r.ex.length, 0, { ...c.after }); break
      case 'remove-exercise': r.ex = r.ex.filter(x => x.id !== c.target.exId); cleanupGroups(r.ex); break
      case 'swap-exercise': r.ex[r.ex.indexOf(e)] = swapPrescription(e, c.after); break
      case 'sets': case 'reps': case 'repsMin': case 'repsMax': case 'sec': case 'inc': case 'warmupSets': e[c.type] = c.after; break
      case 'exercise-prog': e.prog = c.after; break
      case 'routine-prog': r.prog = c.after; break
      case 'rename-routine': r.name = c.after; break
      case 'cardio': Object.assign(e, c.after); break
      case 'reorder': r.ex = c.after.map(id => r.ex.find(x => x.id === id)).filter(Boolean); cleanupGroups(r.ex); break
      case 'superset':
        // Timing cannot be estimated for a linked pair.
        if (c.after.link) {
          const index = r.ex.findIndex(x => x.id === c.after.with)
          if (index < 0 || c.after.with === e.id) { errors.push('invalid superset partner'); break }
          const [partner] = r.ex.splice(index, 1)
          r.ex.splice(r.ex.indexOf(e) + 1, 0, partner)
          e.sg = partner.sg = 'preview:' + c.id
        } else { delete e.sg; cleanupGroups(r.ex) }
        break
      case 'week':
        if (c.after && c.after !== 'rest' && !routines.some(r => r.id === c.after)) errors.push('week targets a removed routine')
        if (c.after && c.after !== 'rest') result.week[c.target.weekday] = [c.after]
        else delete result.week[c.target.weekday]
        break
    }
  }
  for (const r of routines) {
    const ids = new Set()
    for (const e of r.ex || []) {
      if (ids.has(e.id)) errors.push('routine "' + r.id + '" would contain duplicate exercise "' + e.id + '"')
      ids.add(e.id)
      if (e.warmupSets != null && (!Number.isInteger(e.warmupSets) || e.warmupSets < 0 || e.warmupSets > 5)) errors.push('warmupSets must be a whole number (0-5)')
      if (e.repsMin > 0 && e.repsMax > 0 && e.repsMin > e.repsMax) errors.push('exercise "' + e.id + '" sets a rep ceiling below its own floor — repsMax must be at least repsMin')
    }
  }
  return { plan: result, errors }
}
export const reviewResultErrors = (plan, changes) => reviewResult(plan, changes).errors
