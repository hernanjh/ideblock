import type { ComponentDefinition } from '../component';

const SUPPLY_VOLTS = 5;

/** Components that produce a voltage, controlled by the user with a slider. */
function analogInput(type: string, initial: number): ComponentDefinition {
  return {
    type,
    pins: [{ name: 'signal', kind: 'analog', defaultPin: 'A0' }],
    initialInput: { value: initial },
    create(instance, context) {
      const pin = instance.pins['signal'] ?? 'A0';
      let value = initial;
      const apply = (): void => context.setAnalogInput(pin, (value / 1023) * SUPPLY_VOLTS);
      apply();
      return {
        snapshot: () => ({ value }),
        input(input) {
          if (typeof input['value'] !== 'number') return;
          value = Math.min(1023, Math.max(0, Math.round(input['value'])));
          apply();
        },
      };
    },
  };
}

export const potentiometer = analogInput('potentiometer', 512);
export const photoresistor = analogInput('photoresistor', 700);
