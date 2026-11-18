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

const PIN_STEP = 13;
const CHIP_NAME = 'ESP32';

interface HeaderPin {
  name: string;
  label: string;
}

/** Board in the shape of an Uno, also used for the Nano and Mega, without trademarks. */
function unoLayout(
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

function esp32Layout(): BoardLayout {
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

interface BoardDrawingProps {
  board: BoardDefinition;
  /** Shown above the board name, e.g. "Compatible board". */
  caption: string;
  /** Lit while the program runs, like the power LED on a real board. */
  powered: boolean;
}

/** Generic board drawings: they show where each pin is but carry no brand marks. */
export function BoardDrawing({ board, caption, powered }: BoardDrawingProps) {
  if (board.drawing === 'esp32') {
    return <Esp32Drawing board={board} caption={caption} powered={powered} />;
  }
  return <UnoDrawing board={board} caption={caption} powered={powered} />;
}

const shortName = (board: BoardDefinition): string =>
  board.name
    .replace(/^Arduino\s+/, '')
    .replace(/\s*\(.*\)$/, '')
    .toUpperCase();

function UnoDrawing({ board, caption, powered }: BoardDrawingProps) {
  const layout = unoLayout(board);
  return (
    <svg width={layout.width} height={layout.height} className="board-drawing" aria-hidden="true">
      <rect
        x="6"
        y="6"
        width="348"
        height="238"
        rx="14"
        fill="#1b6fb0"
        stroke="#0f456f"
        strokeWidth="2"
      />
      <rect x="-8" y="44" width="56" height="48" rx="4" fill="#c9ced6" stroke="#8b939f" />
      <rect x="-4" y="150" width="44" height="42" rx="6" fill="#2b2f36" />
      <rect
        x="100"
        y="22"
        width={layout.top.length * PIN_STEP + 30}
        height="16"
        rx="2"
        fill="#20242b"
      />
      <rect
        x="100"
        y="214"
        width={layout.bottom.length * PIN_STEP + 60}
        height="16"
        rx="2"
        fill="#20242b"
      />
      {[...layout.top, ...layout.bottom].map((pin) => {
        const anchor = layout.anchors[pin.name]!;
        const labelY = anchor.side === 'top' ? 52 : 204;
        return (
          <g key={pin.name}>
            <circle cx={anchor.x} cy={anchor.y} r="3.4" fill="#e8c766" />
            <text
              x={anchor.x}
              y={labelY}
              fill="#fff"
              fontSize="9"
              textAnchor="end"
              transform={`rotate(-90 ${anchor.x} ${labelY})`}
              dy="3"
            >
              {pin.label}
            </text>
          </g>
        );
      })}
      <rect x="136" y="132" width="150" height="32" rx="3" fill="#1d2026" />
      <text x="136" y="98" fill="#fff" fontSize="12" fontWeight="700">
        {caption}
      </text>
      <text x="136" y="120" fill="#fff" fontSize="20" fontWeight="700">
        {shortName(board)}
      </text>
      <rect x="66" y="70" width="14" height="8" rx="2" fill={powered ? '#7cfc00' : '#3c5a3c'} />
      <rect x="58" y="20" width="22" height="16" rx="3" fill="#d23" />
    </svg>
  );
}

function Esp32Drawing({ caption, powered }: BoardDrawingProps) {
  const layout = esp32Layout();
  return (
    <svg width={layout.width} height={layout.height} className="board-drawing" aria-hidden="true">
      <rect x="6" y="6" width="178" height="288" rx="12" fill="#1b1d21" stroke="#000" />
      <rect x="45" y="22" width="100" height="96" rx="4" fill="#b9b2a2" stroke="#8d8676" />
      <text x="95" y="66" textAnchor="middle" fill="#3b3a36" fontSize="16" fontWeight="700">
        {CHIP_NAME}
      </text>
      <text x="95" y="86" textAnchor="middle" fill="#3b3a36" fontSize="10">
        {caption}
      </text>
      {Object.entries(layout.anchors).map(([name, anchor]) => (
        <g key={name}>
          <circle cx={anchor.x} cy={anchor.y} r="4" fill="#e2c15b" />
          <text
            x={anchor.side === 'left' ? anchor.x + 9 : anchor.x - 9}
            y={anchor.y + 3}
            textAnchor={anchor.side === 'left' ? 'start' : 'end'}
            fill="#e6e6e6"
            fontSize="8"
          >
            {name.split('.')[0]}
          </text>
        </g>
      ))}
      <rect x="70" y="262" width="50" height="32" rx="6" fill="#c9ced6" stroke="#8b939f" />
      <rect x="60" y="140" width="14" height="8" rx="2" fill={powered ? '#ff5252' : '#5a2a2a'} />
    </svg>
  );
}
