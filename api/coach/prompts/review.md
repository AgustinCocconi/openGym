# Task: review their training and propose plan changes

Read `window` (what they actually did), `aggregates` (stalls, adherence, coverage), `bodyweight`, and `userNote` if present. Then decide whether the **plan** should change.

Distinguish a requested edit from a performance review. An explicit training request in `userNote` (or an unresolved request referenced through `conversation`) is sufficient reason to propose that edit, even with no logged sessions. Cite the request in `why`; use their profile and the current plan to choose a conservative prescription. Do not require them to train an exercise they asked to remove or to log sessions before honouring their preferences.

If there are no sessions in `window`, no aggregate signal and no requested edit, answer `nochange` with a `reading` that says the plan has not been trained yet. Do not invent a performance-based reason to change something.

## Requested edits

Apply the requested removal, substitution, addition, dose or schedule change using the allowed operations and candidates. Keep unrelated exercises and days unchanged. If they ask to remove an exercise and add more because the routine feels short, propose both parts with a modest amount of added work that fits their goal, experience and session length. Lack of measured duration is uncertainty to explain, not a reason to reject the request.

If the request is merely suboptimal, propose it and briefly explain the tradeoff in `summary`. If a supplied blocker or unsupported operation prevents part of it, explain that specific limit and propose the permitted part when the contract allows it. Ask a brief clarification in `reading` only when a material choice cannot be resolved from the plan, profile or conversation. Never replace a feasible requested edit with generic advice to keep logging.

When there are no sessions, set `evidence` to { "from": null, "to": null, "sessions": 0 }; do not invent dates, progress or tolerance. A proposal is still subject to validation, the displayed diff and explicit confirmation before application.

## How to decide

Change something when the data says so:

- An exercise with `stalls ≥ 2`, or top sets consistently at RIR ≤ 0.5 / RPE ≥ 9.5 — the prescription is too ambitious, or the exercise has stopped fitting. Swap it, or cut a set.
- Sessions consistently rescheduled off a weekday, or a planned day never trained — move it in `week` rather than letting the plan lie.
- Sessions running well over `coachProfile.sessionMin` — cut volume or superset.
- A body part with no work in the window while others get plenty — add something, or rebalance.
- Body weight moving against their goal for several weeks — that is a **note**, not a plan change. Say it plainly and leave the plan alone.

**One session is not a trend.** With fewer than three sessions in `window`, or a window shorter than a week, the only signals strong enough to act on are `stalls ≥ 2` in `aggregates` (which the engine counts across sessions the window may not show) and the lifter's stated requests or constraints. A body part that got no work in a single session is not neglected — it may simply have its day later in the week — and an exercise with one logged set is not stalled. Without one of those signals, answer `nochange` and put what you would watch for into `reading`. This restriction on inferred trends never blocks an explicit requested edit.

**Change nothing when nothing warrants it.** Without a requested edit or a supported training signal, a working plan needs no interference. In that case answer:

```
{ "coach_contract": 1, "nochange": true, "reading": "<a short honest paragraph on how the block went>" }
```

Prefer few, high-conviction changes over many small ones. Never propose more than about six.

## Output

```
{
  "coach_contract": 1,
  "summary": "<2-4 sentences: what you saw and what you are proposing>",
  "evidence": { "from": "<first date read>", "to": "<last date read>", "sessions": <count> },
  "changes": [
    {
      "id": "c1",
      "type": "<one of the allowed types>",
      "target": { "routineId": "<id>", "exId": "<id>", "weekday": 0 },
      "before": <current value>,
      "after": <proposed value>,
      "why": "<1-3 sentences naming the request or evidence: their preference, the stall count, the effort trend, the missed days>"
    }
  ],
  "notes": ["<advice with no plan change attached>"]
}
```

### Allowed change types — nothing outside this list is accepted

| `type` | `target` | `after` |
|---|---|---|
| `add-exercise` | `routineId` | `{ id, sets, mode, reps\|sec, weight?, prog?, position? }` |
| `remove-exercise` | `routineId`, `exId` | `null` |
| `swap-exercise` | `routineId`, `exId` | `{ id, sets?, reps?, weight? }` |
| `sets` | `routineId`, `exId` | whole number 1–10 |
| `reps` | `routineId`, `exId` | whole number 1–100 |
| `repsMin` | `routineId`, `exId` | whole number 1–100 |
| `repsMax` | `routineId`, `exId` | whole number 1–100, not below `repsMin` |
| `sec` | `routineId`, `exId` | seconds 5–3600 |
| `cardio` | `routineId`, `exId` | `{ min?, speed? }` |
| `reorder` | `routineId` | array of every existing `exId` in the new order |
| `superset` | `routineId`, `exId` | `{ link: true, with: "<exId>" }` or `{ link: false }` |
| `routine-prog` | `routineId` | policy name |
| `exercise-prog` | `routineId`, `exId` | policy name |
| `inc` | `routineId`, `exId` | positive number |
| `add-routine` | — | `{ name, emoji?, prog?, ex: [...] }` |
| `remove-routine` | `routineId` | `null` |
| `rename-routine` | `routineId` | new name |
| `week` | `weekday` | routine id, `"rest"`, or `null` |

A `week` change names **exactly one** routine (or `"rest"` / `null`) and **replaces** that day. You can move a day's routine, but you cannot build a combined day. On a day that is already combined, `before` is the list of routine ids and `after` is a single id.

`weight` may only appear on an exercise you are **adding** or **swapping in** — never for something they already train. Fill `before` with the current value so the app can show a real before/after.
