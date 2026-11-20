import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { applyBlockMessages, createSketchGenerator, registerBlocks } from '@ideblock/blocks';
import { getBoard } from '@ideblock/boards';
import * as Blockly from 'blockly/core';
import type { ParserFiles } from '../src';

const require = createRequire(import.meta.url);
export const files: ParserFiles = {
  runtime: readFileSync(require.resolve('web-tree-sitter/web-tree-sitter.wasm')),
  grammar: readFileSync(join(import.meta.dirname, '..', 'grammar', 'tree-sitter-cpp.wasm')),
};
export const examplesDir = join(import.meta.dirname, '..', '..', '..', 'examples');

export function generate(state: object, board: string): string {
  applyBlockMessages('en');
  registerBlocks();
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(state, workspace);
    return createSketchGenerator(getBoard(board)).generate(workspace).code;
  } finally {
    workspace.dispose();
  }
}
