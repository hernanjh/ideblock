# IdeBlock

[Leer en español](README.es.md)

IdeBlock is a free and open source desktop IDE for programming Arduino-compatible
and ESP32 boards. It is designed for kids taking their first steps, and grows with
teenagers and adults who want to move on to real code.

> **Status:** Phase 1 (first usable version). See the [roadmap](#roadmap).

## What it can do today

- **Blocks and code side by side.** Show the blocks, the code, or both, and
  resize them. The code updates as you move blocks, and you can switch a project
  to hand-written C++ at any time.
- **Simulator.** Run the program on a simulated Arduino Uno or Nano with LEDs,
  buttons, potentiometers, light sensors, servos, buzzers and ultrasonic
  sensors. The block that is running lights up. The simulator can open in its
  own window.
- **Circuit view.** See the board with every component and wire, move the
  components, rename them and change their pins. A warning appears when two
  components share a pin.
- **Real boards.** Verify, upload and use the serial monitor and graph with
  Arduino Uno, Nano, Mega and ESP32 compatible boards. Board tools are installed
  the first time they are needed.
- **Plain-language help.** Common compiler and upload errors are explained in
  simple English or Spanish, with a link to the line.
- **Projects.** Projects are saved automatically, open in the Arduino IDE, and
  plain `.ino` sketches can be opened. Nine examples go from a blinking LED to a
  parking sensor.

## Goals

- **Blocks or code.** Program with visual blocks or write C++ directly, and move
  between both.
- **Built-in simulator.** Try circuits and programs without hardware, running the
  real compiled firmware.
- **Real boards.** Compile, upload and open the serial monitor on physical boards.
- **Works offline.** Built for classrooms with poor or no connectivity.
- **English and Spanish** from day one, ready for more languages.
- **Private by design.** No accounts, no telemetry, no data collection.

## Supported boards (planned)

Arduino Uno, Nano and Mega compatible boards, and ESP32 DevKit. More boards such as
Raspberry Pi Pico and ESP32-C3 will follow.

## Roadmap

| Phase | Scope                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------- |
| 0     | Repository structure, CI, internationalization, documentation                                         |
| 1     | Blocks to code, code editor, compile and upload, serial monitor, AVR simulator, projects and examples |
| 2     | ESP32 simulation, more components, full circuit editor                                                |
| 3     | Code to blocks conversion                                                                             |
| 4     | On-demand board manager, signed installers, offline school installer, more boards                     |

## Development

Requirements: Node.js 22.12 or later and npm.

```bash
npm install
npm run fetch:toolchain
npm run dev
```

| Command                   | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| `npm run dev`             | Start the app with hot reload                              |
| `npm run lint`            | Run ESLint                                                 |
| `npm run format`          | Format the code with Prettier                              |
| `npm run typecheck`       | Type-check all workspaces                                  |
| `npm test`                | Run unit tests                                             |
| `npm run test:e2e`        | Build the app and run end-to-end tests                     |
| `npm run package`         | Build an installer for the current platform                |
| `npm run check:licenses`  | Verify that dependency licenses are GPL-3.0 compatible     |
| `npm run fetch:toolchain` | Download the pinned arduino-cli used to compile and upload |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project structure and guidelines.

## License

IdeBlock is licensed under the [GNU General Public License v3.0](LICENSE).

Arduino is a trademark of Arduino SA. IdeBlock is an independent project and is not
affiliated with or endorsed by Arduino SA. ESP32 is a trademark of Espressif Systems.
