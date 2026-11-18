import { AvrRunner } from './avr-runner';
import type {
  ComponentInput,
  ComponentInstance,
  ComponentModel,
  ComponentState,
  SimulationContext,
} from './component';
import { findComponent } from './components';

export interface SimulationFrame {
  /** Simulated time since the program started, in milliseconds. */
  timeMs: number;
  components: Record<string, ComponentState>;
  /** Serial output produced since the previous frame. */
  serial: string;
  /** Index of the block that ran last, when the firmware was built with tracing. */
  trace: number | null;
  /** Simulated time divided by real time over the last frame. */
  speed: number;
}

/** Real time slices longer than this are not caught up, so a busy computer slows the simulation down instead of freezing. */
const MAX_SLICE_MS = 50;

export class Simulation {
  private readonly runner: AvrRunner;
  private readonly models = new Map<string, ComponentModel>();
  private readonly pinListeners = new Map<string, ((high: boolean, cycles: number) => void)[]>();
  private serial: number[] = [];
  private trace: number | null = null;
  private lastSpeed = 1;

  constructor(hex: string, components: readonly ComponentInstance[]) {
    this.runner = new AvrRunner(hex);
    this.runner.onPinChange((pin, high, cycles) => {
      for (const listener of this.pinListeners.get(pin) ?? []) listener(high, cycles);
    });
    this.runner.onSerialByte = (byte) => this.serial.push(byte);
    this.runner.onTrace = (index) => {
      this.trace = index;
    };

    const runner = this.runner;
    const context: SimulationContext = {
      frequency: runner.frequency,
      cycles: () => runner.cycles,
      onPin: (pin, listener) => {
        const listeners = this.pinListeners.get(pin) ?? [];
        listeners.push(listener);
        this.pinListeners.set(pin, listeners);
      },
      readPin: (pin) => runner.readPin(pin),
      setDigitalInput: (pin, high) => runner.setDigitalInput(pin, high),
      setAnalogInput: (pin, volts) => runner.setAnalogInput(pin, volts),
      schedule: (callback, delay) => runner.schedule(callback, delay),
    };
    for (const instance of components) {
      const definition = findComponent(instance.type);
      if (definition) this.models.set(instance.id, definition.create(instance, context));
    }
  }

  get timeMs(): number {
    return (this.runner.cycles / this.runner.frequency) * 1000;
  }

  /** Advances the simulation by `realMs` of wall-clock time. */
  advance(realMs: number): void {
    const slice = Math.min(realMs, MAX_SLICE_MS);
    this.lastSpeed = realMs > 0 ? slice / realMs : 1;
    this.runner.runUntil(this.runner.cycles + (slice / 1000) * this.runner.frequency);
  }

  input(componentId: string, input: ComponentInput): void {
    this.models.get(componentId)?.input?.(input);
  }

  writeSerial(text: string): void {
    for (const byte of new TextEncoder().encode(text)) this.runner.writeSerial(byte);
  }

  frame(): SimulationFrame {
    const components: Record<string, ComponentState> = {};
    for (const [id, model] of this.models) components[id] = model.snapshot();
    const serial = new TextDecoder().decode(new Uint8Array(this.serial));
    this.serial = [];
    return { timeMs: this.timeMs, components, serial, trace: this.trace, speed: this.lastSpeed };
  }
}
