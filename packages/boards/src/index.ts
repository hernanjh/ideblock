import { BOARDS, DEFAULT_BOARD_ID } from './definitions';
import type { BoardDefinition } from './types';

export * from './definitions';
export type * from './types';

export function findBoard(id: string): BoardDefinition | undefined {
  return BOARDS.find((board) => board.id === id);
}

export function getBoard(id: string): BoardDefinition {
  const board = findBoard(id) ?? findBoard(DEFAULT_BOARD_ID);
  if (!board) {
    throw new Error('Default board is not registered');
  }
  return board;
}

/** Output-capable pins: every digital pin except input-only ones. */
export function outputPins(board: BoardDefinition): readonly string[] {
  if (board.architecture === 'esp32') {
    return board.pwmPins;
  }
  return board.digitalPins;
}
