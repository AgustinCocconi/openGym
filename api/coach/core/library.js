/* The exercise catalogue the Coach reasons over, in the five fields it needs.
 *
 * `library-data.js` is generated from the frontend dataset and committed (see
 * scripts/build-coach-assets.mjs) — the same arrangement the translated instruction packs use.
 * It is an ES module rather than JSON on purpose: bare node needs createRequire for JSON, Vite
 * needs an import attribute, and this file has to load under both without either knowing.
 */
import { EXERCISES } from './library-data.js';

export const LIBRARY = EXERCISES;
export const LIB_BY_ID = new Map(LIBRARY.map(e => [e.id, e]));

export const equipmentContext = equipment => JSON.stringify([...new Set((equipment || []).map(value => String(value).toLowerCase()))].sort());
export const libraryHas = id => LIB_BY_ID.has(id);
export const libraryName = (id, locale='en') => LIB_BY_ID.get(id)?.labels?.[locale.split('-')[0]] || LIB_BY_ID.get(id)?.n || null;

/* ---------- the library slice the model gets to choose from ----------
   Bounded. The whole catalogue is 1,324 rows — 10k+ tokens on every job, which costs real money
   against a cloud API and does not fit a small local model's context at all; and a model does
   not choose better from 1,324 options than from 160. So the slice is capped and balanced: an
   even share of every body part, in catalogue order (deterministic, so repeated jobs keep the
   same prefix), with the exercises already in the user's plan or history always included —
   a review has to be able to name what it is talking about. */
export const MAX_LIBRARY = 160;

// What one library entry tells the model: enough to pick it, nothing more. The taxonomy
// fields beyond body part never appear in a rationale and cost ~30 tokens an entry.
const slim = (e, locale) => ({ id: e.id, n: libraryName(e.id,locale) || e.n, bp: e.bp, eq: e.eq || null, ...(e.custom ? { custom: true } : {}) });

export function librarySlice(S, equipment, { keep = [], max = MAX_LIBRARY, locale='en', strictEquipment=false } = {}) {
  const wanted = (equipment || []).map(x => String(x).toLowerCase());
  const customs = (S.customEx || []).map(c => ({ id: c.id, n: c.n, bp: c.bp, tg: null, eq: 'custom', custom: true }));
  // No equipment stated (or "everything") ⇒ the whole catalogue. Filtering to nothing would
  // leave the Coach unable to propose anything at all, which is a worse failure than a
  // slightly larger payload.
  const filtered = wanted.length ? LIBRARY.filter(e => wanted.includes((e.eq || '').toLowerCase())) : LIBRARY;
  const base = strictEquipment ? filtered : filtered.length ? filtered : LIBRARY;

  const pinned = new Set(keep.filter(id => LIB_BY_ID.has(id)));
  const out = [];
  const taken = new Set();
  const equipmentCounts = new Map();
  const add = e => {
    if (!taken.has(e.id)) {
      taken.add(e.id); out.push(e);
      equipmentCounts.set(e.eq, (equipmentCounts.get(e.eq) || 0) + 1);
    }
  };
  // What the user already trains comes first, filter or no filter.
  for (const id of pinned) {
    const exercise = LIB_BY_ID.get(id);
    if ((!strictEquipment || !wanted.length || wanted.includes((exercise.eq || '').toLowerCase())) && out.length < max) add(exercise);
  }
  if (base.length + out.length <= max) {
    base.forEach(add);
  } else {
    // Round-robin across body parts so a 292-row "upper arms" cannot crowd out a 37-row
    // "lower arms". Within each body part, favour equipment least represented so far;
    // pinned band/bodyweight work cannot crowd out available weights. Catalogue order breaks ties.
    const groups = new Map();
    for (const e of base) { if (!groups.has(e.bp)) groups.set(e.bp, []); groups.get(e.bp).push(e); }
    const lanes = [...groups.keys()].sort().map(k => groups.get(k));
    let progressed = true;
    while (out.length < max && progressed) {
      progressed = false;
      for (let i = 0; i < lanes.length && out.length < max; i++) {
        let next = null, count = Infinity;
        for (const e of lanes[i]) {
          if (taken.has(e.id)) continue;
          const represented = equipmentCounts.get(e.eq) || 0;
          if (represented < count) { next = e; count = represented; }
        }
        if (next) { add(next); progressed = true; }
      }
    }
  }
  return (strictEquipment ? [...(!wanted.length ? customs : []), ...out].slice(0,max) : [...customs, ...out]).map(e=>slim(e,locale));
}
