# Ideas and research notes

[Leer en español](ideas.es.md)

Working notes on features, references and risks. Items here are proposals, not
commitments; each one is reviewed at the end of a phase before it enters the roadmap.

Last reviewed: 2026-11-18 (end of Phase 1).

## Phase 1 review

Done in Phase 1 from the candidates below: plain-language compile and upload
errors, the "show all ports" fallback, driver guidance for CH340, CP210x and
FTDI on Windows, block highlighting while simulating, interactive simulator
inputs, beginner and advanced toolbox levels, a slow-simulation notice, an
example gallery, autosave and session recovery. The simulator can also open in
its own window.

New notes from building it:

- **Startup size.** Monaco makes the main bundle about 9 MB. Loading the code
  editor only when its panel is first shown would speed up startup on old
  computers.
- **Faster simulation start.** Starting the simulator compiles the sketch. The
  firmware could be cached by code and board, so restarting an unchanged program
  is instant.
- **Visual wiring.** Components are wired by choosing pins from a list. A
  breadboard view with wires (Phase 2) needs board artwork without trademarks.
- **Mega simulation.** avr8js can emulate the ATmega2560 with the extra ports
  and timers; it would be a small step after Phase 1.
- **Hardware test pass.** Uploading could not be tested on real boards during
  development. Before a release, test an original Uno, a CH340 Nano clone with
  the old bootloader and an ESP32 DevKit that needs the BOOT button.
- **macOS.** Unsigned macOS builds are blocked by Gatekeeper; notarization needs
  an Apple developer account.

## Landscape

| Product                          | Blocks                   | Simulator                         | Uploads to boards        | Offline        | Open source      |
| -------------------------------- | ------------------------ | --------------------------------- | ------------------------ | -------------- | ---------------- |
| mBlock 5                         | Yes (Scratch 3)          | No (sprite stage only)            | Yes                      | Desktop app    | No               |
| Tinkercad Circuits               | Yes                      | Yes (Uno, micro:bit)              | No                       | No             | No               |
| PictoBlox                        | Yes (plus junior blocks) | No                                | Yes                      | Desktop app    | No               |
| Wokwi                            | No                       | Yes (AVR, ESP32, RP2040, STM32)   | Through VS Code          | Paid           | Parts only (MIT) |
| STEAMakersBlocks (ArduinoBlocks) | Yes                      | No                                | Yes, via local connector | No             | No               |
| Velxio                           | No                       | Yes (AVR, RP2040, ESP32 via QEMU) | Yes                      | Docker image   | AGPL-3.0         |
| OpenHW Studio                    | Yes                      | Yes                               | Yes                      | No             | MIT              |
| OpenBlock                        | Yes (Scratch 3)          | No                                | Yes                      | Yes (Electron) | MIT / BSD        |
| SimulIDE                         | No                       | Yes (AVR, PIC)                    | No                       | Yes            | GPL / AGPL       |

**Gap IdeBlock fills:** no existing tool combines blocks, a breadboard simulator,
uploading to real boards, offline use and an open license. None offers ESP32
simulation with blocks for children.

## Feature ideas

Priority is high, medium or low. The phase is where it would fit best.

### Phase 1 candidates

- **Plain-language upload errors (high).** Port busy, wrong board, missing driver
  and timeout errors are the most frequent complaints in mBlock and PictoBlox forums.
  Explain them in simple English and Spanish, with a step-by-step CH340 and CP210x
  driver guide.
- **"Show all ports" fallback (high)** when automatic board detection fails, so the
  student can still pick a port.
- **No board needed by default (high).** New projects open ready to simulate, and the
  same project uploads to hardware unchanged. This is Tinkercad's strongest point,
  and Tinkercad cannot upload.
- **Block highlighting while simulating (high).** Highlight the block being executed.
  Very effective for ages 8 to 12 and cheap to do with avr8js.
- **Interactive simulator inputs (high).** Clickable buttons, sliders for distance,
  light and temperature sensors.
- **Toolbox levels (high).** Restricted block palettes per lesson or level to avoid
  overwhelming beginners.
- **Real-time indicator (medium).** Show the simulation speed against real time; slow
  simulation is a known Tinkercad complaint.
- **Example gallery filtered by board, difficulty and topic (high).** Content drives
  adoption.
- **Autosave with local version history (high).** Teachers frequently report lost
  work.

### Phase 2 candidates

- **Circuit validation (high).** Warn about an LED without a resistor, a short
  circuit or a pin used twice. Teaches electrical safety.
- **Program and circuit mismatch (high).** Warn when a block drives a part that is
  not in the circuit on that pin, for example NeoPixel blocks on a pin wired to a
  plain LED. Reported by the first user tests.
- **Self-checking challenges (high).** Expected pin and serial behavior plus circuit
  checks, packaged as a file the teacher distributes. Grading needs no server.
- **Kit profiles (high).** Block palettes and examples for common educational kits
  (generic sensor kits, Keyestudio-style kits). This is how ArduinoBlocks won
  Spanish schools.
- **Shareable block and component packs (high).** A documented package format
  (blocks, generator, library dependencies, simulated part) that teachers and
  vendors can distribute as a file.
- **Library manager (medium)** through arduino-cli, with block packs declaring their
  library dependencies.
- **Virtual instruments (medium):** logic analyzer, oscilloscope view of a pin and a
  simple multimeter.
