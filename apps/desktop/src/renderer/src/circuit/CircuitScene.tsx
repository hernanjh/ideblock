import { pinLabel, type BoardDefinition } from '@ideblock/boards';
import type { ComponentInput, ComponentState } from '@ideblock/simulator';
import { Flame } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { VISUALS } from '../simulator/catalog';
import type { CircuitItem, WiringMode } from '../simulator/circuit';
import { WokwiElement } from '../simulator/WokwiElement';
import { BOARD_ORIGIN, WIRE_ROOM, defaultPositions } from './layout';
import { BoardDrawing, boardLayout, type BoardLayout } from './boards';
import { BREADBOARD_HOLES, BREADBOARD_SIZE, describeHole } from './breadboard';
import { BreadboardDrawing } from './BreadboardDrawing';
import {
  SHAPES,
  pinSide,
  wireMidpoint,
  wirePath,
  type Anchor,
  type ComponentShape,
  type Point,
} from './geometry';
import { analyse, visibleParts } from './model';
import { snapToHoles, type CircuitAnalysis, type CircuitWire } from './netlist';

const MARGIN = 40;
const SIGNAL_COLOURS = ['#1e88e5', '#2fa84f', '#f59f00', '#8e24aa', '#00897b', '#d81b60'];
const GROUND_COLOUR = '#20242b';
const SUPPLY_COLOUR = '#e53935';
/** How close the pointer must be to a terminal to grab or drop a wire on it. */
const GRAB_RADIUS = 7;

interface DrawnWire {
  key: string;
  path: string;
  colour: string;
  resistorAt?: Point;
  label?: { at: Point; text: string };
}

interface Placed {
  item: CircuitItem;
  position: Point;
  shape: ComponentShape | undefined;
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
  mode?: WiringMode;
  /** Hand-drawn wires, used with manual wiring. */
  wires?: CircuitWire[];
  selectedWireId?: string | null;
  /** Colour of new wires. */
  wireColour?: string;
  onSelect?: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  onAddWire?: (from: string, to: string) => void;
  /** New positions of the parts that moved; a breadboard carries the parts plugged into it. */
  onMove?: (moves: Record<string, Point>) => void;
  onInput?: (id: string, input: ComponentInput) => void;
  names: Record<string, string>;
}

