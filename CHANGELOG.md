# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-11-24

### Security

- CTA `href` values using `javascript:`, `data:` or `vbscript:` schemes are now
  blocked; the CTA renders as a plain button and a console warning is logged.
- CTA links with `target: '_blank'` now get `rel="noopener noreferrer"` to
  prevent reverse tabnabbing.

### Fixed

- Re-opening the modal within 220 ms of closing it no longer unmounts it while open.
- `ExitModal#destroy()` now removes the overlay immediately, as documented.
- Closing or destroying the modal before its first animation frame no longer
  throws or moves focus into the closed dialog.
- With `mobile.backButton`, repeated `stop()`/`start()` cycles no longer push
  extra history entries.

### Changed

- Dev tooling upgraded: vitest 5, happy-dom 21, tsup 9, postcss-cli 12,
  TypeScript 6, Tailwind CSS 4.3.5, PostCSS 8.5.33. Resolves all `npm audit`
  advisories (dev-only; the package has no runtime dependencies).
- Developing and building the package now requires Node.js ≥ 22.18. Consumers
  are unaffected.
- Added `repository`, `homepage` and `bugs` fields so npm links to the GitHub repo.

## [1.0.1] - 2026-07-09

### Documentation

- Added a no-build "Plug & play" CDN section and a React / Next.js usage example.
- Updated the bundle-size figures.

## [1.0.0] - 2026-07-09

- Initial release.

[1.0.2]: https://www.npmjs.com/package/@oblique-code/exit-intent/v/1.0.2
[1.0.1]: https://www.npmjs.com/package/@oblique-code/exit-intent/v/1.0.1
[1.0.0]: https://www.npmjs.com/package/@oblique-code/exit-intent/v/1.0.0
