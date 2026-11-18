import { COLOURS } from '../colours';
import { PROGRAM_BLOCK_TYPE } from '../generator/sketch-generator';
import type { BlockModule } from '../types';

export const programModule: BlockModule = {
  id: 'program',
  blocks: [
    {
      type: PROGRAM_BLOCK_TYPE,
      message0: '%{BKY_IDEBLOCK_PROGRAM_SETUP} %1 %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'SETUP' }],
      message1: '%{BKY_IDEBLOCK_PROGRAM_LOOP} %1 %2',
      args1: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'LOOP' }],
      colour: COLOURS.program,
      tooltip: '%{BKY_IDEBLOCK_PROGRAM_TOOLTIP}',
    },
  ],
  generators: {
    [PROGRAM_BLOCK_TYPE]: (block, generator) => {
      generator.setProgram(
        generator.statementToCode(block, 'SETUP'),
        generator.statementToCode(block, 'LOOP'),
      );
      return '';
    },
  },
};
