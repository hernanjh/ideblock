import { getBoard } from '@ideblock/boards';
import { partsUsedBy, type PartUse } from '@ideblock/blocks';
import type { WorkspaceState } from '@ideblock/project';
import { useEffect, useMemo, useState } from 'react';
import { convertCode } from '../blocks/code-to-blocks';
import { useProjectStore } from '../state/project';

/** Waits for typing to pause before reading the code again. */
const CODE_DELAY_MS = 400;
const NONE: PartUse[] = [];

/**
 * The circuit parts the program drives. Hand-written code is read through the
 * code-to-blocks converter, so only parts the code names without doubt count:
 * a library object, a helper the blocks write, or a pull-up button read.
 */
export function useProgramParts(): PartUse[] {
  const boardId = useProjectStore((state) => state.boardId);
  const mode = useProjectStore((state) => state.mode);
  const workspaceState = useProjectStore((state) => state.workspaceState);
  const code = useProjectStore((state) => (state.mode === 'code' ? state.code : null));
  const circuit = useProjectStore((state) => state.circuit);
  const [fromCode, setFromCode] = useState<PartUse[]>(NONE);

  const fromBlocks = useMemo(
    () => (mode === 'blocks' ? partsUsedBy(workspaceState, getBoard(boardId)) : NONE),
    [mode, workspaceState, boardId],
  );

  useEffect(() => {
    if (code === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const board = getBoard(boardId);
      convertCode(code, board, circuit)
        .then((result) => {
          if (!cancelled) setFromCode(partsUsedBy(result.state as WorkspaceState, board));
        })
        .catch(() => {
          if (!cancelled) setFromCode(NONE);
        });
    }, CODE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, boardId, circuit]);

  return mode === 'code' ? fromCode : fromBlocks;
}
