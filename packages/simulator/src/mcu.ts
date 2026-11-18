import {
  adcConfig,
  portAConfig,
  portBConfig,
  portCConfig,
  portDConfig,
  portEConfig,
  portFConfig,
  portGConfig,
  portHConfig,
  portJConfig,
  portKConfig,
  portLConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  twiConfig,
  usart0Config,
  type AVRPortConfig,
  type AVRTimerConfig,
} from 'avr8js';

export type AvrMcuName = 'atmega328p' | 'atmega2560';
export type McuName = AvrMcuName | 'rp2040';

export interface PinLocation {
  port: string;
  /** Bit in the port, or -1 for analog-only inputs such as A6 on the Nano. */
  bit: number;
  /** ADC channel for analog inputs. */
  adc?: number;
}

/** What differs between the supported microcontrollers. */
export interface McuProfile {
  flashBytes: number;
  /** Data memory above the first 256 bytes of registers, up to RAMEND. */
  sramBytes: number;
  ports: Record<string, AVRPortConfig>;
  timers: AVRTimerConfig[];
  usart: typeof usart0Config;
  adc: typeof adcConfig;
  twi: typeof twiConfig;
  /** Where a pin name used in sketches ("13", "A0") lives. */
  pin(name: string): PinLocation | null;
  /** The sketch name of a port bit, for reporting pin changes. */
  pinName(port: string, bit: number): string | null;
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

const ATMEGA328P: McuProfile = {
  flashBytes: 0x8000,
  sramBytes: 0x800,
  ports: { B: portBConfig, C: portCConfig, D: portDConfig },
  timers: [timer0Config, timer1Config, timer2Config],
  usart: usart0Config,
  adc: adcConfig,
  twi: twiConfig,
  pin: atmega328Pin,
  pinName: (port, bit) => {
    if (port === 'D') return String(bit);
    if (port === 'B') return String(bit + 8);
    if (port === 'C') return `A${bit}`;
    return null;
  },
};

// Arduino Mega digital pins 0 to 53, from the core's pins_arduino.h for the
// "mega" variant: [port, bit] per pin number.
const MEGA_DIGITAL: [string, number][] = [
  ['E', 0],
  ['E', 1],
  ['E', 4],
  ['E', 5],
  ['G', 5],
  ['E', 3],
  ['H', 3],
  ['H', 4],
  ['H', 5],
  ['H', 6],
  ['B', 4],
  ['B', 5],
  ['B', 6],
  ['B', 7],
  ['J', 1],
  ['J', 0],
  ['H', 1],
  ['H', 0],
  ['D', 3],
  ['D', 2],
  ['D', 1],
  ['D', 0],
  ['A', 0],
  ['A', 1],
  ['A', 2],
  ['A', 3],
  ['A', 4],
  ['A', 5],
  ['A', 6],
  ['A', 7],
  ['C', 7],
  ['C', 6],
  ['C', 5],
  ['C', 4],
  ['C', 3],
  ['C', 2],
  ['C', 1],
  ['C', 0],
  ['D', 7],
  ['G', 2],
  ['G', 1],
  ['G', 0],
  ['L', 7],
  ['L', 6],
  ['L', 5],
  ['L', 4],
  ['L', 3],
  ['L', 2],
  ['L', 1],
  ['L', 0],
  ['B', 3],
  ['B', 2],
  ['B', 1],
  ['B', 0],
];

/** Pin names used in sketches mapped to ATmega2560 ports, as on the Arduino Mega. */
export function atmega2560Pin(name: string): PinLocation | null {
  const analog = /^A(\d{1,2})$/.exec(name);
  const number = /^\d+$/.test(name) ? Number(name) : null;
  const channel = analog ? Number(analog[1]) : number !== null && number >= 54 ? number - 54 : null;
  if (channel !== null) {
    if (channel > 15) return null;
    // A8 to A15 need the MUX5 bit, which the emulated ADC does not decode;
    // they still work as digital pins.
    return channel < 8
      ? { port: 'F', bit: channel, adc: channel }
      : { port: 'K', bit: channel - 8 };
  }
  const location = number !== null ? MEGA_DIGITAL[number] : undefined;
  return location ? { port: location[0], bit: location[1] } : null;
}

const MEGA_NAMES = new Map<string, string>([
  ...MEGA_DIGITAL.map(([port, bit], pin): [string, string] => [`${port}${bit}`, String(pin)]),
  ...Array.from({ length: 8 }, (_, bit): [string, string] => [`F${bit}`, `A${bit}`]),
  ...Array.from({ length: 8 }, (_, bit): [string, string] => [`K${bit}`, `A${bit + 8}`]),
]);

// The ATmega2560 has more interrupt vectors than the ATmega328P, so the same
// peripherals sit at other vector addresses (word address = vector number × 2).
const timer01Dividers = timer1Config.dividers;
const sixteenBit = (
  registers: Pick<
    AVRTimerConfig,
    'TIFR' | 'OCRA' | 'OCRB' | 'OCRC' | 'ICR' | 'TCNT' | 'TCCRA' | 'TCCRB' | 'TCCRC' | 'TIMSK'
  >,
  firstVector: number,
  port: AVRPortConfig,
  pins: [number, number, number],
  clockPin: number,
): AVRTimerConfig => ({
  ...timer1Config,
  ...registers,
  captureInterrupt: firstVector * 2,
  compAInterrupt: (firstVector + 1) * 2,
  compBInterrupt: (firstVector + 2) * 2,
  compCInterrupt: (firstVector + 3) * 2,
  ovfInterrupt: (firstVector + 4) * 2,
  dividers: timer01Dividers,
  compPortA: port.PORT,
  compPinA: pins[0],
  compPortB: port.PORT,
  compPinB: pins[1],
  compPortC: port.PORT,
  compPinC: pins[2],
  externalClockPort: port.PORT,
  externalClockPin: clockPin,
});

const ATMEGA2560: McuProfile = {
  flashBytes: 0x40000,
  // RAMEND is 0x21FF: 8 KB of SRAM after 512 bytes of registers and I/O.
  sramBytes: 0x2100,
  ports: {
    A: portAConfig,
    B: portBConfig,
    C: portCConfig,
    D: portDConfig,
    E: portEConfig,
    F: portFConfig,
    G: portGConfig,
    H: portHConfig,
    J: portJConfig,
    K: portKConfig,
    L: portLConfig,
  },
  timers: [
    {
      ...timer0Config,
      compAInterrupt: 0x2a,
      compBInterrupt: 0x2c,
      ovfInterrupt: 0x2e,
      compPortA: portBConfig.PORT,
      compPinA: 7,
      compPortB: portGConfig.PORT,
      compPinB: 5,
      externalClockPort: portDConfig.PORT,
      externalClockPin: 7,
    },
    sixteenBit(
      {
        TIFR: 0x36,
        OCRA: 0x88,
        OCRB: 0x8a,
        OCRC: 0x8c,
        ICR: 0x86,
        TCNT: 0x84,
        TCCRA: 0x80,
        TCCRB: 0x81,
        TCCRC: 0x82,
        TIMSK: 0x6f,
      },
      16,
      portBConfig,
      [5, 6, 7],
      6,
    ),
    {
      ...timer2Config,
      compAInterrupt: 0x1a,
      compBInterrupt: 0x1c,
      ovfInterrupt: 0x1e,
      compPortA: portBConfig.PORT,
      compPinA: 4,
      compPortB: portHConfig.PORT,
      compPinB: 6,
    },
    sixteenBit(
      {
        TIFR: 0x38,
        OCRA: 0x98,
        OCRB: 0x9a,
        OCRC: 0x9c,
        ICR: 0x96,
        TCNT: 0x94,
        TCCRA: 0x90,
        TCCRB: 0x91,
        TCCRC: 0x92,
        TIMSK: 0x71,
      },
      31,
      portEConfig,
      [3, 4, 5],
      6,
    ),
    sixteenBit(
      {
        TIFR: 0x39,
        OCRA: 0xa8,
        OCRB: 0xaa,
        OCRC: 0xac,
        ICR: 0xa6,
        TCNT: 0xa4,
        TCCRA: 0xa0,
        TCCRB: 0xa1,
        TCCRC: 0xa2,
        TIMSK: 0x72,
      },
      41,
      portHConfig,
      [3, 4, 5],
      7,
    ),
    sixteenBit(
      {
        TIFR: 0x3a,
        OCRA: 0x128,
        OCRB: 0x12a,
        OCRC: 0x12c,
        ICR: 0x126,
        TCNT: 0x124,
        TCCRA: 0x120,
        TCCRB: 0x121,
        TCCRC: 0x122,
        TIMSK: 0x73,
      },
      46,
      portLConfig,
      [3, 4, 5],
      2,
    ),
  ],
  usart: {
    ...usart0Config,
    rxCompleteInterrupt: 0x32,
    dataRegisterEmptyInterrupt: 0x34,
    txCompleteInterrupt: 0x36,
  },
  adc: { ...adcConfig, adcInterrupt: 0x3a },
  twi: { ...twiConfig, twiInterrupt: 0x4e },
  pin: atmega2560Pin,
  pinName: (port, bit) => MEGA_NAMES.get(`${port}${bit}`) ?? null,
};

export const MCUS: Record<AvrMcuName, McuProfile> = {
  atmega328p: ATMEGA328P,
  atmega2560: ATMEGA2560,
};

export const isSimulatedMcu = (name: string | undefined): name is McuName =>
  name !== undefined && (name in MCUS || name === 'rp2040');

/**
 * Parts whose signals a chip produces in ways the emulator cannot time yet. On
 * the RP2040, arduino-pico drives servos, tones and NeoPixels from PIO state
 * machines, which rp2040js runs apart from the simulated clock.
 */
export const UNSIMULATED_PARTS: Partial<Record<McuName, readonly string[]>> = {
  rp2040: ['servo', 'buzzer', 'neopixel-ring'],
};
