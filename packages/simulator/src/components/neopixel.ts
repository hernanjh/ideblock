import type { ComponentDefinition } from '../component';

// WS2812 bits are told apart by how long the line stays high: about 0.4 µs
// for a 0 and 0.8 µs for a 1. A low period over 50 µs latches the colours.
const ONE_THRESHOLD_US = 0.6;
const RESET_US = 50;
const DEFAULT_PIXELS = 8;

export const neopixelRing: ComponentDefinition = {
  type: 'neopixel-ring',
  pins: [{ name: 'din', kind: 'output', defaultPin: '6' }],
  create(instance, context) {
    const count = Number(instance.props?.['pixels'] ?? DEFAULT_PIXELS);
    const colours = new Array<string>(count).fill('0,0,0');
    const toUs = (cycles: number): number => (cycles / context.frequency) * 1_000_000;
    let bits: number[] = [];
    let riseCycles = -1;
    let fallCycles = -1;

    const latch = (): void => {
      for (let pixel = 0; pixel < count && (pixel + 1) * 24 <= bits.length; pixel++) {
        const byte = (offset: number): number =>
          bits
            .slice(pixel * 24 + offset, pixel * 24 + offset + 8)
            .reduce((value, bit) => (value << 1) | bit, 0);
        // WS2812 expects green first, then red and blue.
        colours[pixel] = `${byte(8)},${byte(0)},${byte(16)}`;
      }
      bits = [];
    };

    context.onPin(instance.pins['din'] ?? '6', (high, cycles) => {
      if (high) {
        if (fallCycles >= 0 && toUs(cycles - fallCycles) > RESET_US && bits.length > 0) latch();
        riseCycles = cycles;
      } else if (riseCycles >= 0) {
        bits.push(toUs(cycles - riseCycles) > ONE_THRESHOLD_US ? 1 : 0);
        fallCycles = cycles;
      }
    });

    return {
      snapshot() {
        if (
          bits.length >= 24 &&
          fallCycles >= 0 &&
          toUs(context.cycles() - fallCycles) > RESET_US
        ) {
          latch();
        }
        return { colours: colours.join(';') };
      },
    };
  },
};
