# Adding a board

[Leer en español](adding-a-board.es.md)

Boards are described in `packages/boards/src/definitions.ts`. A definition tells
the rest of the application how to compile for the board, which pins it has and
whether it can be simulated.

```ts
export const leonardo: BoardDefinition = {
  id: 'leonardo',
  name: 'Arduino Leonardo',
  fqbn: 'arduino:avr:leonardo',
  architecture: 'avr',
  family: 'arduino',
  core: { id: 'arduino:avr' },
  servo: { header: 'Servo.h', library: 'Servo' },
  drawing: 'uno',
  pinLabelPrefix: 'D',
  digitalPins: [...range(0, 13), 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  analogInputPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  pwmPins: ['3', '5', '6', '9', '10', '11', '13'],
  builtinLedPin: '13',
  usbIds: [{ vid: '2341', pid: '8036' }],
};
```

| Field                                       | Meaning                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `fqbn`                                      | Fully qualified board name used by arduino-cli                                                                |
| `core`                                      | arduino-cli platform to install the first time the board is used; `indexUrl` adds a third-party package index |
| `digitalPins`, `analogInputPins`, `pwmPins` | Pins offered in block dropdowns and the simulator, written as in code                                         |
| `builtinLedPin`                             | Default pin for LED blocks                                                                                    |
| `usbIds`                                    | Lets a plugged-in board be recognized                                                                         |
| `simulation`                                | Only for boards the simulator supports (currently the ATmega328P)                                             |

Then:

1. Add the definition to `BOARDS` in the same file.
2. If some blocks need different code on the new architecture, use
   `generator.board.architecture` in their generators.
3. Run `npm test`: the board tests check that every PWM, analog and LED pin
   exists on the board.
