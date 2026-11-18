import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { SketchGenerator } from '../generator/sketch-generator';
import type { BlockModule } from '../types';

function servoName(pin: string): string {
  return `servo_${pin}`;
}

function useServo(generator: SketchGenerator, pin: string): string {
  const name = servoName(pin);
  const { header, library } = generator.board.servo;
  generator.addInclude(header);
  if (library) generator.addLibrary(library);
  generator.addGlobal(`servo:${pin}`, `Servo ${name};`);
  generator.addSetup(`servo:${pin}`, `${name}.attach(${pin});`);
  return name;
}

export const outputsModule: BlockModule = {
  id: 'outputs',
  blocks: [
    {
      type: 'led_set',
      message0: '%{BKY_IDEBLOCK_LED_SET}',
      args0: [
        {
          type: 'field_dropdown',
          name: 'STATE',
          options: [
            ['%{BKY_IDEBLOCK_LED_ON}', 'HIGH'],
            ['%{BKY_IDEBLOCK_LED_OFF}', 'LOW'],
          ],
        },
        { type: 'field_pin', name: 'PIN', pinKind: 'output' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_LED_SET_TOOLTIP}',
    },
    {
      type: 'builtin_led_set',
      message0: '%{BKY_IDEBLOCK_BUILTIN_LED}',
      args0: [
        {
          type: 'field_dropdown',
          name: 'STATE',
          options: [
            ['%{BKY_IDEBLOCK_LED_ON}', 'HIGH'],
            ['%{BKY_IDEBLOCK_LED_OFF}', 'LOW'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_BUILTIN_LED_TOOLTIP}',
    },
    {
      type: 'led_on_for',
      message0: '%{BKY_IDEBLOCK_LED_ON_FOR}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'output' },
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_LED_ON_FOR_TOOLTIP}',
    },
    {
      type: 'led_brightness',
      message0: '%{BKY_IDEBLOCK_LED_BRIGHTNESS}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'pwm' },
        { type: 'input_value', name: 'PERCENT', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_LED_BRIGHTNESS_TOOLTIP}',
    },
    {
      type: 'buzzer_tone',
      message0: '%{BKY_IDEBLOCK_BUZZER_TONE}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'output' },
        { type: 'input_value', name: 'FREQUENCY', check: 'Number' },
        { type: 'input_value', name: 'DURATION', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_BUZZER_TONE_TOOLTIP}',
    },
    {
      type: 'buzzer_stop',
      message0: '%{BKY_IDEBLOCK_BUZZER_STOP}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'output' }],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_BUZZER_STOP_TOOLTIP}',
    },
    {
      type: 'servo_write',
      message0: '%{BKY_IDEBLOCK_SERVO_WRITE}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'pwm' },
        { type: 'input_value', name: 'ANGLE', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.outputs,
      tooltip: '%{BKY_IDEBLOCK_SERVO_WRITE_TOOLTIP}',
    },
  ],
  generators: {
    // Each board says which pin its own LED is on, so the block works on all of them.
    builtin_led_set: (block, generator) => {
      const pin = generator.board.builtinLedPin;
      generator.pinMode(pin, 'OUTPUT');
      return `digitalWrite(${pin}, ${block.getFieldValue('STATE') as string});\n`;
    },
    led_on_for: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      generator.pinMode(pin, 'OUTPUT');
      const seconds = generator.valueOrDefault(block, 'SECONDS', Order.MULTIPLICATIVE, '1');
      const literal = Number(seconds);
      const ms = Number.isFinite(literal)
        ? String(Math.round(literal * 1000))
        : `${seconds} * 1000`;
      return `digitalWrite(${pin}, HIGH);\ndelay(${ms});\ndigitalWrite(${pin}, LOW);\n`;
    },
    led_set: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      generator.pinMode(pin, 'OUTPUT');
      return `digitalWrite(${pin}, ${block.getFieldValue('STATE') as string});\n`;
    },
    led_brightness: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const percent = generator.valueOrDefault(block, 'PERCENT', Order.COMMA, '0');
      generator.pinMode(pin, 'OUTPUT');
      return `analogWrite(${pin}, map(constrain(${percent}, 0, 100), 0, 100, 0, 255));\n`;
    },
    buzzer_tone: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const frequency = generator.valueOrDefault(block, 'FREQUENCY', Order.COMMA, '440');
      const duration = generator.valueOrDefault(block, 'DURATION', Order.NONE, '0');
      // tone() returns immediately; waiting keeps consecutive notes audible.
      return `tone(${pin}, ${frequency}, ${duration});\ndelay(${duration});\n`;
    },
    buzzer_stop: (block) => `noTone(${block.getFieldValue('PIN') as string});\n`,
    servo_write: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const angle = generator.valueOrDefault(block, 'ANGLE', Order.COMMA, '90');
      return `${useServo(generator, pin)}.write(constrain(${angle}, 0, 180));\n`;
    },
  },
};
