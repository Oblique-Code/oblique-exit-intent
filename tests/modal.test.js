import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ExitModal } from '../src/modal.js'

/** Flush a requestAnimationFrame tick. */
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))

describe('ExitModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })
  afterEach(() => vi.useRealTimers())

  it('renders an accessible dialog', () => {
    const modal = new ExitModal({ title: 'Hi', text: 'Body copy' })
    const overlay = modal.render()
    const dialog = overlay.querySelector('.oei-dialog')
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe(dialog.querySelector('.oei-title').id)
    expect(dialog.getAttribute('aria-describedby')).toBe(dialog.querySelector('.oei-body').id)
    expect(dialog.querySelector('.oei-title').textContent).toBe('Hi')
  })

  it('escapes text bodies but keeps html bodies', () => {
    const t = new ExitModal({ text: '<img src=x onerror=1>' }).render()
    expect(t.querySelector('.oei-body').querySelector('img')).toBeNull()
    const h = new ExitModal({ html: '<strong>bold</strong>' }).render()
    expect(h.querySelector('.oei-body strong')).not.toBeNull()
  })

  it('mounts on open and locks scroll', async () => {
    const modal = new ExitModal({ title: 'Hi', lockScroll: true })
    modal.open()
    await nextFrame()
    expect(document.querySelector('.oei-overlay')).not.toBeNull()
    expect(modal.isOpen).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.querySelector('.oei-overlay').classList.contains('oei-overlay--open')).toBe(
      true,
    )
  })

  it('closes on Escape and restores scroll', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const modal = new ExitModal({ title: 'Hi', onClose })
    modal.open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledWith('esc')
    expect(modal.isOpen).toBe(false)
    expect(document.body.style.overflow).toBe('')
    vi.advanceTimersByTime(300)
    expect(document.querySelector('.oei-overlay')).toBeNull()
  })

  it('closes on backdrop click but not dialog click', async () => {
    const modal = new ExitModal({ title: 'Hi' })
    modal.open()
    const overlay = document.querySelector('.oei-overlay')
    overlay.querySelector('.oei-dialog').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(modal.isOpen).toBe(true) // inner click ignored
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(modal.isOpen).toBe(false)
  })

  it('fires the CTA handler and closes with reason "cta"', () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    const modal = new ExitModal({ cta: { label: 'Go', onClick }, onClose })
    modal.open()
    document.querySelector('.oei-cta').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledWith('cta')
  })

  it('renders the CTA as an anchor when href is given', () => {
    const modal = new ExitModal({ cta: { label: 'Go', href: '/offer' } })
    const cta = modal.render().querySelector('.oei-cta')
    expect(cta.tagName).toBe('A')
    expect(cta.getAttribute('href')).toBe('/offer')
  })

  it('traps focus with Tab / Shift+Tab', () => {
    const modal = new ExitModal({
      closeButton: true,
      cta: { label: 'Go' },
      dismissLabel: 'No',
    })
    modal.open()
    const els = modal._focusableEls()
    expect(els.length).toBeGreaterThanOrEqual(3)
    const last = els[els.length - 1]
    last.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(els[0]) // wrapped to first
    els[0].focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(document.activeElement).toBe(last) // wrapped to last
  })
})
