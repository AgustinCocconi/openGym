import { t } from '../../lib/i18n.js'
import { changeTitle, changeValues } from '../../lib/coach.js'
import Icon from '../Icon.jsx'

export default function ChangeRow({ c, S, stale, badge, children }) {
  const vals = changeValues(c, S)
  return <div className={'pcard-chg' + (stale ? ' stale' : '') + (c.status === 'rejected' ? ' declined' : '')}>
    <div className="grow">
      <div className="pcard-chg-t">{changeTitle(c, S)}{c.routineName ? <span className="dim" style={{ fontWeight: 400 }}> · {c.routineName}</span> : null}</div>
      {vals && <div className="pcard-chg-v"><span className="tag">{vals.before}</span><Icon name="chevronRight" style={{ fontSize: 12, color: 'var(--label-3)' }} /><span className="tag acc">{vals.after}</span></div>}
      <div className="pcard-chg-w">{c.why}</div>
      {stale && <div className="pcard-chg-stale">{t('Doesn’t match your plan any more — can’t be applied.')}</div>}
    </div>
    {badge}
    {children}
  </div>
}

