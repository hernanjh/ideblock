import type { ComponentDefinition } from '../component';

// Pulse widths used by the standard Servo library for 0 and 180 degrees.
const MIN_PULSE_US = 544;
const MAX_PULSE_US = 2400;

export const servo: ComponentDefinition = {
  type: 'servo',
  pins: [{ name: 'signal', kind: 'pwm', defaultPin: '9' }],
  create(instance, context) {
    const pin = instance.pins['signal'] ?? '9';
    let angle = 90;
    let riseCycles = -1;

    context.onPin(pin, (high, cycles) => {
      if (high) {
        riseCycles = cycles;
        return;
      }
      if (riseCycles < 0) return;
      const widthUs = ((cycles - riseCycles) / context.frequency) * 1_000_000;
      riseCycles = -1;
      // Pulses far outside the servo range are not servo signals.
      if (widthUs < 300 || widthUs > 3000) return;
      const ratio = (widthUs - MIN_PULSE_US) / (MAX_PULSE_US - MIN_PULSE_US);
      angle = Math.round(Math.min(180, Math.max(0, ratio * 180)));
    });

    return { snapshot: () => ({ angle }) };
  },
};
