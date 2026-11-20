import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { BlockModule } from '../types';

const STATE_OPTIONS = [
  ['%{BKY_IDEBLOCK_STATE_HIGH}', 'HIGH'],
  ['%{BKY_IDEBLOCK_STATE_LOW}', 'LOW'],
];

export const pinsModule: BlockModule = {
  id: 'pins',
  blocks: [
    {
      type: 'io_digital_write',
      message0: '%{BKY_IDEBLOCK_DIGITAL_WRITE}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'output' },
        { type: 'field_dropdown', name: 'STATE', options: STATE_OPTIONS },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.pins,
      tooltip: '%{BKY_IDEBLOCK_DIGITAL_WRITE_TOOLTIP}',
    },
    {
      type: 'io_digital_write_value',
      message0: '%{BKY_IDEBLOCK_DIGITAL_WRITE_VALUE}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'output' },
        { type: 'input_value', name: 'VALUE', check: ['Boolean', 'Number'] },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.pins,
      tooltip: '%{BKY_IDEBLOCK_DIGITAL_WRITE_VALUE_TOOLTIP}',
    },
    {
      type: 'io_pulse_in',
      message0: '%{BKY_IDEBLOCK_PULSE_IN}',
      args0: [
        { type: 'field_dropdown', name: 'STATE', options: STATE_OPTIONS },
        { type: 'field_pin', name: 'PIN', pinKind: 'digital' },
      ],
      output: 'Number',
      colour: COLOURS.pins,
      tooltip: '%{BKY_IDEBLOCK_PULSE_IN_TOOLTIP}',
    },
    {
      type: 'io_digital_read',
      message0: '%{BKY_IDEBLOCK_DIGITAL_READ}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'digital' }],
      output: 'Boolean',
      colour: COLOURS.pins,
      tooltip: '%{BKY_IDEBLOCK_DIGITAL_READ_TOOLTIP}',
    },
    {
      type: 'io_analog_read',
      message0: '%{BKY_IDEBLOCK_ANALOG_READ}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'analog' }],
      output: 'Number',
      colour: COLOURS.pins,
      tooltip: '%{BKY_IDEBLOCK_ANALOG_READ_TOOLTIP}',
    },
    {
      type: 'io_analog_write',
      message0: '%{BKY_IDEBLOCK_ANALOG_WRITE}',
      args0: [
        { type: 'field_pin', name: 'PIN', pinKind: 'pwm' },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.pins,
      tooltip: '%{BKY_IDEBLOCK_ANALOG_WRITE_TOOLTIP}',
    },
  ],
  generators: {
    io_digital_write: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      generator.pinMode(pin, 'OUTPUT');
      return `digitalWrite(${pin}, ${block.getFieldValue('STATE') as string});\n`;
    },
    io_digital_write_value: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const value = generator.valueOrDefault(block, 'VALUE', Order.COMMA, 'LOW');
      generator.pinMode(pin, 'OUTPUT');
      return `digitalWrite(${pin}, ${value});\n`;
    },
    io_pulse_in: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      generator.pinMode(pin, 'INPUT');
      return [`pulseIn(${pin}, ${block.getFieldValue('STATE') as string})`, Order.POSTFIX];
    },
    io_digital_read: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      generator.pinMode(pin, 'INPUT');
      return [`digitalRead(${pin})`, Order.POSTFIX];
    },
    io_analog_read: (block) => [
      `analogRead(${block.getFieldValue('PIN') as string})`,
      Order.POSTFIX,
    ],
    io_analog_write: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      const value = generator.valueOrDefault(block, 'VALUE', Order.COMMA, '0');
      generator.pinMode(pin, 'OUTPUT');
      return `analogWrite(${pin}, ${value});\n`;
    },
  },
  valueTypes: {
    io_digital_read: 'bool',
    io_analog_read: 'int',
    io_pulse_in: 'unsigned long',
  },
};
