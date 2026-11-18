import { findComponent } from '@ideblock/simulator';
import type { CircuitItem } from '../simulator/circuit';
import { BREADBOARD_HOLES, PITCH } from './breadboard';
import { SHAPES, type Point } from './geometry';

/** A wire drawn by hand between two terminals, stored in circuit.json `connections`. */
export interface CircuitWire {
  id: string;
  /** Terminal ids: "board:13", "led1:A" or "breadboard1:f12". */
  from: string;
  to: string;
  color?: string;
}

export type CircuitIssue =
  | { kind: 'unconnected'; id: string; signal: string }
  | { kind: 'noGround'; id: string }
  | { kind: 'noSupply'; id: string }
  | { kind: 'noResistor'; id: string }
  | { kind: 'short'; pins: string[] };

export interface CircuitAnalysis {
  /** Simulated components, with the board pins their wiring reaches. */
  components: CircuitItem[];
  /** Board pin reached by each component pin, or null when it is not wired. */
  reached: Record<string, Record<string, string | null>>;
  issues: CircuitIssue[];
  /** Position of every terminal, in scene coordinates. */
  terminals: Map<string, Point>;
  /** Breadboard hole each component leg is plugged into. */
  seated: Map<string, string>;
  /** Terminals joined to each terminal by the breadboard and wires, for highlighting. */
  netOf: (terminal: string) => string[];
}

export interface PlacedPart {
  item: CircuitItem;
  position: Point;
}

export interface NetlistInput {
  /** Board pin positions in scene coordinates, keyed by pin name ("13", "GND.top"). */
  boardPins: Record<string, Point>;
  parts: PlacedPart[];
  wires: CircuitWire[];
}

/** How far a leg may sit from a hole and still be plugged into it. */
const SEAT_TOLERANCE = PITCH * 0.45;

const isGround = (pin: string): boolean => pin.startsWith('GND');
const isSupply = (pin: string): boolean => pin === '5V' || pin === '3V3';
export const boardTerminal = (pin: string): string => `board:${pin}`;

class Nets {
  private readonly parent = new Map<string, string>();

  find(node: string): string {
    let root = node;
    while (this.parent.has(root) && this.parent.get(root) !== root) root = this.parent.get(root)!;
    this.parent.set(node, root);
    return root;
  }

  join(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }
}

/** Board pins on each net, split into signal pins, ground and supply. */
function boardPinsByNet(nets: Nets, pins: string[]) {
  const byNet = new Map<string, { signals: Set<string>; ground: boolean; supply: string | null }>();
  for (const pin of pins) {
    const root = nets.find(boardTerminal(pin));
    const entry = byNet.get(root) ?? { signals: new Set<string>(), ground: false, supply: null };
    if (isGround(pin)) entry.ground = true;
    else if (isSupply(pin)) entry.supply = pin;
    else entry.signals.add(pin);
    byNet.set(root, entry);
  }
  return (terminal: string) =>
    byNet.get(nets.find(terminal)) ?? { signals: new Set<string>(), ground: false, supply: null };
}

/**
 * Works out what each hand-wired component is connected to.
 *
 * Two nets are built: `full` treats resistors as connections, so an LED behind
 * its resistor still reaches its pin; `direct` does not, which shows whether a
 * resistor sits in series with the LED.
 */
