import { describe, expect, it } from 'vitest';
import { BOARDS, getBoard, outputPins } from '../src';

describe('board definitions', () => {
  it('have unique ids', () => {
    const ids = BOARDS.map((board) => board.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const board of BOARDS) {
    describe(board.id, () => {
      it('uses a fully qualified board name for its core', () => {
        expect(board.fqbn.startsWith(`${board.core.id}:`)).toBe(true);
      });

      it('lists PWM, analog and LED pins that exist on the board', () => {
        const known = new Set([...board.digitalPins, ...board.analogInputPins]);
        for (const pin of [...board.pwmPins, ...board.analogInputPins, board.builtinLedPin]) {
          expect(known.has(pin), pin).toBe(true);
        }
      });

      it('has no duplicate pins', () => {
        expect(new Set(board.digitalPins).size).toBe(board.digitalPins.length);
      });
    });
  }

  it('falls back to the default board for unknown ids', () => {
    expect(getBoard('does-not-exist').id).toBe('uno');
  });

  it('excludes input-only pins from ESP32 outputs', () => {
    expect(outputPins(getBoard('esp32-devkit'))).not.toContain('34');
    expect(outputPins(getBoard('uno'))).toContain('A0');
  });
});
