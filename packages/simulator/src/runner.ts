/** Called when the firmware changes an output pin, with the CPU cycle it happened at. */
export type PinListener = (pin: string, high: boolean, cycles: number) => void;

/** A device on the I2C bus, as seen from the microcontroller acting as master. */
export interface I2CDevice {
  /** Returns true to acknowledge the byte. */
  write(value: number): boolean;
  read(): number;
  stop?(): void;
}

/**
 * An emulated microcontroller running compiled firmware. Component models only
 * use this interface, so they work the same on every simulated board.
 */
export interface Runner {
  readonly frequency: number;
  readonly cycles: number;
  onSerialByte: ((byte: number) => void) | null;
  onTrace: ((index: number) => void) | null;
  onPinChange(listener: PinListener): void;
  /** Output level of a pin as driven by the program. */
  readPin(name: string): boolean;
  setDigitalInput(name: string, high: boolean): void;
  /** Voltages are given for a 5 V board; 3.3 V boards scale them to their range. */
  setAnalogInput(name: string, volts: number): void;
  addI2CDevice(address: number, device: I2CDevice): void;
  writeSerial(byte: number): void;
  schedule(callback: () => void, delayCycles: number): void;
  /** Executes instructions until the cycle counter reaches `targetCycles`. */
  runUntil(targetCycles: number): void;
}
