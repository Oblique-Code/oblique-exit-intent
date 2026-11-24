import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ExitIntentDetector } from '../src/detector.js'

/** Dispatch a top-of-window mouseout. */
function leaveTop(clientY = 0, relatedTarget = null) {
  document.dispatchEvent(new MouseEvent('mouseout', { clientY, relatedTarget, bubbles: true }))
}

describe('ExitIntentDetector (desktop)', () => {
  let clock
  let instances
  beforeEach(() => {
    localStorage.clear()
    clock = 0
    instances = []
  })
  // Detach every detector so leftover listeners don't leak into later tests.
  afterEach(() => instances.forEach((d) => d.destroy()))

  const make = (opts = {}) => {
    const d = new ExitIntentDetector({ now: () => clock, storageKey: 'oei:test', ...opts })
    instances.push(d)
    return d
  }

  it('fires when the pointer leaves via the top edge', () => {
    const onExit = vi.fn()
    make({ onExit })
    leaveTop(5)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit.mock.calls[0][0]).toMatchObject({ reason: 'desktop-top', count: 1 })
  })

  it('ignores mouseout below the threshold', () => {
    const onExit = vi.fn()
    make({ threshold: 20, onExit })
    leaveTop(100)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('ignores mouseout that moves into another element', () => {
    const onExit = vi.fn()
    make({ onExit })
    leaveTop(0, document.createElement('div'))
    expect(onExit).not.toHaveBeenCalled()
  })

  it('respects maxDisplays and stops after the cap', () => {
    const onExit = vi.fn()
    const d = make({ maxDisplays: 1, onExit })
    leaveTop(0)
    leaveTop(0)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(d._active).toBe(false)
  })

  it('respects cooldown between fires', () => {
    const onExit = vi.fn()
    make({ cooldown: '1h', maxDisplays: 5, onExit })
    clock = 0
    leaveTop(0)
    clock = 30 * 60_000 // 30 min later — still cooling
    leaveTop(0)
    expect(onExit).toHaveBeenCalledTimes(1)
    clock = 61 * 60_000 // past the hour
    leaveTop(0)
    expect(onExit).toHaveBeenCalledTimes(2)
  })

  it('honors delay and cancels when the pointer returns', () => {
    vi.useFakeTimers()
    const onExit = vi.fn()
    make({ delay: 200, onExit })
    leaveTop(0)
    expect(onExit).not.toHaveBeenCalled() // pending
    document.dispatchEvent(new MouseEvent('mousemove')) // pointer came back
    vi.advanceTimersByTime(300)
    expect(onExit).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('trigger() fires manually and reset() clears the cap', () => {
    const onExit = vi.fn()
    const d = make({ maxDisplays: 1, autoStart: false, onExit })
    expect(d.trigger()).toBe(true)
    expect(onExit.mock.calls[0][0]).toMatchObject({ reason: 'manual' })
    expect(d.trigger()).toBe(false) // capped
    d.reset()
    expect(d.trigger()).toBe(true)
  })

  it('stop() detaches listeners', () => {
    const onExit = vi.fn()
    const d = make({ onExit })
    d.stop()
    leaveTop(0)
    expect(onExit).not.toHaveBeenCalled()
  })
})

describe('ExitIntentDetector (mobile back button)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pushes only one history entry across stop/start cycles', () => {
    vi.spyOn(ExitIntentDetector.prototype, '_isTouch', 'get').mockReturnValue(true)
    const push = vi.spyOn(history, 'pushState')
    const d = new ExitIntentDetector({
      storageKey: 'oei:back',
      mobile: { backButton: true, inactivity: false, scrollUp: false },
    })
    d.stop().start().stop().start()
    expect(push).toHaveBeenCalledTimes(1)
    d.destroy()
  })
})
