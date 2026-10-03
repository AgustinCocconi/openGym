import { beforeEach, describe, it, expect, vi } from 'vitest'

const env = vi.hoisted(() => ({ secrets: new Map(), file: null, fail: false, options: null }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  KeychainAccess: { whenUnlockedThisDeviceOnly: 1 },
  SecureStorage: {
    get: async key => env.secrets.get(key) || null,
    set: async (key, value, sync, access) => {
      if (env.fail) throw new Error('native store failed')
      env.options = { sync, access }; env.secrets.set(key, value)
    },
    remove: async key => env.secrets.delete(key),
  },
}))
vi.mock('./mobile.js', () => ({
  loadRemoteFile: async () => env.file,
  saveRemoteFile: async data => { env.file = structuredClone(data) },
}))
vi.mock('./api.js', () => ({
  pairRedeem: vi.fn(async () => ({ token: 'synthetic-bearer', user: { id: 'u' } })),
  setRemoteAuth: vi.fn(),
}))
import { setRemoteAuth } from './api.js'
import { connect, loadRemote, forgetRemote } from './remote.js'

beforeEach(() => { env.secrets.clear(); env.file = null; env.fail = false; env.options = null; vi.clearAllMocks() })

describe('native pairing persistence', () => {
  it('persists metadata and a device-only secret separately, then removes the secret on disconnect', async () => {
    await connect('gym.example', '1234')
    expect(env.file).toEqual({ mode: 'remote', base: 'https://gym.example', user: { id: 'u' } })
    expect(env.secrets.get('remote.token')).toBe('synthetic-bearer')
    expect(env.options).toEqual({ sync: false, access: 1 })
    expect(await loadRemote()).toMatchObject({ token: 'synthetic-bearer' })
    await forgetRemote()
    expect(env.secrets.size).toBe(0)
    expect(env.file).toEqual({ mode: 'local' })
  })
  it('migrates a legacy token without leaving it in the JSON metadata', async () => {
    env.file = { mode: 'remote', base: 'https://gym.example', token: 'legacy-synthetic', user: { id: 'u' } }
    expect(await loadRemote()).toMatchObject({ token: 'legacy-synthetic' })
    expect(env.file).not.toHaveProperty('token')
    expect(env.secrets.get('remote.token')).toBe('legacy-synthetic')
  })
  it('does not restore authentication from metadata when the device secret is absent', async () => {
    env.file = { mode: 'remote', base: 'https://gym.example', user: { id: 'u' } }
    expect(await loadRemote()).toEqual({ mode: 'local' })
    expect(setRemoteAuth).not.toHaveBeenCalled()
  })
  it('refuses to activate a pairing if durable native storage fails', async () => {
    env.fail = true
    await expect(connect('gym.example', '1234')).rejects.toThrow('Could not save')
    expect(setRemoteAuth).not.toHaveBeenCalled()
    expect(env.file).toBe(null)
  })
})
