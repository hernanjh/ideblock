import type { ComponentInput, ComponentState } from '@ideblock/simulator';

export type ControlKind = 'press' | 'slider' | 'distance' | 'none';

interface VisualDefinition {
  tag: string;
  control: ControlKind;
  /** Element properties for the current simulation state. */
  properties: (
    state: ComponentState | undefined,
    input: ComponentInput | undefined,
    props: Record<string, unknown> | undefined,
  ) => Record<string, unknown>;
  apply?: (element: HTMLElement, state: ComponentState | undefined) => void;
}

interface LedRingElement extends HTMLElement {
  setPixel(pixel: number, colour: { r: number; g: number; b: number }): void;
}

/** How each simulated component is drawn and controlled in the interface. */
export const VISUALS: Record<string, VisualDefinition> = {
  led: {
    tag: 'wokwi-led',
    control: 'none',
    properties: (state, _input, props) => {
      const brightness = Number(state?.['brightness'] ?? 0);
      return { value: brightness > 0, brightness, color: props?.['color'] ?? 'red' };
    },
  },
  pushbutton: {
    tag: 'wokwi-pushbutton',
    control: 'press',
    properties: (state, input) => ({
      pressed: Boolean(state?.['pressed'] ?? input?.['pressed']),
      color: 'green',
    }),
  },
  potentiometer: {
    tag: 'wokwi-potentiometer',
    control: 'slider',
    properties: (state, input) => ({ value: Number(state?.['value'] ?? input?.['value'] ?? 512) }),
  },
  photoresistor: {
    tag: 'wokwi-photoresistor-sensor',
    control: 'slider',
    properties: () => ({}),
  },
  servo: {
    tag: 'wokwi-servo',
    control: 'none',
    properties: (state) => ({ angle: Number(state?.['angle'] ?? 90) }),
  },
  buzzer: {
    tag: 'wokwi-buzzer',
    control: 'none',
    properties: (state) => ({ hasSignal: Number(state?.['frequency'] ?? 0) > 0 }),
  },
  'rgb-led': {
    tag: 'wokwi-rgb-led',
    control: 'none',
    properties: (state) => ({
      ledRed: Number(state?.['red'] ?? 0),
      ledGreen: Number(state?.['green'] ?? 0),
      ledBlue: Number(state?.['blue'] ?? 0),
    }),
  },
  lcd1602: {
    tag: 'wokwi-lcd1602',
    control: 'none',
    properties: (state) => ({
      pins: 'i2c',
      text: String(state?.['text'] ?? ''),
      backlight: Boolean(state?.['backlight'] ?? true),
    }),
  },
  'neopixel-ring': {
    tag: 'wokwi-led-ring',
    control: 'none',
    properties: (_state, _input, props) => ({ pixels: Number(props?.['pixels'] ?? 8) }),
    apply: (element, state) => {
      const ring = element as LedRingElement;
      const colours = String(state?.['colours'] ?? '').split(';');
      colours.forEach((colour, pixel) => {
        const [r = 0, g = 0, b = 0] = colour.split(',').map(Number);
        ring.setPixel?.(pixel, { r: r / 255, g: g / 255, b: b / 255 });
      });
    },
  },
  'hc-sr04': {
    tag: 'wokwi-hc-sr04',
    control: 'distance',
    properties: () => ({}),
  },
};
