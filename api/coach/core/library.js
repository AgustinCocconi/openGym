/* The exercise catalogue the Coach reasons over.
 * library-data.js is generated from the frontend dataset by build-coach-assets.mjs.
 * A plain ES module keeps the same candidates loadable under bare Node and Vite.
 */
import { EXERCISES } from './library-data.js';
import { movementOf, FOUNDATION_PATTERNS, foundationIds } from './movement-patterns.js';

export const LIBRARY = EXERCISES;
export const LIB_BY_ID = new Map(LIBRARY.map(e => [e.id, e]));

export const equipmentContext = equipment => JSON.stringify([...new Set((equipment || []).map(value => String(value).toLowerCase()))].sort());
export const libraryHas = id => LIB_BY_ID.has(id);
export const libraryName = (id, locale='en') => LIB_BY_ID.get(id)?.labels?.[locale.split('-')[0]] || LIB_BY_ID.get(id)?.n || null;
export const MAX_LIBRARY = 160;

// Adapted from upstream 043dd30: new training candidates exclude stretches;
// references already in a plan/history remain pinned and readable.
export const isStretch = e => /\bstretch(es|ing)?\b/i.test(e?.n || '');
const LANE_WEIGHT = {
  back: 4, chest: 4, 'upper legs': 4, shoulders: 3,
  'upper arms': 2, waist: 2, cardio: 1, 'lower arms': 1, 'lower legs': 1, neck: 1
};
const slim = (e, locale) => ({
  id: e.id, n: libraryName(e.id,locale) || e.n, bp: e.bp, eq: e.eq || null,
  ...(movementOf(e.id) ? { pattern: movementOf(e.id) } : {}),
  ...(e.muscles?.primaries.length ? { primaries: [...e.muscles.primaries], muscleMetadata: e.muscles.source } : {}),
  ...(e.custom ? { custom: true } : {})
});

export function librarySlice(S, equipment, { keep = [], max = MAX_LIBRARY, locale='en', strictEquipment=false } = {}) {
  const wanted = (equipment || []).map(x => String(x).toLowerCase());
  const customs = (S.customEx || []).map(c => ({ id: c.id, n: c.n, bp: c.bp, eq: 'custom', custom: true }));
  const filtered = wanted.length ? LIBRARY.filter(e => wanted.includes((e.eq || '').toLowerCase())) : LIBRARY;
  const equipped = strictEquipment ? filtered : filtered.length ? filtered : LIBRARY;
  // Unlike upstream's fallback, a strict request never invents equipment or offers
  // stretches as substitutes for training when no compatible lifts exist.
  const base = equipped.filter(e => !isStretch(e));
  const pinned = new Set(keep.filter(id => LIB_BY_ID.has(id)));
  const out = [], taken = new Set(), equipmentCounts = new Map();
  const customCount = strictEquipment && !wanted.length ? Math.min(customs.length, max) : 0;
  const limit = Math.max(0, max - customCount);
  const add = e => {
    if (!taken.has(e.id) && out.length < limit) {
      taken.add(e.id); out.push(e);
      equipmentCounts.set(e.eq, (equipmentCounts.get(e.eq) || 0) + 1);
    }
  };
  for (const id of pinned) {
    const exercise = LIB_BY_ID.get(id);
    if (!strictEquipment || !wanted.length || wanted.includes((exercise.eq || '').toLowerCase())) add(exercise);
  }

  // Reserve a small set of conventional options per movement before filling the
  // weighted lanes. Ranking by catalogue prefix must not eliminate all hinges/curls.
  const eligible = new Map(base.map(e => [e.id, e]));
  for (const pattern of FOUNDATION_PATTERNS) {
    let count = out.filter(e => movementOf(e.id) === pattern).length;
    for (const id of foundationIds(pattern)) {
      if (count >= 2 || out.length >= limit) break;
      if (eligible.has(id) && !taken.has(id)) { add(eligible.get(id)); count++; }
    }
  }
  if (base.length + out.length <= limit) {
    base.forEach(add);
  } else {
    const groups = new Map();
    for (const e of base) { if (!groups.has(e.bp)) groups.set(e.bp, []); groups.get(e.bp).push(e); }
    const keys = [...groups.keys()].sort(), lanes = keys.map(k => groups.get(k));
    let progressed = true;
    while (out.length < limit && progressed) {
      progressed = false;
      for (let i = 0; i < lanes.length && out.length < limit; i++) {
        for (let n = 0; n < (LANE_WEIGHT[keys[i]] || 1) && out.length < limit; n++) {
          let next = null, count = Infinity;
          for (const e of lanes[i]) {
            if (taken.has(e.id)) continue;
            const represented = equipmentCounts.get(e.eq) || 0;
            if (represented < count) { next = e; count = represented; }
          }
          if (!next) break;
          add(next); progressed = true;
        }
      }
    }
  }
  return (strictEquipment ? [...(!wanted.length ? customs : []), ...out].slice(0,max) : [...customs, ...out]).map(e=>slim(e,locale));
}
