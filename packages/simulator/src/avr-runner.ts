import {
  AVRADC,
  AVRClock,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  CPU,
  adcConfig,
  avrInstruction,
  clockConfig,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from 'avr8js';
import { loadHex } from './hex';
import { atmega328Pin, pinNameFor, type PortName } from './pins';

export const ATMEGA328_FREQUENCY = 16_000_000;
const FLASH_BYTES = 0x8000;

// General purpose I/O registers in data space; the sketch writes the running
// block index here when built for simulation.
const GPIOR0 = 0x3e;
const GPIOR1 = 0x4a;

export type PinListener = (pin: string, high: boolean, cycles: number) => void;

/**
 * Runs compiled ATmega328P firmware. Only the peripherals used by beginner
 * sketches are wired: GPIO, timers, ADC and the serial port.
 */
export class AvrRunner {
  readonly cpu: CPU;
  readonly frequency = ATMEGA328_FREQUENCY;
  private readonly ports: Record<PortName, AVRIOPort>;
  private readonly adc: AVRADC;
  private readonly usart: AVRUSART;
  private readonly pinListeners: PinListener[] = [];
  private traceHigh = 0;

  onSerialByte: ((byte: number) => void) | null = null;
  onTrace: ((index: number) => void) | null = null;

  constructor(hex: string) {
    const flash = new Uint8Array(FLASH_BYTES);
    loadHex(hex, flash);
    this.cpu = new CPU(new Uint16Array(flash.buffer));

    new AVRTimer(this.cpu, timer0Config);
    new AVRTimer(this.cpu, timer1Config);
    new AVRTimer(this.cpu, timer2Config);
    new AVRClock(this.cpu, this.frequency, clockConfig);
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, this.frequency);
    this.usart.onByteTransmit = (byte) => this.onSerialByte?.(byte);

    this.ports = {
      B: new AVRIOPort(this.cpu, portBConfig),
      C: new AVRIOPort(this.cpu, portCConfig),
      D: new AVRIOPort(this.cpu, portDConfig),
    };
    for (const [name, port] of Object.entries(this.ports) as [PortName, AVRIOPort][]) {
      port.addListener((value, oldValue) => {
        const changed = value ^ oldValue;
        if (changed === 0) return;
        for (let bit = 0; bit < 8; bit++) {
          if (changed & (1 << bit)) {
            const pin = pinNameFor(name, bit);
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
    const location = atmega328Pin(name);
    if (!location || location.bit < 0) return false;
    const state = this.ports[location.port].pinState(location.bit);
    // PinState: Low = 0, High = 1, Input = 2, InputPullUp = 3.
    return state === 1 || state === 3;
  }

  setDigitalInput(name: string, high: boolean): void {
    const location = atmega328Pin(name);
    if (!location || location.bit < 0) return;
    this.ports[location.port].setPin(location.bit, high);
  }

  setAnalogInput(name: string, volts: number): void {
    const location = atmega328Pin(name);
    if (location?.adc === undefined) return;
    this.adc.channelValues[location.adc] = volts;
    // Analog pins also read as digital inputs.
    if (location.bit >= 0) this.ports[location.port].setPin(location.bit, volts > 2.5);
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
