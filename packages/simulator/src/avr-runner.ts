import {
  AVRADC,
  AVRTWI,
  AVRClock,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  CPU,
  avrInstruction,
  clockConfig,
  type TWIEventHandler,
} from 'avr8js';
import { loadHex } from './hex';
import { MCUS, type McuName, type McuProfile } from './mcu';

export const ATMEGA328_FREQUENCY = 16_000_000;

// General purpose I/O registers in data space; the sketch writes the running
// block index here when built for simulation.
const GPIOR0 = 0x3e;
const GPIOR1 = 0x4a;

export type PinListener = (pin: string, high: boolean, cycles: number) => void;

/** A device on the I2C bus, as seen from the microcontroller acting as master. */
export interface I2CDevice {
  /** Returns true to acknowledge the byte. */
  write(value: number): boolean;
  read(): number;
  stop?(): void;
}

/** Routes the TWI peripheral's bus activity to the simulated devices by address. */
class I2CBus implements TWIEventHandler {
  readonly devices = new Map<number, I2CDevice>();
  private current: I2CDevice | null = null;

  constructor(private readonly twi: AVRTWI) {}

  start(): void {
    this.twi.completeStart();
  }

  stop(): void {
    this.current?.stop?.();
    this.current = null;
    this.twi.completeStop();
  }

  connectToSlave(address: number): void {
    this.current = this.devices.get(address) ?? null;
    this.twi.completeConnect(this.current !== null);
  }

  writeByte(value: number): void {
    this.twi.completeWrite(this.current?.write(value) ?? false);
  }

  readByte(): void {
    this.twi.completeRead(this.current?.read() ?? 0xff);
  }
}

/**
 * Runs compiled ATmega328P or ATmega2560 firmware. Only the peripherals used by
 * beginner sketches are wired: GPIO, timers, ADC, I2C and the serial port.
 */
export class AvrRunner {
  readonly cpu: CPU;
  readonly frequency = ATMEGA328_FREQUENCY;
  private readonly mcu: McuProfile;
  private readonly ports: Record<string, AVRIOPort>;
  private readonly adc: AVRADC;
  private readonly usart: AVRUSART;
  private readonly i2c: I2CBus;
  private readonly pinListeners: PinListener[] = [];
  private traceHigh = 0;

  onSerialByte: ((byte: number) => void) | null = null;
  onTrace: ((index: number) => void) | null = null;

  constructor(hex: string, mcuName: McuName = 'atmega328p') {
    this.mcu = MCUS[mcuName];
    const flash = new Uint8Array(this.mcu.flashBytes);
    loadHex(hex, flash);
    this.cpu = new CPU(new Uint16Array(flash.buffer), this.mcu.sramBytes);

    for (const timer of this.mcu.timers) new AVRTimer(this.cpu, timer);
    new AVRClock(this.cpu, this.frequency, clockConfig);
    this.adc = new AVRADC(this.cpu, this.mcu.adc);
    this.usart = new AVRUSART(this.cpu, this.mcu.usart, this.frequency);
    this.usart.onByteTransmit = (byte) => this.onSerialByte?.(byte);
    const twi = new AVRTWI(this.cpu, this.mcu.twi, this.frequency);
    this.i2c = new I2CBus(twi);
    twi.eventHandler = this.i2c;

    this.ports = Object.fromEntries(
      Object.entries(this.mcu.ports).map(([name, config]) => [
        name,
        new AVRIOPort(this.cpu, config),
      ]),
    );
    for (const [name, port] of Object.entries(this.ports)) {
      port.addListener((value, oldValue) => {
        const changed = value ^ oldValue;
        if (changed === 0) return;
        for (let bit = 0; bit < 8; bit++) {
          if (changed & (1 << bit)) {
            const pin = this.mcu.pinName(name, bit);
            if (pin === null) continue;
            const high = (value & (1 << bit)) !== 0;
            for (const listener of this.pinListeners) listener(pin, high, this.cpu.cycles);
          }
        }
      });
    }

    this.cpu.writeHooks[GPIOR1] = (value) => {
      this.traceHigh = value;
      return false;
    };
    this.cpu.writeHooks[GPIOR0] = (value) => {
      this.onTrace?.((this.traceHigh << 8) | value);
      return false;
    };
  }

  get cycles(): number {
    return this.cpu.cycles;
  }

  onPinChange(listener: PinListener): void {
    this.pinListeners.push(listener);
  }

  /** Output level of a pin as driven by the program. */
  readPin(name: string): boolean {
    const location = this.mcu.pin(name);
    const port = location ? this.ports[location.port] : undefined;
    if (!location || !port || location.bit < 0) return false;
    const state = port.pinState(location.bit);
    // PinState: Low = 0, High = 1, Input = 2, InputPullUp = 3.
    return state === 1 || state === 3;
  }

  setDigitalInput(name: string, high: boolean): void {
    const location = this.mcu.pin(name);
    if (!location || location.bit < 0) return;
    this.ports[location.port]?.setPin(location.bit, high);
  }

  setAnalogInput(name: string, volts: number): void {
    const location = this.mcu.pin(name);
    if (location?.adc === undefined) return;
    this.adc.channelValues[location.adc] = volts;
    // Analog pins also read as digital inputs.
    if (location.bit >= 0) this.ports[location.port]?.setPin(location.bit, volts > 2.5);
  }

  addI2CDevice(address: number, device: I2CDevice): void {
    this.i2c.devices.set(address, device);
  }

  writeSerial(byte: number): void {
    this.usart.writeByte(byte);
  }

  schedule(callback: () => void, delayCycles: number): void {
    this.cpu.addClockEvent(callback, Math.max(1, Math.round(delayCycles)));
  }

  /** Executes instructions until the cycle counter reaches `targetCycles`. */
  runUntil(targetCycles: number): void {
    const cpu = this.cpu;
    while (cpu.cycles < targetCycles) {
      avrInstruction(cpu);
      cpu.tick();
    }
  }
}
