import type { BoardDefinition } from './types';

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) => String(from + index));

const AVR_CORE = { id: 'arduino:avr' } as const;
const AVR_SERVO = { header: 'Servo.h', library: 'Servo' } as const;
const ARDUINO_LIKE = {
  family: 'arduino',
  servo: AVR_SERVO,
  drawing: 'uno',
  pinLabelPrefix: 'D',
} as const;
const ESP32_LIKE = {
  architecture: 'esp32',
  family: 'esp32',
  core: {
    id: 'esp32:esp32',
    indexUrl: 'https://espressif.github.io/arduino-esp32/package_esp32_index.json',
  },
  // The standard Servo library does not support the ESP32.
  servo: { header: 'ESP32Servo.h', library: 'ESP32Servo' },
  pinLabelPrefix: 'GPIO ',
} as const;

const UNO_ANALOG = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const NANO_ANALOG = [...UNO_ANALOG, 'A6', 'A7'];
const ATMEGA328_PWM = ['3', '5', '6', '9', '10', '11'];

export const uno: BoardDefinition = {
  id: 'uno',
  name: 'Arduino Uno',
  fqbn: 'arduino:avr:uno',
  architecture: 'avr',
  ...ARDUINO_LIKE,
  core: AVR_CORE,
  digitalPins: [...range(0, 13), ...UNO_ANALOG],
  analogInputPins: UNO_ANALOG,
  pwmPins: ATMEGA328_PWM,
  builtinLedPin: '13',
  i2c: { sda: 'A4', scl: 'A5' },
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
  ...ARDUINO_LIKE,
  core: AVR_CORE,
  // A6 and A7 are analog-only on the Nano.
  digitalPins: [...range(0, 13), ...UNO_ANALOG],
  analogInputPins: NANO_ANALOG,
  pwmPins: ATMEGA328_PWM,
  builtinLedPin: '13',
  i2c: { sda: 'A4', scl: 'A5' },
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
  ...ARDUINO_LIKE,
  core: AVR_CORE,
  digitalPins: [...range(0, 53), ...MEGA_ANALOG],
  analogInputPins: MEGA_ANALOG,
  pwmPins: [...range(2, 13), '44', '45', '46'],
  builtinLedPin: '13',
  i2c: { sda: '20', scl: '21' },
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
  ...ESP32_LIKE,
  id: 'esp32-devkit',
  name: 'ESP32 DevKit',
  fqbn: 'esp32:esp32:esp32',
  drawing: 'esp32',
  digitalPins: [...ESP32_OUTPUTS, ...ESP32_INPUT_ONLY],
  // ADC2 pins stop working while Wi-Fi is active, so only ADC1 is offered.
  analogInputPins: ['32', '33', '34', '35', '36', '39'],
  pwmPins: ESP32_OUTPUTS,
  builtinLedPin: '2',
  i2c: { sda: '21', scl: '22' },
};

export const leonardo: BoardDefinition = {
  id: 'leonardo',
  name: 'Arduino Leonardo',
  fqbn: 'arduino:avr:leonardo',
  architecture: 'avr',
  ...ARDUINO_LIKE,
  core: AVR_CORE,
  digitalPins: [...range(0, 13), ...UNO_ANALOG],
  analogInputPins: UNO_ANALOG,
  pwmPins: ['3', '5', '6', '9', '10', '11', '13'],
  builtinLedPin: '13',
  i2c: { sda: '2', scl: '3' },
  usbIds: [
    { vid: '2341', pid: '8036' },
    { vid: '2341', pid: '0036' },
  ],
};

export const micro: BoardDefinition = {
  ...leonardo,
  id: 'micro',
  name: 'Arduino Micro',
  fqbn: 'arduino:avr:micro',
  usbIds: [
    { vid: '2341', pid: '8037' },
    { vid: '2341', pid: '0037' },
  ],
};

export const nanoEvery: BoardDefinition = {
  id: 'nano-every',
  name: 'Arduino Nano Every',
  fqbn: 'arduino:megaavr:nona4809',
  architecture: 'megaavr',
  ...ARDUINO_LIKE,
  core: { id: 'arduino:megaavr' },
  digitalPins: [...range(0, 13), ...UNO_ANALOG],
  analogInputPins: NANO_ANALOG,
  pwmPins: ['3', '5', '6', '9', '10'],
  builtinLedPin: '13',
  i2c: { sda: 'A4', scl: 'A5' },
  usbIds: [{ vid: '2341', pid: '0058' }],
};

