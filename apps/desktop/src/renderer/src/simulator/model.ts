import type { PartUse } from '@ideblock/blocks';
import type { CircuitDocument } from '@ideblock/project';
import type { ComponentInput, ComponentState } from '@ideblock/simulator';
import { createContext, useContext } from 'react';
import type { SimulationStatus } from '../state/simulation';

/** Everything the simulator panel shows, wherever it is displayed. */
export interface SimulatorSnapshot {
  status: SimulationStatus;
  components: Record<string, ComponentState>;
  inputs: Record<string, ComponentInput>;
  timeMs: number;
  speed: number;
  error: string | null;
  /** True when the code changed after the simulation started. */
  outdated: boolean;
  circuit: CircuitDocument;
  boardId: string;
  /** Parts the blocks program drives; empty when programming in code. */
  programParts: PartUse[];
}

export type SimulatorAction =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'openCircuit'; componentId: string | null }
  | { type: 'openAssembly' }
  | { type: 'input'; id: string; input: ComponentInput }
  | { type: 'setCircuit'; circuit: CircuitDocument };

export interface SimulatorModel {
  snapshot: SimulatorSnapshot;
  dispatch: (action: SimulatorAction) => void;
  /** True when shown in its own window. */
  detached: boolean;
  /** Moves the simulator to its own window or back to the main one. */
  toggleWindow: () => void;
}

export const SimulatorModelContext = createContext<SimulatorModel | null>(null);

export function useSimulatorModel(): SimulatorModel {
  const model = useContext(SimulatorModelContext);
  if (!model) throw new Error('Simulator model is not provided');
  return model;
}
