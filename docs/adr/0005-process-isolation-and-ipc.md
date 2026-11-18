# 0005. Process isolation and typed IPC

- Status: Accepted
- Date: 2026-11-18

## Context

The main process will run external tools (arduino-cli, QEMU) and access the file
system and serial ports. The renderer displays user projects and, in the future,
community extensions. A compromised renderer must not gain access to the system.

## Decision

- Renderer windows run with `contextIsolation`, `sandbox` and without
  `nodeIntegration`. Production builds set a strict Content Security Policy.
- The preload script exposes a single `window.ideblock` object with `invoke` and
  `on`, restricted to an allow-list of channels.
- Channels and their argument and result types are declared once in
  `packages/shared/src/ipc.ts`. Handlers in the main process are typed against the
  same contract, and incoming data is validated with zod.
- Navigation away from the app is blocked; external links open in the system
  browser and only for `https:` and `mailto:` URLs.
- External GPL programs run as child processes and are never linked.

## Consequences

- Adding a channel requires updating the contract, which keeps the main process,
  preload and renderer in sync at compile time.
- Renderer code cannot use Node.js modules; all system access goes through the
  main process.
