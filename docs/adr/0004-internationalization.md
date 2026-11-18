# 0004. Internationalization

- Status: Accepted
- Date: 2026-11-18

## Context

The interface must be available in English and Spanish from the start, follow the
system language by default and let the community add languages (Portuguese is the
next candidate).

## Decision

- i18next with react-i18next. Translations live in `packages/i18n/locales/<lang>/`
  as JSON, one file per namespace.
- English is the reference and fallback language.
- The language preference is `system`, `en` or `es`. With `system`, the UI locale
  reported by Electron and the operating system's preferred languages are matched
  by primary subtag (`es-AR` resolves to `es`).
- Tests fail if any language is missing a key, has an empty value or changes the
  interpolation placeholders. ESLint rejects literal strings in JSX.
- Blockly messages and compiler error explanations will use the same files when
  those features are added.

## Consequences

- Adding a language is a translation task without code changes, apart from
  registering the language code.
- Translation keys are type checked in the renderer.
