// @vitest-environment happy-dom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'

afterEach(() => { localStorage.clear(); vi.resetModules() })

describe('device secrets with the real web runtime', () => {
  it('keeps a synthetic key in memory and forgets it when the module reloads', async () => {
    expect(Capacitor.isNativePlatform()).toBe(false)
    localStorage.setItem('capacitor-storage_coach.apiKey', 'old-synthetic-key')
    const secrets = await import('./device-secrets.js')
    await secrets.setDeviceSecret('coach.apiKey', 'synthetic-web-key')
    expect(await secrets.getDeviceSecret('coach.apiKey')).toBe('synthetic-web-key')
    expect(localStorage.length).toBe(0)
    vi.resetModules()
    const reloaded = await import('./device-secrets.js')
    expect(await reloaded.getDeviceSecret('coach.apiKey')).toBe(null)
  })
})
