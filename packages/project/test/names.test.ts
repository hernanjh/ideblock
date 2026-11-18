import { describe, expect, it } from 'vitest';
import { isValidSketchName, toSketchName } from '../src';

describe('toSketchName', () => {
  it.each([
    ['Mi semáforo', 'Mi_semaforo'],
    ['Año 2026', 'Ano_2026'],
    ['  ¡Hola!  ', 'Hola'],
    ['___', 'sketch'],
    ['robot-v2.1', 'robot-v2.1'],
  ])('turns %s into %s', (input, expected) => {
    expect(toSketchName(input)).toBe(expected);
    expect(isValidSketchName(toSketchName(input))).toBe(true);
  });

  it('limits the length', () => {
    expect(toSketchName('a'.repeat(100))).toHaveLength(63);
  });
});
