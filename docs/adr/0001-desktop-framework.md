# 0001. Electron as the desktop framework

- Status: Accepted
- Date: 2026-11-18

## Context

IdeBlock needs a desktop shell on Windows (priority), Linux and macOS that hosts
Blockly, Monaco and an in-app simulator based on avr8js and wokwi-elements, and
that manages external processes (arduino-cli, QEMU) and serial ports. Electron
and Tauri were evaluated.

Tauri produces much smaller installers and uses less memory, but renders with the
operating system's web view: WebView2 on Windows, WebKitGTK on Linux and WKWebView
on macOS. The simulator emulates a 16 MHz microcontroller in JavaScript, so
JavaScript engine performance and rendering consistency matter more than in a
typical app. WebKitGTK is noticeably slower and its behavior varies across Linux
distributions. Tauri's WebDriver support does not cover macOS, which limits
end-to-end testing. Offline Windows 10 machines without WebView2 would need the
fixed runtime bundled.

The installer size advantage is small in practice: arduino-cli and the AVR
toolchain add roughly 200 MB and the ESP32 toolchain more than 1 GB.

## Decision

Use Electron with TypeScript, React and electron-vite. Windows 10 is the minimum
supported Windows version.

## Consequences

- One rendering and JavaScript engine on every platform, predictable simulator
  performance and full Playwright support for end-to-end tests on all three
  platforms.
- A single language (TypeScript) across the codebase lowers the barrier for
  contributors.
- Higher memory use than Tauri. The simulator runs in a Web Worker and memory is
  measured on low-end hardware during Phase 1.
- Electron must be kept up to date for security fixes.
