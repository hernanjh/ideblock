import type { ComponentInput, ComponentInstance, SimulationFrame } from '@ideblock/simulator';

export type WorkerRequest =
  | { type: 'start'; hex: string; components: ComponentInstance[] }
  | { type: 'input'; id: string; input: ComponentInput }
  | { type: 'serial'; text: string };

export type WorkerResponse =
  { type: 'frame'; frame: SimulationFrame } | { type: 'error'; message: string };
