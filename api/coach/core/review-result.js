// Validate the resulting plan, including a user's selected subset, in both runtimes.
export function reviewResultErrors(plan, changes) {
  const routines = structuredClone(plan?.routines || [])
  const errors = []
  for (const c of changes) {
    const r = routines.find(r => r.id === c.target?.routineId)
    const e = r?.ex?.find(e => e.id === c.target?.exId)
    if (!['add-routine', 'week'].includes(c.type) && !r) {
      errors.push('change targets a removed routine'); continue
    }
    if (c.target?.exId && !e) { errors.push('change targets a removed exercise'); continue }
    switch (c.type) {
      case 'add-routine': routines.push({ ...c.after, id: `new:${c.id}` }); break
      case 'remove-routine': routines.splice(routines.indexOf(r), 1); break
      case 'add-exercise': r.ex.push({ ...c.after }); break
      case 'remove-exercise': r.ex = r.ex.filter(x => x.id !== c.target.exId); break
      case 'swap-exercise': Object.assign(e, c.after); break
      case 'repsMin': case 'repsMax': e[c.type] = c.after; break
      case 'week':
        if (c.after && c.after !== 'rest' && !routines.some(r => r.id === c.after)) errors.push('week targets a removed routine')
        break
    }
  }
  for (const r of routines) {
    const ids = new Set()
    for (const e of r.ex || []) {
      if (ids.has(e.id)) errors.push(`routine "${r.id}" would contain duplicate exercise "${e.id}"`)
      ids.add(e.id)
      if (e.repsMin > 0 && e.repsMax > 0 && e.repsMin > e.repsMax) {
        errors.push(`exercise "${e.id}" sets a rep ceiling below its own floor — repsMax must be at least repsMin`)
      }
    }
  }
  return errors
}
