# 0002. Monorepo with npm workspaces

- Status: Accepted
- Date: 2026-11-18

## Context

Blocks, code generators, board definitions, simulated components and the project
format must be testable without Electron and extensible by the community without
touching the application core.

## Decision

Use a single repository with npm workspaces: `apps/desktop` for the Electron app and
`packages/*` for independent modules. Packages export TypeScript sources directly
and are bundled by electron-vite, so there is no separate build step per package.
The application bundles all JavaScript dependencies; the `dependencies` field of
`apps/desktop` is reserved for native modules that must ship unbundled.

Packages are created when a feature needs them, not ahead of time.

## Consequences

- Pure logic (generators, component models, project format) is unit tested in
  Node without starting Electron.
- npm is the only required tool; no extra package manager.
- Dependency versions are pinned exactly (`save-exact`) and locked in
  `package-lock.json`.
