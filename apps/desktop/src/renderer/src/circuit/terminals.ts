import { pinLabel, type BoardDefinition } from '@ideblock/boards';
import type { CircuitItem } from '../simulator/circuit';
import { describeHole } from './breadboard';
import { legName } from './legs';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Names a terminal for people: "Board pin 13", "Column 12, row e" or "LED: long leg (+)". */
export function describeTerminal(
  t: unknown,
  board: BoardDefinition,
  items: readonly CircuitItem[],
  names: Record<string, string>,
  id: string,
): string {
  const translate = t as Translate;
  const owner = id.slice(0, id.indexOf(':'));
  const part = id.slice(id.indexOf(':') + 1);
  if (owner === 'board') {
    return translate('circuit.boardPin', { pin: pinLabel(board, part.split('.')[0]!) });
  }
  const type = items.find((item) => item.id === owner)?.type ?? '';
  const hole = describeHole(part);
  if (hole && type === 'breadboard') {
    return /^[a-j]$/.test(hole.row)
      ? translate('circuit.hole', { column: hole.column, row: hole.row })
      : translate(hole.row.endsWith('p') ? 'circuit.railPlus' : 'circuit.railMinus');
  }
  return translate('circuit.leg', { name: names[owner] ?? owner, leg: legName(t, type, part) });
}
