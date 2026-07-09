# @oblique-code/exit-intent

> Modern, framework-agnostic **exit-intent detection** with an accessible,
> Tailwind-styled modal. Zero runtime dependencies. ~3&nbsp;kB gzipped.

Detect when a visitor is about to leave — mouse racing for the tab bar on
desktop, or inactivity / fast scroll-up / Back-button on mobile — and (optionally)
show a polished modal to win them back.

- 🎯 **Accurate detection** — desktop top-edge tracking + opt-in mobile heuristics
- ♿ **Accessible modal** — focus trap, ARIA, Esc/backdrop close, scroll lock, reduced-motion aware
- 🎨 **Tailwind-first, but optional** — utility classes when you have Tailwind, a drop-in CSS file when you don't
- 🧠 **Smart frequency caps** — `maxDisplays` + `cooldown` persisted to local/session storage
- 🧩 **Composable** — use the detector alone, the modal alone, or the one-line helper
- 📦 **ESM + CJS + types** — works everywhere; typed via JSDoc

## Install

```bash
npm install @oblique-code/exit-intent
```

## Quick start

```js
import { exitIntent } from '@oblique-code/exit-intent'
// Only needed if your app does NOT run Tailwind:
import '@oblique-code/exit-intent/styles.css'

exitIntent({
  cooldown: '7d',      // don't nag the same visitor for a week
  maxDisplays: 1,      // ...and at most once, ever
  modal: {
    title: 'Wait — before you go',
    text: 'Here is 10% off your first order.',
    cta: { label: 'Claim 10% off', href: '/offer' },
  },
  onExit: ({ reason }) => console.log('exit intent:', reason),
})
```

## Using with Tailwind

The modal elements already carry Tailwind utility classes, so if your app runs
Tailwind you **do not import the CSS file** — just make sure the package is scanned
so those classes aren't purged. In your `@import "tailwindcss"` entry (Tailwind v4):

```css
@import 'tailwindcss';
@source '../node_modules/@oblique-code/exit-intent/dist/index.js';
```

Without Tailwind, import the prebuilt fallback stylesheet instead:

```js
import '@oblique-code/exit-intent/styles.css'
```

## Ready-made modals (presets)

Three production-styled modals ship with the package. Each preset returns a plain
options object, so you can pass it straight in or override any field.

```js
import { exitIntent, presets } from '@oblique-code/exit-intent'

// 🎟️ Discount — coupon chip with click-to-copy
exitIntent({
  cooldown: '7d',
  modal: presets.discount({
    discount: '15%',
    code: 'SAVE15',
    onClaim: () => location.assign('/checkout'),
  }),
})

// 📬 Newsletter — email capture with inline validation
exitIntent({
  modal: presets.newsletter({
    onSubmit: (email) => api.subscribe(email), // only called with a valid email
  }),
})

// 🛒 Cart saver — abandonment nudge
exitIntent({
  modal: presets.cartSaver({ href: '/cart' }),
})

// Override anything:
exitIntent({
  modal: { ...presets.discount({ code: 'HELLO10' }), title: 'One sec!', theme: 'amber' },
})
```

## Themes

The primary CTA supports five accent themes — all WCAG-AA contrast checked in
light and dark mode, in both default and hover states:

```js
new ExitModal({ theme: 'indigo', cta: { label: 'Go' } })
// 'slate' (default) | 'indigo' | 'emerald' | 'rose' | 'amber'
```

## Recipes

### Detector only (bring your own UI)

```js
import { ExitIntentDetector } from '@oblique-code/exit-intent'

const detector = new ExitIntentDetector({ threshold: 20, cooldown: '1d' })
detector.on('exit', ({ reason, count }) => {
  myAnalytics.track('exit_intent', { reason, count })
})
```

### Modal only (open it yourself)

```js
import { ExitModal } from '@oblique-code/exit-intent'

const modal = new ExitModal({ title: 'Leaving already?', text: 'Save your cart?' })
document.querySelector('#save').addEventListener('click', () => modal.open())
```

