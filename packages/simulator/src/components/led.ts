import type { ComponentDefinition } from '../component';

/**
 * Brightness is the share of time the pin was high since the last frame, so
 * PWM dims the LED the same way persistence of vision does.
 */
export const led: ComponentDefinition = {
  type: 'led',
  pins: [{ name: 'anode', kind: 'output', defaultPin: '13' }],
  create(instance, context) {
    const pin = instance.pins['anode'] ?? '13';
    let high = context.readPin(pin);
    let lastChange = context.cycles();
    let frameStart = lastChange;
    let highCycles = 0;

    context.onPin(pin, (value, cycles) => {
      if (high) highCycles += cycles - lastChange;
      high = value;
      lastChange = cycles;
    });

    return {
      snapshot() {
        const now = context.cycles();
        if (high) highCycles += now - lastChange;
        const elapsed = now - frameStart;
        const brightness = elapsed > 0 ? Math.min(1, highCycles / elapsed) : high ? 1 : 0;
        frameStart = now;
        lastChange = now;
        highCycles = 0;
        return { brightness: Math.round(brightness * 100) / 100 };
      },
    };
  },
};
