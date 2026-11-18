import { describe, expect, it } from 'vitest';
import { parsePlotLine } from '../src/renderer/src/serial/plot-parser';

describe('parsePlotLine', () => {
  it('reads unlabelled values separated by spaces, commas or tabs', () => {
    expect(parsePlotLine('12 34')).toEqual([
      { label: '1', value: 12 },
      { label: '2', value: 34 },
    ]);
    expect(parsePlotLine('1.5,-2\t3e2')).toEqual([
      { label: '1', value: 1.5 },
      { label: '2', value: -2 },
      { label: '3', value: 300 },
    ]);
  });

  it('reads labelled values', () => {
    expect(parsePlotLine('temp:21.5 hum:40')).toEqual([
      { label: 'temp', value: 21.5 },
      { label: 'hum', value: 40 },
    ]);
  });

  it('ignores lines with text', () => {
    expect(parsePlotLine('Hello!')).toBeNull();
    expect(parsePlotLine('distance: far')).toBeNull();
    expect(parsePlotLine('   ')).toBeNull();
  });
});
