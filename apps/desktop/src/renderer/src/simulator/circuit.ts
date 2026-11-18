import type { BoardDefinition } from '@ideblock/boards';
import { pinsFor } from '@ideblock/blocks';
import type { CircuitDocument } from '@ideblock/project';
import { findComponent, type ComponentInstance } from '@ideblock/simulator';

/** Circuit components with the fields the simulator needs; others are ignored. */
export function circuitComponents(circuit: CircuitDocument): ComponentInstance[] {
  return circuit.components.flatMap((component) => {
    const pins = (component as { pins?: unknown }).pins;
    if (typeof pins !== 'object' || pins === null) return [];
    return [
      {
        id: component.id,
        type: component.type,
        pins: pins as Record<string, string>,
        ...(typeof component['props'] === 'object' && component['props'] !== null
          ? { props: component['props'] as Record<string, unknown> }
          : {}),
      },
    ];
  });
}

/** Picks free pins for a new component, preferring the usual ones from examples. */
export function newComponent(
  type: string,
  circuit: CircuitDocument,
  board: BoardDefinition,
): ComponentInstance | null {
  const definition = findComponent(type);
  if (!definition) return null;
  const used = new Set(circuitComponents(circuit).flatMap((item) => Object.values(item.pins)));
  const pins: Record<string, string> = {};
  for (const spec of definition.pins) {
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
