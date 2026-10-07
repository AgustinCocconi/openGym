// Public product facts shared by the read-only Coach context and offline help.
export const APP_GUIDANCE_VERSION = 'opengym-usage/v1';
export const APP_GUIDANCE = [
  {
    "topic": "loads",
    "text": "The app saves the weight you enter without doubling it. For dumbbells, we recommend weight per dumbbell: two 12 kg dumbbells = 12 kg. Keep the same convention for an exercise; existing records are not converted."
  },
  {
    "topic": "machines",
    "text": "For a barbell, enter bar plus plates. For machines, enter the displayed selected load; on an assisted machine that number is assistance, not weight lifted. More assistance makes the exercise easier."
  },
  {
    "topic": "calibration",
    "text": "A blank load means it has not been calibrated, not that the exercise is unloaded. Start with a manageable load, complete the planned reps with controlled technique and record what you actually did. Adjust manually as needed."
  },
  {
    "topic": "effort",
    "text": "Reps alone do not describe difficulty. Record RIR (reps you could still do) or RPE (effort from 1 to 10) using the effort control. If it is hidden, enable RIR/RPE in Settings → Effort per set, or enable RIR from this help. If a session felt easy or short, tell the Coach which exercises and whether you need more work."
  },
  {
    "topic": "warmup",
    "text": "Use the exercise menu to add warm-up sets and mark them as warm-up. These rows are separate from work sets. Record extra exercises and sets so the next review includes them."
  },
  {
    "topic": "scope",
    "text": "Questions only provide information. Session adaptations affect this workout after confirmation; plan reviews affect future routines after approval. You can change loads and reps manually even without the Coach."
  }
];
