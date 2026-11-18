export type BoardArchitecture = 'avr' | 'esp32';

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
  core: BoardCore;
  /** Pins usable with digitalRead/digitalWrite, as they are written in code. */
  digitalPins: readonly string[];
  /** Pins usable with analogRead. */
  analogInputPins: readonly string[];
  /** Pins usable with analogWrite. */
  pwmPins: readonly string[];
  builtinLedPin: string;
  /** USB vendor/product ids that identify the board when it is plugged in. */
  usbIds?: readonly { vid: string; pid: string }[];
  /** Present when the board can run in the built-in simulator. */
  simulation?: BoardSimulation;
}
