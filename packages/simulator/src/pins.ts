export type PortName = 'B' | 'C' | 'D';

export interface PinLocation {
  port: PortName;
  bit: number;
  /** ADC channel for analog inputs. */
  adc?: number;
}

/** Pin names used in sketches mapped to ATmega328P ports, as on the Uno and Nano. */
export function atmega328Pin(name: string): PinLocation | null {
  const analog = /^A([0-7])$/.exec(name);
  if (analog) {
    const channel = Number(analog[1]);
    // A6 and A7 exist only as ADC inputs, without a digital port.
    return channel < 6
      ? { port: 'C', bit: channel, adc: channel }
      : { port: 'C', bit: -1, adc: channel };
  }
  if (!/^\d+$/.test(name)) return null;
  const pin = Number(name);
  if (pin <= 7) return { port: 'D', bit: pin };
  if (pin <= 13) return { port: 'B', bit: pin - 8 };
  if (pin <= 19) return { port: 'C', bit: pin - 14, adc: pin - 14 };
  return null;
}

export function pinNameFor(port: PortName, bit: number): string {
  if (port === 'D') return String(bit);
  if (port === 'B') return String(bit + 8);
  return `A${bit}`;
}
