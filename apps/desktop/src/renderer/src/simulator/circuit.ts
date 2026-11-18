import type { BoardDefinition } from '@ideblock/boards';
import { pinsFor } from '@ideblock/blocks';
import type { CircuitDocument } from '@ideblock/project';
import { findComponent, type ComponentInstance } from '@ideblock/simulator';

/** A placed component: the simulator fields plus its position in the drawing. */
export interface CircuitItem extends ComponentInstance {
  x?: number;
  y?: number;
}

/** Circuit components with the fields the simulator and drawing need; others are ignored. */
export function circuitComponents(circuit: CircuitDocument): CircuitItem[] {
  return circuit.components.flatMap((component) => {
    const pins = (component as { pins?: unknown }).pins;
    if (typeof pins !== 'object' || pins === null) return [];
    const position = component as { x?: unknown; y?: unknown };
    return [
      {
        id: component.id,
        type: component.type,
        pins: pins as Record<string, string>,
        ...(typeof position.x === 'number' ? { x: position.x } : {}),
        ...(typeof position.y === 'number' ? { y: position.y } : {}),
        ...(typeof component['props'] === 'object' && component['props'] !== null
          ? { props: component['props'] as Record<string, unknown> }
          : {}),
      },
    ];
  });
}

/** Parts that only exist in hand-wired circuits and are not simulated on their own. */
export const PASSIVE_PARTS = new Set(['breadboard', 'resistor']);

export type WiringMode = 'auto' | 'manual';

/** Automatic wiring draws wires from the pins chosen per component; manual wiring uses drawn wires. */
export const wiringMode = (circuit: CircuitDocument): WiringMode =>
  circuit['wiring'] === 'manual' ? 'manual' : 'auto';

/** Picks free pins for a new component, preferring the usual ones from examples. */
export function newComponent(
  type: string,
  circuit: CircuitDocument,
  board: BoardDefinition,
): ComponentInstance | null {
  const definition = findComponent(type);
  if (!definition && !PASSIVE_PARTS.has(type)) return null;
  const used = new Set(circuitComponents(circuit).flatMap((item) => Object.values(item.pins)));
  const pins: Record<string, string> = {};
  for (const spec of definition?.pins ?? []) {
    const available = pinsFor(board, spec.kind).filter((pin) => !used.has(pin));
    const pin = available.includes(spec.defaultPin) ? spec.defaultPin : available[0];
    if (pin === undefined) return null;
    pins[spec.name] = pin;
    used.add(pin);
  }
  let index = 1;
  const ids = new Set(circuit.components.map((item) => item.id));
  while (ids.has(`${type}${index}`)) index++;
  return { id: `${type}${index}`, type, pins };
}

type CircuitComponents = CircuitDocument['components'];

/** Writes component instances back into the circuit document. */
export function withComponents(circuit: CircuitDocument, items: CircuitItem[]): CircuitDocument {
  // Component instances are plain JSON objects, which is what circuit.json stores.
  return { ...circuit, components: items as unknown as CircuitComponents };
}

export function updateComponent(
  circuit: CircuitDocument,
  id: string,
  change: (item: CircuitItem) => CircuitItem,
): CircuitDocument {
  return withComponents(
    circuit,
    circuitComponents(circuit).map((item) => (item.id === id ? change(item) : item)),
  );
}

/** Board pins used by more than one component, which usually means a wiring mistake. */
export function sharedPins(items: CircuitItem[]): Set<string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const pin of Object.values(item.pins)) counts.set(pin, (counts.get(pin) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([pin]) => pin));
}

/**
 * Moves parts on the I2C bus to the bus pins of another board: the bus has
 * fixed pins, so A4 and A5 on an Uno become 20 and 21 on a Mega.
 */
export function withBoardBus(circuit: CircuitDocument, board: BoardDefinition): CircuitDocument {
  let changed = false;
  const items = circuitComponents(circuit).map((item) => {
    const definition = findComponent(item.type);
    if (!definition) return item;
    const pins = { ...item.pins };
    for (const spec of definition.pins) {
      const bus = spec.kind === 'sda' ? board.i2c.sda : spec.kind === 'scl' ? board.i2c.scl : null;
      if (bus && pins[spec.name] !== bus) {
        pins[spec.name] = bus;
        changed = true;
      }
    }
    return { ...item, pins };
  });
  return changed ? withComponents(circuit, items) : circuit;
}
