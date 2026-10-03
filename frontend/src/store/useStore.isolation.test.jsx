// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn() }))
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast }) } }))

import { api } from '../lib/api.js'
import { DEF, useStore } from './useStore.js'

const clone = value => JSON.parse(JSON.stringify(value))
const profile = id => ({ ...clone(DEF), _ts: 100, workouts: [{ id: 'private-' + id, d: '2026-10-02', entries: [] }] })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const httpError = (status, data) => Object.assign(new Error('HTTP ' + status), { status, data })
const puts = () => api.mock.calls.filter(([, opts]) => opts?.method === 'PUT').map(([, opts]) => JSON.parse(opts.body))
const marker = () => JSON.parse(localStorage.getItem('gym_sync'))
const switchToB = () => {
  useStore.getState().setUser({ id: 'B' })
  useStore.getState().replaceState(profile('B'))
  localStorage.setItem('gym_sync', JSON.stringify({ rev: 20, ts: 100 }))
  localStorage.setItem('gym_dirty', '1')
  useStore.setState({ sync: { offline: false, pending: true, lastSynced: 50 } })
}
const expectBIntact = () => {
  expect(useStore.getState().user.id).toBe('B')
  expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['private-B'])
  expect(JSON.parse(localStorage.getItem('gym_state_v1')).workouts.map(w => w.id)).toEqual(['private-B'])
  expect(marker()).toEqual({ rev: 20, ts: 100 })
  expect(localStorage.getItem('gym_dirty')).toBe('1')
  expect(useStore.getState().sync).toEqual({ offline: false, pending: true, lastSynced: 50 })
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  api.mockReset()
  toast.mockReset()
  useStore.getState().setUser({ id: 'A' })
  useStore.getState().replaceState(profile('A'))
  useStore.setState({ ready: true, config: null, sync: { offline: false, pending: false, lastSynced: 0 } })
  localStorage.setItem('gym_sync', JSON.stringify({ rev: 1, ts: 100 }))
})
afterEach(() => {
  useStore.getState().setUser(null)
  vi.useRealTimers()
  localStorage.clear()
})

