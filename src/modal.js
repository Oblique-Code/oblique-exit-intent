/**
 * @file Accessible, Tailwind-styled modal used as the default exit-intent UI.
 *
 * Every element carries BOTH Tailwind utility classes (so apps with Tailwind get
 * styling for free) and a semantic `oei-*` hook class (targeted by the shipped
 * fallback CSS, so it also looks right without Tailwind). Import the fallback via
 * `@oblique-code/exit-intent/styles.css` when your app has no Tailwind build.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

/**
 * Tailwind utility strings per element. Mirror these in `src/styles.css` so the
 * two rendering paths stay visually identical.
 */
const TW = {
  overlay:
    'oei-overlay fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-950/70 p-4 opacity-0 backdrop-blur-sm transition-opacity duration-200 ease-out',
  overlayOpen: 'oei-overlay--open opacity-100',
  dialog:
    'oei-dialog relative w-full max-w-md scale-95 rounded-2xl bg-white p-6 text-slate-900 shadow-2xl transition-transform duration-200 ease-out dark:bg-slate-900 dark:text-slate-100 sm:p-8',
  dialogOpen: 'oei-dialog--open scale-100',
  // p-0/border-0/bg-transparent are explicit resets: host pages commonly define
  // a generic `button { padding/border/background }` rule, and since a plain
  // type selector still wins any property this class doesn't itself declare,
  // omitting these let a 36px icon button collapse to 0 width under such a rule.
  close:
    'oei-close absolute right-3 top-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
  title: 'oei-title pr-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl',
  body: 'oei-body mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300',
  actions: 'oei-actions mt-6 flex flex-col gap-2 sm:flex-row-reverse',
  // Color-free CTA base; the accent colors come from THEMES below.
  cta: 'oei-cta inline-flex cursor-pointer items-center justify-center rounded-xl border-0 px-5 py-2.5 text-sm font-medium no-underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  dismiss:
    'oei-dismiss inline-flex cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
}

/**
 * Accent themes for the primary CTA. Static strings so Tailwind's scanner can
 * pick them up; each also carries an `oei-cta--*` hook for the fallback CSS.
 * All pairs meet WCAG AA contrast (≥ 4.5:1) in default and hover states.
 * @type {Record<'slate'|'indigo'|'emerald'|'rose'|'amber', string>}
 */
const THEMES = {
  slate:
    'oei-cta--slate bg-slate-900 text-white hover:bg-slate-700 focus-visible:ring-slate-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
  indigo:
    'oei-cta--indigo bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:hover:text-indigo-950',
  emerald:
    'oei-cta--emerald bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400',
  rose:
    'oei-cta--rose bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400 dark:hover:text-rose-950',
  amber:
    'oei-cta--amber bg-amber-400 text-amber-950 hover:bg-amber-300 focus-visible:ring-amber-500',
}

/**
 * @typedef {Object} CtaConfig
 * @property {string} label Button text.
 * @property {string} [href] If set, renders an anchor; otherwise a button.
 * @property {string} [target] Anchor target (e.g. `_blank`).
 * @property {() => (void|boolean)} [onClick] Click handler (also runs for anchors).
 *   Return `false` to keep the modal open (e.g. failed validation).
 */

/**
 * @typedef {Object} ExitModalOptions
 * @property {string} [title='Wait — before you go'] Heading text.
 * @property {string} [html] Trusted HTML for the body. Takes precedence over `text`.
 * @property {string} [text] Plain-text body (safely escaped).
 * @property {'slate'|'indigo'|'emerald'|'rose'|'amber'} [theme='slate'] CTA accent theme.
 * @property {CtaConfig|null} [cta] Primary call-to-action.
 * @property {string|null} [dismissLabel='No thanks'] Secondary dismiss button; null to hide.
 * @property {boolean} [closeButton=true] Show the top-right ✕ button.
 * @property {boolean} [closeOnBackdrop=true] Close when the backdrop is clicked.
 * @property {boolean} [closeOnEsc=true] Close on the Escape key.
 * @property {boolean} [lockScroll=true] Prevent background scroll while open.
 * @property {HTMLElement} [container=document.body] Where the modal is mounted.
 * @property {(dialog: HTMLElement) => void} [onRender] Called once after the DOM is
 *   built — bind events to custom `html` content here.
 * @property {(reason: 'cta'|'dismiss'|'backdrop'|'esc'|'close'|'programmatic') => void} [onClose]
 * @property {() => void} [onOpen]
 */

/** Escape a string for safe insertion as text content. */
function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
}

let uid = 0

/**
 * A self-contained, accessible modal dialog.
 *
 * @example
 * const modal = new ExitModal({ title: 'Leaving already?', text: 'Take 10% off.' })
 * modal.open()
 */
export class ExitModal {
  /** @param {ExitModalOptions} [options] */
  constructor(options = {}) {
    /** @type {ExitModalOptions} */
    this.options = {
      title: 'Wait — before you go',
      theme: 'slate',
      dismissLabel: 'No thanks',
      closeButton: true,
      closeOnBackdrop: true,
      closeOnEsc: true,
      lockScroll: true,
      ...options,
    }
    this.isOpen = false
    this._id = `oei-modal-${++uid}`
    this._overlay = null
    this._dialog = null
    this._lastActive = null
    this._prevOverflow = ''
    this._onKeydown = (e) => this._handleKeydown(e)
  }

