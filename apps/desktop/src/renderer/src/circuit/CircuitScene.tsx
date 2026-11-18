import type { BoardDefinition } from '@ideblock/boards';
import type { ComponentInput, ComponentState } from '@ideblock/simulator';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { VISUALS } from '../simulator/catalog';
import type { CircuitItem } from '../simulator/circuit';
import { WokwiElement } from '../simulator/WokwiElement';
import { BoardDrawing, boardLayout } from './boards';
import { SHAPES, pinSide, wireMidpoint, wirePath, type Anchor, type Point } from './geometry';

export const BOARD_ORIGIN: Point = { x: 60, y: 200 };
const MARGIN = 40;
// Room below the board for ground wires, which bend downwards.
const WIRE_ROOM = 90;
const COLUMN_WIDTH = 150;
const SIGNAL_COLOURS = ['#1e88e5', '#2fa84f', '#f59f00', '#8e24aa', '#00897b', '#d81b60'];
const GROUND_COLOUR = '#20242b';
const SUPPLY_COLOUR = '#e53935';

const usesAnalogPin = (item: CircuitItem): boolean =>
  Object.values(item.pins).some((pin) => pin.startsWith('A'));

/**
 * Components without a saved position are lined up next to the header they
 * connect to: digital ones above the board, analog ones below it, so wires
 * stay short.
 */
