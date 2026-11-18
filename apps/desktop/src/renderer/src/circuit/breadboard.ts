import type { Point } from './geometry';

/** Hole spacing: 0.1 inch at the scale wokwi-elements are drawn at. */
export const PITCH = 9.6;
export const BREADBOARD_COLUMNS = 30;
const LEFT = 22;
const MAIN_TOP = 50;
const RAIL_TOP = 16;
// The centre gap is three holes wide, like on a real board.
const ROW_Y = (row: number): number => MAIN_TOP + (row < 5 ? row : row + 2) * PITCH;
const BOTTOM_RAIL = ROW_Y(9) + 22;

export const BREADBOARD_SIZE = {
  width: LEFT * 2 + (BREADBOARD_COLUMNS - 1) * PITCH,
  height: BOTTOM_RAIL + PITCH + 18,
};

export const MAIN_ROWS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] as const;

export type RailName = 'tp' | 'tn' | 'bp' | 'bn';
export const RAILS: Record<RailName, { y: number; positive: boolean }> = {
  tp: { y: RAIL_TOP, positive: true },
  tn: { y: RAIL_TOP + PITCH, positive: false },
  bp: { y: BOTTOM_RAIL, positive: true },
  bn: { y: BOTTOM_RAIL + PITCH, positive: false },
};

export interface Hole extends Point {
  /** Hole name, e.g. "f12" or "tp3". */
  name: string;
  /** Holes with the same strip are joined inside the breadboard. */
  strip: string;
}

export const columnX = (column: number): number => LEFT + (column - 1) * PITCH;

/** Rails have holes in groups of five, with a gap after each group. */
const hasRailHole = (column: number): boolean => column % 6 !== 0;

function buildHoles(): Hole[] {
  const holes: Hole[] = [];
  for (let column = 1; column <= BREADBOARD_COLUMNS; column++) {
    MAIN_ROWS.forEach((row, index) => {
      holes.push({
        name: `${row}${column}`,
        strip: `${column}${index < 5 ? 'top' : 'bottom'}`,
        x: columnX(column),
        y: ROW_Y(index),
      });
    });
    if (!hasRailHole(column)) continue;
    for (const [rail, { y }] of Object.entries(RAILS)) {
      holes.push({ name: `${rail}${column}`, strip: rail, x: columnX(column), y });
    }
  }
  return holes;
}

/** Every hole, in breadboard coordinates. */
export const BREADBOARD_HOLES: readonly Hole[] = buildHoles();

const HOLE_BY_NAME = new Map(BREADBOARD_HOLES.map((hole) => [hole.name, hole]));

export const findHole = (name: string): Hole | undefined => HOLE_BY_NAME.get(name);

/** Splits "f12" into its row and column, or a rail name and column. */
export function describeHole(name: string): { row: string; column: number } | null {
  const match = /^([a-j]|tp|tn|bp|bn)(\d+)$/.exec(name);
  if (!match) return null;
  return { row: match[1]!, column: Number(match[2]) };
}