const ESP32_C3_PINS = [...range(0, 10), '20', '21'];

export const esp32C3: BoardDefinition = {
  ...ESP32_LIKE,
  id: 'esp32-c3',
  name: 'ESP32-C3 DevKit',
  fqbn: 'esp32:esp32:esp32c3',
  drawing: 'generic',
  digitalPins: ESP32_C3_PINS,
  analogInputPins: ['0', '1', '2', '3', '4'],
  pwmPins: ESP32_C3_PINS,
  builtinLedPin: '8',
  i2c: { sda: '8', scl: '9' },
};

const ESP32_S3_PINS = [...range(1, 21), ...range(35, 48)];

export const esp32S3: BoardDefinition = {
  ...ESP32_LIKE,
  id: 'esp32-s3',
  name: 'ESP32-S3 DevKit',
  fqbn: 'esp32:esp32:esp32s3',
  drawing: 'generic',
  digitalPins: ESP32_S3_PINS,
  analogInputPins: range(1, 10),
  pwmPins: ESP32_S3_PINS,
  builtinLedPin: '2',
  i2c: { sda: '8', scl: '9' },
};

const ESP8266_CORE = {
  id: 'esp8266:esp8266',
  indexUrl: 'https://arduino.esp8266.com/stable/package_esp8266com_index.json',
} as const;
// GPIO numbers usable on NodeMCU and Wemos boards; 6-11 belong to the flash.
const ESP8266_PINS = ['16', '5', '4', '0', '2', '14', '12', '13', '15'];

export const nodeMcu: BoardDefinition = {
  id: 'nodemcu',
  name: 'NodeMCU 1.0 (ESP8266)',
  fqbn: 'esp8266:esp8266:nodemcuv2',
  architecture: 'esp8266',
  family: 'esp8266',
  core: ESP8266_CORE,
  // The ESP8266 platform bundles its own Servo library.
  servo: { header: 'Servo.h' },
  drawing: 'generic',
  pinLabelPrefix: 'GPIO ',
  digitalPins: ESP8266_PINS,
  analogInputPins: ['A0'],
  pwmPins: ESP8266_PINS.filter((pin) => pin !== '16'),
  builtinLedPin: '2',
  i2c: { sda: '4', scl: '5' },
};

export const wemosD1Mini: BoardDefinition = {
  ...nodeMcu,
  id: 'wemos-d1-mini',
  name: 'Wemos D1 mini (ESP8266)',
  fqbn: 'esp8266:esp8266:d1_mini',
};

const PICO_PINS = range(0, 28).filter((pin) => !['23', '24', '25'].includes(pin));

export const pico: BoardDefinition = {
  id: 'pico',
  name: 'Raspberry Pi Pico',
  fqbn: 'rp2040:rp2040:rpipico',
  architecture: 'rp2040',
  family: 'raspberry-pi',
  core: {
    id: 'rp2040:rp2040',
    indexUrl:
      'https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json',
  },
  // The RP2040 platform bundles its own Servo library.
  servo: { header: 'Servo.h' },
  drawing: 'generic',
  pinLabelPrefix: 'GP',
  digitalPins: [...PICO_PINS, '25'],
  // GPIO 26 to 28; arduino-pico names them A0 to A2, like the examples do.
  analogInputPins: ['A0', 'A1', 'A2'],
  pwmPins: PICO_PINS,
  builtinLedPin: '25',
  i2c: { sda: '4', scl: '5' },
  usbIds: [{ vid: '2E8A', pid: '000A' }],
  simulation: { mcu: 'rp2040', clockHz: 125_000_000 },
};

export const BOARDS: readonly BoardDefinition[] = [
  uno,
  nano,
  nanoOldBootloader,
  mega,
  leonardo,
  micro,
  nanoEvery,
  esp32DevKit,
  esp32C3,
  esp32S3,
  nodeMcu,
  wemosD1Mini,
  pico,
];

/** Package indexes needed by all supported boards, for the toolchain configuration. */
export const BOARD_INDEX_URLS: readonly string[] = [
  ...new Set(BOARDS.flatMap((board) => (board.core.indexUrl ? [board.core.indexUrl] : []))),
];

export const DEFAULT_BOARD_ID = uno.id;
