import type { ComponentDefinition } from '../component';

/** Wired between the pin and GND, read with the internal pull-up: pressed is LOW. */
export const pushbutton: ComponentDefinition = {
  type: 'pushbutton',
  pins: [{ name: 'signal', kind: 'digital', defaultPin: '2' }],
  initialInput: { pressed: false },
  create(instance, context) {
    const pin = instance.pins['signal'] ?? '2';
    let pressed = false;
    context.setDigitalInput(pin, true);
    return {
      snapshot: () => ({ pressed }),
      input(input) {
        if (typeof input['pressed'] !== 'boolean') return;
        pressed = input['pressed'];
        context.setDigitalInput(pin, !pressed);
      },
    };
  },
};
