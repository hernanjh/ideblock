import { COLOURS } from '../colours';
import { colourChannels } from '../fields/field-led-colour';
import { Order } from '../generator/order';
import type { SketchGenerator } from '../generator/sketch-generator';
import type { BlockModule } from '../types';

const LCD_ADDRESS = '0x27';

// Segments a to g of the digits 0 to 9, bit 0 being segment a.
const DIGIT_HELPER = `const byte DIGIT_SEGMENTS[10] = {
  0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110,
  0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111
};

void showDigit(int firstPin, int number) {
  // Numbers outside 0 to 9 show a dash.
  byte segments = (number >= 0 && number <= 9) ? DIGIT_SEGMENTS[number] : 0b1000000;
  for (int segment = 0; segment < 7; segment++) {
    pinMode(firstPin + segment, OUTPUT);
    digitalWrite(firstPin + segment, bitRead(segments, segment) ? HIGH : LOW);
  }
}`;

function useLcd(generator: SketchGenerator): string {
  generator.addInclude('Wire.h');
  generator.addInclude('LiquidCrystal_PCF8574.h');
  generator.addLibrary('LiquidCrystal_PCF8574');
  generator.addGlobal('lcd', `LiquidCrystal_PCF8574 lcd(${LCD_ADDRESS});`);
  generator.addSetup('lcd:begin', 'lcd.begin(16, 2);');
  generator.addSetup('lcd:backlight', 'lcd.setBacklight(255);');
  return 'lcd';
}

function useStrip(generator: SketchGenerator, pin: string, count: number): string {
  const name = `pixels_${pin}`;
  generator.addInclude('Adafruit_NeoPixel.h');
  generator.addLibrary('Adafruit NeoPixel');
  generator.addGlobal(
    `neopixel:${pin}`,
    `Adafruit_NeoPixel ${name}(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`,
  );
  generator.addSetup(`neopixel:${pin}`, `${name}.begin();`);
  return name;
}

function rgbWrite(generator: SketchGenerator, pins: string[], values: string[]): string {
  return pins
    .map((pin, index) => {
      generator.pinMode(pin, 'OUTPUT');
      return `analogWrite(${pin}, ${values[index]});\n`;
    })
    .join('');
}

const rgbPins = [
  { type: 'field_pin', name: 'RED', pinKind: 'pwm', value: '9' },
  { type: 'field_pin', name: 'GREEN', pinKind: 'pwm', value: '10' },
  { type: 'field_pin', name: 'BLUE', pinKind: 'pwm', value: '11' },
];

