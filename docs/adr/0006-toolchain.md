# 0006. Compiling, uploading and serial through arduino-cli

- Status: Accepted
- Date: 2026-11-18

## Context

The application must compile sketches, install board cores and libraries,
detect boards, upload firmware and show the serial monitor on Windows, Linux
and macOS, preferably without native Node.js modules that must be rebuilt for
every Electron version.

## Decision

- Bundle arduino-cli (GPL-3.0) as a separate executable. The version and the
  SHA-256 of each platform archive are pinned in
  `scripts/fetch-arduino-cli.mjs`, which runs before packaging.
- Run it with a configuration file that keeps cores, downloads and libraries in
  the application's data folder, so an installed Arduino IDE is never affected.
- Install the core of a board and the libraries a sketch needs the first time
  they are used, showing progress in the console.
- Run all arduino-cli operations one at a time, because it locks its data
  folder.
- Detect ports with `board list --watch` and implement the serial monitor with
  `arduino-cli monitor`, instead of the native `serialport` module.
- On Windows, look for USB-serial chips (CH340, CP210x, FTDI) whose driver is
  missing, using PowerShell's `Get-PnpDevice`, and link to the vendor drivers.

## Consequences

- No native modules: the same build works with any Electron version.
- The first use of a board needs internet. The offline school installer
  (Phase 4) will ship preinstalled cores.
- Integration tests that compile need the real tool and are enabled with
  `IDEBLOCK_TOOLCHAIN_TESTS=1`.
