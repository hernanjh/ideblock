import { getBoard } from '@ideblock/boards';
import type { ComponentInput, ComponentState } from '@ideblock/simulator';
import { create } from 'zustand';
import { generateSimulationSketch } from '../blocks/simulation-sketch';
import { librariesForCode } from '../build/libraries';
import { circuitComponents } from '../simulator/circuit';
import type { WorkerRequest, WorkerResponse } from '../simulator/protocol';
import SimulationWorker from '../simulator/sim.worker?worker';
import { useBuildStore } from './build';
import { currentCode, useProjectStore } from './project';
import { useSerialStore } from './serial';
import { useSettingsStore } from './settings';

export type SimulationStatus = 'stopped' | 'compiling' | 'running' | 'error' | 'unsupported';

interface SimulationState {
  status: SimulationStatus;
  components: Record<string, ComponentState>;
  /** User-controlled inputs, kept so they survive a restart. */
  inputs: Record<string, ComponentInput>;
  timeMs: number;
  speed: number;
  activeBlockId: string | null;
  /** Code that is running, to tell the user when it no longer matches. */
  runningCode: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /** Restarts the running firmware, e.g. after the circuit changed. */
  restart: () => void;
  input: (componentId: string, input: ComponentInput) => void;
  sendSerial: (text: string) => void;
}

let worker: Worker | null = null;
let hex: string | null = null;
let tracedBlocks: string[] = [];

function post(message: WorkerRequest): void {
  worker?.postMessage(message);
}

function launch(firmware: string): void {
  worker?.terminate();
  worker = new SimulationWorker();
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (message.type === 'error') {
      useSimulationStore.setState({ status: 'error', error: message.message });
      worker?.terminate();
      worker = null;
      return;
    }
    const { frame } = message;
    if (frame.serial) useSerialStore.getState().receive(frame.serial);
    useSimulationStore.setState({
      components: frame.components,
      timeMs: frame.timeMs,
      speed: frame.speed,
      activeBlockId: frame.trace === null ? null : (tracedBlocks[frame.trace] ?? null),
    });
  };
  const { circuit } = useProjectStore.getState();
  post({ type: 'start', hex: firmware, components: circuitComponents(circuit) });
  for (const [id, input] of Object.entries(useSimulationStore.getState().inputs)) {
    post({ type: 'input', id, input });
  }
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  status: 'stopped',
  components: {},
  inputs: {},
  timeMs: 0,
  speed: 1,
  activeBlockId: null,
  runningCode: null,
  error: null,

  start: async () => {
    if (get().status === 'compiling') return;
    get().stop();
    const project = useProjectStore.getState();
    const board = getBoard(project.boardId);
    if (board.simulation?.mcu !== 'atmega328p') {
      set({ status: 'unsupported' });
      return;
    }

    set({ status: 'compiling', error: null });
    const visibleCode = currentCode(project);
    let code = visibleCode;
    let libraries = librariesForCode(code);
    tracedBlocks = [];
    if (project.mode === 'blocks') {
      const sketch = generateSimulationSketch(project.workspaceState, board);
      code = sketch.code;
      libraries = sketch.libraries;
      tracedBlocks = sketch.tracedBlocks;
    }

    const result = await window.ideblock.invoke('toolchain:compile', {
      code,
      boardId: board.id,
      sketchName: `${project.name || 'sketch'} simulation`,
      libraries,
    });
    if (get().status !== 'compiling') return;
    if (!result.ok || !result.hex) {
      // Errors are explained in the console, with the same help as Verify.
      useBuildStore.setState({ status: 'error', action: 'verify', result, noBoard: false });
      await useSettingsStore.getState().update({ consoleVisible: true });
      set({ status: 'error', error: null });
      return;
    }

    hex = result.hex;
    const serial = useSerialStore.getState();
    serial.setSource('simulator');
    serial.clear();
    launch(result.hex);
    set({ status: 'running', runningCode: visibleCode });
  },

  stop: () => {
    worker?.terminate();
    worker = null;
    if (useSerialStore.getState().source === 'simulator') {
      useSerialStore.getState().setSource('board');
    }
    set({ status: 'stopped', activeBlockId: null, components: {}, timeMs: 0, runningCode: null });
  },

  restart: () => {
    if (get().status === 'running' && hex) launch(hex);
  },

  input: (componentId, input) => {
    set((state) => ({
      inputs: { ...state.inputs, [componentId]: { ...state.inputs[componentId], ...input } },
    }));
    post({ type: 'input', id: componentId, input });
  },

  sendSerial: (text) => post({ type: 'serial', text }),
}));

// Rewiring takes effect at once by restarting the running firmware.
useProjectStore.subscribe((state, previous) => {
  if (state.circuit !== previous.circuit && state.loadId === previous.loadId) {
    useSimulationStore.getState().restart();
  }
});

// A different project stops the simulation of the previous one.
useProjectStore.subscribe((state, previous) => {
  if (state.loadId !== previous.loadId) useSimulationStore.getState().stop();
});
