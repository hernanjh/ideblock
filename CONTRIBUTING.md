# Contributing to IdeBlock

[Leer en español](CONTRIBUTING.es.md)

Thank you for helping make IdeBlock better. Contributions of every kind are welcome:
code, translations, examples, lesson material, bug reports and ideas.

## Ground rules

- Be respectful. IdeBlock is used by children and teachers; keep issues, code and
  content appropriate for that audience.
- No telemetry, analytics or network calls that send user data. Any feature that
  needs the network must work offline or degrade gracefully.
- Every dependency must use a license compatible with GPL-3.0 (MIT, BSD, Apache-2.0,
  ISC, MPL-2.0, LGPL, GPL). Run `npm run check:licenses` after adding one, and
  mention the license in the pull request.
- External GPL programs (arduino-cli, QEMU) run as separate processes; they are never
  linked into the application.
- Do not use "Arduino" or other trademarks in product names, logos or identifiers.
  Saying "compatible with Arduino" in descriptions is fine.

## Project structure

```
apps/desktop/          Electron application
  src/main/            Main process: windows, settings, external tools
  src/preload/         Secure bridge between the main process and the UI
  src/renderer/        User interface (React)
  e2e/                 End-to-end tests (Playwright)
packages/shared/       IPC contracts, shared types and schemas
packages/i18n/         Translation files and language helpers
docs/adr/              Architecture decision records
scripts/               Build and maintenance scripts
```

More packages (blocks, boards, simulator, components, projects) are added as each
feature lands. Guides for adding a block, a simulated component and a board will be
published in `docs/guides/` together with those extension points.

## Getting started

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

On Linux without a display, run end-to-end tests with `xvfb-run -a npm run test:e2e`.

## Code style

- TypeScript in strict mode. Prettier and ESLint are the source of truth for style.
- Source code, identifiers and comments are written in English.
- Comments explain _why_ when it is not obvious; avoid comments that restate the code.
- Communication between the UI and the main process goes through the typed contract
  in `packages/shared/src/ipc.ts`. Never expose Node.js or Electron APIs directly to
  the renderer.

## Translations

- No user-visible text is hardcoded. Add strings to `packages/i18n/locales/<lang>/`.
- Every key must exist in every language; the test suite enforces this.
- To add a language, copy the `en` folder, translate the values, register the
  language in `packages/i18n/src/index.ts` and add its name under `language` in all
  locale files.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) in English:
  `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.
- Keep commits small and focused on one change.
- Add or update tests for behavior changes.
- Significant architecture decisions are recorded in `docs/adr/` in both languages.

## Reporting bugs

Open an issue with the steps to reproduce, the expected and actual behavior, the
operating system, the IdeBlock version and, when relevant, the board model.

## License

By contributing, you agree that your contributions are licensed under the GNU General
Public License v3.0.
