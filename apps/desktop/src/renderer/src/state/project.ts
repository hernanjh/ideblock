import { DEFAULT_BOARD_ID, getBoard } from '@ideblock/boards';
import type { SketchResult } from '@ideblock/blocks';
import {
  createProject,
  EMPTY_CIRCUIT,
  type CircuitDocument,
  type ProjectDocument,
  type ProjectManifest,
  type ProjectMode,
  type WorkspaceState,
} from '@ideblock/project';
import { create } from 'zustand';
import { withBoardBus } from '../simulator/circuit';

export type { ProjectMode, WorkspaceState };

export interface Diagnostic {
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ProjectState {
  name: string;
  boardId: string;
  /**
   * In "blocks" mode the blocks are the source of truth and the code is
   * generated. In "code" mode the user edits the code and the blocks are kept
   * untouched.
   */
  mode: ProjectMode;
  workspaceState: WorkspaceState | null;
  /** Hand-written code, used in "code" mode. */
  code: string;
  circuit: CircuitDocument;
  /** Earlier circuits for undo, oldest first, and undone ones for redo. */
  circuitPast: CircuitDocument[];
  circuitFuture: CircuitDocument[];
  /** Fields from ideblock.json this version does not use, kept on save. */
  extraManifest: Record<string, unknown>;
  /** Project folder; null until the project is saved somewhere. */
  path: string | null;
  sketch: SketchResult | null;
  diagnostics: Diagnostic[];
  /** Changes since the last save, used to schedule autosave. */
  revision: number;
  savedRevision: number;
  /** True once the user changed anything in this project. */
  edited: boolean;
  /** Increments when a different project is loaded, so editors reload. */
  loadId: number;
  saveStatus: SaveStatus;
  /** Asks the code editor to show a line; the id makes repeated requests distinct. */
  reveal: { line: number; column: number; id: number } | null;

  load: (project: ProjectDocument, path: string | null) => void;
  newProject: (name: string) => void;
  setName: (name: string) => void;
  undoCircuit: () => void;
  redoCircuit: () => void;
  setBoard: (boardId: string) => void;
  setWorkspaceState: (state: WorkspaceState) => void;
  /** Stores the workspace as loaded, with block ids, without counting it as an edit. */
  syncWorkspaceState: (state: WorkspaceState) => void;
  setSketch: (sketch: SketchResult) => void;
  setCode: (code: string) => void;
  switchToCode: () => void;
  /** Returns to blocks only when the code still matches the blocks, so nothing is lost. */
  switchToBlocks: () => boolean;
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
  markSaved: (revision: number, path: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  revealLine: (line: number, column: number) => void;
  /** `mergeKey` groups consecutive edits of one field into a single undo step. */
  setCircuit: (circuit: CircuitDocument, mergeKey?: string) => void;
}

const HISTORY_LIMIT = 100;
const MERGE_MS = 1500;
let lastCircuitChange = 0;
let lastMergeKey: string | undefined;

export const useProjectStore = create<ProjectState>((set, get) => {
  const change = (patch: Partial<ProjectState>): void =>
    set((state) => ({ ...patch, revision: state.revision + 1, edited: true }));

  return {
    name: '',
    boardId: DEFAULT_BOARD_ID,
    mode: 'blocks',
    workspaceState: null,
    code: '',
    circuit: EMPTY_CIRCUIT,
    circuitPast: [],
    circuitFuture: [],
    extraManifest: {},
    path: null,
    sketch: null,
    diagnostics: [],
    revision: 0,
    savedRevision: 0,
    edited: false,
    loadId: 0,
    saveStatus: 'idle',
    reveal: null,

    load: (project, path) => {
      const { formatVersion: _version, name, board, mode, ...extra } = project.manifest;
      set((state) => ({
        name,
        boardId: board,
        mode,
        workspaceState: project.blocks,
        code: mode === 'code' ? project.code : '',
        circuit: project.circuit,
        circuitPast: [],
        circuitFuture: [],
        extraManifest: extra,
        path,
        sketch: null,
        diagnostics: [],
        revision: 0,
        savedRevision: 0,
        edited: false,
        loadId: state.loadId + 1,
        saveStatus: path ? 'saved' : 'idle',
      }));
    },
    newProject: (name) => get().load(createProject(name, get().boardId), null),
    setName: (name) => change({ name }),
    setBoard: (boardId) =>
      change({ boardId, circuit: withBoardBus(get().circuit, getBoard(boardId)) }),
    setWorkspaceState: (workspaceState) => change({ workspaceState }),
    syncWorkspaceState: (workspaceState) => set({ workspaceState }),
    setSketch: (sketch) => set({ sketch }),
    setCode: (code) => change({ code }),
    switchToCode: () => change({ mode: 'code', code: get().sketch?.code ?? '' }),
    switchToBlocks: () => {
      const { code, sketch } = get();
      if (code !== (sketch?.code ?? '')) return false;
      change({ mode: 'blocks' });
      return true;
    },
    setDiagnostics: (diagnostics) => set({ diagnostics }),
    markSaved: (revision, path) =>
      set({ savedRevision: revision, path, saveStatus: path ? 'saved' : 'idle' }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setCircuit: (circuit, mergeKey) => {
      const { circuit: previous, circuitPast } = get();
      if (circuit === previous) return;
      // Typing a name changes the circuit on every key; those changes are
      // undone together when they come one after another.
      const now = Date.now();
      const merge =
        mergeKey !== undefined &&
        mergeKey === lastMergeKey &&
        now - lastCircuitChange < MERGE_MS &&
        circuitPast.length > 0;
      lastCircuitChange = now;
      lastMergeKey = mergeKey;
      change({
        circuit,
        circuitPast: merge ? circuitPast : [...circuitPast, previous].slice(-HISTORY_LIMIT),
        circuitFuture: [],
      });
    },
    undoCircuit: () => {
      const { circuit, circuitPast, circuitFuture } = get();
      const previous = circuitPast.at(-1);
      if (!previous) return;
      lastCircuitChange = 0;
      change({
        circuit: previous,
        circuitPast: circuitPast.slice(0, -1),
        circuitFuture: [circuit, ...circuitFuture],
      });
    },
    redoCircuit: () => {
      const { circuit, circuitPast, circuitFuture } = get();
      const [next, ...rest] = circuitFuture;
      if (!next) return;
      lastCircuitChange = 0;
      change({ circuit: next, circuitPast: [...circuitPast, circuit], circuitFuture: rest });
    },
    revealLine: (line, column) =>
      set((state) => ({ reveal: { line, column, id: (state.reveal?.id ?? 0) + 1 } })),
  };
});

export function currentCode(state: Pick<ProjectState, 'mode' | 'code' | 'sketch'>): string {
  return state.mode === 'code' ? state.code : (state.sketch?.code ?? '');
}

export function toDocument(state: ProjectState): ProjectDocument {
  const manifest: ProjectManifest = {
    ...state.extraManifest,
    formatVersion: 1,
    name: state.name || 'Project',
    board: state.boardId,
    mode: state.mode,
  };
  return {
    manifest,
    blocks: state.workspaceState,
    code: currentCode(state),
    circuit: state.circuit,
  };
}
