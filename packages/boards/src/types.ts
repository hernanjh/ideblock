export type BoardArchitecture = 'avr' | 'megaavr' | 'esp32' | 'esp8266' | 'rp2040';

/** Groups boards in the board selector. */
export type BoardFamily = 'arduino' | 'esp32' | 'esp8266' | 'raspberry-pi';

/** How to include the servo library, which differs between platforms. */
export interface ServoSupport {
  header: string;
  /** Library to install, when the board platform does not bundle one. */
  library?: string;
}

export interface BoardCore {
  /** arduino-cli platform identifier, e.g. "arduino:avr". */
  id: string;
  /** Extra package index needed to install the core, if any. */
  indexUrl?: string;
}

export interface BoardSimulation {
  mcu: 'atmega328p' | 'atmega2560';
  clockHz: number;
}

export interface BoardDefinition {
  id: string;
  name: string;
  fqbn: string;
  architecture: BoardArchitecture;
  family: BoardFamily;
  core: BoardCore;
  servo: ServoSupport;
  /** Drawing used in the circuit view. */
  drawing: 'uno' | 'esp32' | 'generic';
  /** Prefix for numbered pins in labels, e.g. "D13", "GPIO 2", "GP15". */
  pinLabelPrefix: string;
  /** Pins usable with digitalRead/digitalWrite, as they are written in code. */
  digitalPins: readonly string[];
  /** Pins usable with analogRead. */
  analogInputPins: readonly string[];
  /** Pins usable with analogWrite. */
  pwmPins: readonly string[];
  builtinLedPin: string;
  /** Default I2C pins used by the Wire library. */
  i2c: { sda: string; scl: string };
  /** USB vendor/product ids that identify the board when it is plugged in. */
  usbIds?: readonly { vid: string; pid: string }[];
  /** Present when the board can run in the built-in simulator. */
  simulation?: BoardSimulation;
}
