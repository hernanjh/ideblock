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
packages/blocks/       Block definitions and the C++ sketch generator
packages/boards/       Board definitions
packages/compiler/     Compiler and upload messages explained in plain language
packages/project/      Project file format
packages/simulator/    AVR emulation and simulated components
examples/              Example projects bundled with the application
docs/adr/              Architecture decision records
docs/guides/           Guides for extending IdeBlock
scripts/               Build and maintenance scripts
```

Guides:

- [Adding a block](docs/guides/adding-a-block.md)
- [Adding a simulated component](docs/guides/adding-a-component.md)
- [Adding a board](docs/guides/adding-a-board.md)

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

### Tests that compile

Tests that compile real sketches are skipped by default because they need
arduino-cli and download the AVR core the first time. To run them:

```bash
npm run fetch:toolchain
IDEBLOCK_TOOLCHAIN_TESTS=1 IDEBLOCK_ARDUINO_DATA_DIR=/path/to/cache npm test
IDEBLOCK_TOOLCHAIN_TESTS=1 IDEBLOCK_ARDUINO_DATA_DIR=/path/to/cache npm run test:e2e
```

`IDEBLOCK_ARDUINO_DATA_DIR` keeps installed cores between runs.

### Examples

The `.ino` file of each example must match what its blocks generate; a test
checks it. After changing blocks or generators, update them with
`UPDATE_EXAMPLES=1 npx vitest run packages/blocks/test/examples.test.ts`.

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