export function defaultPositions(items: CircuitItem[], board: BoardDefinition): Map<string, Point> {
  const layout = boardLayout(board);
  const positions = new Map<string, Point>();
  let above = 0;
  let below = 0;
  for (const item of items) {
    if (item.x !== undefined && item.y !== undefined) {
      positions.set(item.id, { x: item.x, y: item.y });
    } else if (usesAnalogPin(item) && board.architecture !== 'esp32') {
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

interface Wire {
  key: string;
  path: string;
  colour: string;
  resistorAt?: Point;
  label?: { at: Point; text: string };
}

function pinLabel(pin: string, board: BoardDefinition): string {
  if (!/^\d+$/.test(pin)) return pin;
  return board.architecture === 'esp32' ? `GPIO ${pin}` : `D${pin}`;
}

interface CircuitSceneProps {
  board: BoardDefinition;
  items: CircuitItem[];
  /** Live component states from the simulation, when it runs. */
  states?: Record<string, ComponentState>;
  inputs?: Record<string, ComponentInput>;
  running: boolean;
  /** Fit the drawing to the available space instead of using `zoom`. */
  fit?: boolean;
  zoom?: number;
  selectedId?: string | null;
  editable?: boolean;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, position: Point) => void;
  onInput?: (id: string, input: ComponentInput) => void;
  names: Record<string, string>;
}

export function CircuitScene({
  board,
  items,
  states = {},
  inputs = {},
  running,
  fit = false,
  zoom = 1,
  selectedId = null,
  editable = false,
  onSelect,
  onMove,
  onInput,
  names,
}: CircuitSceneProps) {
  const { t } = useTranslation();
  const outerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [dragging, setDragging] = useState<{ id: string; position: Point } | null>(null);
  const dragStart = useRef<{ pointer: Point; origin: Point } | null>(null);
  const layout = boardLayout(board);

  const placed = useMemo(() => {
    const defaults = defaultPositions(items, board);
    return items.map((item) => {
      const position =
        dragging?.id === item.id ? dragging.position : (defaults.get(item.id) ?? { x: 0, y: 0 });
      return { item, position, shape: SHAPES[item.type] };
    });
  }, [items, board, dragging]);

  const size = useMemo(() => {
    let width = BOARD_ORIGIN.x + layout.width;
    let height = BOARD_ORIGIN.y + layout.height + WIRE_ROOM;
    for (const { position, shape } of placed) {
      if (!shape) continue;
      width = Math.max(width, position.x + shape.width);
      height = Math.max(height, position.y + shape.height + 24);
    }
    return { width: width + MARGIN, height: height + MARGIN };
  }, [placed, layout]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!fit || !outer) return;
    const update = (): void => {
      const scale = Math.min(outer.clientWidth / size.width, outer.clientHeight / size.height);
      setFitScale(Math.max(0.2, Math.min(scale, 1.4)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [fit, size]);

  const scale = fit ? fitScale : zoom;

  const wires = useMemo(() => {
    const result: Wire[] = [];
    const boardAnchor = (anchor: Anchor): Anchor => ({
      ...anchor,
      x: BOARD_ORIGIN.x + anchor.x,
      y: BOARD_ORIGIN.y + anchor.y,
    });
    placed.forEach(({ item, position, shape }, index) => {
      // Wires leave the component outwards, so labels sit just past its pins.
      const labelOffset: Record<string, Point> = {
        top: { x: 0, y: -16 },
        bottom: { x: 0, y: 26 },
        left: { x: -28, y: 0 },
        right: { x: 28, y: 0 },
      };
      if (!shape) return;
      const at = (pinName: string): Anchor => {
        const pin = shape.pins[pinName] ?? { x: shape.width / 2, y: shape.height };
        return { x: position.x + pin.x, y: position.y + pin.y, side: pinSide(shape, pin) };
      };
      const colour = SIGNAL_COLOURS[index % SIGNAL_COLOURS.length]!;
      for (const [signal, elementPin] of Object.entries(shape.signals)) {
        const boardPin = item.pins[signal];
        if (!boardPin) continue;
        const anchor = layout.anchors[boardPin];
        // Pins missing from the drawing still get a wire to the board edge.
        const target = boardAnchor(
          anchor ?? { x: layout.width, y: layout.height / 2, side: 'right' },
        );
        const from = at(elementPin);
        result.push({
          key: `${item.id}-${signal}`,
          path: wirePath(target, from),
          colour,
          ...(item.type === 'led' ? { resistorAt: wireMidpoint(target, from) } : {}),
          label: {
            at: {
              x: from.x + labelOffset[from.side]!.x,
              y: from.y + labelOffset[from.side]!.y,
            },
            text: pinLabel(boardPin, board),
          },
        });
      }
      for (const pin of shape.ground) {
        const from = at(pin);
        const ground = layout.grounds
          .map(boardAnchor)
          .sort(
            (a, b) =>
              Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
          )[0]!;
        result.push({
          key: `${item.id}-gnd-${pin}`,
          path: wirePath(ground, from),
          colour: GROUND_COLOUR,
        });
      }
      for (const pin of shape.supply) {
        result.push({
          key: `${item.id}-vcc-${pin}`,
          path: wirePath(boardAnchor(layout.supply), at(pin)),
          colour: SUPPLY_COLOUR,
        });
      }
    });
    return result;
  }, [placed, layout, board]);

  const startDrag = (event: PointerEvent<HTMLDivElement>, id: string, origin: Point): void => {
    onSelect?.(id);
    if (!editable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointer: { x: event.clientX, y: event.clientY }, origin };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>, id: string): void => {
    const start = dragStart.current;
    if (!start) return;
    const position = {
      x: Math.max(0, Math.round(start.origin.x + (event.clientX - start.pointer.x) / scale)),
      y: Math.max(0, Math.round(start.origin.y + (event.clientY - start.pointer.y) / scale)),
    };
    setDragging({ id, position });
  };

  const endDrag = (id: string): void => {
    if (dragStart.current && dragging?.id === id) onMove?.(id, dragging.position);
    dragStart.current = null;
    setDragging(null);
  };

  return (
    <div
      ref={outerRef}
      className={fit ? 'scene scene--fit' : 'scene'}
      data-testid="circuit-scene"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect?.(null);
      }}
    >
      <div
        className="scene__canvas"
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale})`,
          ...(fit
            ? {}
            : { marginRight: size.width * (scale - 1), marginBottom: size.height * (scale - 1) }),
        }}
      >
        <div className="scene__board" style={{ left: BOARD_ORIGIN.x, top: BOARD_ORIGIN.y }}>
          <BoardDrawing board={board} caption={t('circuit.compatibleBoard')} powered={running} />
        </div>

        {placed.map(({ item, position, shape }) => {
          const visual = VISUALS[item.type];
          if (!shape || !visual) return null;
          const events =
            visual.control === 'press'
              ? {
                  'button-press': () => onInput?.(item.id, { pressed: true }),
                  'button-release': () => onInput?.(item.id, { pressed: false }),
                }
              : item.type === 'potentiometer'
                ? {
                    input: (event: Event) =>
                      onInput?.(item.id, { value: Number((event as CustomEvent).detail) }),
                  }
                : undefined;
          return (
            <div
              key={item.id}
              className={`scene__item${selectedId === item.id ? ' scene__item--selected' : ''}`}
              style={{ left: position.x, top: position.y, width: shape.width }}
              data-testid={`scene-item-${item.id}`}
              data-state={states[item.id] ? JSON.stringify(states[item.id]) : undefined}
              onPointerDown={(event) => startDrag(event, item.id, position)}
              onPointerMove={(event) => moveDrag(event, item.id)}
              onPointerUp={() => endDrag(item.id)}
              onPointerCancel={() => endDrag(item.id)}
            >
              <WokwiElement
                tag={shape.tag}
                label={names[item.id] ?? item.type}
                properties={visual.properties(states[item.id], inputs[item.id], item.props)}
                {...(events && running ? { events } : {})}
              />
              <span className="scene__name">{names[item.id]}</span>
            </div>
          );
        })}

        <svg className="scene__wires" width={size.width} height={size.height} aria-hidden="true">
          {wires.map((wire) => (
            <g key={wire.key}>
              <path
                d={wire.path}
                stroke={wire.colour}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              {wire.resistorAt && (
                <g transform={`translate(${wire.resistorAt.x - 16} ${wire.resistorAt.y - 6})`}>
                  <rect width="32" height="12" rx="6" fill="#d9b48a" stroke="#a5835c" />
                  <rect x="8" width="4" height="12" fill="#8b4513" />
                  <rect x="15" width="4" height="12" fill="#222" />
                  <rect x="22" width="4" height="12" fill="#c80" />
                </g>
              )}
              {wire.label && (
                <g transform={`translate(${wire.label.at.x} ${wire.label.at.y})`}>
                  <rect x="-24" y="-10" width="48" height="20" rx="10" fill={wire.colour} />
                  <text textAnchor="middle" y="4" fontSize="11" fontWeight="700" fill="#fff">
                    {wire.label.text}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
