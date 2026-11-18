import { DEFAULT_BOARD_ID } from '@ideblock/boards';
import type { SketchResult } from '@ideblock/blocks';
import { create } from 'zustand';

/** Serialized Blockly workspace, as produced by Blockly.serialization. */
export type WorkspaceState = Record<string, unknown>;

interface ProjectState {
  boardId: string;
  workspaceState: WorkspaceState | null;
  sketch: SketchResult | null;
  setBoard: (boardId: string) => void;
  setWorkspaceState: (state: WorkspaceState) => void;
  setSketch: (sketch: SketchResult) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  boardId: DEFAULT_BOARD_ID,
  workspaceState: null,
  sketch: null,
  setBoard: (boardId) => set({ boardId }),
  setWorkspaceState: (workspaceState) => set({ workspaceState }),
  setSketch: (sketch) => set({ sketch }),
}));
