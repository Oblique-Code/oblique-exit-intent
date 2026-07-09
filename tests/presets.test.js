import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExitModal } from '../src/modal.js'
import { presets, discount, newsletter, cartSaver } from '../src/presets.js'

describe('presets', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('exposes all presets on the presets object', () => {
    expect(presets).toEqual({ discount, newsletter, cartSaver })
  })

  describe('discount', () => {
    it('renders the coupon chip with the code and indigo CTA', () => {
      const modal = new ExitModal(discount({ code: 'SAVE15', discount: '15%' }))
      const overlay = modal.render()
      expect(overlay.querySelector('.oei-coupon').textContent).toBe('SAVE15')
      expect(overlay.querySelector('.oei-title').textContent).toContain('15%')
      expect(overlay.querySelector('.oei-cta').classList.contains('oei-cta--indigo')).toBe(true)
    })

    it('escapes user-provided code and text', () => {
      const modal = new ExitModal(discount({ code: '<img src=x>', text: '<b>x</b>' }))
      const overlay = modal.render()
      expect(overlay.querySelector('.oei-body img')).toBeNull()
      expect(overlay.querySelector('.oei-body b')).toBeNull()
    })

    it('copies the code to the clipboard on chip click', async () => {
      const writeText = vi.fn().mockResolvedValue()
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      })
      const modal = new ExitModal(discount({ code: 'COPYME' }))
      modal.open()
      document.querySelector('.oei-coupon').click()
      await Promise.resolve()
      expect(writeText).toHaveBeenCalledWith('COPYME')
    })

    it('allows overriding any modal option', () => {
      const opts = discount({ title: 'Custom', dismissLabel: null })
      expect(opts.title).toBe('Custom')
      expect(opts.dismissLabel).toBeNull()
    })
  })

  describe('newsletter', () => {
    it('keeps the modal open and shows an error for an invalid email', () => {
      const onSubmit = vi.fn()
      const modal = new ExitModal(newsletter({ onSubmit }))
      modal.open()
      const input = document.querySelector('.oei-input')
      input.value = 'not-an-email'
      document.querySelector('.oei-cta').click()
      expect(onSubmit).not.toHaveBeenCalled()
      expect(modal.isOpen).toBe(true)
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(document.querySelector('.oei-error').hidden).toBe(false)
    })

    it('clears the error state while typing', () => {
      const modal = new ExitModal(newsletter({ onSubmit: vi.fn() }))
      modal.open()
      const input = document.querySelector('.oei-input')
      input.value = 'nope'
      document.querySelector('.oei-cta').click()
      input.dispatchEvent(new Event('input', { bubbles: true }))
      expect(input.getAttribute('aria-invalid')).toBeNull()
      expect(document.querySelector('.oei-error').hidden).toBe(true)
    })

    it('submits a valid email and closes', () => {
      const onSubmit = vi.fn()
      const modal = new ExitModal(newsletter({ onSubmit }))
      modal.open()
      document.querySelector('.oei-input').value = 'a@b.co'
      document.querySelector('.oei-cta').click()
      expect(onSubmit).toHaveBeenCalledWith('a@b.co')
      expect(modal.isOpen).toBe(false)
    })

    it('submits on Enter', () => {
      const onSubmit = vi.fn()
      const modal = new ExitModal(newsletter({ onSubmit }))
      modal.open()
      const input = document.querySelector('.oei-input')
      input.value = 'a@b.co'
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(onSubmit).toHaveBeenCalledWith('a@b.co')
    })
  })

  describe('cartSaver', () => {
    it('renders the eyebrow badge and rose CTA', () => {
      const modal = new ExitModal(cartSaver({ href: '/cart' }))
      const overlay = modal.render()
      expect(overlay.querySelector('.oei-eyebrow')).not.toBeNull()
      const cta = overlay.querySelector('.oei-cta')
      expect(cta.classList.contains('oei-cta--rose')).toBe(true)
      expect(cta.getAttribute('href')).toBe('/cart')
      expect(overlay.querySelector('.oei-dismiss').textContent).toBe('Continue browsing')
    })

    it('hides the eyebrow when set to empty', () => {
      const overlay = new ExitModal(cartSaver({ eyebrow: '' })).render()
      expect(overlay.querySelector('.oei-eyebrow')).toBeNull()
    })
  })
})

describe('ExitModal themes + veto', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('applies the requested theme and falls back to slate', () => {
    const emerald = new ExitModal({ cta: { label: 'Go' }, theme: 'emerald' }).render()
    expect(emerald.querySelector('.oei-cta').classList.contains('oei-cta--emerald')).toBe(true)
    const bogus = new ExitModal({ cta: { label: 'Go' }, theme: 'neon' }).render()
    expect(bogus.querySelector('.oei-cta').classList.contains('oei-cta--slate')).toBe(true)
  })

  it('keeps the modal open when cta onClick returns false', () => {
    const modal = new ExitModal({ cta: { label: 'Go', onClick: () => false } })
    modal.open()
    document.querySelector('.oei-cta').click()
    expect(modal.isOpen).toBe(true)
  })

  it('calls onRender with the dialog element', () => {
    const onRender = vi.fn()
    const modal = new ExitModal({ title: 'Hi', onRender })
    const overlay = modal.render()
    expect(onRender).toHaveBeenCalledWith(overlay.querySelector('.oei-dialog'))
    modal.render() // second call reuses DOM
    expect(onRender).toHaveBeenCalledTimes(1)
  })
})
