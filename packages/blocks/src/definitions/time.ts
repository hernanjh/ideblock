import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { BlockModule } from '../types';

export const timeModule: BlockModule = {
  id: 'time',
  blocks: [
    {
      type: 'time_delay',
      message0: '%{BKY_IDEBLOCK_DELAY_MS}',
      args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.time,
      tooltip: '%{BKY_IDEBLOCK_DELAY_MS_TOOLTIP}',
    },
    {
      type: 'time_delay_seconds',
      message0: '%{BKY_IDEBLOCK_DELAY_SECONDS}',
      args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.time,
      tooltip: '%{BKY_IDEBLOCK_DELAY_SECONDS_TOOLTIP}',
    },
    {
      type: 'time_delay_us',
      message0: '%{BKY_IDEBLOCK_DELAY_US}',
      args0: [{ type: 'input_value', name: 'US', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.time,
      tooltip: '%{BKY_IDEBLOCK_DELAY_US_TOOLTIP}',
    },
    {
      type: 'time_millis',
      message0: '%{BKY_IDEBLOCK_MILLIS}',
      output: 'Number',
      colour: COLOURS.time,
      tooltip: '%{BKY_IDEBLOCK_MILLIS_TOOLTIP}',
    },
  ],
  generators: {
    time_delay: (block, generator) =>
      `delay(${generator.valueOrDefault(block, 'MS', Order.NONE, '0')});\n`,
    time_delay_seconds: (block, generator) => {
      const seconds = generator.valueOrDefault(block, 'SECONDS', Order.MULTIPLICATIVE, '0');
      // Literal seconds are folded so the generated code reads naturally.
      const literal = Number(seconds);
      const ms = Number.isFinite(literal)
        ? String(Math.round(literal * 1000))
        : `${seconds} * 1000`;
      return `delay(${ms});\n`;
    },
    time_delay_us: (block, generator) =>
      `delayMicroseconds(${generator.valueOrDefault(block, 'US', Order.NONE, '0')});\n`,
    time_millis: () => ['millis()', Order.POSTFIX],
  },
  valueTypes: {
    time_millis: 'unsigned long',
  },
};