- **Pinout overlay and wiring hints (medium)** in the circuit editor.
- **Teacher lock settings (medium):** preset board, hide the code view, restrict the
  toolbox. Classroom control without a server.
- **Wokwi `diagram.json` import and export (medium)** for access to a large body of
  existing examples.
- **Virtual network for ESP32 (medium):** simulated Wi-Fi and MQTT for IoT lessons,
  together with a simple local dashboard.
- **Curriculum-aligned lessons (medium).** For example, Spain's LOMLOE "Tecnología y
  Digitalización" and Argentina's NAP for programming and robotics.

### Later

- **Classroom packs (medium).** Assignment packs that the teacher exports and
  submission packs (zip) that the students return, with automatic checks. Optionally a
  dashboard on the local network, with no cloud.
- **Homework export to PDF (medium):** circuit, blocks and code in one document.
- **Live mode with Firmata (medium)** and an on-screen stage where board sensors drive
  a game, the main appeal of mBlock and PictoBlox.
- **Simulator debugger (medium):** breakpoints, stepping and variable watch.
- **Junior icon-only blocks (low)** for ages 6 to 8.
- **Local achievements (low)** for completed challenges. Nothing leaves the computer.
- **More languages (medium):** Portuguese, Catalan, Galician and Basque, through a
  community translation platform.
- **MicroPython target for ESP32 (low)**, as offered by BIPES and PictoBlox.
- **Analog circuit simulation (low)** with ngspice compiled to WebAssembly.
- **Web or PWA edition (low)** using Web Serial, for schools that use Chromebooks.

## Differentiation

1. Blocks, simulator and real hardware in one free, offline, open source package.
2. ESP32 simulation with blocks, aimed at children.
3. Privacy by design: no accounts, no cloud services, no telemetry. This contrasts
   with cloud-based features in competing tools and with Wokwi's free projects, which
   are public. It also fits school data protection rules (GDPR, Argentina's Law 25,326).
4. Spanish-first quality: interface, lessons and error explanations.
5. Live block highlighting, and later conversion in both directions.
6. Independent of any hardware vendor.
7. Self-checking challenges and classroom packs that work without a server.

## Reusable references

| Project                          | License              | Use                                                                                        |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| avr8js, rp2040js, wokwi-elements | MIT                  | Direct dependencies                                                                        |
| Ardublockly                      | Apache-2.0           | Block definitions and generators for reference or reuse                                    |
| Visualino                        | BSD-2-Clause         | Block ideas; the project is dormant                                                        |
| OpenBlock                        | MIT / BSD-3-Clause   | Electron and arduino-cli integration patterns                                              |
| BIPES                            | GPL-3.0              | Code can be reused; MicroPython ideas                                                      |
| OpenHW Studio                    | MIT                  | Circuit validation, grading and classroom features                                         |
| Velxio                           | AGPL-3.0             | Design reference for QEMU-based ESP32 simulation; copy no code without a separate decision |
| SimulIDE                         | GPL / AGPL (unclear) | Instrument and simulation reference only                                                   |

## Risks

- **ESP32 simulation (moved to Phase 4).** A feasibility spike in Phase 2 found:
  - Espressif's QEMU 9.2.2 boots arduino-esp32 3.3 images and runs Serial sketches,
    but drops GPIO writes, cannot inject inputs and hangs on `analogRead`.
  - The lcgamboa fork (`esp32-picsimlab` machine) emulates GPIO, LEDC, ADC, I2C and
    SPI. With a ~60-line patch (two flash fixes backported from Espressif, readable
    LEDC duty, ADC as an input line, qtest polling) a separate process could watch an
    LED, press a button, turn a potentiometer and read PWM through qtest.
  - The fork has a single maintainer and lags Espressif; no binaries are published.
  - Official macOS and Linux binaries depend on Homebrew or system libraries, so
    QEMU must be built per platform by the project either way.
  - A shim that overrides the weak `digitalWrite`/`digitalRead`/`analogRead` symbols
    works on the unmodified binary but misses LEDC, RMT and libraries that bypass the
    Arduino API.
  - Estimated effort: 4–5 weeks for the patched fork, 1–2 weeks for the shim.
  - **Decision:** postpone to Phase 4, together with the board manager and installers. The
    preferred route at that point is the patched fork, built per platform in CI. Notes and the patch are in
    [research/esp32-qemu](research/esp32-qemu/README.md).
- **QEMU licensing.** QEMU is GPL-2.0. It must run as a separate process and never be
  linked into the application, since GPL-2.0-only code cannot be combined with
  GPL-3.0. Its source must be offered alongside the binaries.
- **ESP32 ROM images** required by QEMU: check Espressif's redistribution terms before
  bundling them.
- **Toolchain size.** The ESP32 core exceeds 1 GB. Mitigated by on-demand downloads and
  an offline school installer (Phase 4).
- **Trademarks.**
  - Board artwork in wokwi-elements may include the Arduino and Espressif logos; check
    it and use unbranded artwork if needed.
  - Avoid names close to Arduino, Scratch, Wokwi, Tinkercad or ArduBlock.
  - Check that "IdeBlock" is free before the first public release.
- **Windows code signing.** Unsigned installers trigger SmartScreen warnings that put
  off schools. SignPath Foundation signs open source projects at no cost; apply early.
- **Memory on old school computers.** Measure Electron and simulator memory use on
  low-end hardware during Phase 1.
