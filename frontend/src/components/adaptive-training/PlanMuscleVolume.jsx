import { t } from '../../lib/i18n.js'
import { DAYN } from '../../lib/format.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'
import { MUSCLE_VOLUME_VERSION } from '../../../../api/coach/core/plan-muscle-volume.js'

const muscleLabel = muscle => t(MUSCLE_NAME[muscle] || 'Other')
function issueText(issue) {
  switch (issue.code) {
    case 'quality.muscle_primary_missing':
      return t('No primary work recorded for {0}; {1} supporting sets. Review against your goal.', muscleLabel(issue.muscle), issue.supportingSets)
    case 'quality.muscle_distribution':
      return t('Chest: {0} primary sets; upper back: {1}. Review this distribution.', issue.chest, issue.back)
    case 'quality.muscle_concentration':
      return t('{0}: {1} primary sets on {2}. Review how this volume is distributed.', muscleLabel(issue.muscle), issue.sets, t(DAYN[issue.day]))
    default: return null
  }
}
export default function PlanMuscleVolume({ volume }) {
  if (volume?.version !== MUSCLE_VOLUME_VERSION) return null
  const messages = (volume.issues || []).map(issueText).filter(Boolean)
  return <details className="ins-block" open={messages.length > 0}>
    <summary className="ins-h" style={{ cursor: 'pointer', display: 'list-item' }}>{t('Weekly muscle volume')}</summary>
    <p className="small dim">{t('Scheduled sets, with primary and supporting work listed separately.')}</p>
    <table className="small" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
      <caption style={{ textAlign: 'left', marginBottom: 8 }}>{t('These counts do not measure effort or recovery, or define an ideal dose.')}</caption>
      <thead><tr>
        <th scope="col" style={{ width: '28%', textAlign: 'left' }}>{t('By muscle')}</th>
        {[t('Primary'), t('Supporting'), t('Days')].map(label => <th scope="col" key={label} style={{ overflowWrap: 'anywhere', padding: '4px 0' }}>{label}</th>)}
      </tr></thead>
      <tbody>{Object.entries(volume.byMuscle || {}).map(([muscle, stats]) => <tr key={muscle}>
        <th scope="row" style={{ textAlign: 'left', fontWeight: 'normal', overflowWrap: 'anywhere', padding: '4px 0' }}>{muscleLabel(muscle)}{stats.uncertain ? '*' : ''}</th>
        <td style={{ textAlign: 'center' }}>{stats.primarySets}</td>
        <td style={{ textAlign: 'center' }}>{stats.supportingSets}</td>
        <td style={{ textAlign: 'center' }}>{stats.days}</td>
      </tr>)}</tbody>
    </table>
    {!!(volume.partialRows || volume.unmeasuredRows) && <p className="small dim">{t('Counts marked * are incomplete; some primary work may be missing.')}</p>}
    {!!volume.unmeasuredRows && <p className="small dim">{t('Timed work, cardio and stretches are excluded.')}</p>}
    {messages.map((message, i) => <p className="small" key={i}>{message}</p>)}
  </details>
}
