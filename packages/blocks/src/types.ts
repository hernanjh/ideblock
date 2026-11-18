import type * as Blockly from 'blockly/core';
import type { SketchGenerator, ValueTypeRule } from './generator/sketch-generator';

export type BlockGenerator = (
  block: Blockly.Block,
  generator: SketchGenerator,
) => string | [string, number] | null;

export type BlockJson = Record<string, unknown> & { type: string };

/**
 * A self-contained set of blocks. Adding blocks to the editor only requires a
 * new module: JSON definitions, a code generator per block and, for value
 * blocks, the C++ type they produce. Text lives in the "blocks" translation
 * namespace and is referenced as %{BKY_IDEBLOCK_<KEY>}.
 */
export interface BlockModule {
  id: string;
  blocks: BlockJson[];
  generators: Record<string, BlockGenerator>;
  valueTypes?: Record<string, ValueTypeRule>;
}
