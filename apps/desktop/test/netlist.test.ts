import { describe, expect, it } from 'vitest';
import { columnX, findHole } from '../src/renderer/src/circuit/breadboard';
import { SHAPES, shapeOf, type Point } from '../src/renderer/src/circuit/geometry';
import {
  analyseCircuit,
  snapToHoles,
  type CircuitWire,
  type PlacedPart,
} from '../src/renderer/src/circuit/netlist';
import type { CircuitItem } from '../src/renderer/src/simulator/circuit';

const boardPins: Record<string, Point> = {
  '13': { x: -100, y: 0 },
  '12': { x: -110, y: 0 },
  '2': { x: -120, y: 0 },
  A0: { x: -130, y: 0 },
  GND: { x: -140, y: 0 },
  'GND.top': { x: -150, y: 0 },
  '5V': { x: -160, y: 0 },
};

const breadboard: PlacedPart = {
  item: { id: 'bb', type: 'breadboard', pins: {} },
  position: { x: 0, y: 0 },
};

/** Places a part so that one of its legs sits exactly in a hole. */
function plug(item: CircuitItem, leg: string, hole: string): PlacedPart {
  const target = findHole(hole)!;
  const offset = shapeOf(item)!.pins[leg]!;
  return { item, position: { x: target.x - offset.x, y: target.y - offset.y } };
}

let wireCount = 0;
const wire = (from: string, to: string): CircuitWire => ({ id: `w${++wireCount}`, from, to });

const led: CircuitItem = { id: 'led1', type: 'led', pins: { anode: '7' } };
const resistor: CircuitItem = { id: 'r1', type: 'resistor', pins: {} };

describe('analyseCircuit', () => {
  it('finds the pin an LED reaches through the breadboard and its resistor', () => {
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard, plug(led, 'A', 'e10'), plug(resistor, '1', 'b9')],
      wires: [wire('board:13', 'bb:a10'), wire('bb:a15', 'board:GND')],
    });
    expect(analysis.seated.get('led1:A')).toBe('bb:e10');
    expect(analysis.seated.get('led1:C')).toBe('bb:e9');
    expect(analysis.seated.get('r1:2')).toBe('bb:b15');
    expect(analysis.issues).toEqual([]);
    expect(analysis.components).toEqual([{ ...led, pins: { anode: '13' } }]);
  });

  it('warns about an LED wired without a resistor', () => {
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard, plug(led, 'A', 'e10')],
      wires: [wire('board:13', 'bb:a10'), wire('bb:a9', 'board:GND.top')],
    });
    expect(analysis.issues).toEqual([{ kind: 'noResistor', id: 'led1' }]);
    // It still runs, so the interface can show it burning out.
    expect(analysis.components).toHaveLength(1);
  });

  it('reports pins that are not wired and leaves the part out of the simulation', () => {
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard, plug(led, 'A', 'e10')],
      wires: [],
    });
    expect(analysis.issues).toEqual([
      { kind: 'unconnected', id: 'led1', signal: 'anode' },
      { kind: 'noGround', id: 'led1' },
    ]);
    expect(analysis.reached['led1']).toEqual({ anode: null });
    expect(analysis.components).toEqual([]);
  });

  it('accepts a push button wired either way round across the gap', () => {
    const button: CircuitItem = { id: 'button1', type: 'pushbutton', pins: { signal: '4' } };
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard, plug(button, '2.l', 'e20')],
      wires: [wire('board:2', 'bb:a20'), wire('board:GND', 'bb:j22')],
    });
    expect(analysis.seated.get('button1:1.l')).toBe('bb:e22');
    expect(analysis.seated.get('button1:2.r')).toBe('bb:j20');
    expect(analysis.issues).toEqual([]);
    expect(analysis.components).toEqual([{ ...button, pins: { signal: '2' } }]);
  });

  it('needs the supply wired for parts that take power', () => {
    const knob: CircuitItem = { id: 'pot1', type: 'potentiometer', pins: { signal: 'A0' } };
    const parts = [breadboard, plug(knob, 'GND', 'e3')];
    const wires = [wire('board:A0', 'bb:a4'), wire('board:GND', 'bb:a3')];
    expect(analyseCircuit({ boardPins, parts, wires }).issues).toEqual([
      { kind: 'noSupply', id: 'pot1' },
    ]);
    const powered = analyseCircuit({
      boardPins,
      parts,
      wires: [...wires, wire('board:5V', 'bb:a5')],
    });
    expect(powered.issues).toEqual([]);
    expect(powered.components[0]?.pins).toEqual({ signal: 'A0' });
  });

  it('detects short circuits between pins and between the supply and ground', () => {
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard],
      wires: [
        wire('board:13', 'bb:tp1'),
        wire('board:12', 'bb:tp7'),
        wire('board:5V', 'board:GND'),
      ],
    });
    expect(analysis.issues).toEqual([
      { kind: 'short', pins: ['12', '13'] },
      { kind: 'short', pins: ['5V', 'GND'] },
    ]);
  });

  it('lists every terminal joined to a hole', () => {
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard],
      wires: [wire('board:13', 'bb:c4')],
    });
    expect(analysis.netOf('bb:a4').sort()).toEqual(
      ['bb:a4', 'bb:b4', 'bb:c4', 'bb:d4', 'bb:e4', 'board:13'].sort(),
    );
  });
});

describe('rotated parts', () => {
  it('turns the legs with the part', () => {
    const led = SHAPES['led']!;
    const turned = shapeOf({ type: 'led', props: { rotation: 1 } })!;
    expect(turned.width).toBe(led.height);
    expect(turned.pins['A']).toEqual({ x: led.height - led.pins['A']!.y, y: led.pins['A']!.x });
    expect(shapeOf({ type: 'led', props: { rotation: 4 } })).toBe(led);
  });

  it('plugs an upright resistor into one breadboard column', () => {
    const upright: CircuitItem = { id: 'r1', type: 'resistor', pins: {}, props: { rotation: 1 } };
    const analysis = analyseCircuit({
      boardPins,
      parts: [breadboard, plug(upright, '1', 'tp3')],
      wires: [],
    });
    expect(analysis.seated.get('r1:1')).toBe('bb:tp3');
    // About six holes further down the same column, past the rail gap.
    expect(analysis.seated.get('r1:2')).toBe('bb:d3');
  });
});

describe('snapToHoles', () => {
  it('drops the nearest leg into a hole', () => {
    const holes = [{ x: columnX(5), y: 50 }];
    const offset = SHAPES['led']!.pins['A']!;
    const snapped = snapToHoles(led, { x: columnX(5) - offset.x + 3, y: 50 - offset.y - 2 }, holes);
    expect(snapped.x + offset.x).toBeCloseTo(columnX(5));
    expect(snapped.y + offset.y).toBeCloseTo(50);
  });

  it('leaves parts far from any hole where they are', () => {
    expect(snapToHoles(led, { x: 500, y: 500 }, [{ x: 0, y: 0 }])).toEqual({ x: 500, y: 500 });
  });
});