### Enable mobile heuristics

```js
exitIntent({
  mobile: { inactivity: true, inactivityMs: 20000, scrollUp: true, backButton: false },
  modal: { title: 'Still there?', text: 'Your cart is waiting.' },
})
```

## API

### `exitIntent(config)` → handle

Wires a detector to a modal. `config` is all
[`ExitIntentDetector` options](#exitintentdetector-options) plus:

| Option   | Type                         | Description                                          |
| -------- | ---------------------------- | ---------------------------------------------------- |
| `modal`  | `ExitModalOptions \| false`  | Modal config, or `false` to skip the built-in modal. |
| `onExit` | `(detail) => void`           | Called on every fire, alongside opening the modal.   |

Returns `{ detector, modal, start(), stop(), open(), close(), reset(), destroy() }`.

### `ExitIntentDetector` options

| Option        | Type                          | Default        | Description                                              |
| ------------- | ----------------------------- | -------------- | -------------------------------------------------------- |
| `threshold`   | `number`                      | `20`           | Distance (px) from the top edge that counts as leaving.  |
| `delay`       | `number`                      | `0`            | Grace period (ms); cancelled if the pointer returns.     |
| `mobile`      | `boolean \| MobileOptions`    | `false`        | Enable touch-device heuristics.                          |
| `maxDisplays` | `number`                      | `Infinity`     | Max fires per persisted scope.                           |
| `cooldown`    | `number \| string`            | `0`            | Min time between fires: `'7d'`, `'24h'`, `'30m'`, or ms. |
| `scope`       | `'local' \| 'session'`        | `'local'`      | Persistence scope for frequency caps.                    |
| `storageKey`  | `string`                      | `'oei:default'`| Storage namespace (use distinct keys for distinct popups).|
| `autoStart`   | `boolean`                     | `true`         | Attach listeners on construction.                        |
| `onExit`      | `(detail) => void`            | —              | Shortcut for `.on('exit', …)`.                           |

**Methods:** `start()`, `stop()`, `destroy()`, `reset()`, `trigger(reason?)`,
`on(type, handler)`, `off(type, handler)`.

**`exit` detail:** `{ reason: 'desktop-top' | 'mobile-inactivity' | 'mobile-scroll' | 'mobile-back' | 'manual', count: number }`

### `ExitModal` options

| Option            | Type                | Default                    |
| ----------------- | ------------------- | -------------------------- |
| `title`           | `string`            | `'Wait — before you go'`   |
| `theme`           | `string`            | `'slate'` (see [Themes](#themes)) |
| `text`            | `string`            | — (escaped)                |
| `html`            | `string`            | — (trusted; takes priority)|
| `cta`             | `CtaConfig \| null` | —                          |
| `dismissLabel`    | `string \| null`    | `'No thanks'`              |
| `closeButton`     | `boolean`           | `true`                     |
| `closeOnBackdrop` | `boolean`           | `true`                     |
| `closeOnEsc`      | `boolean`           | `true`                     |
| `lockScroll`      | `boolean`           | `true`                     |
| `container`       | `HTMLElement`       | `document.body`            |
| `onRender`        | `(dialog) => void`  | — (bind events to custom `html` here) |
| `onOpen`/`onClose`| `function`          | —                          |

`CtaConfig`: `{ label, href?, target?, onClick? }`. With `href` it renders an
anchor; otherwise a button. `onClick` may return `false` to keep the modal open
(used by the newsletter preset for validation).

**Methods:** `open()`, `close(reason?)`, `render()`, `destroy()`.

> **Security:** `html` is inserted verbatim — only pass trusted markup. Use `text`
> for anything user-derived; it is escaped for you.

## Browser support

Modern evergreen browsers. Detection and the modal no-op safely during SSR (no
`window`). Storage failures (private mode, blocked cookies) fall back to in-memory.

## License

[MIT](./LICENSE) © oblique-code
