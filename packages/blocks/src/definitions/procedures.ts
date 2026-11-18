import type * as Blockly from 'blockly/core';
import { defaultValue } from '../generator/cpp-types';
import { Order } from '../generator/order';
import { procedureParameters, type SketchGenerator } from '../generator/sketch-generator';
import type { BlockModule } from '../types';

function defineProcedure(block: Blockly.Block, generator: SketchGenerator): null {
  const displayName = block.getFieldValue('NAME') as string;
  const name = generator.getProcedureName(displayName);
  const params = procedureParameters(block).map((param) => {
    const type = generator.types.variableType(param.getId());
    return `${type} ${generator.variableName(param.getId())}`;
  });
  const body = generator.statementToCode(block, 'STACK');

  let returnType = 'void';
  let returnLine = '';
  if (block.getInput('RETURN')) {
    const type = generator.procedureReturnType(displayName);
    returnType = type;
    const value = generator.valueOrDefault(block, 'RETURN', Order.NONE, defaultValue(type));
    returnLine = `${generator.INDENT}return ${value};\n`;
  }

  const comment = block.getCommentText();
  const header = comment ? generator.prefixLines(`${comment}\n`, '// ') : '';
  generator.addFunction(
    name,
    `${header}${returnType} ${name}(${params.join(', ')}) {\n${body}${returnLine}}`,
  );
  return null;
}

function callArguments(block: Blockly.Block, generator: SketchGenerator): string {
  const args: string[] = [];
  for (let index = 0; block.getInput(`ARG${index}`); index++) {
    args.push(generator.valueOrDefault(block, `ARG${index}`, Order.COMMA, '0'));
  }
  return args.join(', ');
}

/** Code generators for Blockly's built-in function blocks. */
export const proceduresModule: BlockModule = {
  id: 'procedures',
  blocks: [],
  generators: {
    procedures_defnoreturn: defineProcedure,
    procedures_defreturn: defineProcedure,
    procedures_callnoreturn: (block, generator) => {
      const name = generator.getProcedureName(block.getFieldValue('NAME') as string);
      return `${name}(${callArguments(block, generator)});\n`;
    },
    procedures_callreturn: (block, generator) => {
      const name = generator.getProcedureName(block.getFieldValue('NAME') as string);
      return [`${name}(${callArguments(block, generator)})`, Order.POSTFIX];
    },
    procedures_ifreturn: (block, generator) => {
      const condition = generator.valueOrDefault(block, 'CONDITION', Order.NONE, 'false');
      const hasValue = (block as Blockly.Block & { hasReturnValue_?: boolean }).hasReturnValue_;
      const value = hasValue ? generator.valueOrDefault(block, 'VALUE', Order.NONE, '0') : '';
      return `if (${condition}) {\n${generator.INDENT}return${value ? ` ${value}` : ''};\n}\n`;
    },
  },
  valueTypes: {
    procedures_callreturn: (block, types) =>
      types.procedureReturnType(block.getFieldValue('NAME') as string),
  },
};
