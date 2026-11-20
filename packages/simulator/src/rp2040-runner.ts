import {
  ConsoleLogger,
  GPIOPinState,
  I2CMode,
  LogLevel,
  RP2040,
  USBCDC,
  type RPI2C,
} from 'rp2040js';
import { bootromB1 } from './rp2040/bootrom';
import { PioModel, type PioBlock } from './rp2040/pio-model';
import type { I2CDevice, PinListener, Runner } from './runner';

export const RP2040_FREQUENCY = 125_000_000;
const NANOS_PER_CYCLE = 1e9 / RP2040_FREQUENCY;
const FLASH_START = 0x10000000;
const GPIO_COUNT = 30;
// GPIO 26 to 29 double as ADC inputs 0 to 3; A0 to A3 in sketches.
const FIRST_ADC_PIN = 26;
const ADC_MAX = 4095;
// Component models describe voltages for a 5 V board; the Pico runs at 3.3 V,
// so a voltage is read as the same fraction of the supply.
const MODEL_SUPPLY_VOLTS = 5;
// Watchdog scratch register 0, written by the trace helper of simulator builds.
const WATCHDOG_BASE = 0x40058;
const TRACE_OFFSET = 0x0c;

/** The parts of rp2040js's default clock the runner drives directly. */
interface SimulationClock {
  readonly nanos: number;
  readonly nanosToNextAlarm: number;
  tick(deltaNanos: number): void;
  createAlarm(callback: () => void): { schedule(deltaNanos: number): void; cancel(): void };
}

interface WritablePeripheral {
  writeUint32(offset: number, value: number): void;
}

/** Sketch pin names on the Raspberry Pi Pico: "25", or "A0" for GPIO 26. */
export function rp2040Pin(name: string): { gpio: number; adc?: number } | null {
  const analog = /^A([0-3])$/.exec(name);
  const gpio = analog ? FIRST_ADC_PIN + Number(analog[1]) : /^\d+$/.test(name) ? Number(name) : NaN;
  if (!Number.isInteger(gpio) || gpio < 0 || gpio >= GPIO_COUNT) return null;
  return gpio >= FIRST_ADC_PIN ? { gpio, adc: gpio - FIRST_ADC_PIN } : { gpio };
}

/** Names a GPIO can have in sketches, so listeners on either name hear it. */
function namesOf(gpio: number): string[] {
  return gpio >= FIRST_ADC_PIN ? [String(gpio), `A${gpio - FIRST_ADC_PIN}`] : [String(gpio)];
}

/** Routes an RP2040 I2C controller to the simulated devices by address. */
function attachI2C(i2c: RPI2C, devices: Map<number, I2CDevice>): void {
  let current: I2CDevice | null = null;
  i2c.onStart = () => i2c.completeStart();
  i2c.onConnect = (address, mode) => {
    current = devices.get(address) ?? null;
    // Reads are not used by the simulated parts yet; they still get an answer.
    i2c.completeConnect(current !== null || mode === I2CMode.Read);
  };
  i2c.onWriteByte = (value) => i2c.completeWrite(current?.write(value) ?? false);
  i2c.onReadByte = () => i2c.completeRead(current?.read() ?? 0xff);
  i2c.onStop = () => {
    current?.stop?.();
    current = null;
    i2c.completeStop();
  };
}

/**
 * Runs Raspberry Pi Pico firmware built by the arduino-pico core in rp2040js
 * (MIT). The sketch's Serial is the USB serial port, as on the real board.
 */
export class Rp2040Runner implements Runner {
  readonly frequency = RP2040_FREQUENCY;
  private readonly mcu: RP2040;
  private readonly clock: SimulationClock;
  private readonly cdc: USBCDC;
  private readonly listeners: PinListener[] = [];
  private readonly i2cDevices = new Map<number, I2CDevice>();
  private serialReady = false;

  onSerialByte: ((byte: number) => void) | null = null;
  onTrace: ((index: number) => void) | null = null;

