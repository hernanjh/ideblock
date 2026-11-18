# Adding a simulated component

[Leer en español](adding-a-component.es.md)

A simulated component has two parts:

- **Behaviour** in `packages/simulator/src/components/`: which board pins it
  uses and how it reacts to the running firmware. It runs inside the simulation
  worker and has no access to the interface.
- **Appearance** in `apps/desktop/src/renderer/src/simulator/catalog.ts`: the
  [wokwi-elements](https://github.com/wokwi/wokwi-elements) drawing and the
  control the user interacts with.

## 1. Model the behaviour

```ts
import type { ComponentDefinition } from '../component';

export const vibrationMotor: ComponentDefinition = {
  type: 'vibration-motor',
  pins: [{ name: 'signal', kind: 'output', defaultPin: '6' }],
  create(instance, context) {
    const pin = instance.pins['signal'] ?? '6';
    let running = context.readPin(pin);
    context.onPin(pin, (high) => {
      running = high;
    });
    return { snapshot: () => ({ running }) };
  },
};
```

The `context` gives access to the simulated board:

| Member                       | Purpose                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `onPin(pin, listener)`       | Called with the new level and the CPU cycle when the program changes a pin |
| `readPin(pin)`               | Current level of a pin                                                     |
| `setDigitalInput(pin, high)` | Drives an input pin, as a button or sensor would                           |
| `setAnalogInput(pin, volts)` | Sets the voltage read by `analogRead()`                                    |
| `schedule(callback, cycles)` | Runs code after some CPU cycles, for timed signals                         |
| `cycles()`, `frequency`      | Simulated time, to measure pulses                                          |

`snapshot()` runs once per frame and returns what the interface draws.
Components the user controls implement `input()` and declare `initialInput`.

Register the definition in `COMPONENTS` in
`packages/simulator/src/components/index.ts`.

## 2. Describe the appearance

In `catalog.ts`, map the component type to a wokwi-elements tag, the kind of
control and the element properties for each frame. Controls shown on the
component card are:

| Control       | Use                                             |
| ------------- | ----------------------------------------------- |
| `press`       | Held down like a push button (`pressed`)        |
| `motion`      | Held down to trigger a motion sensor (`motion`) |
| `toggle`      | On and off, like a switch (`on`)                |
| `slider`      | A value from 0 to 1023 (`value`)                |
| `distance`    | A distance in centimetres (`distance`)          |
| `temperature` | A temperature in °C (`temperature`)             |
| `none`        | Outputs only                                    |

In `apps/desktop/src/renderer/src/circuit/geometry.ts`, add the shape used by the
circuit drawing and by hand wiring:

- `width`, `height` and `pins`: taken from the element's `pinInfo`, in pixels.
- `signals`: which element pin each simulated pin uses; `ground` and `supply`:
  the legs that go to GND and to 5V or 3V3.
- `resistors`: the part needs a series resistor (LEDs).
- `bridges`: legs joined inside the part; `swappable`: signal and ground work
  either way round.
- `rotation`: a quarter turn, so the legs fit a breadboard.

Legs 0.1 inch apart (9.6 px) drop into breadboard holes. Draw a palette icon in
`ComponentIcon.tsx`.

## 3. Add the blocks and texts

If blocks drive the part, add them in `packages/blocks/src/definitions/` and map
them to the part in `packages/blocks/src/parts.ts`, so the simulator can warn
when the program uses a part the circuit does not have.

Add the component name under `components`, its description under
`componentInfo`, new pin names under `componentPins` and new leg names under
`legs` in `packages/i18n/locales/*/common.json`.

## 4. Test it

Add a case to `packages/simulator/test/simulation.test.ts`. Tests run real
firmware: compile a small sketch for the Arduino Uno and save its `.hex` in
`packages/simulator/test/fixtures/`, as described in the README there.
