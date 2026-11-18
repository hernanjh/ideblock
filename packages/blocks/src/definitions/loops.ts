import { Order } from '../generator/order';
import type { BlockModule } from '../types';

const isNumberLiteral = (code: string): boolean => /^-?\d+(\.\d+)?$/.test(code);

/** Code generators for Blockly's built-in loop blocks. */
export const loopsModule: BlockModule = {
  id: 'loops',
  blocks: [],
  generators: {
    controls_repeat_ext: (block, generator) => {
      const times = generator.valueOrDefault(block, 'TIMES', Order.RELATIONAL, '0');
      const counter = generator.nameDB_!.getDistinctName('i', 'VARIABLE');
      const body = generator.statementToCode(block, 'DO');
      return `for (int ${counter} = 0; ${counter} < ${times}; ${counter}++) {\n${body}}\n`;
    },
    controls_whileUntil: (block, generator) => {
      const until = block.getFieldValue('MODE') === 'UNTIL';
      let condition = generator.valueOrDefault(
        block,
        'BOOL',
        until ? Order.PREFIX : Order.NONE,
        until ? 'true' : 'false',
      );
      if (until) condition = `!${condition}`;
      return `while (${condition}) {\n${generator.statementToCode(block, 'DO')}}\n`;
    },
    controls_for: (block, generator) => {
      const variable = generator.variableName(block.getFieldValue('VAR') as string);
      const from = generator.valueOrDefault(block, 'FROM', Order.ASSIGNMENT, '0');
      const to = generator.valueOrDefault(block, 'TO', Order.RELATIONAL, '0');
      const by = generator.valueOrDefault(block, 'BY', Order.ASSIGNMENT, '1');
      const body = generator.statementToCode(block, 'DO');

      if (isNumberLiteral(from) && isNumberLiteral(to) && isNumberLiteral(by)) {
        const step = Math.abs(Number(by)) || 1;
        const up = Number(from) <= Number(to);
        const increment =
          step === 1 ? `${variable}${up ? '++' : '--'}` : `${variable} ${up ? '+=' : '-='} ${step}`;
        return `for (${variable} = ${from}; ${variable} ${up ? '<=' : '>='} ${to}; ${increment}) {\n${body}}\n`;
      }
      // Direction is only known at run time.
      const step = generator.nameDB_!.getDistinctName(`${variable}_step`, 'VARIABLE');
      return (
        `float ${step} = abs(${by});\n` +
        `if (${from} > ${to}) {\n${generator.INDENT}${step} = -${step};\n}\n` +
        `for (${variable} = ${from}; ${step} >= 0 ? ${variable} <= ${to} : ${variable} >= ${to}; ${variable} += ${step}) {\n${body}}\n`
      );
    },
    controls_flow_statements: (block) =>
      block.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n',
  },
};
