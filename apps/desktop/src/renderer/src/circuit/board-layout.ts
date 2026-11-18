import type { BoardDefinition } from '@ideblock/boards';
import type { Anchor } from './geometry';

export interface BoardLayout {
  width: number;
  height: number;
  /** Where each pin of the board can be wired, in board coordinates. */
  anchors: Record<string, Anchor>;
  /** Every GND pin; wires use the nearest one. */
  grounds: Anchor[];
  supply: Anchor;
  supplyLabel: string;
}

export const PIN_STEP = 13;

export interface HeaderPin {
  name: string;
  label: string;
}

/** Board in the shape of an Uno, also used for the Nano and Mega, without trademarks. */
export function unoLayout(
  board: BoardDefinition,
): BoardLayout & { top: HeaderPin[]; bottom: HeaderPin[] } {
  const digital: HeaderPin[] = [
    '13',
    '12',
    '11',
    '10',
    '9',
    '8',
    '7',
    '6',
    '5',
    '4',
    '3',
    '2',
    '1',
    '0',
  ].map((name) => ({ name, label: name }));
  const top: HeaderPin[] = [{ name: 'GND.top', label: 'GND' }, ...digital];
  const analogNames = board.analogInputPins.slice(0, 8);
  const bottom: HeaderPin[] = [
    { name: '5V', label: '5V' },
    { name: 'GND', label: 'GND' },
    ...analogNames.map((name) => ({ name, label: name })),
  ];
  const anchors: Record<string, Anchor> = {};
  top.forEach((pin, index) => {
    const gap = index > 7 ? 8 : 0;
    anchors[pin.name] = { x: 120 + index * PIN_STEP + gap, y: 30, side: 'top' };
  });
  bottom.forEach((pin, index) => {
    const gap = index > 1 ? 40 : 0;
    anchors[pin.name] = { x: 120 + index * PIN_STEP + gap, y: 222, side: 'bottom' };
  });
  return {
    width: 360,
    height: 250,
    anchors,
    grounds: [anchors['GND']!, anchors['GND.top']!],
    supply: anchors['5V']!,
    supplyLabel: '5V',
    top,
    bottom,
  };
}

const ESP32_LEFT = [
  '3V3',
  'GND',
  '36',
  '39',
  '34',
  '35',
  '32',
  '33',
  '25',
  '26',
  '27',
  '14',
  '12',
  '13',
];
const ESP32_RIGHT = [
  'GND.right',
  '23',
  '22',
  '21',
  '19',
  '18',
  '5',
  '17',
  '16',
  '4',
  '0',
  '2',
  '15',
];

export function esp32Layout(): BoardLayout {
  const anchors: Record<string, Anchor> = {};
  ESP32_LEFT.forEach((name, index) => {
    anchors[name] = { x: 14, y: 40 + index * 17, side: 'left' };
  });
  ESP32_RIGHT.forEach((name, index) => {
    anchors[name] = { x: 176, y: 40 + index * 17, side: 'right' };
  });
  return {
    width: 190,
    height: 300,
    anchors,
    grounds: [anchors['GND']!, anchors['GND.right']!],
    supply: anchors['3V3']!,
    supplyLabel: '3V3',
  };
}

/**
 * Boards without a dedicated drawing: their pins in one row along the top and
 * analog pins, power and ground along the bottom.
 */
function genericLayout(
  board: BoardDefinition,
): BoardLayout & { top: HeaderPin[]; bottom: HeaderPin[] } {
  const analog = new Set(board.analogInputPins);
  const top: HeaderPin[] = [
    { name: 'GND.top', label: 'GND' },
    ...board.digitalPins.filter((pin) => !analog.has(pin)).map((name) => ({ name, label: name })),
  ];
  const bottom: HeaderPin[] = [
    { name: '5V', label: board.architecture === 'avr' ? '5V' : '3V3' },
    { name: 'GND', label: 'GND' },
    ...board.analogInputPins.map((name) => ({ name, label: name })),
  ];
  const width = Math.max(240, 120 + Math.max(top.length, bottom.length) * PIN_STEP + 30);
  const anchors: Record<string, Anchor> = {};
  top.forEach((pin, index) => {
    anchors[pin.name] = { x: 110 + index * PIN_STEP, y: 30, side: 'top' };
  });
  bottom.forEach((pin, index) => {
    anchors[pin.name] = { x: 110 + index * PIN_STEP, y: 222, side: 'bottom' };
  });
  return {
    width,
    height: 250,
    anchors,
    grounds: [anchors['GND']!, anchors['GND.top']!],
    supply: anchors['5V']!,
    supplyLabel: bottom[0]!.label,
    top,
    bottom,
  };
}

export function boardLayout(board: BoardDefinition): BoardLayout {
  if (board.drawing === 'esp32') return esp32Layout();
  if (board.drawing === 'generic') return genericLayout(board);
  return unoLayout(board);
}
