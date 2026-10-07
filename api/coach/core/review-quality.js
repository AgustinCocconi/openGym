import { reviewResult } from './review-result.js';
import { assessPlanQuality } from './plan-quality.js';

// Reviews retain explicitly selected scope; missing coverage is visible, advisory.
export function reviewQuality(plan, changes, context = {}) {
  const projected = reviewResult(plan, changes);
  return { ...projected, quality: assessPlanQuality(projected.plan, {
    requirements: context.planRequirements ? { ...context.planRequirements, enforceCoverage: false } : null,
    candidateIds: context.candidateIds
  }) };
}
