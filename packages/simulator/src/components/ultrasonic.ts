import type { ComponentDefinition } from '../component';

// The HC-SR04 answers about 0.5 ms after the trigger pulse ends; the echo then
// stays high 58 microseconds per centimetre (sound goes there and back).
const RESPONSE_DELAY_US = 500;
const US_PER_CM = 58;
const MIN_TRIGGER_US = 8;
const MAX_RANGE_CM = 400;

export const ultrasonic: ComponentDefinition = {
  type: 'hc-sr04',
  pins: [
    { name: 'trig', kind: 'output', defaultPin: '9' },
    { name: 'echo', kind: 'digital', defaultPin: '10' },
  ],
  initialInput: { distance: 100 },
  create(instance, context) {
    const trig = instance.pins['trig'] ?? '9';
    const echo = instance.pins['echo'] ?? '10';
    const toCycles = (us: number) => (us * context.frequency) / 1_000_000;
    let distance = 100;
    let triggerStart = -1;

    context.setDigitalInput(echo, false);
    context.onPin(trig, (high, cycles) => {
      if (high) {
        triggerStart = cycles;
        return;
      }
      if (triggerStart < 0 || cycles - triggerStart < toCycles(MIN_TRIGGER_US)) return;
      triggerStart = -1;
      if (distance > MAX_RANGE_CM) return;
      context.schedule(() => {
        context.setDigitalInput(echo, true);
        context.schedule(
          () => context.setDigitalInput(echo, false),
          toCycles(distance * US_PER_CM),
        );
      }, toCycles(RESPONSE_DELAY_US));
    });

    return {
      snapshot: () => ({ distance }),
      input(input) {
        if (typeof input['distance'] === 'number') {
          distance = Math.min(MAX_RANGE_CM + 50, Math.max(2, input['distance']));
        }
      },
    };
  },
};
