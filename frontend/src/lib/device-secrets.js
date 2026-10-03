// Device credentials share one native store; web runs keep them only in memory.
import { Capacitor } from '@capacitor/core'

const memory = new Map()
let pluginPromise = null
function plugin() {
  if (!Capacitor.isNativePlatform()) {
    globalThis.localStorage?.removeItem('capacitor-storage_coach.apiKey')
    return Promise.resolve({ store: null })
  }
  if (!pluginPromise) {
    // Capacitor proxies have a `then` method: never resolve a promise to the bare proxy.
    pluginPromise = import('@aparajita/capacitor-secure-storage')
      .then(m => ({ store: m?.SecureStorage || null, access: m?.KeychainAccess?.whenUnlockedThisDeviceOnly }))
      .catch(() => ({ store: null }))
  }
  return pluginPromise
}

export const withTimeout = (promise, ms = 4000) => new Promise((resolve, reject) => {
  const tm = setTimeout(() => reject(new Error('secure storage timed out')), ms)
  promise.then(v => { clearTimeout(tm); resolve(v) }, e => { clearTimeout(tm); reject(e) })
})

export async function getDeviceSecret(key) {
  const { store } = await plugin()
  if (store) {
    try {
      const v = await withTimeout(store.get(key, false, false))
      return typeof v === 'string' && v ? v : null
    } catch { /* unavailable: a Coach key may live in memory for this run */ }
  }
  return memory.get(key) || null
}

export async function setDeviceSecret(key, value, { persistent = false } = {}) {
  const v = String(value || '').trim()
  if (!v) return clearDeviceSecret(key)
  const { store, access } = await plugin()
  if (store) {
    try {
      await withTimeout(store.set(key, v, false, access))
      memory.delete(key)
      return
    } catch (e) { if (persistent) throw e }
  }
  if (persistent && Capacitor.isNativePlatform()) throw new Error('Secure storage unavailable')
  memory.set(key, v)
}

export async function clearDeviceSecret(key) {
  const { store } = await plugin()
  if (store) { try { await withTimeout(store.remove(key, false)) } catch { /* nothing accessible to clear */ } }
  memory.delete(key)
}
