// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const xml = path => new DOMParser().parseFromString(read(path), 'application/xml')

describe('Android credential backup contract', () => {
  it('excludes pairing and the installed secure plugin file from every supported backup mode', () => {
    const native = read('../../node_modules/@aparajita/capacitor-secure-storage/android/src/main/java/com/aparajita/capacitor/securestorage/SecureStorage.java')
    const preferences = /SHARED_PREFERENCES\s*=\s*"([^"]+)"/.exec(native)[1] + '.xml'
    const legacy = xml('../../android/app/src/main/res/xml/backup_rules.xml')
    const modern = xml('../../android/app/src/main/res/xml/data_extraction_rules.xml')
    const manifest = xml('../../android/app/src/main/AndroidManifest.xml').querySelector('application')
    expect(manifest.getAttribute('android:fullBackupContent')).toBe('@xml/backup_rules')
    expect(manifest.getAttribute('android:dataExtractionRules')).toBe('@xml/data_extraction_rules')
    for (const rules of [legacy.documentElement, modern.querySelector('cloud-backup'), modern.querySelector('device-transfer')]) {
      const excludes = [...rules.querySelectorAll('exclude')].map(e => [e.getAttribute('domain'), e.getAttribute('path')])
      expect(excludes).toContainEqual(['file', 'opengym-remote.json'])
      expect(excludes).toContainEqual(['sharedpref', preferences])
      expect(excludes).not.toContainEqual(['file', 'opengym-state.json'])
    }
  })
})
