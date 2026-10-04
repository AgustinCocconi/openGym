/* A question cannot carry any operation, even when the model ignores its mode. */
export function validateQuestion(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['expected a question answer'] };
  for (const field of ['changes', 'operations', 'bundle', 'routines', 'week', 'customEx', 'nochange']) {
    if (Object.hasOwn(data, field)) errors.push('questions cannot carry ' + field);
  }
  if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 2000) errors.push('answer must be nonempty and at most 2000 characters');
  if (errors.length) return { ok: false, errors };
  return { ok: true, nochange: true, reading: data.answer.trim() };
}
