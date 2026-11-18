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
  blocks: [],
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
    text_length: (block, generator) => [
      `String(${generator.valueOrDefault(block, 'VALUE', Order.NONE, '""')}).length()`,
      Order.POSTFIX,
    ],
  },
  valueTypes: {
    text: 'String',
    text_join: 'String',
    text_length: 'int',
  },
};
