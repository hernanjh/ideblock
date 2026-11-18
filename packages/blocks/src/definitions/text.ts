import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { BlockModule } from '../types';

export function quoteCppString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

/** Code generators for Blockly's built-in text blocks. */
export const textModule: BlockModule = {
  id: 'text',
  blocks: [
    {
      type: 'text_letter',
      message0: '%{BKY_IDEBLOCK_TEXT_LETTER}',
      args0: [
        { type: 'input_value', name: 'INDEX', check: 'Number' },
        { type: 'input_value', name: 'TEXT' },
      ],
      inputsInline: true,
      output: 'String',
      colour: COLOURS.text,
      tooltip: '%{BKY_IDEBLOCK_TEXT_LETTER_TOOLTIP}',
    },
    {
      type: 'text_contains',
      message0: '%{BKY_IDEBLOCK_TEXT_CONTAINS}',
      args0: [
        { type: 'input_value', name: 'TEXT' },
        { type: 'input_value', name: 'PART' },
      ],
      inputsInline: true,
      output: 'Boolean',
      colour: COLOURS.text,
      tooltip: '%{BKY_IDEBLOCK_TEXT_CONTAINS_TOOLTIP}',
    },
  ],
  generators: {
    text: (block) => [quoteCppString(String(block.getFieldValue('TEXT') ?? '')), Order.ATOMIC],
    text_join: (block, generator) => {
      const parts: string[] = [];
      for (let index = 0; block.getInput(`ADD${index}`); index++) {
        const part = generator.valueToCode(block, `ADD${index}`, Order.NONE);
        if (part) parts.push(`String(${part})`);
      }
      if (parts.length === 0) return ['String("")', Order.POSTFIX];
      if (parts.length === 1) return [parts[0]!, Order.POSTFIX];
      return [parts.join(' + '), Order.ADDITIVE];
    },
    // Letters are counted from 1, as children count them.
    text_letter: (block, generator) => {
      const index = generator.valueOrDefault(block, 'INDEX', Order.ADDITIVE, '1');
      const text = generator.valueOrDefault(block, 'TEXT', Order.NONE, '""');
      const position = /^\d+$/.test(index)
        ? String(Math.max(0, Number(index) - 1))
        : `${index} - 1`;
      return [`String(String(${text}).charAt(${position}))`, Order.POSTFIX];
    },
    text_contains: (block, generator) => {
      const text = generator.valueOrDefault(block, 'TEXT', Order.NONE, '""');
      const part = generator.valueOrDefault(block, 'PART', Order.NONE, '""');
      return [`String(${text}).indexOf(String(${part})) >= 0`, Order.RELATIONAL];
    },
    text_length: (block, generator) => [
      `String(${generator.valueOrDefault(block, 'VALUE', Order.NONE, '""')}).length()`,
      Order.POSTFIX,
    ],
  },
  valueTypes: {
    text: 'String',
    text_join: 'String',
    text_length: 'int',
    text_letter: 'String',
    text_contains: 'bool',
  },
};
