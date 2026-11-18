import { Order } from '../generator/order';
import { widenType } from '../generator/cpp-types';
import type { BlockModule } from '../types';

const COMPARISON: Record<string, string> = {
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>=',
};

/** Code generators for Blockly's built-in logic blocks. */
export const logicModule: BlockModule = {
  id: 'logic',
  blocks: [],
  generators: {
    controls_if: (block, generator) => {
      let code = '';
      let index = 0;
      while (block.getInput(`IF${index}`)) {
        const condition = generator.valueOrDefault(block, `IF${index}`, Order.NONE, 'false');
        const branch = generator.statementToCode(block, `DO${index}`);
        code += `${index === 0 ? 'if' : ' else if'} (${condition}) {\n${branch}}`;
        index++;
      }
      if (block.getInput('ELSE')) {
        code += ` else {\n${generator.statementToCode(block, 'ELSE')}}`;
      }
      return `${code}\n`;
    },
    logic_compare: (block, generator) => {
      const operator = COMPARISON[block.getFieldValue('OP') as string] ?? '==';
      const order = operator === '==' || operator === '!=' ? Order.EQUALITY : Order.RELATIONAL;
      const a = generator.valueOrDefault(block, 'A', order, '0');
      const b = generator.valueOrDefault(block, 'B', order, '0');
      return [`${a} ${operator} ${b}`, order];
    },
    logic_operation: (block, generator) => {
      const isAnd = block.getFieldValue('OP') === 'AND';
      const order = isAnd ? Order.LOGICAL_AND : Order.LOGICAL_OR;
      const fallback = isAnd ? 'true' : 'false';
      const a = generator.valueOrDefault(block, 'A', order, fallback);
      const b = generator.valueOrDefault(block, 'B', order, fallback);
      return [`${a} ${isAnd ? '&&' : '||'} ${b}`, order];
    },
    logic_negate: (block, generator) => [
      `!${generator.valueOrDefault(block, 'BOOL', Order.PREFIX, 'true')}`,
      Order.PREFIX,
    ],
    logic_boolean: (block) => [
      block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false',
      Order.ATOMIC,
    ],
    logic_ternary: (block, generator) => {
      const condition = generator.valueOrDefault(block, 'IF', Order.CONDITIONAL, 'false');
      const then = generator.valueOrDefault(block, 'THEN', Order.CONDITIONAL, '0');
      const otherwise = generator.valueOrDefault(block, 'ELSE', Order.CONDITIONAL, '0');
      return [`${condition} ? ${then} : ${otherwise}`, Order.CONDITIONAL];
    },
  },
  valueTypes: {
    logic_compare: 'bool',
    logic_operation: 'bool',
    logic_negate: 'bool',
    logic_boolean: 'bool',
    logic_ternary: (block, types) =>
      widenType(
        types.typeOf(block.getInputTargetBlock('THEN')),
        types.typeOf(block.getInputTargetBlock('ELSE')),
      ),
  },
};
