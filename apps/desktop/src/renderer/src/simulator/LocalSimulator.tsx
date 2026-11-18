import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { currentCode, useProjectStore } from '../state/project';
import { useSimulationStore } from '../state/simulation';
import { useUiStore } from '../state/ui';
import { SimulatorModelContext, type SimulatorAction, type SimulatorSnapshot } from './model';

function useSnapshot(): SimulatorSnapshot {
  const simulation = useSimulationStore(
    useShallow((state) => ({
      status: state.status,
      components: state.components,
      inputs: state.inputs,
      timeMs: state.timeMs,
      speed: state.speed,
      error: state.error,
      runningCode: state.runningCode,
    })),
  );
  const circuit = useProjectStore((state) => state.circuit);
  const boardId = useProjectStore((state) => state.boardId);
  const code = useProjectStore(currentCode);
  const { runningCode, ...rest } = simulation;
  return useMemo(
    () => ({
      ...rest,
      outdated: runningCode !== null && runningCode !== code,
      circuit,
      boardId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simulation, circuit, boardId, code],
  );
}

export function runSimulatorAction(action: SimulatorAction): void {
  const simulation = useSimulationStore.getState();
  switch (action.type) {
    case 'start':
      void simulation.start();
      break;
    case 'stop':
      simulation.stop();
      break;
    case 'input':
      simulation.input(action.id, action.input);
      break;
    case 'setCircuit':
      useProjectStore.getState().setCircuit(action.circuit);
      break;
  }
}

/**
 * Provides the simulator to the main window, and mirrors it to the separate
 * simulator window while that window is open.
 */
export function LocalSimulator({ children }: { children: ReactNode }) {
  const snapshot = useSnapshot();
  const detached = useUiStore((state) => state.simulatorDetached);

  useEffect(() => {
    if (detached) void window.ideblock.invoke('simulator:sync', { ...snapshot });
  }, [detached, snapshot]);

  useEffect(
    () =>
      window.ideblock.on('simulator:action', (action) =>
        runSimulatorAction(action as SimulatorAction),
      ),
    [],
  );

  const toggleWindow = useCallback(() => {
    void window.ideblock.invoke(detached ? 'simulator:attach' : 'simulator:detach');
  }, [detached]);

  const model = useMemo(
    () => ({ snapshot, dispatch: runSimulatorAction, detached: false, toggleWindow }),
    [snapshot, toggleWindow],
  );
  return <SimulatorModelContext.Provider value={model}>{children}</SimulatorModelContext.Provider>;
}
