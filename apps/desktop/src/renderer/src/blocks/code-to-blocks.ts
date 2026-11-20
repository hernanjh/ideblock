import type { BoardDefinition } from '@ideblock/boards';
import grammar from '@ideblock/code-to-blocks/grammar/tree-sitter-cpp.wasm?url';
import type { CircuitDocument } from '@ideblock/project';
import runtime from 'web-tree-sitter/web-tree-sitter.wasm?url';
import { simulatedComponents } from '../circuit/model';

export type { ConversionResult } from '@ideblock/code-to-blocks';

/**
 * Converts code to blocks. The converter and its 3.5 MB grammar are only
 * loaded the first time, so they do not slow down starting the app.
 */
export async function convertCode(code: string, board: BoardDefinition, circuit: CircuitDocument) {
  const { codeToBlocks } = await import('@ideblock/code-to-blocks');
  return codeToBlocks(code, {
    board,
    parts: simulatedComponents(circuit, board),
    files: { runtime, grammar },
  });
}
