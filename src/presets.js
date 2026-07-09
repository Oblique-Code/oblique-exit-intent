/**
 * @file Ready-made, production-styled modal configurations.
 *
 * Each preset returns a plain {@link ExitModalOptions} object, so you can use it
 * directly or spread-and-override any field:
 *
 * ```js
 * exitIntent({ modal: presets.discount({ code: 'SAVE15', discount: '15%' }) })
 * new ExitModal({ ...presets.newsletter({ onSubmit }), title: 'Custom title' })
 * ```
 *
 * Like the modal itself, every element carries Tailwind utilities plus an
 * `oei-*` hook class covered by the fallback stylesheet.
 */

import { escapeHtml } from './modal.js'

/** @typedef {import('./modal.js').ExitModalOptions} ExitModalOptions */

/** Static Tailwind strings for preset-only elements (mirrored in styles.css). */
const P = {
  eyebrow:
    'oei-eyebrow mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  coupon:
    'oei-coupon mt-4 flex select-all items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-mono text-lg font-semibold tracking-[0.2em] text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white',
  couponHint: 'oei-coupon-hint mt-2 text-center text-xs text-slate-500 dark:text-slate-400',
  field: 'oei-field mt-4',
  input:
    'oei-input w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400',
  inputError: 'oei-input--error border-rose-500 focus:ring-rose-500 focus:border-rose-500',
  errorMsg: 'oei-error mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400',
}

let pid = 0

/**
 * @typedef {Object} DiscountPresetOptions
 * @property {string} [discount='10%'] Discount amount shown in the copy.
 * @property {string} [code='SAVE10'] Coupon code displayed in the dashed chip.
 * @property {string} [title] Heading override.
 * @property {string} [text] Lead sentence override.
 * @property {string} [ctaLabel] CTA label override.
 * @property {string} [href] Where the CTA navigates (optional).
 * @property {() => (void|boolean)} [onClaim] CTA click handler.
 * @property {ExitModalOptions['theme']} [theme='indigo']
 */

/**
 * Discount / coupon-code modal with a click-to-copy code chip.
 * @param {DiscountPresetOptions} [opts]
 * @returns {ExitModalOptions}
 */
export function discount(opts = {}) {
  const {
    discount: amount = '10%',
    code = 'SAVE10',
    title = `Wait — take ${amount} off`,
    text = 'Use this code at checkout before you go. It only takes a second.',
    ctaLabel = `Claim ${amount} off`,
    href,
    onClaim,
    theme = 'indigo',
    ...rest
  } = opts
  const id = `oei-coupon-${++pid}`

  return {
    title,
    theme,
    html: [
      `<p>${escapeHtml(text)}</p>`,
      `<button type="button" id="${id}" class="${P.coupon} w-full cursor-pointer" aria-label="Copy code ${escapeHtml(code)}">${escapeHtml(code)}</button>`,
      `<p class="${P.couponHint}" id="${id}-hint" aria-live="polite">Click the code to copy it</p>`,
    ].join(''),
    cta: { label: ctaLabel, href, onClick: onClaim },
    onRender(dialog) {
      const chip = dialog.querySelector(`#${id}`)
      const hint = dialog.querySelector(`#${id}-hint`)
      chip?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code)
          if (hint) hint.textContent = 'Copied to clipboard ✓'
        } catch {
          if (hint) hint.textContent = 'Select and copy the code above'
        }
      })
    },
    ...rest,
  }
}

/**
 * @typedef {Object} NewsletterPresetOptions
 * @property {(email: string) => void} onSubmit Called with a valid email.
 * @property {string} [title] Heading override.
 * @property {string} [text] Lead sentence override.
 * @property {string} [placeholder='you@example.com']
 * @property {string} [ctaLabel='Subscribe']
 * @property {ExitModalOptions['theme']} [theme='emerald']
 */

/**
 * Email-capture modal with inline validation (invalid email keeps it open).
 * @param {NewsletterPresetOptions} opts
 * @returns {ExitModalOptions}
 */
export function newsletter(opts = {}) {
  const {
    onSubmit,
    title = 'Before you go…',
    text = 'Get our best tips in your inbox. No spam, unsubscribe anytime.',
    placeholder = 'you@example.com',
    ctaLabel = 'Subscribe',
    theme = 'emerald',
    ...rest
  } = opts
  const id = `oei-email-${++pid}`

  const submit = () => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById(id))
    const error = document.getElementById(`${id}-error`)
    const email = input?.value.trim() ?? ''
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!valid) {
      input?.classList.add(...P.inputError.split(' '))
      input?.setAttribute('aria-invalid', 'true')
      if (error) error.hidden = false
      input?.focus()
      return false // veto close
    }
    onSubmit?.(email)
    return true
  }

  return {
    title,
    theme,
    html: [
      `<p>${escapeHtml(text)}</p>`,
      `<div class="${P.field}">`,
      `<label for="${id}" class="sr-only">Email address</label>`,
      `<input id="${id}" class="${P.input}" type="email" name="email" autocomplete="email" inputmode="email" placeholder="${escapeHtml(placeholder)}" aria-describedby="${id}-error" />`,
      `<p id="${id}-error" class="${P.errorMsg}" role="alert" hidden>Please enter a valid email address.</p>`,
      `</div>`,
    ].join(''),
    cta: { label: ctaLabel, onClick: submit },
    onRender(dialog) {
      const input = dialog.querySelector(`#${id}`)
      // Enter submits; typing clears the error state.
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          dialog.querySelector('.oei-cta')?.click()
        }
      })
      input?.addEventListener('input', () => {
        input.classList.remove(...P.inputError.split(' '))
        input.removeAttribute('aria-invalid')
        const error = dialog.querySelector(`#${id}-error`)
        if (error) error.hidden = true
      })
    },
    ...rest,
  }
}

/**
 * @typedef {Object} CartSaverPresetOptions
 * @property {string} [title] Heading override.
 * @property {string} [text] Lead sentence override.
 * @property {string} [ctaLabel='Return to cart']
 * @property {string} [href] Cart URL for the CTA.
 * @property {() => (void|boolean)} [onResume] CTA click handler.
 * @property {string} [eyebrow='Your cart is waiting'] Small badge above the title; '' hides it.
 * @property {ExitModalOptions['theme']} [theme='rose']
 */

/**
 * Cart-abandonment modal nudging the visitor back to checkout.
 * @param {CartSaverPresetOptions} [opts]
 * @returns {ExitModalOptions}
 */
export function cartSaver(opts = {}) {
  const {
    title = 'Leaving your cart behind?',
    text = 'Your items are saved for now, but they’re not reserved — popular items sell out fast.',
    ctaLabel = 'Return to cart',
    href,
    onResume,
    eyebrow = 'Your cart is waiting',
    theme = 'rose',
    ...rest
  } = opts

  return {
    title,
    theme,
    html: [
      eyebrow ? `<span class="${P.eyebrow}">🛒 ${escapeHtml(eyebrow)}</span>` : '',
      `<p>${escapeHtml(text)}</p>`,
    ].join(''),
    cta: { label: ctaLabel, href, onClick: onResume },
    dismissLabel: 'Continue browsing',
    ...rest,
  }
}

/** All presets, keyed by name. */
export const presets = { discount, newsletter, cartSaver }
