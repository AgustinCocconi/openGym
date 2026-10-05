// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { webauthnOK } from './api.js'

const originalPublicKeyCredential = window.PublicKeyCredential
const originalCredentials = navigator.credentials

function setCapability(target, property, value) {
  Object.defineProperty(target, property, { configurable: true, value })
}

afterEach(() => {
  setCapability(window, 'PublicKeyCredential', originalPublicKeyCredential)
  setCapability(navigator, 'credentials', originalCredentials)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('webauthnOK', () => {
  it('accepts WebAuthn when PublicKeyCredential is exposed', () => {
    setCapability(window, 'PublicKeyCredential', class PublicKeyCredential {})
    setCapability(navigator, 'credentials', {})
    expect(webauthnOK()).toBe(true)
  })

  it('does not reject WebAuthn when the generic credentials check is unavailable', () => {
    setCapability(window, 'PublicKeyCredential', class PublicKeyCredential {})
    setCapability(navigator, 'credentials', undefined)
    expect(webauthnOK()).toBe(true)
  })

  it('rejects browsers without the WebAuthn credential type', () => {
    setCapability(window, 'PublicKeyCredential', undefined)
    setCapability(navigator, 'credentials', {})
    expect(webauthnOK()).toBe(false)
  })
})

describe('api()', () => {
  it('a failed request throws with the status and the parsed body attached', async () => {
    const { api } = await import('./api.js')
    const original = globalThis.fetch
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'conflict', rev: 3, state: { _rev: 3 } }) })
    try {
      await expect(api('/api/data', { method: 'PUT', body: '{}' })).rejects.toMatchObject({
        message: 'conflict', status: 409, data: { error: 'conflict', rev: 3, state: { _rev: 3 } }
      })
    } finally { globalThis.fetch = original }
  })
})

// A reverse proxy redirects unauthenticated AJAX to another origin. A manual redirect
// exposes that response without a CORS failure, letting the explicit login renew Access.
describe('passkey login behind an authentication proxy', () => {
  it('renews proxy sign-in by navigation before opening the authenticator', async () => {
    const { passkeyLogin } = await import('./api.js')
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    const get = vi.fn()
    setCapability(navigator, 'credentials', { get })
    const request = vi.fn().mockResolvedValue({ type: 'opaqueredirect', status: 0 })
    vi.stubGlobal('fetch', request)
    await expect(passkeyLogin()).rejects.toMatchObject({ name: 'AbortError' })
    expect(request).toHaveBeenCalledWith('/api/login/options', expect.objectContaining({
      method: 'POST', redirect: 'manual', body: '{}'
    }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(get).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('completes the normal passkey exchange after Access is already authenticated', async () => {
    const { passkeyLogin } = await import('./api.js')
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    const user = { id: 'existing-owner', name: 'Owner' }
    const bytes = () => new Uint8Array([0, 1]).buffer
    const get = vi.fn().mockResolvedValue({
      id: 'fixture-passkey', rawId: bytes(), type: 'public-key',
      response: { clientDataJSON: bytes(), authenticatorData: bytes(), signature: bytes(), userHandle: null }
    })
    setCapability(navigator, 'credentials', { get })
    const request = vi.fn()
      .mockResolvedValueOnce({ type: 'basic', ok: true, json: async () => ({ cid: 'fixture-challenge', options: { challenge: 'AAE' } }) })
      .mockResolvedValueOnce({ type: 'basic', ok: true, json: async () => ({ user }) })
    vi.stubGlobal('fetch', request)
    await expect(passkeyLogin()).resolves.toEqual(user)
    expect(get).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenLastCalledWith('/api/login/verify', expect.objectContaining({ method: 'POST' }))
    expect(reload).not.toHaveBeenCalled()
  })

  it('keeps an application 401 as an error without reloading or opening the authenticator', async () => {
    const { passkeyLogin } = await import('./api.js')
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    const get = vi.fn()
    setCapability(navigator, 'credentials', { get })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      type: 'basic', ok: false, status: 401, json: async () => ({ error: 'not signed in' })
    }))
    await expect(passkeyLogin()).rejects.toMatchObject({ status: 401, message: 'not signed in' })
    expect(reload).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
  })

  it('keeps failed background data requests offline without a navigation', async () => {
    const { api } = await import('./api.js')
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    const offline = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(offline))
    await expect(api('/api/data', { method: 'PUT', body: '{"sets":[3]}' })).rejects.toBe(offline)
    expect(reload).not.toHaveBeenCalled()
  })
})