  /** Build the DOM (once) and return the overlay element. @returns {HTMLElement} */
  render() {
    if (this._overlay) return this._overlay
    const o = this.options
    const doc = document

    const overlay = doc.createElement('div')
    overlay.className = TW.overlay
    overlay.setAttribute('role', 'presentation')

    const dialog = doc.createElement('div')
    dialog.className = TW.dialog
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.id = this._id

    // Title
    let titleEl = null
    if (o.title) {
      titleEl = doc.createElement('h2')
      titleEl.className = TW.title
      titleEl.id = `${this._id}-title`
      titleEl.textContent = o.title
      dialog.setAttribute('aria-labelledby', titleEl.id)
    }

    // Body
    let bodyEl = null
    if (o.html || o.text) {
      bodyEl = doc.createElement('div')
      bodyEl.className = TW.body
      bodyEl.id = `${this._id}-body`
      if (o.html) bodyEl.innerHTML = o.html
      else bodyEl.textContent = o.text
      dialog.setAttribute('aria-describedby', bodyEl.id)
    }

    // Close (✕) button
    let closeEl = null
    if (o.closeButton) {
      closeEl = doc.createElement('button')
      closeEl.type = 'button'
      closeEl.className = TW.close
      closeEl.setAttribute('aria-label', 'Close dialog')
      closeEl.innerHTML =
        '<svg class="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      closeEl.addEventListener('click', () => this.close('close'))
    }

    // Actions
    let actionsEl = null
    if (o.cta || o.dismissLabel) {
      actionsEl = doc.createElement('div')
      actionsEl.className = TW.actions
      if (o.cta) {
        const cta = o.cta.href ? doc.createElement('a') : doc.createElement('button')
        cta.className = `${TW.cta} ${THEMES[o.theme] || THEMES.slate}`
        cta.textContent = o.cta.label
        if (o.cta.href) {
          cta.href = o.cta.href
          if (o.cta.target) cta.target = o.cta.target
        } else {
          cta.type = 'button'
        }
        cta.addEventListener('click', (e) => {
          if (o.cta.onClick?.() === false) {
            // Handler vetoed (e.g. validation failed) — keep the modal open.
            if (o.cta.href) e.preventDefault()
            return
          }
          this.close('cta')
        })
        actionsEl.appendChild(cta)
      }
      if (o.dismissLabel) {
        const dismiss = doc.createElement('button')
        dismiss.type = 'button'
        dismiss.className = TW.dismiss
        dismiss.textContent = o.dismissLabel
        dismiss.addEventListener('click', () => this.close('dismiss'))
        actionsEl.appendChild(dismiss)
      }
    }

    ;[closeEl, titleEl, bodyEl, actionsEl].forEach((el) => el && dialog.appendChild(el))
    overlay.appendChild(dialog)

    if (o.closeOnBackdrop) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close('backdrop')
      })
    }

    this._overlay = overlay
    this._dialog = dialog
    o.onRender?.(dialog)
    return overlay
  }

  /** Mount + reveal the modal. @returns {this} */
  open() {
    if (this.isOpen) return this
    const overlay = this.render()
    const container = this.options.container || document.body
    this._lastActive = document.activeElement
    container.appendChild(overlay)

    if (this.options.lockScroll) {
      this._prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    document.addEventListener('keydown', this._onKeydown, true)

    // Next frame → trigger the transition, then move focus in.
    const reveal = () => {
      overlay.classList.add(...TW.overlayOpen.split(' '))
      this._dialog.classList.add(...TW.dialogOpen.split(' '))
      this._focusFirst()
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal)
    else reveal()

    this.isOpen = true
    this.options.onOpen?.()
    return this
  }

  /**
   * Hide + unmount the modal, restoring focus and scroll.
   * @param {'cta'|'dismiss'|'backdrop'|'esc'|'close'|'programmatic'} [reason='programmatic']
   * @returns {this}
   */
  close(reason = 'programmatic') {
    if (!this.isOpen) return this
    this.isOpen = false
    document.removeEventListener('keydown', this._onKeydown, true)

    const overlay = this._overlay
    overlay.classList.remove(...TW.overlayOpen.split(' '))
    this._dialog.classList.remove(...TW.dialogOpen.split(' '))

    if (this.options.lockScroll) document.body.style.overflow = this._prevOverflow

    const remove = () => overlay.parentNode && overlay.parentNode.removeChild(overlay)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) remove()
    else setTimeout(remove, 220)

    // Restore focus to the element that was focused before opening.
    if (this._lastActive && typeof this._lastActive.focus === 'function') {
      this._lastActive.focus()
    }
    this.options.onClose?.(reason)
    return this
  }

  /** Remove the modal from the DOM immediately and drop references. */
  destroy() {
    this.close('programmatic')
    this._overlay = null
    this._dialog = null
  }

  /* ---- internal ---- */

  _focusableEls() {
    return Array.from(this._dialog.querySelectorAll(FOCUSABLE)).filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false
      if (el.hidden) return false
      const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null
      return !style || (style.display !== 'none' && style.visibility !== 'hidden')
    })
  }

  _focusFirst() {
    const els = this._focusableEls()
    ;(els[0] || this._dialog).focus?.()
    if (!els.length) this._dialog.setAttribute('tabindex', '-1')
  }

  _handleKeydown(e) {
    if (e.key === 'Escape' && this.options.closeOnEsc) {
      e.preventDefault()
      this.close('esc')
      return
    }
    if (e.key !== 'Tab') return
    // Focus trap.
    const els = this._focusableEls()
    if (!els.length) {
      e.preventDefault()
      return
    }
    const first = els[0]
    const last = els[els.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

export { escapeHtml }
