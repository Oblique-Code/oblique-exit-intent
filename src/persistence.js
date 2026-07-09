/**
 * @file Lightweight persistence + frequency-capping for exit-intent triggers.
 * Backed by localStorage (persistent) or sessionStorage (per-session), with a
 * safe in-memory fallback when Web Storage is unavailable (SSR, privacy mode).
 */

/** In-memory fallback so the library never throws when storage is blocked. */
const memoryStore = new Map()

/**
 * Resolve the requested Storage, degrading to an in-memory shim on failure.
 * @param {'local'|'session'} kind
 * @returns {Storage}
 */
function resolveStorage(kind) {
  try {
    const store = kind === 'session' ? window.sessionStorage : window.localStorage
    const probe = '__oei_probe__'
    store.setItem(probe, '1')
    store.removeItem(probe)
    return store
  } catch {
    return /** @type {Storage} */ ({
      getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
      setItem: (k, v) => void memoryStore.set(k, String(v)),
      removeItem: (k) => void memoryStore.delete(k),
    })
  }
}

/**
 * Parse a cooldown value into milliseconds.
 * Accepts a number (ms) or a shorthand string: `500ms`, `30s`, `15m`, `24h`, `7d`, `2w`.
 * @param {number|string|undefined|null} value
 * @returns {number} Milliseconds (0 when unset/invalid).
 */
export function parseDuration(value) {
  if (value == null) return 0
  if (typeof value === 'number') return value > 0 ? value : 0
  const match = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?\s*$/i.exec(value)
  if (!match) return 0
  const amount = parseFloat(match[1])
  const unit = (match[2] || 'ms').toLowerCase()
  const factors = { ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }
  return Math.round(amount * factors[unit])
}

/**
 * @typedef {Object} ExitState
 * @property {number} count   Number of times the trigger has fired for this key.
 * @property {number} last    Epoch ms of the most recent fire (0 if never).
 */

/**
 * Frequency-cap store for a single exit-intent instance.
 */
export class ExitStore {
  /**
   * @param {Object} [options]
   * @param {string} [options.key='oei:default'] Storage key namespace.
   * @param {'local'|'session'} [options.scope='local'] Persistence scope.
   */
  constructor({ key = 'oei:default', scope = 'local' } = {}) {
    this.key = key
    this.storage = resolveStorage(scope)
  }

  /** @returns {ExitState} */
  read() {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) return { count: 0, last: 0 }
      const parsed = JSON.parse(raw)
      return {
        count: Number(parsed.count) || 0,
        last: Number(parsed.last) || 0,
      }
    } catch {
      return { count: 0, last: 0 }
    }
  }

  /**
   * Record a fire: increments count and stamps `last`.
   * @param {number} now Epoch ms (injectable for testing).
   * @returns {ExitState}
   */
  record(now) {
    const state = this.read()
    const next = { count: state.count + 1, last: now }
    try {
      this.storage.setItem(this.key, JSON.stringify(next))
    } catch {
      /* storage full / blocked — best effort only */
    }
    return next
  }

  /** Clear all stored state for this key. */
  reset() {
    try {
      this.storage.removeItem(this.key)
    } catch {
      /* no-op */
    }
  }

  /**
   * Whether the trigger is allowed to fire right now.
   * @param {Object} rules
   * @param {number} [rules.maxDisplays=Infinity] Cap on total displays.
   * @param {number} [rules.cooldownMs=0] Minimum ms between displays.
   * @param {number} rules.now Epoch ms (injectable for testing).
   * @returns {boolean}
   */
  canFire({ maxDisplays = Infinity, cooldownMs = 0, now }) {
    const { count, last } = this.read()
    if (count >= maxDisplays) return false
    if (cooldownMs > 0 && count > 0 && now - last < cooldownMs) return false
    return true
  }
}
