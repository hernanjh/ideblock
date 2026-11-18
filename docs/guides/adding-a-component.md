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
control (`press`, `slider`, `distance` or `none`) and the element properties for
each frame.

## 3. Add the texts

Add the component name under `components` and any new pin names under
`componentPins` in `packages/i18n/locales/*/common.json`.

## 4. Test it

Add a case to `packages/simulator/test/simulation.test.ts`. Tests run real
firmware: compile a small sketch for the Arduino Uno and save its `.hex` in
`packages/simulator/test/fixtures/`, as described in the README there.
