import type { ComponentDefinition } from '../component';

// Silence is assumed when the pin has not toggled for this long.
const SILENCE_SECONDS = 0.05;

export const buzzer: ComponentDefinition = {
  type: 'buzzer',
  pins: [{ name: 'signal', kind: 'output', defaultPin: '8' }],
  create(instance, context) {
    const pin = instance.pins['signal'] ?? '8';
    let lastRise = -1;
    let period = 0;

    context.onPin(pin, (high, cycles) => {
      if (!high) return;
      if (lastRise >= 0) period = cycles - lastRise;
      lastRise = cycles;
    });

    return {
      snapshot() {
        const silent =
          lastRise < 0 || context.cycles() - lastRise > SILENCE_SECONDS * context.frequency;
        const frequency = silent || period === 0 ? 0 : Math.round(context.frequency / period);
        return { frequency };
      },
    };
  },
};
