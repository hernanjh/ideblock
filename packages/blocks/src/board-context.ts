import { getBoard, outputPins, type BoardDefinition } from '@ideblock/boards';

export type PinKind = 'digital' | 'output' | 'analog' | 'pwm' | 'sda' | 'scl';

let activeBoard: BoardDefinition = getBoard('uno');

/** The board whose pins are offered in pin dropdowns. */
export function setActiveBoard(board: BoardDefinition): void {
  activeBoard = board;
}

export function getActiveBoard(): BoardDefinition {
  return activeBoard;
}

export function pinsFor(board: BoardDefinition, kind: PinKind): readonly string[] {
  switch (kind) {
    case 'analog':
      return board.analogInputPins;
    case 'pwm':
      return board.pwmPins;
    case 'output':
      return outputPins(board);
    case 'digital':
      return board.digitalPins;
    case 'sda':
      return [board.i2c.sda];
    case 'scl':
      return [board.i2c.scl];
  }
}
