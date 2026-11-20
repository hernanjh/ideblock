# IdeBlock

[Leer en español](README.es.md)

IdeBlock is a free and open source desktop IDE for programming Arduino-compatible
and ESP32 boards. It is designed for kids taking their first steps, and grows with
teenagers and adults who want to move on to real code.

> **Status:** Phase 3 (code to blocks). Phases 1 and 2 are done. See the [roadmap](#roadmap).

## What it can do today

- **Blocks and code side by side.** Show the blocks, the code, or both, and
  resize them. The code updates as you move blocks, and you can switch a project
  to hand-written C++ at any time. Hand-written code, or a sketch from a book,
  turns back into blocks; anything without a matching block stays as a grey
  code block, so nothing is lost.
- **Simulator.** Run the program on a simulated Arduino Uno, Nano, Mega, Leonardo, Micro or
  Raspberry Pi Pico with LEDs,
  RGB LEDs, buttons, switches, potentiometers, light, temperature, motion, tilt
  and ultrasonic sensors, servos, buzzers, an I2C LCD screen and NeoPixel rings.
  The blocks light up as they run, and the board's own LED blinks too. The
  simulator can open in its own window.
- **Circuit view.** See the board with every component and wire, move the
  components, rename them and change their pins. Or wire by hand: plug parts
  into a breadboard, lay the wires and add resistors. A circuit check explains
  missing wires, short circuits and LEDs without a resistor, which burn out in
  the simulation like real ones.
- **Program and circuit together.** A notice appears when the blocks use a part
  the circuit does not have, with a button to add it.
- **Real boards.** Verify, upload and use the serial monitor and graph with
  Arduino Uno, Nano, Mega and ESP32 compatible boards. Board tools are installed
  the first time they are needed.
- **Plain-language help.** Common compiler and upload errors are explained in
  simple English or Spanish, with a link to the line.
- **Projects.** Projects are saved automatically, open in the Arduino IDE, and
  plain `.ino` sketches can be opened. Fourteen examples go from a blinking LED to
  a motion alarm.

## Goals

- **Blocks or code.** Program with visual blocks or write C++ directly, and move
  between both.
- **Built-in simulator.** Try circuits and programs without hardware, running the
  real compiled firmware.
- **Real boards.** Compile, upload and open the serial monitor on physical boards.
- **Works offline.** Built for classrooms with poor or no connectivity.
- **English and Spanish** from day one, ready for more languages.
- **Private by design.** No accounts, no telemetry, no data collection.

## Supported boards

Boards compatible with Arduino Uno, Nano, Mega, Leonardo, Micro and Nano Every, ESP32
DevKit, ESP32-C3 and ESP32-S3, NodeMCU and Wemos D1 mini (ESP8266), and Raspberry Pi
Pico. The simulator runs Uno, Nano, Mega, Leonardo, Micro and Pico programs; on the
Pico, servos, tones and NeoPixels are not simulated yet.

## Roadmap

| Phase | Scope                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------- |
| 0     | Repository structure, CI, internationalization, documentation                                         |
| 1     | Blocks to code, code editor, compile and upload, serial monitor, AVR simulator, projects and examples |
| 2     | More components, full circuit editor                                                                  |
| 3     | Code to blocks conversion                                                                             |
| 4     | ESP32 simulation, on-demand board manager, signed installers, offline school installer                |

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
