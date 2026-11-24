/**
 * @file Framework-agnostic exit-intent detector. Emits `exit` when a visitor
 * signals they are about to leave, with no UI of its own. Pair it with
 * {@link ExitModal} or any custom handler.
 */

import { ExitStore, parseDuration } from './persistence.js'

/**
 * @typedef {Object} MobileOptions
 * @property {boolean} [inactivity=true]  Fire after a period of no interaction.
 * @property {number}  [inactivityMs=15000] Idle time before firing (ms).
 * @property {boolean} [scrollUp=true]    Fire on a fast upward scroll near the top.
 * @property {boolean} [backButton=false] Trap the first Back press via history state.
 */

/**
 * @typedef {Object} ExitIntentOptions
 * @property {number}  [threshold=20] Distance (px) from the top edge that counts as leaving.
 * @property {number}  [delay=0] Grace period (ms) before firing; cancelled if the pointer returns.
 * @property {boolean|MobileOptions} [mobile=false] Enable touch-device heuristics.
 * @property {number}  [maxDisplays=Infinity] Max times to fire per persisted scope.
 * @property {number|string} [cooldown=0] Minimum time between fires (`'7d'`, `'24h'`, ms).
 * @property {'local'|'session'} [scope='local'] Persistence scope for frequency caps.
 * @property {string}  [storageKey='oei:default'] Storage namespace.
 * @property {boolean} [autoStart=true] Attach listeners immediately on construction.
 * @property {() => number} [now] Clock provider (injectable for testing).
 * @property {(detail: ExitDetail) => void} [onExit] Convenience callback for the `exit` event.
 */

/**
 * @typedef {Object} ExitDetail
 * @property {'desktop-top'|'mobile-inactivity'|'mobile-scroll'|'mobile-back'|'manual'} reason
 * @property {number} count Total fires including this one.
 */

