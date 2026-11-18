import { DEFAULT_BOARD_ID } from '@ideblock/boards';
import type { SketchResult } from '@ideblock/blocks';
import { create } from 'zustand';

/** Serialized Blockly workspace, as produced by Blockly.serialization. */
export type WorkspaceState = Record<string, unknown>;

/**
 * In "blocks" mode the blocks are the source of truth and the code is
 * generated. In "code" mode the user edits the code directly and the blocks
 * are kept untouched.
 */
export type ProjectMode = 'blocks' | 'code';

export interface Diagnostic {
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
}

interface ProjectState {
  boardId: string;
  mode: ProjectMode;
  workspaceState: WorkspaceState | null;
  sketch: SketchResult | null;
  /** Hand-written code, used in "code" mode. */
  code: string;
  /** Generated code at the moment the project switched to "code" mode. */
  codeAtSwitch: string | null;
  diagnostics: Diagnostic[];
  setBoard: (boardId: string) => void;
  setWorkspaceState: (state: WorkspaceState) => void;
  setSketch: (sketch: SketchResult) => void;
  setCode: (code: string) => void;
  switchToCode: () => void;
  /** Returns to blocks only when the code was not edited, so nothing is lost. */
  switchToBlocks: () => boolean;
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  boardId: DEFAULT_BOARD_ID,
  mode: 'blocks',
  workspaceState: null,
  sketch: null,
  code: '',
  codeAtSwitch: null,
  diagnostics: [],
  setBoard: (boardId) => set({ boardId }),
  setWorkspaceState: (workspaceState) => set({ workspaceState }),
  setSketch: (sketch) => set({ sketch }),
  setCode: (code) => set({ code }),
  switchToCode: () => {
    const generated = get().sketch?.code ?? '';
    set({ mode: 'code', code: generated, codeAtSwitch: generated });
  },
  switchToBlocks: () => {
    const { code, codeAtSwitch } = get();
    if (codeAtSwitch === null || code !== codeAtSwitch) return false;
    set({ mode: 'blocks', codeAtSwitch: null });
    return true;
  },
  setDiagnostics: (diagnostics) => set({ diagnostics }),
}));

export function currentCode(state: Pick<ProjectState, 'mode' | 'code' | 'sketch'>): string {
  return state.mode === 'code' ? state.code : (state.sketch?.code ?? '');
}
