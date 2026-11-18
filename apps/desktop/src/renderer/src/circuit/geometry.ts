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
  /** Draw a series resistor on each signal wire, as LEDs need one. */
  resistors?: boolean;
  /** Legs joined inside the part, such as both legs on one side of a push button. */
  bridges?: string[][];
  /** Signal and ground legs work either way round, as in a push button. */
  swappable?: boolean;
  /**
   * Quarter turns applied to the element. `width`, `height` and `pins` already
   * describe the turned part; `element` keeps the element's own size.
   */
  rotation?: { turns: 1; element: { width: number; height: number } };
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
    resistors: true,
  },
  'rgb-led': {
    tag: 'wokwi-rgb-led',
    width: 42.1,
    height: 72.6,
    pins: {
      R: { x: 8.5, y: 44 },
      COM: { x: 18, y: 54 },
      G: { x: 26.4, y: 44 },
      B: { x: 35.7, y: 44 },
    },
    signals: { red: 'R', green: 'G', blue: 'B' },
    ground: ['COM'],
    supply: [],
    resistors: true,
  },
  lcd1602: {
    tag: 'wokwi-lcd1602',
    width: 302.4,
    height: 136.1,
    pins: {
      GND: { x: 4, y: 32 },
      VCC: { x: 4, y: 41.5 },
      SDA: { x: 4, y: 51 },
      SCL: { x: 4, y: 60.5 },
    },
    signals: { sda: 'SDA', scl: 'SCL' },
    ground: ['GND'],
    supply: ['VCC'],
  },
  'neopixel-ring': {
    tag: 'wokwi-led-ring',
    width: 93.5,
    height: 104.8,
    pins: {
      GND: { x: 32.3, y: 104.8 },
      VCC: { x: 41.9, y: 104.8 },
      DIN: { x: 51.5, y: 104.8 },
    },
    signals: { din: 'DIN' },
    ground: ['GND'],
    supply: ['VCC'],
  },
  // Turned a quarter so its legs straddle the breadboard gap, like a real one.
  pushbutton: {
    tag: 'wokwi-pushbutton',
    width: 12 * MM,
    height: 17.802 * MM,
    pins: {
      '1.l': { x: 12 * MM - 13, y: 0 },
      '2.l': { x: 12 * MM - 32, y: 0 },
      '1.r': { x: 12 * MM - 13, y: 67 },
      '2.r': { x: 12 * MM - 32, y: 67 },
    },
    signals: { signal: '1.l' },
    ground: ['2.l'],
    supply: [],
    bridges: [
      ['1.l', '1.r'],
      ['2.l', '2.r'],
    ],
    swappable: true,
    rotation: { turns: 1, element: { width: 17.802 * MM, height: 12 * MM } },
  },
  resistor: {
    tag: 'wokwi-resistor',
    width: 15.645 * MM,
    height: 3 * MM,
    pins: { '1': { x: 0, y: 5.65 }, '2': { x: 58.8, y: 5.65 } },
    signals: {},
    ground: [],
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
    swappable: true,
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