/** Minimal typed event emitter. */
class Emitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map()
  }

  /**
   * @param {string} type
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function.
   */
  on(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set())
    this._listeners.get(type).add(handler)
    return () => this.off(type, handler)
  }

  /**
   * @param {string} type
   * @param {Function} handler
   */
  off(type, handler) {
    this._listeners.get(type)?.delete(handler)
  }

  /**
   * @param {string} type
   * @param {*} [detail]
   */
  emit(type, detail) {
    this._listeners.get(type)?.forEach((fn) => {
      try {
        fn(detail)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[exit-intent] listener for "${type}" threw`, err)
      }
    })
  }
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

/**
 * Detects exit intent across desktop and (optionally) touch devices.
 *
 * @example
 * const detector = new ExitIntentDetector({ cooldown: '1d', maxDisplays: 3 })
 * const off = detector.on('exit', ({ reason }) => console.log('leaving:', reason))
 */
export class ExitIntentDetector extends Emitter {
  /** @param {ExitIntentOptions} [options] */
  constructor(options = {}) {
    super()
    /** @type {Required<Omit<ExitIntentOptions, 'mobile'|'onExit'|'now'>> & ExitIntentOptions} */
    this.options = {
      threshold: 20,
      delay: 0,
      mobile: false,
      maxDisplays: Infinity,
      cooldown: 0,
      scope: 'local',
      storageKey: 'oei:default',
      autoStart: true,
      ...options,
    }
    this._now = options.now || (() => Date.now())
    this._cooldownMs = parseDuration(this.options.cooldown)
    this._store = new ExitStore({ key: this.options.storageKey, scope: this.options.scope })
    this._active = false
    this._pending = null
    this._idleTimer = null
    this._lastScrollY = 0
    this._bound = null
    this._historyTrapped = false

    if (options.onExit) this.on('exit', options.onExit)
    if (this.options.autoStart) this.start()
  }

  /** @returns {MobileOptions|null} Normalized mobile config, or null if disabled. */
  get _mobileConfig() {
    const m = this.options.mobile
    if (!m) return null
    const base = { inactivity: true, inactivityMs: 15000, scrollUp: true, backButton: false }
    return m === true ? base : { ...base, ...m }
  }

  /** @returns {boolean} True on touch/no-hover devices. */
  get _isTouch() {
    if (!isBrowser) return false
    return (
      ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
      window.matchMedia?.('(hover: none)').matches !== false
    )
  }

  /** Attach listeners. Idempotent. @returns {this} */
  start() {
    if (!isBrowser || this._active) return this
    this._active = true
    const b = {
      mouseout: (e) => this._onMouseOut(e),
      mousemove: () => this._cancelPending(),
      scroll: () => this._onScroll(),
      touch: () => this._resetIdle(),
      popstate: () => this._onPopState(),
    }
    this._bound = b

    const touch = this._isTouch
    const mobile = this._mobileConfig

    if (!touch) {
      document.addEventListener('mouseout', b.mouseout, { passive: true })
      document.addEventListener('mousemove', b.mousemove, { passive: true })
    }

    if (touch && mobile) {
      if (mobile.scrollUp) {
        this._lastScrollY = window.scrollY
        window.addEventListener('scroll', b.scroll, { passive: true })
      }
      if (mobile.inactivity) {
        window.addEventListener('touchstart', b.touch, { passive: true })
        window.addEventListener('scroll', b.touch, { passive: true })
        this._resetIdle()
      }
      if (mobile.backButton) {
        try {
          // Only one trap entry at a time, so stop()/start() cycles don't pile
          // up history entries the visitor must click Back through.
          if (!this._historyTrapped) {
            history.pushState({ oei: true }, '')
            this._historyTrapped = true
          }
          window.addEventListener('popstate', b.popstate)
        } catch {
          /* history unavailable */
        }
      }
    }
    return this
  }

  /** Detach all listeners and clear timers. Idempotent. @returns {this} */
  stop() {
    if (!isBrowser || !this._active) return this
    this._active = false
    const b = this._bound
    if (b) {
      document.removeEventListener('mouseout', b.mouseout)
      document.removeEventListener('mousemove', b.mousemove)
      window.removeEventListener('scroll', b.scroll)
      window.removeEventListener('touchstart', b.touch)
      window.removeEventListener('scroll', b.touch)
      window.removeEventListener('popstate', b.popstate)
    }
    this._cancelPending()
    if (this._idleTimer) clearTimeout(this._idleTimer)
    this._idleTimer = null
    return this
  }

  /** Stop and remove all event subscribers. */
  destroy() {
    this.stop()
    this._listeners.clear()
  }

  /** Clear persisted frequency-cap state (counts + cooldown). */
  reset() {
    this._store.reset()
    return this
  }

  /**
   * Force the exit flow, honoring frequency caps.
   * @param {ExitDetail['reason']} [reason='manual']
   * @returns {boolean} Whether it actually fired.
   */
  trigger(reason = 'manual') {
    return this._fire(reason)
  }

  /* ---- internal handlers ---- */

  _onMouseOut(e) {
    // Only when leaving the window at the top, not moving into another element.
    if (e.clientY > this.options.threshold) return
    const to = e.relatedTarget || e.toElement
    if (to) return
    if (this.options.delay > 0) {
      if (this._pending) return
      this._pending = setTimeout(() => {
        this._pending = null
        this._fire('desktop-top')
      }, this.options.delay)
    } else {
      this._fire('desktop-top')
    }
  }

  _cancelPending() {
    if (this._pending) {
      clearTimeout(this._pending)
      this._pending = null
    }
  }

  _onScroll() {
    const y = window.scrollY
    const delta = y - this._lastScrollY
    this._lastScrollY = y
    // Fast upward fling while near the top of the page.
    if (delta < -40 && y < 200) this._fire('mobile-scroll')
  }

  _resetIdle() {
    const mobile = this._mobileConfig
    if (!mobile?.inactivity) return
    if (this._idleTimer) clearTimeout(this._idleTimer)
    this._idleTimer = setTimeout(() => this._fire('mobile-inactivity'), mobile.inactivityMs)
  }

  _onPopState() {
    this._historyTrapped = false
    this._fire('mobile-back')
  }

  /**
   * @param {ExitDetail['reason']} reason
   * @returns {boolean}
   */
  _fire(reason) {
    const now = this._now()
    if (
      !this._store.canFire({
        maxDisplays: this.options.maxDisplays,
        cooldownMs: this._cooldownMs,
        now,
      })
    ) {
      return false
    }
    const { count } = this._store.record(now)
    if (count >= this.options.maxDisplays) this.stop()
    this.emit('exit', { reason, count })
    return true
  }
}
