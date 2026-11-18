import type { BoardDefinition } from '@ideblock/boards';
import { PIN_STEP, esp32Layout, unoLayout } from './board-layout';

export { boardLayout, type BoardLayout } from './board-layout';

const CHIP_NAME = 'ESP32';

interface BoardDrawingProps {
  board: BoardDefinition;
  /** Shown above the board name, e.g. "Compatible board". */
  caption: string;
  /** Lit while the program runs, like the power LED on a real board. */
  powered: boolean;
  /** Brightness of the LED wired to the built-in LED pin, from 0 to 1. */
  builtinLed?: number;
}

/** Generic board drawings: they show where each pin is but carry no brand marks. */
export function BoardDrawing(props: BoardDrawingProps) {
  if (props.board.drawing === 'esp32') return <Esp32Drawing {...props} />;
  return <UnoDrawing {...props} />;
}

/** The small LED most boards carry on one pin, labelled L on Uno-style boards. */
function BuiltinLed({
  x,
  y,
  brightness,
  colour,
}: {
  x: number;
  y: number;
  brightness: number;
  colour: string;
}) {
  return (
    <g>
      {brightness > 0 && (
        <circle cx={x + 7} cy={y + 4} r="9" fill={colour} opacity={0.35 * brightness} />
      )}
      <rect
        x={x}
        y={y}
        width="14"
        height="8"
        rx="2"
        fill={brightness > 0 ? colour : '#5b4a2a'}
        opacity={brightness > 0 ? 0.5 + brightness / 2 : 1}
      />
      <text x={x + 18} y={y + 8} fill="#fff" fontSize="9" fontWeight="700">
        L
      </text>
    </g>
  );
}

const shortName = (board: BoardDefinition): string =>
  board.name
    .replace(/^Arduino\s+/, '')
    .replace(/\s*\(.*\)$/, '')
    .toUpperCase();

function UnoDrawing({ board, caption, powered, builtinLed = 0 }: BoardDrawingProps) {
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
      <BuiltinLed x={66} y={100} brightness={builtinLed} colour="#ffb300" />
      <rect x="58" y="20" width="22" height="16" rx="3" fill="#d23" />
    </svg>
  );
}

function Esp32Drawing({ caption, powered, builtinLed = 0 }: BoardDrawingProps) {
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
      <BuiltinLed x={110} y={140} brightness={builtinLed} colour="#4fa3ff" />
    </svg>
  );
}
