import { describe, it, expect, beforeEach } from 'vitest'
import { ExitStore, parseDuration } from '../src/persistence.js'

describe('parseDuration', () => {
  it('passes through positive numbers as ms', () => {
    expect(parseDuration(500)).toBe(500)
  })

  it('treats non-positive / nullish as 0', () => {
    expect(parseDuration(0)).toBe(0)
    expect(parseDuration(-5)).toBe(0)
    expect(parseDuration(null)).toBe(0)
    expect(parseDuration(undefined)).toBe(0)
  })

  it('parses shorthand units', () => {
    expect(parseDuration('500ms')).toBe(500)
    expect(parseDuration('30s')).toBe(30_000)
    expect(parseDuration('15m')).toBe(900_000)
    expect(parseDuration('24h')).toBe(86_400_000)
    expect(parseDuration('7d')).toBe(604_800_000)
    expect(parseDuration('2w')).toBe(1_209_600_000)
  })

  it('defaults a bare number string to ms and rejects garbage', () => {
    expect(parseDuration('250')).toBe(250)
    expect(parseDuration('soon')).toBe(0)
  })
})

describe('ExitStore', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty', () => {
    const store = new ExitStore({ key: 'oei:test' })
    expect(store.read()).toEqual({ count: 0, last: 0 })
  })

  it('records fires and increments count', () => {
    const store = new ExitStore({ key: 'oei:test' })
    expect(store.record(1000)).toEqual({ count: 1, last: 1000 })
    expect(store.record(2000)).toEqual({ count: 2, last: 2000 })
  })

  it('enforces maxDisplays', () => {
    const store = new ExitStore({ key: 'oei:test' })
    expect(store.canFire({ maxDisplays: 1, now: 0 })).toBe(true)
    store.record(0)
    expect(store.canFire({ maxDisplays: 1, now: 0 })).toBe(false)
  })

  it('enforces cooldown windows', () => {
    const store = new ExitStore({ key: 'oei:test' })
    store.record(1000)
    expect(store.canFire({ cooldownMs: 5000, now: 3000 })).toBe(false) // still cooling
    expect(store.canFire({ cooldownMs: 5000, now: 6001 })).toBe(true) // window passed
  })

  it('reset clears state', () => {
    const store = new ExitStore({ key: 'oei:test' })
    store.record(1000)
    store.reset()
    expect(store.read()).toEqual({ count: 0, last: 0 })
  })

  it('isolates by key', () => {
    const a = new ExitStore({ key: 'oei:a' })
    const b = new ExitStore({ key: 'oei:b' })
    a.record(1)
    expect(b.read().count).toBe(0)
  })
})
