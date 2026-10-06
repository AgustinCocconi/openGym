import { t } from '../../lib/i18n.js'

export default function PlanScope({ value, onChange }) {
  return <div className="ob-field">
    <div className="ob-sub" style={{ marginTop: 0 }}>{t('Plan scope')}</div>
    <div className="ob-chips" role="radiogroup" aria-label={t('Plan scope')}>
      {[['general', 'Whole-body plan'], ['focused', 'Specific focus']].map(([scope, label]) =>
        <button key={scope} type="button" role="radio" aria-checked={value === scope}
          className={'chip' + (value === scope ? ' on' : '')} onClick={() => onChange(scope)}>{t(label)}</button>)}
    </div>
    <p className="small dim">{t('Describe a specific focus in your notes.')}</p>
  </div>
}