export function analyseCircuit({ boardPins, parts, wires }: NetlistInput): CircuitAnalysis {
  const full = new Nets();
  const direct = new Nets();
  const join = (a: string, b: string, viaResistor = false): void => {
    full.join(a, b);
    if (!viaResistor) direct.join(a, b);
  };
  const terminals = new Map<string, Point>();
  const seated = new Map<string, string>();

  for (const [pin, at] of Object.entries(boardPins)) terminals.set(boardTerminal(pin), at);
  // Every GND pin on a board is the same node.
  const grounds = Object.keys(boardPins).filter(isGround);
  for (const pin of grounds.slice(1)) join(boardTerminal(grounds[0]!), boardTerminal(pin));

  const holes: { id: string; at: Point }[] = [];
  for (const { item, position } of parts) {
    if (item.type !== 'breadboard') continue;
    const strips = new Map<string, string>();
    for (const hole of BREADBOARD_HOLES) {
      const id = `${item.id}:${hole.name}`;
      const at = { x: position.x + hole.x, y: position.y + hole.y };
      terminals.set(id, at);
      holes.push({ id, at });
      const first = strips.get(hole.strip);
      if (first) join(first, id);
      else strips.set(hole.strip, id);
    }
  }

  for (const { item, position } of parts) {
    const shape = SHAPES[item.type];
    if (!shape) continue;
    for (const [leg, offset] of Object.entries(shape.pins)) {
      const id = `${item.id}:${leg}`;
      const at = { x: position.x + offset.x, y: position.y + offset.y };
      terminals.set(id, at);
      const hole = holes.find(
        (candidate) => Math.hypot(candidate.at.x - at.x, candidate.at.y - at.y) <= SEAT_TOLERANCE,
      );
      if (hole) {
        seated.set(id, hole.id);
        join(id, hole.id);
      }
    }
    for (const group of shape.bridges ?? []) {
      for (const leg of group.slice(1)) join(`${item.id}:${group[0]}`, `${item.id}:${leg}`);
    }
    if (item.type === 'resistor') join(`${item.id}:1`, `${item.id}:2`, true);
  }

  for (const wire of wires) {
    if (terminals.has(wire.from) && terminals.has(wire.to)) join(wire.from, wire.to);
  }

  const pinNames = Object.keys(boardPins);
  const fullPins = boardPinsByNet(full, pinNames);
  const directPins = boardPinsByNet(direct, pinNames);

  const components: CircuitItem[] = [];
  const reached: CircuitAnalysis['reached'] = {};
  const issues: CircuitIssue[] = [];

  for (const { item } of parts) {
    const shape = SHAPES[item.type];
    if (!shape || !findComponent(item.type)) continue;
    const signalLeg = (leg: string): string | null => {
      const terminal = `${item.id}:${leg}`;
      const near = directPins(terminal).signals;
      const far = fullPins(terminal).signals;
      return [...(near.size > 0 ? near : far)][0] ?? null;
    };
    const attempt = (signals: Record<string, string>, groundLegs: string[]) => {
      const pins = Object.fromEntries(
        Object.entries(signals).map(([signal, leg]) => [signal, signalLeg(leg)]),
      );
      const grounded = groundLegs.every((leg) => fullPins(`${item.id}:${leg}`).ground);
      const wired = Object.values(pins).filter((pin) => pin !== null).length;
      return { pins, grounded, score: wired + (grounded ? 1 : 0), signals, groundLegs };
    };
    let best = attempt(shape.signals, shape.ground);
    const signalLegs = Object.values(shape.signals);
    if (shape.swappable && signalLegs.length === 1 && shape.ground.length === 1) {
      const swapped = attempt({ [Object.keys(shape.signals)[0]!]: shape.ground[0]! }, [
        signalLegs[0]!,
      ]);
      if (swapped.score > best.score) best = swapped;
    }
    reached[item.id] = best.pins;

    const supplied = shape.supply.every((leg) => fullPins(`${item.id}:${leg}`).supply !== null);
    const missing = Object.entries(best.pins).filter(([, pin]) => pin === null);
    for (const [signal] of missing) issues.push({ kind: 'unconnected', id: item.id, signal });
    if (!best.grounded) issues.push({ kind: 'noGround', id: item.id });
    if (!supplied) issues.push({ kind: 'noSupply', id: item.id });

    if (shape.resistors && best.grounded) {
      const groundDirect = best.groundLegs.every((leg) => directPins(`${item.id}:${leg}`).ground);
      const signalDirect = Object.values(best.signals).some(
        (leg) => directPins(`${item.id}:${leg}`).signals.size > 0,
      );
      if (groundDirect && signalDirect) issues.push({ kind: 'noResistor', id: item.id });
    }

    if (missing.length === 0 && best.grounded && supplied) {
      components.push({ ...item, pins: best.pins as Record<string, string> });
    }
  }

  const seen = new Set<string>();
  for (const pin of pinNames) {
    const root = direct.find(boardTerminal(pin));
    if (seen.has(root)) continue;
    seen.add(root);
    const net = directPins(boardTerminal(pin));
    if (net.signals.size > 1) issues.push({ kind: 'short', pins: [...net.signals].sort() });
    if (net.ground && net.supply) issues.push({ kind: 'short', pins: [net.supply, 'GND'] });
  }

  const netOf = (terminal: string): string[] => {
    const root = full.find(terminal);
    return [...terminals.keys()].filter((other) => full.find(other) === root);
  };

  return { components, reached, issues, terminals, seated, netOf };
}

/** Moves a part so its nearest leg drops into a breadboard hole, if one is close. */
export function snapToHoles(item: CircuitItem, position: Point, holes: readonly Point[]): Point {
  const shape = SHAPES[item.type];
  if (!shape) return position;
  let best: { dx: number; dy: number; distance: number } | null = null;
  for (const offset of Object.values(shape.pins)) {
    const leg = { x: position.x + offset.x, y: position.y + offset.y };
    for (const hole of holes) {
      const distance = Math.hypot(hole.x - leg.x, hole.y - leg.y);
      if (distance < PITCH * 0.75 && (!best || distance < best.distance)) {
        best = { dx: hole.x - leg.x, dy: hole.y - leg.y, distance };
      }
    }
  }
  if (!best) return position;
  return { x: position.x + best.dx, y: position.y + best.dy };
}
