// Coach keys never travel in the training state, exports or device settings file.
import { getDeviceSecret, setDeviceSecret, clearDeviceSecret } from './device-secrets.js'
export { withTimeout } from './device-secrets.js'

const KEY = 'coach.apiKey'
export const getApiKey = () => getDeviceSecret(KEY)
export const setApiKey = value => setDeviceSecret(KEY, value)
export const clearApiKey = () => clearDeviceSecret(KEY)
