import type { ComponentDefinition } from '../component';

/**
 * Modules that put the supply or ground on their output pin: a slide switch
 * with its middle leg on the pin, or a tilt switch module.
 */
function onOffInput(type: string, defaultPin: string): ComponentDefinition {
  return {
    type,
    pins: [{ name: 'signal', kind: 'digital', defaultPin }],
    initialInput: { on: false },
    create(instance, context) {
      const pin = instance.pins['signal'] ?? defaultPin;
      let on = false;
      context.setDigitalInput(pin, false);
      return {
        snapshot: () => ({ on }),
        input(input) {
          if (typeof input['on'] !== 'boolean') return;
          on = input['on'];
          context.setDigitalInput(pin, on);
        },
      };
    },
  };
}

export const slideSwitch = onOffInput('slide-switch', '4');
export const tiltSwitch = onOffInput('tilt-switch', '5');

/** Like common PIR modules, the output stays high for a while after the motion stops. */
const PIR_HOLD_SECONDS = 2;

export const pirSensor: ComponentDefinition = {
  type: 'pir-sensor',
  pins: [{ name: 'signal', kind: 'digital', defaultPin: '7' }],
  initialInput: { motion: false },
  create(instance, context) {
    const pin = instance.pins['signal'] ?? '7';
    let moving = false;
    let output = false;
    // Each new motion restarts the hold time, so older timers must not end it.
    let generation = 0;
    const set = (high: boolean): void => {
      output = high;
      context.setDigitalInput(pin, high);
    };
    set(false);
    return {
      snapshot: () => ({ motion: output }),
      input(input) {
        if (typeof input['motion'] !== 'boolean') return;
        moving = input['motion'];
        generation++;
        if (moving) {
          set(true);
          return;
        }
        const current = generation;
        context.schedule(() => {
          if (current === generation && !moving) set(false);
        }, PIR_HOLD_SECONDS * context.frequency);
      },
    };
  },
};
