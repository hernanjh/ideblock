import type { ComponentDefinition } from '../component';

const SUPPLY_VOLTS = 5;

/** A two-axis joystick module: each axis is a potentiometer and the stick is a button to GND. */
export const joystick: ComponentDefinition = {
  type: 'joystick',
  pins: [
    { name: 'horz', kind: 'analog', defaultPin: 'A0' },
    { name: 'vert', kind: 'analog', defaultPin: 'A1' },
    { name: 'sel', kind: 'digital', defaultPin: '2' },
  ],
  initialInput: { x: 0, y: 0, pressed: false },
  create(instance, context) {
    const horz = instance.pins['horz'] ?? 'A0';
    const vert = instance.pins['vert'] ?? 'A1';
    const sel = instance.pins['sel'] ?? '2';
    const state = { x: 0, y: 0, pressed: false };
    // -100 to 100 maps onto the full voltage range, so the centre reads about 512.
    const volts = (value: number): number => ((value + 100) / 200) * SUPPLY_VOLTS;
    const apply = (): void => {
      context.setAnalogInput(horz, volts(state.x));
      context.setAnalogInput(vert, volts(state.y));
      context.setDigitalInput(sel, !state.pressed);
    };
    apply();
    return {
      snapshot: () => ({ ...state }),
      input(input) {
        const clamp = (value: number) => Math.min(100, Math.max(-100, Math.round(value)));
        if (typeof input['x'] === 'number') state.x = clamp(input['x']);
        if (typeof input['y'] === 'number') state.y = clamp(input['y']);
        if (typeof input['pressed'] === 'boolean') state.pressed = input['pressed'];
        apply();
      },
    };
  },
};
