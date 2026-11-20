/**
 * A high-level model of the PIO programs the arduino-pico core uses for
 * servos, tones and NeoPixels.
 *
 * rp2040js runs the PIO state machines on a JavaScript timer, apart from the
 * simulated clock, and stepping them cycle by cycle in the simulation loop is
 * far too slow: a servo pulse is hundreds of thousands of PIO cycles. So the
 * state machines do not run at all. Each value the firmware pushes into a TX
 * FIFO is read by a model of the program loaded for that state machine, which
 * then draws the waveform the real program would draw on its pin, as pin
 * changes on the simulated clock. Component models see the same signal as on
 * an AVR board.
 */

/** The parts of rp2040js's state machine the model uses. */
export interface PioStateMachine {
  enabled: boolean;
  pc: number;
  readonly execCtrl: number;
  readonly pinCtrl: number;
  writeFIFO(value: number): void;
}

/** The parts of rp2040js's PIO block the model uses. */
export interface PioBlock {
  readonly instructions: Uint32Array | number[];
  readonly machines: PioStateMachine[];
  run(): void;
  writeUint32(offset: number, value: number): void;
}

export interface PioHost {
  /** The simulated time, in system clock cycles. */
  readonly cycles: number;
  readonly frequency: number;
  /** Calls back after a number of cycles; one timer per id, rescheduling replaces it. */
  timer(callback: () => void): { schedule(delayCycles: number): void; cancel(): void };
  /** Reports a level change on a GPIO, at a cycle that may be ahead of now. */
  drive(gpio: number, high: boolean, cycles: number): void;
}

/** Assembled programs, from the arduino-pico core and the Adafruit NeoPixel library. */
const PROGRAMS = {
  // libraries/Servo/src/servo.pio.h
  servo: [0x9080, 0xa027, 0x0022, 0xa046, 0x00a6, 0x1807, 0xa042, 0x0084],
  // cores/rp2040/tone2.pio.h
  tone: [0x8080, 0xb827, 0xa047, 0x0083, 0xb047, 0x0085],
  // Adafruit_NeoPixel/rp2040_pio.h
  ws2812: [0x6221, 0x1123, 0x1400, 0xa442],
} as const;
type ProgramName = keyof typeof PROGRAMS;

/** The servo library's refresh interval, the first value it pushes. */
const SERVO_PERIOD_US = 20_000;
/** Offset of the servo program's halt loop, which the library waits for on detach. */
const SERVO_HALT = 2;
/**
 * Simulation builds use the board's default clock option, 200 MHz; tone()
 * computes its half period from that clock.
 */
export const FIRMWARE_CLOCK_HZ = 200_000_000;
/** WS2812 bit timing, as the NeoPixel component decodes it. */
const WS2812_ONE_US = 0.8;
const WS2812_ZERO_US = 0.4;
const WS2812_BIT_US = 1.25;
/** The data line idles low this long after a frame, so the pixels latch it. */
const WS2812_LATCH_US = 80;

const CTRL = 0x000;

/** Jumps hold absolute addresses; the rest of an instruction does not depend on where it was loaded. */
function relocated(word: number, offset: number): number {
  const isJump = (word & 0xe000) === 0;
  return isJump ? (word & ~0x1f) | (((word & 0x1f) + offset) & 0x1f) : word;
}

/** The known program a state machine runs, from its wrap range in instruction memory. */
export function identifyProgram(pio: PioBlock, machine: PioStateMachine): ProgramName | null {
  const offset = (machine.execCtrl >>> 7) & 0x1f;
  for (const [name, words] of Object.entries(PROGRAMS) as [ProgramName, readonly number[]][]) {
    if (
      words.every(
        (word, index) => pio.instructions[(offset + index) & 0x1f] === relocated(word, offset),
      )
    ) {
      return name;
    }
  }
  return null;
}

interface Waveform {
  stop(): void;
}

export class PioModel {
  /** Per state machine ("pio:sm"), what its program is drawing. */
  private readonly servos = new Map<
    string,
    { period: number | null; pulseUs: number; wave: Waveform | null }
  >();
  private readonly tones = new Map<string, Waveform>();
  /** Where each NeoPixel line's next bit starts, so frames never overlap. */
  private readonly lineCursor = new Map<number, number>();

  constructor(
    private readonly blocks: PioBlock[],
    private readonly host: PioHost,
  ) {
    blocks.forEach((pio, pioIndex) => {
      // The state machines never run on rp2040js's own timer.
      pio.run = () => undefined;
      pio.machines.forEach((machine, smIndex) => {
        machine.writeFIFO = (value) => this.push(pio, pioIndex, machine, smIndex, value >>> 0);
      });
      const write = pio.writeUint32.bind(pio);
      pio.writeUint32 = (offset, value) => {
        write(offset, value);
        if (offset === CTRL) this.enabledChanged(pioIndex);
      };
    });
  }

