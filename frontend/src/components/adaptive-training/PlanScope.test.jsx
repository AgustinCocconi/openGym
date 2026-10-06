import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLang } from '../../lib/i18n.js'
import CoachIntake from '../../views/CoachIntake.jsx'

const mocks = vi.hoisted(() => ({
  S: null, nav: vi.fn(), toast: vi.fn(), requestPlan: vi.fn(async () => ({}))
}))
vi.mock('../../store/useStore.js', () => ({
  useStore: select => select({
    S: mocks.S, user: { id: 'synthetic' }, config: { coach: { enabled: true } },
    update: mut => mut(mocks.S)
  })
}))
vi.mock('../../store/useUI.js', () => ({ useUI: select => select({ toast: mocks.toast }) }))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.nav, useSearchParams: () => [new URLSearchParams('edit=1')]
}))
vi.mock('../../lib/coach-api.js', () => ({ requestPlan: mocks.requestPlan, disclosure: vi.fn() }))

let root, container, dom
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  await setLang('en')
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Element', 'Event', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[key]
  vi.clearAllMocks()
})
async function click(text) {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === text)
  expect(button).toBeTruthy()
  await act(async () => button.dispatchEvent(new dom.Event('click', { bubbles: true })))
}
describe('explicit plan scope in intake', () => {
  for (const locale of ['es', 'es-AR']) it('saves the chosen focus without generating or changing training in ' + locale, async () => {
    await setLang(locale)
    const training = { routines: [{ id: 'old', ex: [] }], week: { 1: 'old' }, workouts: [{ d: '2026-10-01' }] }
    mocks.S = { ...structuredClone(training), lang: locale, coach: {
      consent: { agreedAt: '2026-10-01', version: 2 },
      profile: { goal: 'muscle', experience: 'new', daysPerWeek: 2, preferredDays: [1, 4], sessionMin: 60, equipment: ['dumbbell'], likes: 'Prefiero maquinas.' },
      chat: []
    } }
    dom = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>').window
    globalThis.window = dom; globalThis.document = dom.document
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
    for (const key of ['HTMLElement', 'Node', 'Element', 'Event']) globalThis[key] = dom[key]
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.getElementById('root'); root = createRoot(container)
    await act(async () => root.render(<CoachIntake />))
    for (let i = 0; i < 6; i++) await click('Continuar')
    expect(container.textContent).toContain('Alcance del plan')
    await click('Plan de cuerpo completo')
    expect(container.querySelector('[role="radio"][aria-checked="true"]').textContent).toBe('Plan de cuerpo completo')
    await click('Enfoque específico')
    expect(container.querySelector('[role="radio"][aria-checked="true"]').textContent).toBe('Enfoque específico')
    await click('Guardar')
    expect(mocks.S.coach.profile.planScope).toBe('focused')
    expect(mocks.S.coach.profile.likes).toBe('Prefiero maquinas.')
    for (const key of ['routines', 'week', 'workouts']) expect(mocks.S[key]).toEqual(training[key])
    expect(mocks.requestPlan).not.toHaveBeenCalled()
    expect(mocks.nav).toHaveBeenCalledWith('/coach')
  })
})
