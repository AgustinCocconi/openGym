# Task: build a weekly training plan

## When no exercise candidates are available

If library is empty, do not build or revise a plan. Return only
{ "coach_contract": 1, "answer": "<brief explanation or clarification>" }.
Explain the supplied restriction in meta.lang, using at most 2000 characters.
When jointSignals is non-empty, explain that reported symptoms block a new
prescription and ask about current symptoms; do not diagnose, declare an
alternative safe, or claim that a narrative answer clears the stored signal.
Otherwise ask which equipment or constraints need clarification. Do not invent
exercises, include plan fields, or say that a plan was created. Existing routines,
logged workouts and pending proposals stay unchanged. Use the plan instructions
below only when library has entries.


Design a complete plan from `coachProfile` (their intake answers) and, if present, `history` (what they have already been lifting).

## Constraints

- Schedule exactly `coachProfile.daysPerWeek` training days. Use `preferredDays` when given (0 = Sunday … 6 = Saturday).
- Treat `coachProfile.sessionMin` as an available time budget, not time that must be filled. Roughly 2–3 minutes per straight work set including rest is only an estimate; warm-up and transitions are additional. Supersets do not have a guaranteed time saving.
- Only exercises from `library`. Respect `equipment`, `limitations`, and `dislikes` — a plan someone will not do is a plan that failed.
- If `history.workingWeights` is present, any starting `weight` you set must be at or below what they have already handled for that exercise. For anything they have not trained, omit `weight` entirely — the app's first session sets the baseline.
- 1–7 routines, each 3–12 exercises, compound work before accessories.

## Coverage and programming

`coachProfile.planScope` distinguishes a general whole-body plan from a specific
focus described in their notes. Ordinary exercise likes/dislikes can change the
choices within a general plan without removing whole movement groups. Restrictions,
notes and the current request still take precedence; explain any resulting omission.
The payload's code-derived planRequirements describes the scope of coverage checks.
When enforceCoverage is true, cover knee-dominant work, a hip hinge or hamstring
curl, upper-body pushing and pulling across the scheduled week, using compatible
library options. Do not count a glute bridge, calf raise or stretch as a hamstring
curl or hinge. Split routines may distribute this work across days; an unscheduled
routine does not supply weekly coverage.

Known library.pattern values are curated movement metadata; absent patterns are
unknown, not proof of an exercise's role or safety. Prefer conventional, teachable
choices appropriate to experience before technical variants. Stretches already
present in the plan may be retained for their stated purpose, but do not replace
work sets with them.

Library primaries are canonical muscle slugs, not proof of stimulus or safety.
Legacy muscleMetadata may omit additional primary roles; absent metadata is unknown.
Use these roles to review the weekly muscle distribution: shoulder presses alone do
not supply chest work, and secondary hamstring involvement is not the same as primary
hamstring work. Respect the requested scope and compatible equipment. The app reports
primary and supporting sets separately; do not invent a muscle-volume report or aim
for a universal minimum for every muscle.

Match the distribution of sets to goal, experience, session length and priorities.
Start conservatively for new/returning lifters; there is no universal minimum
volume or compulsory one-to-one push/pull ratio. Explain deliberate priorities
and omissions in summary/why. Put priority main lifts before fatiguing accessories
unless the person's stated purpose calls for another order. Specify an appropriate
progression policy; unknown starting weights do not prevent choosing loaded work.

For a scoped request or restriction, preserve the requested scope and explain
tradeoffs instead of inserting unrelated exercises just to satisfy a general plan.
Quality is recomputed by code; never invent a quality report in the response.

## Initial calibration and warm-up

Use appGuidance for recording conventions. Keep assisted-machine progression manual: increasing assistance does not mean increasing resistance. For an untrained exercise, omit guessed kilograms and explain how the first session establishes a manageable working load and records actual reps/effort. Do not compensate for unknown load with arbitrary low reps or large volume. Use warmupSets (whole number 0-5) for appropriate loaded main lifts when useful; they are separate from work sets and use the existing ramp engine, which needs a calibrated load. Include a brief logging/calibration note in summary, without claiming the warm-up rows replace a general warm-up.

## Output

```
{
  "coach_contract": 1,
  "opengym_plan": 1,
  "name": "<short plan name>",
  "summary": "<2-4 sentences: the shape of the plan and why it fits what they asked for>",
  "basedOn": "<what you used — e.g. 'your last 12 weeks' or 'no history yet'>",
  "week": { "1": "r1", "3": "r2", "5": "r3" },
  "routines": [
    {
      "id": "r1",
      "name": "<routine name>",
      "emoji": "<one emoji>",
      "prog": "linear",
      "why": "<1-2 sentences: what this day is for>",
      "ex": [
        {
          "id": "<library id>",
          "sets": 3,
          "mode": "reps",
          "reps": 8,
          "prog": "linear",
          "inc": 2.5,
          "repsMin": 8,
          "sg": "a",
          "why": "<1-2 sentences naming why this exercise, here, at this prescription>"
        }
      ]
    }
  ],
  "customEx": []
}
```

- `week` keys are weekday numbers as strings, values are `routines[].id` from this same answer.
- `mode` is `reps` (use `reps`), `time` (use `sec`), or `cardio` (use `min` and `speed`).
- `prog` on a routine is its default; on an exercise it overrides. `inc` is the load step in `meta.unit`; `repsMin` only matters for `double`.
- `sg`: give two exercises the same short string to superset them. They must be adjacent in the list.
- `customEx` stays empty unless the library genuinely lacks something the plan needs; then add `{ "id": "cx1", "n": "<name>", "bp": "<body part>", "desc": "<how to do it>" }` and reference `cx1` from a routine.
