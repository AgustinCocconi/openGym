import { t } from '../../lib/i18n.js'
import { DAYS } from '../../lib/format.js'
import PlanMuscleVolume from './PlanMuscleVolume.jsx'
import { PLAN_QUALITY_VERSION } from '../../../../api/coach/core/plan-quality.js'

const GROUP_LABEL = {
  knee_dominant: 'Squats and lunges',
  posterior: 'Hip hinges and hamstrings',
  push: 'Upper body pushing',
  pull: 'Upper body pulling'
}
const groupLabel = group => t(GROUP_LABEL[group] || 'Other')
function issueText(issue, routines) {
  switch (issue.code) {
    case 'quality.coverage_missing': return t('Review missing work for {0}.', groupLabel(issue.group))
    case 'quality.coverage_unavailable': return t('No checked option is available for {0} with the supplied equipment.', groupLabel(issue.group))
    case 'quality.coverage_unknown': return t('Coverage of {0} could not be verified from the selected exercises.', groupLabel(issue.group))
    case 'quality.unclassified': return t('{0} exercises could not be assessed; these counts are incomplete.', issue.count)
    case 'quality.upper_balance': return t('Pushing: {0} sets; pulling: {1}. Review this distribution against your goal.', issue.push, issue.pull)
    case 'quality.session_time': return t('Review the duration of {0}: roughly {1}–{2} minutes before warming up, for a {3}-minute session.', routines.find(r => r.id === issue.routineId)?.name || t('Routine'), issue.estimatedMin, issue.estimatedMax, issue.requestedMin)
    case 'quality.exercise_order': return t('Review the order in {0}: main lifts follow accessories.', routines.find(r => r.id === issue.routineId)?.name || t('Routine'))
    default: return null
  }
}
export default function PlanQuality({ quality, routines = [] }) {
  if (quality?.version !== PLAN_QUALITY_VERSION) return null
  const messages = (quality.issues || []).map(issue => issueText(issue, routines)).filter(Boolean)
  return <div className="ins">
    <div className="ins-block">
      <div className="ins-h"><span>{t('Weekly training balance')}</span></div>
      <p className="small dim">{t('Work sets by movement in your weekly schedule')}</p>
      {Object.entries(GROUP_LABEL).map(([group]) => <div className="ins-row" key={group}>
        <span className="ins-row-n" style={{ whiteSpace: 'normal', textTransform: 'none' }}>{groupLabel(group)}</span>
        <span className="ins-row-v"><b>{quality.weeklySets?.[group] || 0}</b></span>
      </div>)}
      {!quality.requirements?.enforceCoverage && <p className="small dim">{t('Adapt this balance to your goal and restrictions.')}</p>}
      {messages.map((message, i) => <p className="small" key={i}>{message}</p>)}
    </div>
    <PlanMuscleVolume volume={quality.muscleVolume} />
  </div>
}

export function PlanWeek({ quality, routines, days }) {
  return <>
    <PlanQuality quality={quality} routines={routines} />
    <div className="pcard-week">
      {[1, 2, 3, 4, 5, 6, 0].map(d => <div key={d} className={'pcard-wd' + (days.has(d) ? ' on' : '')}>{t(DAYS[d])}</div>)}
    </div>
  </>
}
