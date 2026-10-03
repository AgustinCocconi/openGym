import { describe, expect, it } from 'vitest'
import { createSyncSession } from './sync-session.js'

describe('sync session scope', () => {
  it('checks ownership even before a storage event invalidates the generation', () => {
    let current = { uid: 'A', owner: 'A' }
    const session = createSyncSession(() => current)
    const scope = session.capture()
    expect(session.isCurrent(scope)).toBe(true)
    current = { uid: 'A', owner: 'B' }
    expect(session.isCurrent(scope)).toBe(false)
    expect(session.isCurrent(session.capture())).toBe(false)
  })

  it('rejects the old generation when the same uid returns', () => {
    const session = createSyncSession(() => ({ uid: 'A', owner: 'A' }))
    const old = session.capture()
    session.invalidate()
    const next = session.capture()
    expect(old.signal.aborted).toBe(true)
    expect(session.isCurrent(old)).toBe(false)
    expect(session.isCurrent(next)).toBe(true)
    expect(next.signal.aborted).toBe(false)
  })

  it('does not run sync for an anonymous or mismatched profile', async () => {
    for (const current of [{ uid: null, owner: null }, { uid: 'A', owner: 'B' }]) {
      const session = createSyncSession(() => current)
      const run = () => { throw new Error('Must not send data') }
      await session.push(run)
      await session.pull(run)
    }
  })
})