describe('profile isolation during sync', () => {
  it.each([2, undefined])('ignores a late GET from A after B signs in (rev %s)', async rev => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    const pull = useStore.getState().pullState()
    switchToB()
    request.resolve({ state: { ...profile('A'), _ts: 999 }, rev })
    await pull
    expectBIntact()
    expect(puts()).toHaveLength(0)
  })

  it('does not merge or retry A after a late 409 in another tab', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise).mockResolvedValue({ ok: true, rev: 3 })
    const push = useStore.getState().pushState()
    localStorage.setItem('gym_state_v1', JSON.stringify(profile('B')))
    localStorage.setItem('gym_owner', 'B')
    localStorage.setItem('gym_sync', JSON.stringify({ rev: 20, ts: 100 }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'gym_owner', oldValue: 'A', newValue: 'B' }))
    request.reject(httpError(409, { rev: 2, state: profile('A') }))
    await push
    expect(useStore.getState().user).toBeNull()
    expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['private-B'])
    expect(JSON.parse(localStorage.getItem('gym_state_v1')).workouts.map(w => w.id)).toEqual(['private-B'])
    expect(marker()).toEqual({ rev: 20, ts: 100 })
    expect(puts()).toHaveLength(1)
  })

  it('checks shared ownership before a storage event is delivered', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise).mockResolvedValue({ ok: true, rev: 3 })
    const push = useStore.getState().pushState()
    localStorage.setItem('gym_owner', 'B')
    request.reject(httpError(409, { rev: 2, state: profile('A') }))
    await push
    await useStore.getState().pushState()
    expect(puts()).toHaveLength(1)
    expect(marker().rev).toBe(1)
  })

  it('does not restore a late GET after a sign-out in another tab', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    const pull = useStore.getState().pullState()
    localStorage.setItem('gym_state_v1', JSON.stringify(clone(DEF)))
    localStorage.removeItem('gym_owner')
    window.dispatchEvent(new StorageEvent('storage', { key: 'gym_owner', oldValue: 'A', newValue: null }))
    request.resolve({ state: profile('A'), rev: 2 })
    await pull
    expect(useStore.getState().user).toBeNull()
    expect(useStore.getState().S.workouts).toEqual([])
    expect(JSON.parse(localStorage.getItem('gym_state_v1')).workouts).toEqual([])
    expect(marker().rev).toBe(1)
  })

  it('ignores a late GET failure without making B offline', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    const pull = useStore.getState().pullState()
    switchToB()
    request.reject(new TypeError('Failed to fetch'))
    await pull
    expectBIntact()
  })

  it.each(['success', 'conflict', 'network', 'unauthorized', 'too-large'])('ignores a late PUT %s without changing B markers or banner', async result => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise).mockResolvedValue({ ok: true, rev: 3 })
    const push = useStore.getState().pushState()
    switchToB()
    if (result === 'success') request.resolve({ ok: true, rev: 2 })
    else request.reject(result === 'network' ? new TypeError('Failed to fetch') : httpError({ conflict: 409, unauthorized: 401, 'too-large': 413 }[result], { rev: 2, state: profile('A') }))
    await push
    await vi.advanceTimersByTimeAsync(0)
    expectBIntact()
    expect(puts()).toHaveLength(1)
    expect(toast).not.toHaveBeenCalled()
  })

  it('invalidates old operations even when the same uid signs back in', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    const pull = useStore.getState().pullState()
    useStore.getState().setUser(null)
    useStore.getState().setUser({ id: 'A' })
    const local = { ...profile('A'), _ts: 200 }
    useStore.getState().replaceState(local)
    const saved = localStorage.getItem('gym_state_v1')
    request.resolve({ state: { ...profile('old-session'), _ts: 999 }, rev: 2 })
    await pull
    expect(localStorage.getItem('gym_state_v1')).toBe(saved)
    expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['private-A'])
    expect(marker().rev).toBe(1)
  })

  it('aborts GET and PUT on a session change', async () => {
    const getRequest = deferred(), putRequest = deferred()
    api.mockReturnValueOnce(getRequest.promise).mockReturnValueOnce(putRequest.promise)
    const pull = useStore.getState().pullState()
    const push = useStore.getState().pushState()
    const signals = api.mock.calls.map(([, opts]) => opts?.signal)
    switchToB()
    getRequest.resolve({ state: profile('A'), rev: 2 })
    putRequest.resolve({ ok: true, rev: 2 })
    await Promise.all([pull, push])
    expect(signals).toHaveLength(2)
    expect(signals.every(signal => signal?.aborted)).toBe(true)
    expectBIntact()
  })

  it('does not launch a waiting pull after its push belongs to an old session', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise).mockResolvedValue({ state: profile('A'), rev: 2 })
    const push = useStore.getState().pushState()
    const pull = useStore.getState().pullState()
    switchToB()
    request.resolve({ ok: true, rev: 2 })
    await Promise.all([push, pull])
    expect(api).toHaveBeenCalledTimes(1)
    expectBIntact()
  })

  it('drops A queued pushes and lets B push while A is still unresolved', async () => {
    const oldRequest = deferred(), newRequest = deferred()
    api.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const oldPush = useStore.getState().pushState()
    const queued = useStore.getState().pushState()
    switchToB()
    const newPush = useStore.getState().pushState()
    expect(puts()).toHaveLength(2)
    oldRequest.resolve({ ok: true, rev: 2 })
    await Promise.all([oldPush, queued])
    const coalesced = useStore.getState().pushState()
    expect(puts()).toHaveLength(2)
    api.mockResolvedValueOnce({ ok: true, rev: 22 })
    newRequest.resolve({ ok: true, rev: 21 })
    await Promise.all([newPush, coalesced])
    expect(puts()).toHaveLength(3)
    expect(puts().slice(1).every(body => body.state.workouts[0].id === 'private-B')).toBe(true)
    expect(marker().rev).toBe(22)
  })

  it('does not let an old pull finalizer clear B pull or block it behind A', async () => {
    const oldRequest = deferred(), newRequest = deferred()
    api.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const oldPull = useStore.getState().pullState()
    switchToB()
    localStorage.removeItem('gym_dirty')
    const newPull = useStore.getState().pullState()
    expect(api).toHaveBeenCalledTimes(2)
    oldRequest.resolve({ state: profile('A'), rev: 2 })
    await oldPull
    const coalesced = useStore.getState().pullState()
    expect(api).toHaveBeenCalledTimes(2)
    newRequest.resolve({ state: { ...profile('B'), _ts: Date.now() + 100 }, rev: 21 })
    await Promise.all([newPull, coalesced])
    expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['private-B'])
    expect(marker().rev).toBe(21)
  })

  it('ignores a late revision check without pulling under B session', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    await vi.advanceTimersByTimeAsync(4000)
    window.dispatchEvent(new Event('focus'))
    expect(api.mock.calls[0][0]).toBe('/api/data/rev')
    switchToB()
    request.resolve({ rev: 2 })
    await vi.advanceTimersByTimeAsync(0)
    expect(api).toHaveBeenCalledTimes(1)
    expectBIntact()
  })

  it('does not adopt A after B signs in during the profile GET', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    const adoption = useStore.getState().adoptProfile()
    switchToB()
    request.resolve({ state: profile('A'), rev: 2 })
    await adoption
    expectBIntact()
  })

  it('discards an aborted adoption GET but still reports a current server failure', async () => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise)
    const adoption = useStore.getState().adoptProfile()
    switchToB()
    request.reject(new DOMException('Aborted', 'AbortError'))
    await expect(adoption).resolves.toBeUndefined()
    expectBIntact()
    api.mockRejectedValueOnce(httpError(500))
    await expect(useStore.getState().adoptProfile()).rejects.toMatchObject({ status: 500 })
  })

  it.each([true, false])('ignores an adoption answer from A after switching to B (keep %s)', async keep => {
    api.mockResolvedValueOnce({ state: profile('server-A'), rev: 2 })
    const answer = deferred()
    const ask = vi.fn(() => answer.promise)
    const adoption = useStore.getState().adoptProfile(ask)
    await vi.advanceTimersByTimeAsync(0)
    expect(ask).toHaveBeenCalledTimes(1)
    switchToB()
    answer.resolve(keep)
    await adoption
    expectBIntact()
    expect(puts()).toHaveLength(0)
  })

  it('cancels a debounced import from A without carrying its forced overwrite into B', async () => {
    useStore.getState().replaceState(profile('import-A'), true)
    switchToB()
    await vi.advanceTimersByTimeAsync(2000)
    expect(puts()).toHaveLength(0)
    api.mockResolvedValueOnce({ ok: true, rev: 21 })
    await useStore.getState().pushState()
    expect(puts()[0].baseRev).toBe(20)
    expect(puts()[0].state.workouts.map(w => w.id)).toEqual(['private-B'])
  })

  it.each(['signOut', 'signOutAll'])('does not %s B after waiting for A push', async action => {
    const request = deferred()
    api.mockReturnValueOnce(request.promise).mockResolvedValue({ ok: true })
    const signout = useStore.getState()[action]()
    switchToB()
    request.resolve({ ok: true, rev: 2 })
    await signout
    expect(api).toHaveBeenCalledTimes(1)
    expectBIntact()
  })

  it.each(['signOut', 'signOutAll'])('does not clear B after a late %s response', async action => {
    const request = deferred()
    api.mockResolvedValueOnce({ ok: true, rev: 2 }).mockReturnValueOnce(request.promise)
    const signout = useStore.getState()[action]()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.mock.calls[1][0]).toBe(action === 'signOut' ? '/api/logout' : '/api/logout/all')
    switchToB()
    request.resolve({ ok: true })
    await signout
    expectBIntact()
  })

  it.each(['success', 'expired'])('ignores an old boot /api/me %s after B signs in', async result => {
    const request = deferred()
    api.mockResolvedValueOnce({ allow_guest: true }).mockReturnValueOnce(request.promise)
    const boot = useStore.getState().boot()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.mock.calls[1][0]).toBe('/api/me')
    switchToB()
    if (result === 'success') request.resolve({ user: { id: 'A' } })
    else request.reject(httpError(401))
    await boot
    expect(api).toHaveBeenCalledTimes(2)
    expectBIntact()
  })

  it('preserves an edit made before boot confirms the same profile', async () => {
    const request = deferred()
    useStore.setState({ ready: false })
    localStorage.removeItem('gym_sync')
    api.mockResolvedValueOnce({ allow_guest: true }).mockReturnValueOnce(request.promise)
      .mockResolvedValueOnce({ state: { ...profile('A'), _ts: Date.now() + 100 }, rev: 2 })
      .mockResolvedValueOnce({ ok: true, rev: 3 })
    const boot = useStore.getState().boot()
    await vi.advanceTimersByTimeAsync(0)
    useStore.getState().update(s => { s.workouts.push(profile('new-local').workouts[0]) })
    request.resolve({ user: { id: 'A' } })
    await boot
    expect(useStore.getState().S.workouts.map(w => w.id).sort()).toEqual(['private-A', 'private-new-local'])
    expect(puts()).toHaveLength(1)
    expect(puts()[0].baseRev).toBe(2)
  })

  it('signed-out sync makes no data request', async () => {
    useStore.getState().setUser(null)
    await useStore.getState().pushState()
    await useStore.getState().pullState()
    await useStore.getState().adoptProfile()
    expect(api).not.toHaveBeenCalled()
  })
})
