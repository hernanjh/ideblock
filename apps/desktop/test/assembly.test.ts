import { getBoard } from '@ideblock/boards';
import { describe, expect, it } from 'vitest';
import { assemblyPlan } from '../src/renderer/src/circuit/assembly';
import { toManualWiring } from '../src/renderer/src/circuit/model';

const uno = getBoard('uno');
const circuit = {
  formatVersion: 1,
  components: [
    { id: 'led1', type: 'led', pins: { anode: '13' } },
    { id: 'pot1', type: 'potentiometer', pins: { signal: 'A0' } },
  ],
  connections: [],
};

describe('assemblyPlan', () => {
  it('lists parts and the connections of automatic wiring, with resistors for LEDs', () => {
    const plan = assemblyPlan(circuit, uno);
    expect(plan.parts).toEqual([
      { type: 'led', count: 1 },
      { type: 'potentiometer', count: 1 },
    ]);
    expect(plan.extraResistors).toBe(1);
    expect(plan.steps).toEqual([
      { kind: 'pin', part: 'led1', leg: 'A', pin: '13', resistor: true },
      { kind: 'ground', part: 'led1', leg: 'C' },
      { kind: 'pin', part: 'pot1', leg: 'SIG', pin: 'A0', resistor: false },
      { kind: 'ground', part: 'pot1', leg: 'GND' },
      { kind: 'supply', part: 'pot1', leg: 'VCC', supply: '5V' },
    ]);
  });

  it('lists the wires of hand wiring and the resistor as a part', () => {
    const plan = assemblyPlan(toManualWiring(circuit, uno), uno);
    expect(plan.parts).toContainEqual({ type: 'resistor', count: 1 });
    expect(plan.extraResistors).toBe(0);
    expect(plan.steps.every((step) => step.kind === 'wire')).toBe(true);
    expect(plan.wires).toBe(6);
    expect(plan.issues).toEqual([]);
  });
});