/** Wires laid out from the pins chosen for each component. */
function automaticWires(placed: Placed[], layout: BoardLayout, board: BoardDefinition) {
  const result: DrawnWire[] = [];
  const boardAnchor = (anchor: Anchor): Anchor => ({
    ...anchor,
    x: BOARD_ORIGIN.x + anchor.x,
    y: BOARD_ORIGIN.y + anchor.y,
  });
  // Wires leave the component outwards, so labels sit just past its pins.
  const labelOffset: Record<string, Point> = {
    top: { x: 0, y: -16 },
    bottom: { x: 0, y: 26 },
    left: { x: -28, y: 0 },
    right: { x: 28, y: 0 },
  };
  placed.forEach(({ item, position, shape }, index) => {
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
        ...(shape.resistors ? { resistorAt: wireMidpoint(target, from) } : {}),
        label: {
          at: {
            x: from.x + labelOffset[from.side]!.x,
            y: from.y + labelOffset[from.side]!.y,
          },
          text: pinLabel(board, boardPin),
        },
      });
    }
    for (const pin of shape.ground) {
      const from = at(pin);
      const ground = layout.grounds
        .map(boardAnchor)
        .sort(
          (a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
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
}

/** A jumper wire bowing upwards between two terminals. */
function jumperPath(from: Point, to: Point): string {
  const lift = 14 + Math.hypot(to.x - from.x, to.y - from.y) * 0.22;
  return `M${from.x} ${from.y} C${from.x} ${from.y - lift}, ${to.x} ${to.y - lift}, ${to.x} ${to.y}`;
}

const isLit = (state: ComponentState | undefined): boolean =>
  Object.values(state ?? {}).some((value) =>
    typeof value === 'number' ? value > 0 : value === true,
  );

export function CircuitScene({
  board,
  items: allItems,
  states = {},
  inputs = {},
  running,
  fit = false,
  zoom = 1,
  selectedId = null,
  editable = false,
  mode = 'auto',
  wires = [],
  selectedWireId = null,
  wireColour = SIGNAL_COLOURS[0]!,
  onSelect,
  onSelectWire,
  onAddWire,
  onMove,
  onInput,
  names,
}: CircuitSceneProps) {
  const { t } = useTranslation();
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [dragging, setDragging] = useState<{ id: string; position: Point } | null>(null);
  const dragStart = useRef<{ pointer: Point; origin: Point } | null>(null);
  const [draft, setDraft] = useState<{ from: string; to: Point } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [fried, setFried] = useState<ReadonlySet<string>>(new Set());
  const layout = boardLayout(board);
  const manual = mode === 'manual';
  const items = useMemo(() => visibleParts(allItems, mode), [allItems, mode]);

  const basePositions = useMemo(() => defaultPositions(items, board), [items, board]);
  // Analysis of the circuit at rest, used to know what a breadboard carries.
  const resting = useMemo(
    () => (manual ? analyse(board, items, basePositions, wires) : null),
    [manual, board, items, basePositions, wires],
  );

  const positions = useMemo(() => {
    if (!dragging) return basePositions;
    const moved = new Map(basePositions);
    const origin = basePositions.get(dragging.id) ?? { x: 0, y: 0 };
    const dx = dragging.position.x - origin.x;
    const dy = dragging.position.y - origin.y;
    moved.set(dragging.id, dragging.position);
    for (const id of carriedBy(dragging.id, resting)) {
      const at = basePositions.get(id) ?? { x: 0, y: 0 };
      moved.set(id, { x: at.x + dx, y: at.y + dy });
    }
    return moved;
  }, [basePositions, dragging, resting]);

  const analysis = useMemo(
    () => (manual ? (dragging ? analyse(board, items, positions, wires) : resting) : null),
    [manual, dragging, board, items, positions, wires, resting],
  );

  const placed: Placed[] = useMemo(
    () =>
      items.map((item) => ({
        item,
        position: positions.get(item.id) ?? { x: 0, y: 0 },
        shape: SHAPES[item.type],
      })),
    [items, positions],
  );

  const size = useMemo(() => {
    let width = BOARD_ORIGIN.x + layout.width;
    let height = BOARD_ORIGIN.y + layout.height + WIRE_ROOM;
    for (const { item, position, shape } of placed) {
      const box = item.type === 'breadboard' ? BREADBOARD_SIZE : shape;
      if (!box) continue;
      width = Math.max(width, position.x + box.width);
      height = Math.max(height, position.y + box.height + 24);
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

  const burned = useMemo(
    () =>
      new Set(
        (analysis?.issues ?? []).flatMap((issue) =>
          issue.kind === 'noResistor' ? [issue.id] : [],
        ),
      ),
    [analysis],
  );

  // An LED without a resistor burns out the first time it lights, and stays
  // burnt until the simulation is stopped. Derived while rendering so the
  // burnt look appears in the same frame the LED would have lit.
  const litBurned = running ? [...burned].filter((id) => isLit(states[id])) : [];
  if (!running && fried.size > 0) setFried(new Set());
  if (litBurned.some((id) => !fried.has(id))) setFried(new Set([...fried, ...litBurned]));

  const autoWires = useMemo(
    () => (manual ? [] : automaticWires(placed, layout, board)),
    [manual, placed, layout, board],
  );

  const toScene = (event: PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  };

  const nearestTerminal = (at: Point): string | null => {
    let best: { id: string; distance: number } | null = null;
    for (const [id, point] of analysis?.terminals ?? []) {
      const distance = Math.hypot(point.x - at.x, point.y - at.y);
      if (distance <= GRAB_RADIUS && (!best || distance < best.distance)) best = { id, distance };
    }
    return best?.id ?? null;
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>, id: string, origin: Point): void => {
    onSelect?.(id);
    onSelectWire?.(null);
    if (!editable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointer: { x: event.clientX, y: event.clientY }, origin };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>, id: string): void => {
    const start = dragStart.current;
    if (!start) return;
    setDragging({
      id,
      position: {
        x: Math.max(0, Math.round(start.origin.x + (event.clientX - start.pointer.x) / scale)),
        y: Math.max(0, Math.round(start.origin.y + (event.clientY - start.pointer.y) / scale)),
      },
    });
  };

  const endDrag = (id: string): void => {
    if (dragStart.current && dragging?.id === id) {
      const item = items.find((candidate) => candidate.id === id)!;
      if (!manual) {
        onMove?.({ [id]: dragging.position });
      } else if (item.type === 'breadboard') {
        const moves: Record<string, Point> = {};
        for (const [movedId, at] of positions) {
          if (at !== basePositions.get(movedId)) moves[movedId] = at;
        }
        onMove?.(moves);
      } else {
        onMove?.({ [id]: snapToHoles(item, dragging.position, holePositions(placed, id)) });
      }
    }
    dragStart.current = null;
    setDragging(null);
  };

  const startWire = (event: PointerEvent<SVGElement>): void => {
    if (!manual || !editable || running) return;
    const from = nearestTerminal(toScene(event));
    if (!from) return;
    event.stopPropagation();
    // Without this, a text selection left by an earlier drag turns the
    // gesture into a native drag and the browser cancels the pointer.
    event.preventDefault();
    // Capture on the terminal itself: the layer around it lets clicks through.
    (event.target as Element).setPointerCapture(event.pointerId);
    setDraft({ from, to: toScene(event) });
    onSelectWire?.(null);
  };

  const trackPointer = (event: PointerEvent<SVGElement>): void => {
    const at = toScene(event);
    if (draft) setDraft({ ...draft, to: at });
    setHovered(nearestTerminal(at));
  };

  const finishWire = (event: PointerEvent<SVGElement>): void => {
    if (!draft) return;
    const to = nearestTerminal(toScene(event));
    if (to && to !== draft.from) onAddWire?.(draft.from, to);
    setDraft(null);
  };

  const describeTerminal = (id: string): string => {
    const [owner, part] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
    if (owner === 'board')
      return t('circuit.boardPin', { pin: pinLabel(board, part.split('.')[0]!) });
    const hole = describeHole(part);
    if (hole && items.find((item) => item.id === owner)?.type === 'breadboard') {
      return /^[a-j]$/.test(hole.row)
        ? t('circuit.hole', { column: hole.column, row: hole.row })
        : t(hole.row.endsWith('p') ? 'circuit.railPlus' : 'circuit.railMinus');
    }
    return t('circuit.leg', {
      name: names[owner] ?? owner,
      // Leg names such as "1.l" contain the key separator.
      leg: t(`legs.${part.replace('.', '_')}` as never, { defaultValue: part }),
    });
  };

  const highlighted = useMemo(() => {
    const focus = draft?.from ?? hovered;
    return new Set(focus && analysis ? analysis.netOf(focus) : []);
  }, [draft, hovered, analysis]);

  const hoveredAt = hovered ? analysis?.terminals.get(hovered) : undefined;

  const wireHandlers = {
    onPointerDown: startWire,
    onPointerMove: trackPointer,
    onPointerUp: finishWire,
    onPointerCancel: () => setDraft(null),
    onPointerOut: () => !draft && setHovered(null),
  };

  const breadboardIds = new Set(
    items.filter((item) => item.type === 'breadboard').map((item) => item.id),
  );
  // Breadboard holes sit under the parts, so a plugged-in part can still be
  // grabbed; legs and board pins stay on top.
  const terminalDots = (holes: boolean) =>
    [...(analysis?.terminals ?? [])]
      .filter(([id]) => breadboardIds.has(id.slice(0, id.indexOf(':'))) === holes)
      .map(([id, at]) => (
        <circle
          key={id}
          className={`scene__terminal${highlighted.has(id) ? ' scene__terminal--lit' : ''}`}
          cx={at.x}
          cy={at.y}
          r={id.startsWith('board:') ? 4.5 : 3.5}
          data-terminal={id}
        />
      ));

  return (
    <div
      ref={outerRef}
      className={fit ? 'scene scene--fit' : 'scene'}
      data-testid="circuit-scene"
      data-wiring={mode}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelect?.(null);
          onSelectWire?.(null);
        }
      }}
    >
      <div
        ref={canvasRef}
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
          if (item.type === 'breadboard') {
            const prefix = `${item.id}:`;
            const lit = new Set(
              [...highlighted]
                .filter((id) => id.startsWith(prefix))
                .map((id) => id.slice(prefix.length)),
            );
            return (
              <div
                key={item.id}
                className={`scene__item scene__item--flat${selectedId === item.id ? ' scene__item--selected' : ''}`}
                style={{ left: position.x, top: position.y }}
                data-testid={`scene-item-${item.id}`}
                onPointerDown={(event) => startDrag(event, item.id, position)}
                onPointerMove={(event) => moveDrag(event, item.id)}
                onPointerUp={() => endDrag(item.id)}
                onPointerCancel={() => endDrag(item.id)}
              >
                <BreadboardDrawing highlight={lit} />
              </div>
            );
          }
          const visual = VISUALS[item.type];
          if (!shape || !visual) return null;
          const isFried = fried.has(item.id);
          const state = isFried ? undefined : states[item.id];
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
          const element = (
            <WokwiElement
              tag={shape.tag}
              label={names[item.id] ?? item.type}
              properties={visual.properties(state, inputs[item.id], item.props)}
              {...(visual.apply
                ? { apply: (target: HTMLElement) => visual.apply!(target, state) }
                : {})}
              {...(events && running ? { events } : {})}
            />
          );
          return (
            <div
              key={item.id}
              className={`scene__item${selectedId === item.id ? ' scene__item--selected' : ''}`}
              style={{
                left: position.x,
                top: position.y,
                width: shape.width,
                height: shape.height,
              }}
              data-testid={`scene-item-${item.id}`}
              data-state={states[item.id] ? JSON.stringify(states[item.id]) : undefined}
              data-burned={isFried || undefined}
              onPointerDown={(event) => startDrag(event, item.id, position)}
              onPointerMove={(event) => moveDrag(event, item.id)}
              onPointerUp={() => endDrag(item.id)}
              onPointerCancel={() => endDrag(item.id)}
            >
              {shape.rotation ? (
                <div
                  className="scene__turned"
                  style={{
                    width: shape.rotation.element.width,
                    height: shape.rotation.element.height,
                    transform: `translateX(${shape.width}px) rotate(90deg)`,
                  }}
                >
                  {element}
                </div>
              ) : (
                element
              )}
              {item.type !== 'resistor' && <span className="scene__name">{names[item.id]}</span>}
              {isFried && (
                <span className="scene__burned" role="status">
                  <Flame aria-hidden="true" size="1em" />
                  {t('circuit.burned')}
                </span>
              )}
            </div>
          );
        })}

        <svg className="scene__wires" width={size.width} height={size.height} aria-hidden="true">
          {autoWires.map((wire) => (
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

        {manual && analysis && (
          // Wires sit above the breadboard but under the parts, so a wire never
          // hides the part it runs past; terminals go on top of everything.
          <>
            <svg
              className="scene__wires scene__wires--manual"
              width={size.width}
              height={size.height}
              data-testid="wire-layer"
              {...wireHandlers}
            >
              {wires.map((wire) => {
                const from = analysis.terminals.get(wire.from);
                const to = analysis.terminals.get(wire.to);
                if (!from || !to) return null;
                const path = jumperPath(from, to);
                const selected = wire.id === selectedWireId;
                return (
                  <g key={wire.id} data-testid={`wire-${wire.id}`}>
                    {selected && (
                      <path
                        d={path}
                        stroke="#5b6cff"
                        strokeWidth="9"
                        fill="none"
                        strokeLinecap="round"
                      />
                    )}
                    <path
                      d={path}
                      stroke={wire.color ?? SIGNAL_COLOURS[0]}
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle cx={from.x} cy={from.y} r="3" fill={wire.color ?? SIGNAL_COLOURS[0]} />
                    <circle cx={to.x} cy={to.y} r="3" fill={wire.color ?? SIGNAL_COLOURS[0]} />
                    {editable && (
                      <path
                        d={path}
                        className="scene__wire-hit"
                        stroke="transparent"
                        strokeWidth="12"
                        fill="none"
                        onPointerDown={(event) => {
                          // Grabbing a wire end starts a new wire from that terminal instead.
                          if (nearestTerminal(toScene(event))) return;
                          event.stopPropagation();
                          onSelect?.(null);
                          onSelectWire?.(wire.id);
                        }}
                        onDoubleClick={() => onSelectWire?.(wire.id)}
                      />
                    )}
                  </g>
                );
              })}
              {editable && terminalDots(true)}
            </svg>
            <svg
              className="scene__overlay"
              width={size.width}
              height={size.height}
              {...wireHandlers}
            >
              {editable && terminalDots(false)}
              {draft && analysis.terminals.get(draft.from) && (
                <path
                  d={jumperPath(analysis.terminals.get(draft.from)!, draft.to)}
                  stroke={wireColour}
                  strokeWidth="4"
                  strokeDasharray="7 5"
                  fill="none"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}
            </svg>
          </>
        )}

        {manual && editable && hovered && hoveredAt && (
          <div
            className="scene__tooltip"
            role="tooltip"
            style={{ left: hoveredAt.x + 12, top: hoveredAt.y + 10 }}
          >
            {describeTerminal(hovered)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Parts plugged into a breadboard, which move with it. */
function carriedBy(id: string, analysis: CircuitAnalysis | null): string[] {
  if (!analysis) return [];
  const carried = new Set<string>();
  for (const [leg, hole] of analysis.seated) {
    if (hole.startsWith(`${id}:`)) carried.add(leg.slice(0, leg.indexOf(':')));
  }
  return [...carried];
}

/** Every breadboard hole in scene coordinates, except those of a part being moved. */
function holePositions(placed: Placed[], movingId: string): Point[] {
  return placed
    .filter(({ item }) => item.type === 'breadboard' && item.id !== movingId)
    .flatMap(({ position }) =>
      BREADBOARD_HOLES.map((hole) => ({ x: position.x + hole.x, y: position.y + hole.y })),
    );
}
