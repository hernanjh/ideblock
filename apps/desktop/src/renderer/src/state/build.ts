import type { CompileResult, ToolchainProgress } from '@ideblock/shared';
import { create } from 'zustand';
import { librariesForCode } from '../build/libraries';
import { currentCode, useProjectStore } from './project';

export type BuildStatus = 'idle' | 'working' | 'success' | 'error';

interface BuildState {
  status: BuildStatus;
  progress: ToolchainProgress | null;
  result: CompileResult | null;
  /** Code the last result belongs to, so stale results can be recognized. */
  resultCode: string | null;
  compile: () => Promise<CompileResult | null>;
  setProgress: (progress: ToolchainProgress) => void;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  status: 'idle',
  progress: null,
  result: null,
  resultCode: null,
  compile: async () => {
    if (get().status === 'working') return null;
    const project = useProjectStore.getState();
    const code = currentCode(project);
    const libraries =
      project.mode === 'blocks' ? (project.sketch?.libraries ?? []) : librariesForCode(code);

    set({ status: 'working', progress: null });
    const result = await window.ideblock.invoke('toolchain:compile', {
      code,
      boardId: project.boardId,
      sketchName: project.name || 'sketch',
      libraries,
    });
    set({ status: result.ok ? 'success' : 'error', result, resultCode: code, progress: null });
    useProjectStore
      .getState()
      .setDiagnostics(
        result.diagnostics
          .filter((diagnostic) => diagnostic.inSketch && diagnostic.line > 0)
          .map(({ line, column, severity, message }) => ({ line, column, severity, message })),
      );
    return result;
  },
  setProgress: (progress) => set({ progress }),
}));
