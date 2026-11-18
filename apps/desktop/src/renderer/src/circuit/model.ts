import type { BoardDefinition } from '@ideblock/boards';
import type { CircuitDocument } from '@ideblock/project';
import { findComponent } from '@ideblock/simulator';
import {
  circuitComponents,
  withComponents,
  wiringMode,
  type CircuitItem,
  type WiringMode,
} from '../simulator/circuit';
import { SHAPES, type Point } from './geometry';
import { boardPinPositions, defaultPositions, supplyPin } from './layout';
import { analyseCircuit, type CircuitAnalysis, type CircuitWire } from './netlist';

export const WIRE_COLOURS = ['#1e88e5', '#2fa84f', '#f59f00', '#e53935', '#20242b', '#8e24aa'];
export const GROUND_WIRE = '#20242b';
export const SUPPLY_WIRE = '#e53935';

/** Hand-drawn wires, from circuit.json `connections`. Entries of other shapes are ignored. */
export function circuitWires(circuit: CircuitDocument): CircuitWire[] {
  return circuit.connections.flatMap((connection) => {
    const id = connection['id'];
    const color = connection['color'];
    if (typeof id !== 'string') return [];
    return [
      {
        id,
        from: connection.from,
        to: connection.to,
        ...(typeof color === 'string' ? { color } : {}),
      },
    ];
  });
}

export function withWires(circuit: CircuitDocument, wires: CircuitWire[]): CircuitDocument {
  return { ...circuit, connections: wires.map((wire) => ({ ...wire })) };
}

export function nextWireId(wires: CircuitWire[]): string {
  const ids = new Set(wires.map((wire) => wire.id));
  let index = wires.length + 1;
  while (ids.has(`wire${index}`)) index++;
  return `wire${index}`;
}

/** Parts drawn in each mode: breadboards and resistors only exist in hand wiring. */
export function visibleParts(items: CircuitItem[], mode: WiringMode): CircuitItem[] {
  return mode === 'manual' ? items : items.filter((item) => findComponent(item.type));
}

export function analyse(
  board: BoardDefinition,
  items: CircuitItem[],
  positions: Map<string, Point>,
  wires: CircuitWire[],
): CircuitAnalysis {
  return analyseCircuit({
    boardPins: boardPinPositions(board),
    parts: items.map((item) => ({ item, position: positions.get(item.id) ?? { x: 0, y: 0 } })),
    wires,
  });
}

/** Wiring analysis of a hand-wired circuit, or null for automatic wiring. */
export function circuitAnalysis(
  circuit: CircuitDocument,
  board: BoardDefinition,
): CircuitAnalysis | null {
  if (wiringMode(circuit) !== 'manual') return null;
  const items = circuitComponents(circuit);
  return analyse(board, items, defaultPositions(items, board), circuitWires(circuit));
}

/** Components handed to the simulator, with the pins their wiring reaches. */
export function simulatedComponents(
  circuit: CircuitDocument,
  board: BoardDefinition,
): CircuitItem[] {
  const analysis = circuitAnalysis(circuit, board);
  if (analysis) return analysis.components;
  return circuitComponents(circuit).filter((item) => findComponent(item.type));
}

/** Removes a part and every wire attached to it. */
export function removePart(circuit: CircuitDocument, id: string): CircuitDocument {
  const items = circuitComponents(circuit).filter((item) => item.id !== id);
  const wires = circuitWires(circuit).filter(
    (wire) => !wire.from.startsWith(`${id}:`) && !wire.to.startsWith(`${id}:`),
  );
  return withWires(withComponents(circuit, items), wires);
}

const nextId = (type: string, used: Set<string>): string => {
  let index = 1;
  while (used.has(`${type}${index}`)) index++;
  used.add(`${type}${index}`);
  return `${type}${index}`;
};

/**
 * Switches to hand wiring. The first time, the automatic wiring is turned into
 * real wires, with a resistor in front of each LED, so the circuit keeps working.
 */
export function toManualWiring(circuit: CircuitDocument, board: BoardDefinition): CircuitDocument {
  const switched = { ...circuit, wiring: 'manual' };
  if (circuitWires(circuit).length > 0) return switched;
  const items = circuitComponents(circuit);
  const positions = defaultPositions(items, board);
  const boardPins = boardPinPositions(board);
  const used = new Set(items.map((item) => item.id));
  const wires: CircuitWire[] = [];
  const added: CircuitItem[] = [];
  const wire = (from: string, to: string, color: string): void => {
    wires.push({ id: `wire${wires.length + 1}`, from, to, color });
  };
  const supply = supplyPin(board);

  const placed = items.map((item, index) => {
    const position = positions.get(item.id) ?? { x: 0, y: 0 };
    const shape = SHAPES[item.type];
    if (!shape || !findComponent(item.type)) return item;
    const colour = WIRE_COLOURS[index % 3]!;
    for (const [signal, leg] of Object.entries(shape.signals)) {
      const pin = item.pins[signal];
      if (!pin || !boardPins[pin]) continue;
      if (!shape.resistors) {
        wire(`board:${pin}`, `${item.id}:${leg}`, colour);
        continue;
      }
      // The resistor sits halfway between the board pin and the leg.
      const legAt = { x: position.x + shape.pins[leg]!.x, y: position.y + shape.pins[leg]!.y };
      const pinAt = boardPins[pin]!;
      const resistor = nextId('resistor', used);
      added.push({
        id: resistor,
        type: 'resistor',
        pins: {},
        x: Math.round((legAt.x + pinAt.x) / 2 - 29),
        y: Math.round((legAt.y + pinAt.y) / 2 - 6),
      });
      wire(`board:${pin}`, `${resistor}:1`, colour);
      wire(`${resistor}:2`, `${item.id}:${leg}`, colour);
    }
    for (const leg of shape.ground) wire('board:GND', `${item.id}:${leg}`, GROUND_WIRE);
    for (const leg of shape.supply) wire(`board:${supply}`, `${item.id}:${leg}`, SUPPLY_WIRE);
    return { ...item, x: position.x, y: position.y };
  });
  return withWires(withComponents(switched, [...placed, ...added]), wires);
}

/** Back to automatic wiring, keeping the pins the drawn wires reached. Wires are kept for later. */
export function toAutoWiring(circuit: CircuitDocument, board: BoardDefinition): CircuitDocument {
  const analysis = circuitAnalysis(circuit, board);
  const items = circuitComponents(circuit).map((item) => {
    const reached = analysis?.reached[item.id];
    if (!reached) return item;
    const pins = { ...item.pins };
    for (const [signal, pin] of Object.entries(reached)) if (pin) pins[signal] = pin;
    return { ...item, pins };
  });
  return withComponents({ ...circuit, wiring: 'auto' }, items);
}
