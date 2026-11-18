import type { ComponentDefinition } from '../component';

// The decimal point is left unwired: the display block never uses it.
const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

/** A one-digit common-cathode display: a segment lights while its pin is HIGH. */
export const sevenSegment: ComponentDefinition = {
  type: 'seven-segment',
  pins: SEGMENTS.map((name, index) => ({
    name,
    kind: 'output' as const,
    defaultPin: String(2 + index),
  })),
  create(instance, context) {
    const lit = SEGMENTS.map((name, index) => {
      const pin = instance.pins[name] ?? String(2 + index);
      return { pin, on: context.readPin(pin) };
    });
    for (const segment of lit) {
      context.onPin(segment.pin, (high) => {
        segment.on = high;
      });
    }
    return {
      // "1" or "0" per segment from a to g, then the unlit decimal point.
      snapshot: () => ({
        segments: `${lit.map((segment) => (segment.on ? '1' : '0')).join('')}0`,
      }),
    };
  },
};
