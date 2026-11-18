import { getBoard } from '@ideblock/boards';
import { afterEach, describe, expect, it } from 'vitest';
import { setActiveBoard } from '../src';
import { FieldPin } from '../src/fields/field-pin';

describe('FieldPin', () => {
  afterEach(() => setActiveBoard(getBoard('uno')));

  it('defaults to the pins beginners usually wire', () => {
    expect(new FieldPin('output').getValue()).toBe('13');
    expect(new FieldPin('pwm').getValue()).toBe('9');
    expect(new FieldPin('digital').getValue()).toBe('2');
    expect(new FieldPin('analog').getValue()).toBe('A0');
  });

  it('follows the active board', () => {
    setActiveBoard(getBoard('esp32-devkit'));
    expect(new FieldPin('output').getValue()).toBe('2');
    expect(FieldPin.options('analog').map(([, value]) => value)).toContain('34');
  });

  it('keeps a value the current board does not offer', () => {
    setActiveBoard(getBoard('esp32-devkit'));
    const field = new FieldPin('digital', 'A3');
    expect(field.getValue()).toBe('A3');
    expect(field.getOptions().map((option) => (option as string[])[1])).toContain('A3');
  });
});
