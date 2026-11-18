import { getBoard } from '@ideblock/boards';
import { describe, expect, it } from 'vitest';
import { partsUsedBy } from '../src/parts';

const uno = getBoard('uno');
const workspace = (setup: unknown[], loop: unknown[], loose: unknown[] = []) => {
  const chain = (blocks: unknown[]) =>
    blocks.reduceRight<unknown>(
      (next, block) => ({ ...(block as object), ...(next ? { next: { block: next } } : {}) }),
      undefined,
    );
  return {
    blocks: {
      blocks: [
        {
          type: 'ideblock_program',
          inputs: {
            ...(setup.length ? { SETUP: { block: chain(setup) } } : {}),
            ...(loop.length ? { LOOP: { block: chain(loop) } } : {}),
          },
        },
        ...loose,
      ],
    },
  };
};

describe('partsUsedBy', () => {
  it('lists the parts driven by the program, once each', () => {
    const state = workspace(
      [{ type: 'lcd_clear' }],
      [
        { type: 'led_set', fields: { PIN: '13', STATE: 'HIGH' } },
        { type: 'led_set', fields: { PIN: '13', STATE: 'LOW' } },
        {
          type: 'controls_if',
          inputs: {
            IF0: { block: { type: 'button_pressed', fields: { PIN: '2' } } },
            DO0: {
              block: { type: 'neopixel_set', fields: { PIN: '6', COLOR: '255,0,0', COUNT: 8 } },
            },
          },
        },
      ],
    );
    expect(partsUsedBy(state, uno)).toEqual([
      { type: 'lcd1602', pins: { sda: 'A4', scl: 'A5' } },
      { type: 'led', pins: { anode: '13' } },
      { type: 'pushbutton', pins: { signal: '2' } },
      { type: 'neopixel-ring', pins: { din: '6' } },
    ]);
  });

  it('ignores loose and disabled blocks', () => {
    const state = workspace(
      [],
      [{ type: 'servo_write', enabled: false, fields: { PIN: '9' } }],
      [{ type: 'buzzer_tone', fields: { PIN: '8' } }],
    );
    expect(partsUsedBy(state, uno)).toEqual([]);
  });

  it('copes with an empty or missing workspace', () => {
    expect(partsUsedBy(null, uno)).toEqual([]);
    expect(partsUsedBy({}, uno)).toEqual([]);
  });
});
