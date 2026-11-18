/** Point in scene units, which match CSS pixels at 100 % zoom. */
export interface Point {
  x: number;
  y: number;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export interface Anchor extends Point {
  /** Side the wire leaves from, used to bend it naturally. */
  side: Side;
}

export interface ComponentShape {
  tag: string;
  width: number;
  height: number;
  /** Element pin positions, as reported by wokwi-elements 1.9 `pinInfo`. */
  pins: Record<string, Point>;
  /** Which element pin each simulated pin connects to. */
  signals: Record<string, string>;
  ground: string[];
  supply: string[];
}

const MM = 3.7795;

/** Shapes of the drawn components, so wires can be laid out without measuring the DOM. */
export const SHAPES: Record<string, ComponentShape> = {
  led: {
    tag: 'wokwi-led',
    width: 40,
    height: 50,
    pins: { A: { x: 25, y: 42 }, C: { x: 15, y: 42 } },
    signals: { anode: 'A' },
    ground: ['C'],
    supply: [],
  },
  pushbutton: {
    tag: 'wokwi-pushbutton',
    width: 17.802 * MM,
    height: 12 * MM,
    pins: { '1.l': { x: 0, y: 13 }, '2.l': { x: 0, y: 32 } },
    signals: { signal: '1.l' },
    ground: ['2.l'],
    supply: [],
  },
  potentiometer: {
    tag: 'wokwi-potentiometer',
    width: 20 * MM,
    height: 20 * MM,
    pins: { GND: { x: 29, y: 68.5 }, SIG: { x: 39, y: 68.5 }, VCC: { x: 49, y: 68.5 } },
    signals: { signal: 'SIG' },
    ground: ['GND'],
    supply: ['VCC'],
  },
  photoresistor: {
    tag: 'wokwi-photoresistor-sensor',
    width: 45.95 * MM,
    height: 16.267 * MM,
    pins: { VCC: { x: 172, y: 16 }, GND: { x: 172, y: 26 }, AO: { x: 172, y: 45.5 } },
    signals: { signal: 'AO' },
    ground: ['GND'],
    supply: ['VCC'],
  },
  servo: {
    tag: 'wokwi-servo',
    width: 45 * MM,
    height: 31.63 * MM,
    pins: { GND: { x: 0, y: 50 }, 'V+': { x: 0, y: 59.5 }, PWM: { x: 0, y: 69 } },
    signals: { signal: 'PWM' },
    ground: ['GND'],
    supply: ['V+'],
  },
  buzzer: {
    tag: 'wokwi-buzzer',
    width: 17 * MM,
    height: 20 * MM,
    pins: { '1': { x: 27, y: 84 }, '2': { x: 37, y: 84 } },
    signals: { signal: '1' },
    ground: ['2'],
    supply: [],
  },
  'hc-sr04': {
    tag: 'wokwi-hc-sr04',
    width: 45 * MM,
    height: 25 * MM,
    pins: {
      VCC: { x: 71.3, y: 94.5 },
      TRIG: { x: 81.3, y: 94.5 },
      ECHO: { x: 91.3, y: 94.5 },
      GND: { x: 101.3, y: 94.5 },
    },
    signals: { trig: 'TRIG', echo: 'ECHO' },
    ground: ['GND'],
    supply: ['VCC'],
  },
};

/** The side of the element a pin sits on, so its wire leaves outwards. */
export function pinSide(shape: ComponentShape, pin: Point): Side {
  const distances: [Side, number][] = [
    ['left', pin.x],
    ['right', shape.width - pin.x],
    ['top', pin.y],
    ['bottom', shape.height - pin.y],
  ];
  return distances.sort((a, b) => a[1] - b[1])[0]![0];
}

const OFFSET: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Smooth wire that leaves both ends perpendicular to their sides. */
export function wirePath(from: Anchor, to: Anchor): string {
  const reach = Math.max(36, Math.hypot(to.x - from.x, to.y - from.y) / 3);
  const c1 = { x: from.x + OFFSET[from.side].x * reach, y: from.y + OFFSET[from.side].y * reach };
  const c2 = { x: to.x + OFFSET[to.side].x * reach, y: to.y + OFFSET[to.side].y * reach };
  return `M${from.x} ${from.y} C${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

/** Point halfway along the wire drawn by `wirePath`, where resistors are placed. */
export function wireMidpoint(from: Anchor, to: Anchor): Point {
  const reach = Math.max(36, Math.hypot(to.x - from.x, to.y - from.y) / 3);
  const c1 = { x: from.x + OFFSET[from.side].x * reach, y: from.y + OFFSET[from.side].y * reach };
  const c2 = { x: to.x + OFFSET[to.side].x * reach, y: to.y + OFFSET[to.side].y * reach };
  // Cubic Bézier at t = 0.5.
  return {
    x: (from.x + 3 * c1.x + 3 * c2.x + to.x) / 8,
    y: (from.y + 3 * c1.y + 3 * c2.y + to.y) / 8,
  };
}
