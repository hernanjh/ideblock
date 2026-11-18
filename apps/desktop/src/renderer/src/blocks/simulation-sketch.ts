import type { BoardDefinition } from '@ideblock/boards';
import { createSketchGenerator, registerBlocks, type SketchResult } from '@ideblock/blocks';
import * as Blockly from 'blockly/core';
import type { WorkspaceState } from '../state/project';

/**
 * Generates the sketch again in a headless workspace with block tracing, so
 * the simulator can highlight the running block. The code shown to the user
 * never contains the tracing calls.
 */
export function generateSimulationSketch(
  state: WorkspaceState | null,
  board: BoardDefinition,
): SketchResult {
  registerBlocks();
  const workspace = new Blockly.Workspace();
  try {
    if (state) Blockly.serialization.workspaces.load(state, workspace);
    const generator = createSketchGenerator(board);
    generator.configure({ board, trace: true });
    return generator.generate(workspace);
  } finally {
    workspace.dispose();
  }
}