  private sidesetPin(machine: PioStateMachine): number {
    // PINCTRL_SIDESET_BASE, bits 10 to 14.
    return (machine.pinCtrl >>> 10) & 0x1f;
  }

  private push(
    pio: PioBlock,
    pioIndex: number,
    machine: PioStateMachine,
    smIndex: number,
    value: number,
  ): void {
    const key = `${pioIndex}:${smIndex}`;
    const pin = this.sidesetPin(machine);
    switch (identifyProgram(pio, machine)) {
      case 'servo':
        this.servoValue(key, machine, pin, value);
        break;
      case 'tone':
        this.toneValue(key, pin, value);
        break;
      case 'ws2812':
        this.pixelByte(pin, value >>> 24);
        break;
    }
  }

  private servoValue(key: string, machine: PioStateMachine, pin: number, value: number): void {
    let servo = this.servos.get(key);
    if (!servo) {
      servo = { period: null, pulseUs: 0, wave: null };
      this.servos.set(key, servo);
    }
    // The first value is the refresh interval; the pulse widths follow in the same unit.
    if (servo.period === null) {
      servo.period = value;
      return;
    }
    if (value === 0) {
      // Detaching: the library waits until the program sits in its halt loop.
      servo.wave?.stop();
      servo.wave = null;
      this.servos.delete(key);
      const offset = (machine.execCtrl >>> 7) & 0x1f;
      machine.pc = (offset + SERVO_HALT) & 0x1f;
      return;
    }
    servo.pulseUs = (value / servo.period) * SERVO_PERIOD_US;
    servo.wave ??= this.pulses(pin, () => {
      const current = this.servos.get(key);
      return current ? { periodUs: SERVO_PERIOD_US, highUs: current.pulseUs } : null;
    });
  }

  private toneValue(key: string, pin: number, value: number): void {
    // tone() pushes the half period in clock cycles, minus 3.
    const halfUs = ((value + 3) / FIRMWARE_CLOCK_HZ) * 1_000_000;
    this.tones.get(key)?.stop();
    this.tones.set(
      key,
      this.pulses(pin, () => ({ periodUs: halfUs * 2, highUs: halfUs })),
    );
  }

  private enabledChanged(pioIndex: number): void {
    const pio = this.blocks[pioIndex];
    if (!pio) return;
    pio.machines.forEach((machine, smIndex) => {
      if (machine.enabled) return;
      const key = `${pioIndex}:${smIndex}`;
      // A tone stops when its duration is over or noTone() is called.
      const tone = this.tones.get(key);
      if (tone) {
        tone.stop();
        this.tones.delete(key);
      }
    });
  }

  /** Draws a repeating pulse, asking for its timing at the start of each period. */
  private pulses(pin: number, timing: () => { periodUs: number; highUs: number } | null): Waveform {
    const { host } = this;
    const cyclesPerUs = host.frequency / 1_000_000;
    let stopped = false;
    let high = false;
    const fall = host.timer(() => {
      if (stopped) return;
      high = false;
      host.drive(pin, false, host.cycles);
    });
    const rise = host.timer(() => {
      if (stopped) return;
      const next = timing();
      if (!next) return;
      high = true;
      host.drive(pin, true, host.cycles);
      fall.schedule(Math.max(1, Math.round(next.highUs * cyclesPerUs)));
      rise.schedule(Math.max(2, Math.round(next.periodUs * cyclesPerUs)));
    });
    rise.schedule(1);
    return {
      stop: () => {
        stopped = true;
        rise.cancel();
        fall.cancel();
        if (high) host.drive(pin, false, host.cycles);
      },
    };
  }

  /** One byte of colour, drawn as the WS2812 bits the program would send. */
  private pixelByte(pin: number, byte: number): void {
    const { host } = this;
    const cyclesPerUs = host.frequency / 1_000_000;
    const latch = WS2812_LATCH_US * cyclesPerUs;
    let at = this.lineCursor.get(pin) ?? 0;
    // A byte long after the previous frame starts a new frame.
    if (at + latch < host.cycles) at = host.cycles;
    for (let bit = 7; bit >= 0; bit--) {
      const one = (byte >> bit) & 1;
      host.drive(pin, true, at);
      host.drive(pin, false, at + (one ? WS2812_ONE_US : WS2812_ZERO_US) * cyclesPerUs);
      at += WS2812_BIT_US * cyclesPerUs;
    }
    this.lineCursor.set(pin, at);
  }
}