export const displaysModule: BlockModule = {
  id: 'displays',
  blocks: [
    {
      type: 'rgb_led_color',
      message0: '%{BKY_IDEBLOCK_RGB_COLOR}',
      args0: [...rgbPins, { type: 'field_led_colour', name: 'COLOR', colour: '255,0,0' }],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_RGB_COLOR_TOOLTIP}',
    },
    {
      type: 'rgb_led_mix',
      message0: '%{BKY_IDEBLOCK_RGB_MIX}',
      args0: [
        ...rgbPins,
        { type: 'input_value', name: 'R', check: 'Number' },
        { type: 'input_value', name: 'G', check: 'Number' },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_RGB_MIX_TOOLTIP}',
    },
    {
      type: 'lcd_print',
      message0: '%{BKY_IDEBLOCK_LCD_PRINT}',
      args0: [
        { type: 'input_value', name: 'TEXT' },
        { type: 'input_value', name: 'ROW', check: 'Number' },
        { type: 'input_value', name: 'COLUMN', check: 'Number' },
        { type: 'field_bus_pins', name: 'BUS' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.display,
      tooltip: '%{BKY_IDEBLOCK_LCD_PRINT_TOOLTIP}',
    },
    {
      type: 'lcd_clear',
      message0: '%{BKY_IDEBLOCK_LCD_CLEAR}',
      args0: [{ type: 'field_bus_pins', name: 'BUS' }],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.display,
      tooltip: '%{BKY_IDEBLOCK_LCD_CLEAR_TOOLTIP}',
    },
    {
      type: 'seven_segment_show',
      message0: '%{BKY_IDEBLOCK_SEVEN_SEGMENT}',
      args0: [
        { type: 'input_value', name: 'NUMBER', check: 'Number' },
        { type: 'field_pin', name: 'FIRST', pinKind: 'output', value: '2' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.display,
      tooltip: '%{BKY_IDEBLOCK_SEVEN_SEGMENT_TOOLTIP}',
    },
    {
      type: 'neopixel_set',
      message0: '%{BKY_IDEBLOCK_NEOPIXEL_SET}',
      args0: [
        { type: 'input_value', name: 'INDEX', check: 'Number' },
        { type: 'field_pin', name: 'PIN', pinKind: 'output', value: '6' },
        { type: 'field_led_colour', name: 'COLOR', colour: '255,0,0' },
        { type: 'field_number', name: 'COUNT', value: 8, min: 1, max: 300, precision: 1 },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.display,
      tooltip: '%{BKY_IDEBLOCK_NEOPIXEL_SET_TOOLTIP}',
    },
    {
      type: 'neopixel_clear',
      message0: '%{BKY_IDEBLOCK_NEOPIXEL_CLEAR}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'output', value: '6' },
        { type: 'field_number', name: 'COUNT', value: 8, min: 1, max: 300, precision: 1 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.display,
      tooltip: '%{BKY_IDEBLOCK_NEOPIXEL_CLEAR_TOOLTIP}',
    },
  ],
  generators: {
    rgb_led_color: (block, generator) => {
      const pins = ['RED', 'GREEN', 'BLUE'].map((name) => block.getFieldValue(name) as string);
      const values = colourChannels(block.getFieldValue('COLOR') as string).map(String);
      return rgbWrite(generator, pins, values);
    },
    rgb_led_mix: (block, generator) => {
      const pins = ['RED', 'GREEN', 'BLUE'].map((name) => block.getFieldValue(name) as string);
      const values = ['R', 'G', 'B'].map(
        (name) => `constrain(${generator.valueOrDefault(block, name, Order.COMMA, '0')}, 0, 255)`,
      );
      return rgbWrite(generator, pins, values);
    },
    lcd_print: (block, generator) => {
      const lcd = useLcd(generator);
      const text = generator.valueOrDefault(block, 'TEXT', Order.NONE, '""');
      // Rows and columns start at 1 in the block, like in a notebook.
      const row = generator.valueOrDefault(block, 'ROW', Order.ADDITIVE, '1');
      const column = generator.valueOrDefault(block, 'COLUMN', Order.ADDITIVE, '1');
      const zeroBased = (value: string): string =>
        /^\d+$/.test(value) ? String(Math.max(0, Number(value) - 1)) : `${value} - 1`;
      return `${lcd}.setCursor(${zeroBased(column)}, ${zeroBased(row)});\n${lcd}.print(${text});\n`;
    },
    lcd_clear: (_block, generator) => `${useLcd(generator)}.clear();\n`,
    seven_segment_show: (block, generator) => {
      generator.addHelper('showDigit', DIGIT_HELPER);
      const number = generator.valueOrDefault(block, 'NUMBER', Order.COMMA, '0');
      return `showDigit(${block.getFieldValue('FIRST') as string}, ${number});\n`;
    },
    neopixel_set: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const strip = useStrip(generator, pin, Number(block.getFieldValue('COUNT')));
      const index = generator.valueOrDefault(block, 'INDEX', Order.ADDITIVE, '1');
      const pixel = /^\d+$/.test(index) ? String(Math.max(0, Number(index) - 1)) : `${index} - 1`;
      const [r, g, b] = colourChannels(block.getFieldValue('COLOR') as string);
      return `${strip}.setPixelColor(${pixel}, ${strip}.Color(${r}, ${g}, ${b}));\n${strip}.show();\n`;
    },
    neopixel_clear: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const strip = useStrip(generator, pin, Number(block.getFieldValue('COUNT')));
      return `${strip}.clear();\n${strip}.show();\n`;
    },
  },
};
