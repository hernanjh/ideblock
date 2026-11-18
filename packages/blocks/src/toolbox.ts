import { COLOURS } from './colours';

export type ToolboxLevel = 'beginner' | 'advanced';

interface ToolboxBlock {
  kind: 'block';
  type: string;
  inputs?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  extraState?: Record<string, unknown>;
  /** Blocks without a level are shown at every level. */
  advanced?: boolean;
}

interface ToolboxCategory {
  kind: 'category';
  /** Stable id, used by the interface to pick the category icon. */
  toolboxitemid: string;
  name: string;
  colour: string;
  contents?: ToolboxBlock[];
  custom?: string;
  advanced?: boolean;
}

const number = (value: number) => ({ shadow: { type: 'math_number', fields: { NUM: value } } });
const text = (value: string) => ({ shadow: { type: 'text', fields: { TEXT: value } } });

const CATEGORIES: ToolboxCategory[] = [
  {
    kind: 'category',
    toolboxitemid: 'outputs',
    name: '%{BKY_IDEBLOCK_CATEGORY_OUTPUTS}',
    colour: COLOURS.outputs,
    contents: [
      { kind: 'block', type: 'led_set' },
      { kind: 'block', type: 'io_digital_write' },
      { kind: 'block', type: 'led_brightness', inputs: { PERCENT: number(50) }, advanced: true },
      {
        kind: 'block',
        type: 'buzzer_tone',
        inputs: { FREQUENCY: number(440), DURATION: number(500) },
      },
      { kind: 'block', type: 'buzzer_stop', advanced: true },
      { kind: 'block', type: 'servo_write', inputs: { ANGLE: number(90) } },
      { kind: 'block', type: 'rgb_led_color' },
      {
        kind: 'block',
        type: 'rgb_led_mix',
        inputs: { R: number(255), G: number(0), B: number(128) },
        advanced: true,
      },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'display',
    name: '%{BKY_IDEBLOCK_CATEGORY_DISPLAY}',
    colour: COLOURS.display,
    contents: [
      {
        kind: 'block',
        type: 'lcd_print',
        inputs: { TEXT: text('Hola'), ROW: number(1), COLUMN: number(1) },
      },
      { kind: 'block', type: 'lcd_clear' },
      { kind: 'block', type: 'neopixel_set', inputs: { INDEX: number(1) } },
      { kind: 'block', type: 'neopixel_clear' },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'sensors',
    name: '%{BKY_IDEBLOCK_CATEGORY_SENSORS}',
    colour: COLOURS.sensors,
    contents: [
      { kind: 'block', type: 'button_pressed' },
      { kind: 'block', type: 'potentiometer_read' },
      { kind: 'block', type: 'light_sensor_read' },
      { kind: 'block', type: 'temperature_read' },
      { kind: 'block', type: 'switch_on' },
      { kind: 'block', type: 'motion_detected' },
      { kind: 'block', type: 'tilt_detected', advanced: true },
      { kind: 'block', type: 'ultrasonic_distance', advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'time',
    name: '%{BKY_IDEBLOCK_CATEGORY_TIME}',
    colour: COLOURS.time,
    contents: [
      { kind: 'block', type: 'time_delay_seconds', inputs: { SECONDS: number(1) } },
      { kind: 'block', type: 'time_delay', inputs: { MS: number(500) } },
      { kind: 'block', type: 'time_millis', advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'logic',
    name: '%{BKY_IDEBLOCK_CATEGORY_LOGIC}',
    colour: COLOURS.logic,
    contents: [
      { kind: 'block', type: 'controls_if' },
      { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
      { kind: 'block', type: 'logic_compare' },
      { kind: 'block', type: 'logic_operation', advanced: true },
      { kind: 'block', type: 'logic_negate', advanced: true },
      { kind: 'block', type: 'logic_boolean' },
      { kind: 'block', type: 'logic_ternary', advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'loops',
    name: '%{BKY_IDEBLOCK_CATEGORY_LOOPS}',
    colour: COLOURS.loops,
    contents: [
      { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: number(10) } },
      { kind: 'block', type: 'controls_whileUntil', advanced: true },
      {
        kind: 'block',
        type: 'controls_for',
        inputs: { FROM: number(1), TO: number(10), BY: number(1) },
        advanced: true,
      },
      { kind: 'block', type: 'controls_flow_statements', advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'math',
    name: '%{BKY_IDEBLOCK_CATEGORY_MATH}',
    colour: COLOURS.math,
    contents: [
      { kind: 'block', type: 'math_number' },
      { kind: 'block', type: 'math_arithmetic', inputs: { A: number(1), B: number(1) } },
      { kind: 'block', type: 'math_random_int', inputs: { FROM: number(1), TO: number(10) } },
      {
        kind: 'block',
        type: 'math_map',
        inputs: {
          FROM_LOW: number(0),
          FROM_HIGH: number(1023),
          TO_LOW: number(0),
          TO_HIGH: number(100),
        },
        advanced: true,
      },
      {
        kind: 'block',
        type: 'math_constrain',
        inputs: { LOW: number(0), HIGH: number(100) },
        advanced: true,
      },
      { kind: 'block', type: 'math_modulo', inputs: { DIVISOR: number(2) }, advanced: true },
      { kind: 'block', type: 'math_round', advanced: true },
      { kind: 'block', type: 'math_single', advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'text',
    name: '%{BKY_IDEBLOCK_CATEGORY_TEXT}',
    colour: COLOURS.text,
    contents: [
      { kind: 'block', type: 'text' },
      { kind: 'block', type: 'text_join', advanced: true },
      { kind: 'block', type: 'text_length', inputs: { VALUE: text('hola') }, advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'serial',
    name: '%{BKY_IDEBLOCK_CATEGORY_SERIAL}',
    colour: COLOURS.serial,
    contents: [
      { kind: 'block', type: 'serial_print', inputs: { TEXT: text('Hola') } },
      { kind: 'block', type: 'serial_available', advanced: true },
      { kind: 'block', type: 'serial_read_line', advanced: true },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'pins',
    name: '%{BKY_IDEBLOCK_CATEGORY_PINS}',
    colour: COLOURS.pins,
    advanced: true,
    contents: [
      { kind: 'block', type: 'io_digital_write' },
      { kind: 'block', type: 'io_digital_read' },
      { kind: 'block', type: 'io_analog_read' },
      { kind: 'block', type: 'io_analog_write', inputs: { VALUE: number(128) } },
    ],
  },
  {
    kind: 'category',
    toolboxitemid: 'variables',
    name: '%{BKY_IDEBLOCK_CATEGORY_VARIABLES}',
    colour: COLOURS.variables,
    custom: 'VARIABLE',
  },
  {
    kind: 'category',
    toolboxitemid: 'functions',
    name: '%{BKY_IDEBLOCK_CATEGORY_FUNCTIONS}',
    colour: COLOURS.functions,
    custom: 'PROCEDURE',
    advanced: true,
  },
];

/** Builds the toolbox, hiding advanced blocks for beginners. */
export function buildToolbox(level: ToolboxLevel) {
  const include = (item: { advanced?: boolean }) => level === 'advanced' || !item.advanced;
  return {
    kind: 'categoryToolbox',
    contents: CATEGORIES.filter(include).map(({ advanced: _advanced, contents, ...category }) => ({
      ...category,
      ...(contents
        ? {
            contents: contents
              .filter(include)
              .map(({ advanced: _blockAdvanced, ...block }) => block),
          }
        : {}),
    })),
  };
}

/** Block types offered in the toolbox at a level, for searching. */
export function toolboxBlockTypes(level: ToolboxLevel): string[] {
  const toolbox = buildToolbox(level);
  const types = toolbox.contents.flatMap((category) =>
    'contents' in category && Array.isArray(category.contents)
      ? category.contents.map((block) => (block as { type: string }).type)
      : [],
  );
  return [...new Set(types)];
}

/** Toolbox entry for a block, with the same default inputs as in its category. */
export function toolboxBlock(type: string): Record<string, unknown> | undefined {
  for (const category of CATEGORIES) {
    const block = category.contents?.find((item) => item.type === type);
    if (block) {
      const { advanced: _advanced, ...rest } = block;
      return rest;
    }
  }
  return undefined;
}
