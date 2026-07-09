/**
 * @file Public entry point for `@oblique-code/exit-intent`.
 */

import { ExitIntentDetector } from './detector.js'
import { ExitModal } from './modal.js'

export { ExitIntentDetector } from './detector.js'
export { ExitModal } from './modal.js'
export { ExitStore, parseDuration } from './persistence.js'
export { presets, discount, newsletter, cartSaver } from './presets.js'

/**
 * @typedef {import('./detector.js').ExitIntentOptions} ExitIntentOptions
 * @typedef {import('./modal.js').ExitModalOptions} ExitModalOptions
 */

/**
 * @typedef {ExitIntentOptions & {
 *   modal?: ExitModalOptions | false,
 *   onExit?: (detail: import('./detector.js').ExitDetail) => void
 * }} ExitIntentConfig
 */

/**
 * @typedef {Object} ExitIntentHandle
 * @property {ExitIntentDetector} detector The underlying detector.
 * @property {ExitModal|null} modal The modal instance (null when `modal: false`).
 * @property {() => ExitIntentHandle} start Re-arm the detector.
 * @property {() => ExitIntentHandle} stop Detach listeners.
 * @property {() => void} open Show the modal now (bypasses detection).
 * @property {() => void} close Hide the modal.
 * @property {() => void} reset Clear persisted frequency-cap state.
 * @property {() => void} destroy Tear everything down.
 */

/**
 * One-call setup: wires a detector to a Tailwind modal with sensible defaults.
 *
 * @param {ExitIntentConfig} [config]
 * @returns {ExitIntentHandle}
 *
 * @example
 * import { exitIntent } from '@oblique-code/exit-intent'
 * import '@oblique-code/exit-intent/styles.css'
 *
 * exitIntent({
 *   cooldown: '7d',
 *   maxDisplays: 1,
 *   modal: {
 *     title: 'Wait — before you go',
 *     text: 'Here is 10% off your first order.',
 *     cta: { label: 'Claim 10% off', href: '/offer' },
 *   },
 * })
 */
export function exitIntent(config = {}) {
  const { modal: modalConfig, onExit, ...detectorOptions } = config

  const modal = modalConfig === false ? null : new ExitModal(modalConfig || {})

  const detector = new ExitIntentDetector({
    ...detectorOptions,
    onExit: (detail) => {
      if (modal) modal.open()
      onExit?.(detail)
    },
  })

  /** @type {ExitIntentHandle} */
  const handle = {
    detector,
    modal,
    start() {
      detector.start()
      return handle
    },
    stop() {
      detector.stop()
      return handle
    },
    open() {
      modal?.open()
    },
    close() {
      modal?.close()
    },
    reset() {
      detector.reset()
    },
    destroy() {
      detector.destroy()
      modal?.destroy()
    },
  }
  return handle
}

export default exitIntent
