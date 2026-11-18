import type { ComponentDefinition } from '../component';
import { dutyCycle } from './duty';

export const led: ComponentDefinition = {
  type: 'led',
  pins: [{ name: 'anode', kind: 'output', defaultPin: '13' }],
  create(instance, context) {
    const brightness = dutyCycle(context, instance.pins['anode'] ?? '13');
    return { snapshot: () => ({ brightness: brightness() }) };
  },
};

/** Common-cathode RGB LED: each colour is dimmed with its own PWM pin. */
export const rgbLed: ComponentDefinition = {
  type: 'rgb-led',
  pins: [
    { name: 'red', kind: 'pwm', defaultPin: '9' },
    { name: 'green', kind: 'pwm', defaultPin: '10' },
    { name: 'blue', kind: 'pwm', defaultPin: '11' },
  ],
  create(instance, context) {
    const red = dutyCycle(context, instance.pins['red'] ?? '9');
    const green = dutyCycle(context, instance.pins['green'] ?? '10');
    const blue = dutyCycle(context, instance.pins['blue'] ?? '11');
    return { snapshot: () => ({ red: red(), green: green(), blue: blue() }) };
  },
};
