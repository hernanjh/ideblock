import type { BoardDefinition } from '@ideblock/boards';
import { PROGRAM_BLOCK_TYPE } from './generator/sketch-generator';

/** A circuit part a program drives, with the board pin behind each of its pins. */
export interface PartUse {
  /** Component type, as used by the simulator and circuit.json. */
  type: string;
  pins: Record<string, string>;
}

type FieldMap = Record<string, string>;

/** Which part each block drives, read from its fields. */
const PART_BLOCKS: Record<string, (fields: FieldMap, board: BoardDefinition) => PartUse | null> = {
  led_set: (f) => part('led', { anode: f['PIN'] }),
  led_brightness: (f) => part('led', { anode: f['PIN'] }),
  button_pressed: (f) => part('pushbutton', { signal: f['PIN'] }),
  potentiometer_read: (f) => part('potentiometer', { signal: f['PIN'] }),
  light_sensor_read: (f) => part('photoresistor', { signal: f['PIN'] }),
  buzzer_tone: (f) => part('buzzer', { signal: f['PIN'] }),
  buzzer_stop: (f) => part('buzzer', { signal: f['PIN'] }),
  servo_write: (f) => part('servo', { signal: f['PIN'] }),
  ultrasonic_distance: (f) => part('hc-sr04', { trig: f['TRIG'], echo: f['ECHO'] }),
  rgb_led_color: (f) => part('rgb-led', { red: f['RED'], green: f['GREEN'], blue: f['BLUE'] }),
  rgb_led_mix: (f) => part('rgb-led', { red: f['RED'], green: f['GREEN'], blue: f['BLUE'] }),
  lcd_print: (_f, board) => part('lcd1602', { sda: board.i2c.sda, scl: board.i2c.scl }),
  lcd_clear: (_f, board) => part('lcd1602', { sda: board.i2c.sda, scl: board.i2c.scl }),
  neopixel_set: (f) => part('neopixel-ring', { din: f['PIN'] }),
  neopixel_clear: (f) => part('neopixel-ring', { din: f['PIN'] }),
};

function part(type: string, pins: Record<string, string | undefined>): PartUse | null {
  const entries = Object.entries(pins);
  if (entries.some(([, pin]) => pin === undefined || pin === '')) return null;
  return { type, pins: Object.fromEntries(entries) as Record<string, string> };
}

interface SerializedBlock {
  type?: unknown;
  enabled?: unknown;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: SerializedBlock }>;
  next?: { block?: SerializedBlock };
}

/**
 * Parts driven by the blocks inside the program block of a serialized
 * workspace. Blocks left loose on the workspace do not run, so they are ignored.
 */
export function partsUsedBy(workspaceState: unknown, board: BoardDefinition): PartUse[] {
  const top = (workspaceState as { blocks?: { blocks?: SerializedBlock[] } } | null)?.blocks
    ?.blocks;
  const program = top?.find((block) => block.type === PROGRAM_BLOCK_TYPE);
  if (!program) return [];
  const found = new Map<string, PartUse>();
  const visit = (block: SerializedBlock | undefined): void => {
    for (let current = block; current; current = current.next?.block) {
      if (current.enabled === false) continue;
      const read = typeof current.type === 'string' ? PART_BLOCKS[current.type] : undefined;
      if (read) {
        const fields = Object.fromEntries(
          Object.entries(current.fields ?? {}).map(([name, value]) => [name, String(value)]),
        );
        const use = read(fields, board);
        if (use) found.set(`${use.type}:${JSON.stringify(use.pins)}`, use);
      }
      for (const input of Object.values(current.inputs ?? {})) visit(input.block);
    }
  };
  visit(program);
  return [...found.values()];
}
