import type {
  CompileRequest,
  CompileResult,
  ToolchainProgress,
  UploadResult,
} from '@ideblock/shared';
import { create } from 'zustand';
import { librariesForCode } from '../build/libraries';
import { currentCode, useProjectStore } from './project';

export type BuildStatus = 'idle' | 'working' | 'success' | 'error';
export type BuildAction = 'verify' | 'upload';

interface BuildState {
  status: BuildStatus;
  action: BuildAction;
  progress: ToolchainProgress | null;
  result: CompileResult | null;
  upload: UploadResult | null;
  /** Set when an upload was attempted without a board connected. */
  noBoard: boolean;
  /** Code the last result belongs to, so stale results can be recognized. */
  resultCode: string | null;
  compile: () => Promise<CompileResult | null>;
  uploadTo: (port: string | null) => Promise<UploadResult | null>;
  setProgress: (progress: ToolchainProgress) => void;
}

function compileRequest(): { request: CompileRequest; code: string } {
  const project = useProjectStore.getState();
  const code = currentCode(project);
  const libraries =
    project.mode === 'blocks' ? (project.sketch?.libraries ?? []) : librariesForCode(code);
  return {
    code,
    request: { code, boardId: project.boardId, sketchName: project.name || 'sketch', libraries },
  };
}

function showDiagnostics(result: CompileResult): void {
  useProjectStore
    .getState()
    .setDiagnostics(
      result.diagnostics
        .filter((diagnostic) => diagnostic.inSketch && diagnostic.line > 0)
        .map(({ line, column, severity, message }) => ({ line, column, severity, message })),
    );
}

export const useBuildStore = create<BuildState>((set, get) => ({
  status: 'idle',
  action: 'verify',
  progress: null,
  result: null,
  upload: null,
  noBoard: false,
  resultCode: null,
  compile: async () => {
    if (get().status === 'working') return null;
    const { request, code } = compileRequest();
    set({ status: 'working', action: 'verify', progress: null, upload: null, noBoard: false });
    const result = await window.ideblock.invoke('toolchain:compile', request);
    set({ status: result.ok ? 'success' : 'error', result, resultCode: code, progress: null });
    showDiagnostics(result);
    return result;
  },
  uploadTo: async (port) => {
    if (get().status === 'working') return null;
    if (!port) {
      set({ status: 'error', action: 'upload', noBoard: true, upload: null, result: null });
      return null;
    }
    const { request, code } = compileRequest();
    set({ status: 'working', action: 'upload', progress: null, upload: null, noBoard: false });
    const upload = await window.ideblock.invoke('toolchain:upload', { compile: request, port });
    set({
      status: upload.ok ? 'success' : 'error',
      upload,
      result: upload.compile,
      resultCode: code,
      progress: null,
    });
    showDiagnostics(upload.compile);
    return upload;
  },
  setProgress: (progress) => set({ progress }),
}));
