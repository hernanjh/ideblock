import { Order } from '../generator/order';
import type { BlockModule } from '../types';

/** Code generators for Blockly's built-in variable blocks. */
export const variablesModule: BlockModule = {
  id: 'variables',
  blocks: [],
  generators: {
    variables_get: (block, generator) => [
      generator.variableName(block.getFieldValue('VAR') as string),
      Order.ATOMIC,
    ],
    variables_set: (block, generator) => {
      const name = generator.variableName(block.getFieldValue('VAR') as string);
      const value = generator.valueOrDefault(block, 'VALUE', Order.ASSIGNMENT, '0');
      return `${name} = ${value};\n`;
    },
    math_change: (block, generator) => {
      const name = generator.variableName(block.getFieldValue('VAR') as string);
      const delta = generator.valueOrDefault(block, 'DELTA', Order.ASSIGNMENT, '0');
      if (delta === '1') return `${name}++;\n`;
      if (delta === '-1') return `${name}--;\n`;
      return `${name} += ${delta};\n`;
    },
  },
  valueTypes: {
    variables_get: (block, types) => types.variableType(block.getFieldValue('VAR') as string),
  },
};
