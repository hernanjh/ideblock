import type { ComponentDefinition } from '../component';

const SUPPLY_VOLTS = 5;
// A 10 kΩ NTC thermistor (beta 3950) in a divider with a 10 kΩ resistor, as on
// the common temperature modules; the block that reads it uses the same values.
const BETA = 3950;
const ROOM_KELVIN = 298.15;

/** Reading from 0 to 1023 that the module gives at a temperature in °C. */
export function ntcReading(celsius: number): number {
  const e = Math.exp(BETA * (1 / (celsius + 273.15) - 1 / ROOM_KELVIN));
  return (1023 * e) / (e + 1);
}

export const temperatureSensor: ComponentDefinition = {
  type: 'temperature-sensor',
  pins: [{ name: 'signal', kind: 'analog', defaultPin: 'A2' }],
  initialInput: { temperature: 24 },
  create(instance, context) {
    const pin = instance.pins['signal'] ?? 'A2';
    let temperature = 24;
    const apply = (): void =>
      context.setAnalogInput(pin, (ntcReading(temperature) / 1023) * SUPPLY_VOLTS);
    apply();
    return {
      snapshot: () => ({ temperature }),
      input(input) {
        if (typeof input['temperature'] !== 'number') return;
        temperature = Math.min(80, Math.max(-20, input['temperature']));
        apply();
      },
    };
  },
};
