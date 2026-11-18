import type { BoardDefinition } from './types';

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) => String(from + index));

const AVR_CORE = { id: 'arduino:avr' } as const;

const UNO_ANALOG = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const NANO_ANALOG = [...UNO_ANALOG, 'A6', 'A7'];
const ATMEGA328_PWM = ['3', '5', '6', '9', '10', '11'];

export const uno: BoardDefinition = {
  id: 'uno',
  name: 'Arduino Uno',
  fqbn: 'arduino:avr:uno',
  architecture: 'avr',
  core: AVR_CORE,
  digitalPins: [...range(0, 13), ...UNO_ANALOG],
  analogInputPins: UNO_ANALOG,
  pwmPins: ATMEGA328_PWM,
  builtinLedPin: '13',
  usbIds: [
    { vid: '2341', pid: '0043' },
    { vid: '2341', pid: '0001' },
    { vid: '2A03', pid: '0043' },
  ],
  simulation: { mcu: 'atmega328p', clockHz: 16_000_000 },
};

export const nano: BoardDefinition = {
  id: 'nano',
  name: 'Arduino Nano',
  fqbn: 'arduino:avr:nano',
  architecture: 'avr',
  core: AVR_CORE,
  // A6 and A7 are analog-only on the Nano.
  digitalPins: [...range(0, 13), ...UNO_ANALOG],
  analogInputPins: NANO_ANALOG,
  pwmPins: ATMEGA328_PWM,
  builtinLedPin: '13',
  simulation: { mcu: 'atmega328p', clockHz: 16_000_000 },
};

/** Most low-cost Nano clones still ship with the pre-2018 bootloader. */
export const nanoOldBootloader: BoardDefinition = {
  ...nano,
  id: 'nano-old-bootloader',
  name: 'Arduino Nano (old bootloader)',
  fqbn: 'arduino:avr:nano:cpu=atmega328old',
};

const MEGA_ANALOG = Array.from({ length: 16 }, (_, index) => `A${index}`);

export const mega: BoardDefinition = {
  id: 'mega',
  name: 'Arduino Mega 2560',
  fqbn: 'arduino:avr:mega:cpu=atmega2560',
  architecture: 'avr',
  core: AVR_CORE,
  digitalPins: [...range(0, 53), ...MEGA_ANALOG],
  analogInputPins: MEGA_ANALOG,
  pwmPins: [...range(2, 13), '44', '45', '46'],
  builtinLedPin: '13',
  usbIds: [
    { vid: '2341', pid: '0042' },
    { vid: '2341', pid: '0010' },
  ],
  simulation: { mcu: 'atmega2560', clockHz: 16_000_000 },
};

// GPIO 6-11 are wired to the SPI flash and 34-39 are input only.
const ESP32_OUTPUTS = [
  '0',
  '2',
  '4',
  '5',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '22',
  '23',
  '25',
  '26',
  '27',
  '32',
  '33',
];
const ESP32_INPUT_ONLY = ['34', '35', '36', '39'];

export const esp32DevKit: BoardDefinition = {
  id: 'esp32-devkit',
  name: 'ESP32 DevKit',
  fqbn: 'esp32:esp32:esp32',
  architecture: 'esp32',
  core: {
    id: 'esp32:esp32',
    indexUrl: 'https://espressif.github.io/arduino-esp32/package_esp32_index.json',
  },
  digitalPins: [...ESP32_OUTPUTS, ...ESP32_INPUT_ONLY],
  // ADC2 pins stop working while Wi-Fi is active, so only ADC1 is offered.
  analogInputPins: ['32', '33', '34', '35', '36', '39'],
  pwmPins: ESP32_OUTPUTS,
  builtinLedPin: '2',
};

export const BOARDS: readonly BoardDefinition[] = [uno, nano, nanoOldBootloader, mega, esp32DevKit];

export const DEFAULT_BOARD_ID = uno.id;