  constructor(firmware: Uint8Array) {
    this.mcu = new RP2040();
    this.clock = this.mcu.clock as unknown as SimulationClock;
    this.mcu.logger = new ConsoleLogger(LogLevel.Error);
    this.mcu.loadBootrom(bootromB1);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const runner = this;
    this.mcu.flash.set(firmware, 0);

    this.mcu.gpio.forEach((pin, gpio) => {
      pin.addListener((state, oldState) => {
        const high = state === GPIOPinState.High;
        if (high === (oldState === GPIOPinState.High)) return;
        for (const name of namesOf(gpio)) {
          for (const listener of this.listeners) listener(name, high, this.cycles);
        }
      });
    });

    this.cdc = new USBCDC(this.mcu.usbCtrl);
    this.cdc.onDeviceConnected = () => {
      this.serialReady = true;
    };
    this.cdc.onSerialData = (data) => {
      for (const byte of data) this.onSerialByte?.(byte);
    };

    for (const i2c of this.mcu.i2c) attachI2C(i2c, this.i2cDevices);

    const watchdog = (this.mcu.peripherals as Record<number, WritablePeripheral>)[WATCHDOG_BASE];
    if (watchdog) {
      const write = watchdog.writeUint32.bind(watchdog);
      watchdog.writeUint32 = (offset, value) => {
        if (offset === TRACE_OFFSET) this.onTrace?.(value & 0xffff);
        write(offset, value);
      };
    }

    // Servos, tones and NeoPixels are driven by PIO programs, modelled on the simulated clock.
    new PioModel(this.mcu.pio as unknown as PioBlock[], {
      frequency: this.frequency,
      get cycles() {
        return runner.cycles;
      },
      timer: (callback) => {
        const alarm = this.clock.createAlarm(callback);
        return {
          schedule: (delayCycles) => alarm.schedule(delayCycles * NANOS_PER_CYCLE),
          cancel: () => alarm.cancel(),
        };
      },
      drive: (gpio, high, cycles) => {
        for (const name of namesOf(gpio)) {
          for (const listener of this.listeners) listener(name, high, cycles);
        }
      },
    });

    // Start at the second-stage boot loader in flash, as the boot ROM would.
    this.mcu.core.PC = FLASH_START;
  }

  get cycles(): number {
    return this.clock.nanos / NANOS_PER_CYCLE;
  }

  onPinChange(listener: PinListener): void {
    this.listeners.push(listener);
  }

  readPin(name: string): boolean {
    const location = rp2040Pin(name);
    return location ? this.mcu.gpio[location.gpio]?.value === GPIOPinState.High : false;
  }

  setDigitalInput(name: string, high: boolean): void {
    const location = rp2040Pin(name);
    if (location) this.mcu.gpio[location.gpio]?.setInputValue(high);
  }

  setAnalogInput(name: string, volts: number): void {
    const location = rp2040Pin(name);
    if (location?.adc === undefined) return;
    const fraction = Math.min(1, Math.max(0, volts / MODEL_SUPPLY_VOLTS));
    this.mcu.adc.channelValues[location.adc] = Math.round(fraction * ADC_MAX);
    this.mcu.gpio[location.gpio]?.setInputValue(fraction > 0.5);
  }

  addI2CDevice(address: number, device: I2CDevice): void {
    this.i2cDevices.set(address, device);
  }

  writeSerial(byte: number): void {
    if (this.serialReady) this.cdc.sendSerialByte(byte);
  }

  schedule(callback: () => void, delayCycles: number): void {
    this.clock.createAlarm(callback).schedule(Math.max(1, delayCycles) * NANOS_PER_CYCLE);
  }

  runUntil(targetCycles: number): void {
    const { mcu, clock } = this;
    const target = targetCycles * NANOS_PER_CYCLE;
    while (clock.nanos < target) {
      if (mcu.core.waiting) {
        // Sleeping until an interrupt: jump to the next timer event.
        const next = clock.nanosToNextAlarm;
        clock.tick(next > 0 ? Math.min(next, target - clock.nanos) : NANOS_PER_CYCLE);
      } else {
        clock.tick(mcu.core.executeInstruction() * NANOS_PER_CYCLE);
      }
    }
  }
}
