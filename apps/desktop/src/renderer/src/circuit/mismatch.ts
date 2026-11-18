import type { BoardDefinition } from '@ideblock/boards';
import type { PartUse } from '@ideblock/blocks';
import type { CircuitDocument } from '@ideblock/project';
import { circuitComponents, wiringMode, type CircuitItem } from '../simulator/circuit';
import { simulatedComponents } from './model';

/** A part the program drives that the circuit does not have on those pins. */
export interface Mismatch {
  use: PartUse;
  /** Another component already on one of those pins, if any. */
  occupant: CircuitItem | null;
}

const fits = (item: CircuitItem, use: PartUse): boolean =>
  item.type === use.type &&
  Object.entries(use.pins).every(([name, pin]) => item.pins[name] === pin);

export function programMismatches(
  uses: PartUse[],
  circuit: CircuitDocument,
  board: BoardDefinition,
): Mismatch[] {
  const wired = simulatedComponents(circuit, board);
  // With hand wiring, a part that is placed but not fully wired is already
  // reported by the circuit check; repeating it here would only add noise.
  const placedTypes =
    wiringMode(circuit) === 'manual'
      ? new Set(circuitComponents(circuit).map((item) => item.type))
      : new Set<string>();
  return uses
    .filter((use) => !wired.some((item) => fits(item, use)) && !placedTypes.has(use.type))
    .map((use) => {
      const pins = new Set(Object.values(use.pins));
      const occupant =
        wired.find((item) => Object.values(item.pins).some((pin) => pins.has(pin))) ?? null;
      return { use, occupant };
    });
}
