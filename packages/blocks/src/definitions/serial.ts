import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { BlockModule } from '../types';

export const serialModule: BlockModule = {
  id: 'serial',
  blocks: [
    {
      type: 'serial_print',
      message0: '%{BKY_IDEBLOCK_SERIAL_PRINT}',
      args0: [
        { type: 'input_value', name: 'TEXT' },
        {
          type: 'field_dropdown',
          name: 'NEWLINE',
          options: [
            ['%{BKY_IDEBLOCK_SERIAL_NEWLINE}', 'TRUE'],
            ['%{BKY_IDEBLOCK_SERIAL_NO_NEWLINE}', 'FALSE'],
          ],
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.serial,
      tooltip: '%{BKY_IDEBLOCK_SERIAL_PRINT_TOOLTIP}',
    },
    {
      type: 'serial_available',
      message0: '%{BKY_IDEBLOCK_SERIAL_AVAILABLE}',
      output: 'Boolean',
      colour: COLOURS.serial,
      tooltip: '%{BKY_IDEBLOCK_SERIAL_AVAILABLE_TOOLTIP}',
    },
    {
      type: 'serial_read_line',
      message0: '%{BKY_IDEBLOCK_SERIAL_READ_LINE}',
      output: 'String',
      colour: COLOURS.serial,
      tooltip: '%{BKY_IDEBLOCK_SERIAL_READ_LINE_TOOLTIP}',
    },
  ],
  generators: {
    serial_print: (block, generator) => {
      generator.useSerial();
      const text = generator.valueOrDefault(block, 'TEXT', Order.NONE, '""');
      const method = block.getFieldValue('NEWLINE') === 'TRUE' ? 'println' : 'print';
      return `Serial.${method}(${text});\n`;
    },
    serial_available: (_block, generator) => {
      generator.useSerial();
      return ['Serial.available() > 0', Order.RELATIONAL];
    },
    serial_read_line: (_block, generator) => {
      generator.useSerial();
      return ["Serial.readStringUntil('\\n')", Order.POSTFIX];
    },
  },
  valueTypes: {
    serial_available: 'bool',
    serial_read_line: 'String',
  },
};
