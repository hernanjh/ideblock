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
  'hc-sr04': {
    tag: 'wokwi-hc-sr04',
    control: 'distance',
    properties: () => ({}),
  },
};
