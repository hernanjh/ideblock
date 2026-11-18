import { getBoard } from '@ideblock/boards';
import * as Blockly from 'blockly/core';
import { applyBlockMessages, createSketchGenerator, PROGRAM_BLOCK_TYPE } from '../src';

type BlockState = Record<string, unknown>;

export const num = (value: number): BlockState => ({
  block: { type: 'math_number', fields: { NUM: value } },
});
export const str = (value: string): BlockState => ({
  block: { type: 'text', fields: { TEXT: value } },
});

/** Chains statement blocks through their "next" connections. */
export function chain(...blocks: BlockState[]): BlockState | undefined {
  return blocks.reduceRight<BlockState | undefined>(
    (next, block) => (next ? { ...block, next: { block: next } } : block),
    undefined,
  );
}

export function program(setup: BlockState[], loop: BlockState[]): BlockState {
  const inputs: Record<string, unknown> = {};
  const setupChain = chain(...setup);
  const loopChain = chain(...loop);
  if (setupChain) inputs['SETUP'] = { block: setupChain };
  if (loopChain) inputs['LOOP'] = { block: loopChain };
  return { type: PROGRAM_BLOCK_TYPE, id: 'program', inputs };
}

export interface GenerateOptions {
  board?: string;
  variables?: { id: string; name: string }[];
  extraTopBlocks?: BlockState[];
}

export function generate(root: BlockState, options: GenerateOptions = {}) {
  applyBlockMessages('en');
  const generator = createSketchGenerator(getBoard(options.board ?? 'uno'));
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(
      {
        variables: options.variables ?? [],
        blocks: { languageVersion: 0, blocks: [root, ...(options.extraTopBlocks ?? [])] },
      },
      workspace,
    );
    return generator.generate(workspace);
  } finally {
    workspace.dispose();
  }
}
