import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { BlockModule } from '../types';

/** Code that reads as a single value, so it needs no parentheses around it. */
const ATOMIC_CODE = /^[A-Za-z_][\w.]*(\(.*\))?$|^-?\d+(\.\d+)?$/;

/**
 * Hand-written C++ kept as is. Converting code to blocks uses these for the
 * parts that have no block, so nothing is lost and the program still compiles.
 */
export const codeModule: BlockModule = {
  id: 'code',
  blocks: [
    {
      type: 'code_statement',
      message0: '%{BKY_IDEBLOCK_CODE_STATEMENT}',
      args0: [{ type: 'field_input', name: 'CODE', text: '' }],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.code,
      tooltip: '%{BKY_IDEBLOCK_CODE_TOOLTIP}',
    },
    {
      type: 'code_expression',
      message0: '%{BKY_IDEBLOCK_CODE_EXPRESSION}',
      args0: [{ type: 'field_input', name: 'CODE', text: '0' }],
      output: null,
      colour: COLOURS.code,
      tooltip: '%{BKY_IDEBLOCK_CODE_TOOLTIP}',
    },
    {
      type: 'code_global',
      message0: '%{BKY_IDEBLOCK_CODE_GLOBAL}',
      args0: [{ type: 'field_input', name: 'CODE', text: '' }],
      colour: COLOURS.code,
      tooltip: '%{BKY_IDEBLOCK_CODE_GLOBAL_TOOLTIP}',
    },
  ],
  generators: {
    code_statement: (block) => `${String(block.getFieldValue('CODE') ?? '').trim()}\n`,
    code_expression: (block) => {
      const code = String(block.getFieldValue('CODE') ?? '').trim() || '0';
      return [code, ATOMIC_CODE.test(code) ? Order.ATOMIC : Order.NONE];
    },
    // Includes go to the top of the sketch; declarations and functions go before setup().
    code_global: (block, generator) => {
      const code = String(block.getFieldValue('CODE') ?? '').trim();
      const lines = code.split('\n');
      const includes = lines.filter((line) => line.trim().startsWith('#'));
      const rest = lines
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n')
        .trim();
      for (const line of includes) generator.addRawInclude(line.trim());
      if (rest) generator.addFunction(`code:${block.id}`, rest);
      return '';
    },
  },
};
