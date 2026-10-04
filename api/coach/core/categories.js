/* The data categories the consent screen names (FR-09/10).
 *
 * Its own tiny module so a screen that only needs to *say* what would leave — the mobile setup
 * screen, before anything AI-related has been loaded — can import five strings without pulling
 * the payload builder and the exercise catalogue behind it. payload.js re-exports it, and
 * builds from it, so the screen cannot drift from the payload. */
export const CONSENT_VERSION = 2;
export const DATA_CATEGORIES = Object.freeze([
  'plan',        // routines, exercises, sets/reps, schedule, progression settings
  'training',    // recorded work plus the explicitly requested live snapshot; bounded skill evidence
  'bodyweight',  // weigh-ins in the window and your goal weight
  'profile',     // intake answers, joint signals and user-declared skill targets/prerequisites
  'prefs'        // unit, language, effort scale
]);
