import { t } from './i18n.js'
import { assessPlanQuality, PLAN_QUALITY_VERSION } from '../../../api/coach/core/plan-quality.js'

// Recompute from the proposed exercises immediately before the store mutates.
export function assertPlanQuality(proposal) {
  if (proposal.bundle.quality?.version !== PLAN_QUALITY_VERSION) return
  const quality = assessPlanQuality(proposal.bundle, {
    requirements: proposal.bundle.quality.requirements, candidateIds: proposal.candidateIds
  })
  if (!quality || quality.errors.length) throw new Error(t('That proposal can’t be read.'))
}
