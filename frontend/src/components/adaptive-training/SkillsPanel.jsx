import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor } from '../../lib/i18n.js'
import { EXIDX } from '../../lib/exercises.js'
import { jointSignalsForState, setShoulderPain } from '../../../../api/coach/core/joint-signals.js'
import { uid } from '../../lib/format.js'
import { skillProgression, validateSkillGoals, recordSkillAttempt } from '../../../../api/coach/core/skills.js'
import { Button, SelectRow, TextField } from '../ui.jsx'
import './controls.css'

const EXERCISE_IDS = ['0652', '1326', '0017', '0662', '3302', '3296', '3299', '0631']
export default function SkillsPanel() {
  const S = useStore(s => s.S), update = useStore(s => s.update)
  const [adding, setAdding] = useState(false), [error, setError] = useState('')
  const [exerciseId, setExerciseId] = useState('0652'), [name, setName] = useState('')
  const [mode, setMode] = useState('reps'), [target, setTarget] = useState(4), [prerequisites, setPrerequisites] = useState([])
  const [selection, setSelection] = useState({}), [form, setForm] = useState({}), [painFree, setPainFree] = useState({})
  const goals = S.coach?.skillGoals || [], signals = jointSignalsForState(S)
  let progress = []
  try { progress = skillProgression(goals, signals) } catch { return <div role="alert">{t('Skill settings need review. Use your manual routine meanwhile.')}</div> }
  const add = event => {
    event.preventDefault(); setError('')
    try {
      const goal = { id: uid(), name: name.trim() || exerciseNameFor(EXIDX[exerciseId]), exerciseId, mode, target: Number(target), prerequisiteIds: prerequisites, attempts: [] }
      update(s => { s.coach ||= {}; const next = [...(s.coach.skillGoals || []), goal]; validateSkillGoals(next); s.coach.skillGoals = next })
      setAdding(false); setName(''); setPrerequisites([])
    } catch { setError(t('Check the target and prerequisites.')) }
  }
  const evidenceFor = goal => (S.workouts || []).flatMap(workout => (workout.entries || []).map((entry, index) => ({ workout, entry, index })))
    .filter(item => item.entry.id === goal.exerciseId && !item.entry.noProg && item.entry.sets?.some(row => row.done)).slice(-5).reverse()
  const record = (goal, evidence) => {
    setError('')
    try { update(s => { recordSkillAttempt(s, goal.id, { workoutId: evidence.workout.id, entryIndex: evidence.index, formConfirmed: form[goal.id], painFree: painFree[goal.id] }) }) }
    catch { setError(t('This evidence cannot advance the skill. Check pain, technique and prerequisites.')) }
  }
  return <section className="sect adaptive-controls" aria-label={t('Skills and foundations')} style={{ margin: '18px 0' }}>
    <h3>{t('Skills and foundations')}</h3>
    <p className="muted small">{t('Choose a measurable goal. A harder variation needs recorded evidence and your technique confirmation.')}</p>
    <label className="adaptive-check" style={{ gap: 8 }}>
      <input type="checkbox" checked={signals.some(s => s.region === 'shoulder' && s.type === 'pain')} onChange={event => {
        const checked = event.target.checked
        update(s => setShoulderPain(s,checked))
      }} />{t('I currently have shoulder pain')}
    </label>
    {!!signals.length && <p role="alert">{t('Pain blocks skill advancement and unclassified exercise alternatives. You can skip pending work or finish.')}</p>}
    {progress.map(skill => {
      const goal = goals.find(g => g.id === skill.id), choices = evidenceFor(goal)
      const selected = choices.find(item => JSON.stringify([item.workout.id, item.index]) === selection[goal.id]) || choices[0]
      const status = { active: 'Ready to practise', locked: 'Prerequisites pending', mastered: 'Goal confirmed', blocked: 'Blocked by reported pain' }[skill.status]
      return <div key={skill.id} className="item">
        <b>{skill.name}</b> <span className="tag nocap">{t(status)}</span>
        <p className="small">{t('Target: {0} {1}', skill.target, skill.mode === 'time' ? t('seconds') : t('reps'))}</p>
        {!!skill.missingPrerequisiteIds.length && <p className="muted small">{t('First confirm: {0}', skill.missingPrerequisiteIds.map(id => goals.find(g => g.id === id)?.name).join(', '))}</p>}
        {choices.length ? <>
          <div className="sect-b"><SelectRow title={t('Logged evidence')} stackedValue value={JSON.stringify([selected.workout.id, selected.index])}
            onChange={value => setSelection({ ...selection, [goal.id]: value })} options={choices.map(item => ({ value: JSON.stringify([item.workout.id, item.index]), label: item.workout.d + ' · ' + Math.max(...item.entry.sets.filter(s => s.done).map(s => Number(goal.mode === 'time' ? s.sec : s.r) || 0)) }))} /></div>
          <label className="adaptive-check"><input type="checkbox" checked={!!form[goal.id]} onChange={event => setForm({ ...form, [goal.id]: event.target.checked })} />{t('I confirm controlled technique')}</label>
          <label className="adaptive-check"><input type="checkbox" checked={!!painFree[goal.id]} onChange={event => setPainFree({ ...painFree, [goal.id]: event.target.checked })} />{t('This attempt was pain-free')}</label>
          <Button size="sm" disabled={!skill.available || skill.status === 'locked'} onClick={() => record(goal, selected)}>{t('Record skill evidence')}</Button>
        </> : <p className="muted small">{t('Complete and log this exercise first. The AI cannot mark it mastered.')}</p>}
      </div>
    })}
    {!adding ? <Button size="sm" onClick={() => setAdding(true)} disabled={goals.length >= 20}>{t('Add a skill goal')}</Button> : <form className="adaptive-form" onSubmit={add}>
      <div className="sect-b"><SelectRow title={t('Exercise')} stackedValue value={exerciseId} onChange={setExerciseId} options={EXERCISE_IDS.map(id => ({ value: id, label: exerciseNameFor(EXIDX[id]) }))} /></div>
      <label className="adaptive-field">{t('Goal name')}<TextField maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      <div className="sect-b"><SelectRow title={t('Measure')} value={mode} onChange={setMode} options={[{ value: 'reps', label: t('reps') }, { value: 'time', label: t('seconds') }]} /></div>
      <label className="adaptive-field">{t('Target')}<TextField type="number" min="1" max={mode === 'time' ? 3600 : 100} value={target} onChange={event => setTarget(event.target.value)} required /></label>
      {!!goals.length && <fieldset><legend>{t('Prerequisites you want to require')}</legend>{goals.map(goal => <label key={goal.id} className="adaptive-check"><input type="checkbox" checked={prerequisites.includes(goal.id)} onChange={event => setPrerequisites(event.target.checked ? [...prerequisites, goal.id] : prerequisites.filter(id => id !== goal.id))} />{goal.name}</label>)}</fieldset>}
      <p className="muted small">{t('These are your goals, not a clinical clearance or an automatic training prescription.')}</p>
      <div className="adaptive-actions"><Button type="submit">{t('Save goal')}</Button><Button type="button" variant="ghost" onClick={() => setAdding(false)}>{t('Cancel')}</Button></div>
    </form>}
    {!!error && <p role="alert">{error}</p>}
  </section>
}
