import type { I2CDevice } from './avr-runner';

/** How a component pin connects to the board, which limits the pins offered. */
export type ComponentPinKind = 'output' | 'digital' | 'analog' | 'pwm' | 'sda' | 'scl';

export interface ComponentPinSpec {
  name: string;
  kind: ComponentPinKind;
  /** Pin used when the component is first added, if the board has it. */
  defaultPin: string;
}

/** A component placed in a circuit, as stored in circuit.json. */
export interface ComponentInstance {
  id: string;
  type: string;
  /** Component pin name to board pin, e.g. { signal: '13' }. */
  pins: Record<string, string>;
  props?: Record<string, unknown>;
}

/** What a component model can use from the running simulation. */
export interface SimulationContext {
  readonly frequency: number;
  cycles(): number;
  onPin(pin: string, listener: (high: boolean, cycles: number) => void): void;
  readPin(pin: string): boolean;
  setDigitalInput(pin: string, high: boolean): void;
  setAnalogInput(pin: string, volts: number): void;
  schedule(callback: () => void, delayCycles: number): void;
  addI2CDevice(address: number, device: I2CDevice): void;
}

export type ComponentState = Record<string, number | boolean | string>;
export type ComponentInput = Record<string, number | boolean>;

export interface ComponentModel {
  /** Visual state for the current frame. Called once per frame. */
  snapshot(): ComponentState;
  /** Applies a user interaction, such as pressing a button or turning a knob. */
  input?(input: ComponentInput): void;
}

export interface ComponentDefinition {
  type: string;
  pins: ComponentPinSpec[];
  /** Initial value of user-controlled inputs, also used by the interface. */
  initialInput?: ComponentInput;
  create(instance: ComponentInstance, context: SimulationContext): ComponentModel;
}
