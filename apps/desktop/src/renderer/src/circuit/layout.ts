import type { BoardDefinition } from '@ideblock/boards';
import type { CircuitItem } from '../simulator/circuit';
import { boardLayout } from './boards';
import type { Point } from './geometry';

export const BOARD_ORIGIN: Point = { x: 60, y: 200 };
// Room below the board for ground wires, which bend downwards.
export const WIRE_ROOM = 90;
const COLUMN_WIDTH = 150;
const BREADBOARD_GAP = 70;

const usesAnalogPin = (item: CircuitItem, board: BoardDefinition): boolean =>
  Object.values(item.pins).some((pin) => board.analogInputPins.includes(pin));

/**
 * Components without a saved position are lined up next to the header they
 * connect to: digital ones above the board, analog ones below it, so wires
 * stay short. A breadboard goes to the right of the board.
 */
export function defaultPositions(items: CircuitItem[], board: BoardDefinition): Map<string, Point> {
  const layout = boardLayout(board);
  const positions = new Map<string, Point>();
  let above = 0;
  let below = 0;
  let breadboards = 0;
  for (const item of items) {
    if (item.x !== undefined && item.y !== undefined) {
      positions.set(item.id, { x: item.x, y: item.y });
    } else if (item.type === 'breadboard') {
      positions.set(item.id, {
        x: BOARD_ORIGIN.x + layout.width + BREADBOARD_GAP,
        y: BOARD_ORIGIN.y + breadboards++ * 230,
      });
    } else if (usesAnalogPin(item, board) && board.drawing !== 'esp32') {
      positions.set(item.id, {
        x: BOARD_ORIGIN.x + below++ * COLUMN_WIDTH,
        y: BOARD_ORIGIN.y + layout.height + WIRE_ROOM + 30,
      });
    } else {
      positions.set(item.id, { x: BOARD_ORIGIN.x + 10 + above++ * COLUMN_WIDTH, y: 24 });
    }
  }
  return positions;
}

/** Board pin positions in scene coordinates, keyed by pin name. */
export function boardPinPositions(board: BoardDefinition): Record<string, Point> {
  const { anchors } = boardLayout(board);
  return Object.fromEntries(
    Object.entries(anchors).map(([pin, anchor]) => [
      pin,
      { x: BOARD_ORIGIN.x + anchor.x, y: BOARD_ORIGIN.y + anchor.y },
    ]),
  );
}

/** Name of the board pin that powers parts: 5V on most boards, 3V3 on ESP32. */
export function supplyPin(board: BoardDefinition): string {
  const layout = boardLayout(board);
  return Object.entries(layout.anchors).find(([, anchor]) => anchor === layout.supply)?.[0] ?? '5V';
}
