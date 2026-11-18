import { getBoard } from '@ideblock/boards';
import { describe, expect, it } from 'vitest';
import { circuitComponents, withBoardBus } from '../src/renderer/src/simulator/circuit';

describe('withBoardBus', () => {
  const circuit = {
    formatVersion: 1,
    components: [
      { id: 'lcd1', type: 'lcd1602', pins: { sda: 'A4', scl: 'A5' } },
      { id: 'led1', type: 'led', pins: { anode: '13' } },
    ],
    connections: [],
  };

  it('moves I2C parts to the bus pins of the new board', () => {
    const items = circuitComponents(withBoardBus(circuit, getBoard('mega')));
    expect(items[0]?.pins).toEqual({ sda: '20', scl: '21' });
    expect(items[1]?.pins).toEqual({ anode: '13' });
  });

  it('leaves the circuit untouched when nothing changes', () => {
    expect(withBoardBus(circuit, getBoard('uno'))).toBe(circuit);
  });
});
