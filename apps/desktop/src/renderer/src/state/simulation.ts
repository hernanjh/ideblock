import { getBoard } from '@ideblock/boards';
import { isSimulatedMcu, type ComponentInput, type ComponentState } from '@ideblock/simulator';
import { create } from 'zustand';
import { generateSimulationSketch } from '../blocks/simulation-sketch';
import { librariesForCode } from '../build/libraries';
import { simulationParts } from '../circuit/model';
import type { WorkerRequest, WorkerResponse } from '../simulator/protocol';
import SimulationWorker from '../simulator/sim.worker?worker';
import { useBuildStore } from './build';
import { currentCode, useProjectStore } from './project';
import { useSerialStore } from './serial';
import { useSettingsStore } from './settings';

export type SimulationStatus =
  'stopped' | 'compiling' | 'running' | 'paused' | 'error' | 'unsupported';

interface SimulationState {
  status: SimulationStatus;
  components: Record<string, ComponentState>;
  /** User-controlled inputs, kept so they survive a restart. */
  inputs: Record<string, ComponentInput>;
  timeMs: number;
  speed: number;
  /** Blocks that ran in the last moments, lit in the editor so the program can be followed. */
  activeBlockIds: string[];
  /** Code that is running, to tell the user when it no longer matches. */
  runningCode: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /** Restarts the running firmware, e.g. after the circuit changed. */
  restart: () => void;
  pause: () => void;
  resume: () => void;
  input: (componentId: string, input: ComponentInput) => void;
  sendSerial: (text: string) => void;
}

let worker: Worker | null = null;
let hex: string | null = null;
let tracedBlocks: string[] = [];

/** How long a block stays lit after it ran, long enough for the eye to follow. */
const BLOCK_GLOW_MS = 350;
const lastRan = new Map<string, number>();

/** Blocks that ran within the glow time, keeping the previous array when nothing changed. */
function recentBlocks(indices: number[]): string[] {
  const now = performance.now();
  for (const index of indices) {
    const id = tracedBlocks[index];
    if (id) lastRan.set(id, now);
  }
  for (const [id, at] of lastRan) if (now - at > BLOCK_GLOW_MS) lastRan.delete(id);
  const ids = [...lastRan.keys()].sort();
  const previous = useSimulationStore.getState().activeBlockIds;
  return ids.length === previous.length && ids.every((id, i) => id === previous[i])
    ? previous
    : ids;
}

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
      activeBlockIds: recentBlocks([...frame.ran, ...(frame.trace === null ? [] : [frame.trace])]),
    });
  };
  const { circuit, boardId } = useProjectStore.getState();
  const board = getBoard(boardId);
  const mcu = board.simulation?.mcu;
  if (!isSimulatedMcu(mcu)) return;
  post({ type: 'start', firmware, components: simulationParts(circuit, board), mcu });
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
  activeBlockIds: [],
  runningCode: null,
  error: null,

  start: async () => {
    if (get().status === 'compiling') return;
    get().stop();
    const project = useProjectStore.getState();
    const board = getBoard(project.boardId);
    if (!isSimulatedMcu(board.simulation?.mcu)) {
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
    if (!result.ok || !result.firmware) {
      // Errors are explained in the console, with the same help as Verify.
      useBuildStore.setState({ status: 'error', action: 'verify', result, noBoard: false });
      await useSettingsStore.getState().update({ consoleVisible: true });
      set({ status: 'error', error: null });
      return;
    }

    // Errors from an earlier attempt no longer apply once the program compiles.
    if (useBuildStore.getState().status === 'error') {
      useBuildStore.setState({ status: 'idle', result: null, upload: null, resultCode: null });
    }
    hex = result.firmware;
    const serial = useSerialStore.getState();
    serial.setSource('simulator');
    serial.clear();
    launch(result.firmware);
    set({ status: 'running', runningCode: visibleCode });
  },

  stop: () => {
    worker?.terminate();
    worker = null;
    if (useSerialStore.getState().source === 'simulator') {
      useSerialStore.getState().setSource('board');
    }
    lastRan.clear();
    set({ status: 'stopped', activeBlockIds: [], components: {}, timeMs: 0, runningCode: null });
  },

  restart: () => {
    const { status } = get();
    if ((status === 'running' || status === 'paused') && hex) {
      launch(hex);
      set({ status: 'running' });
    }
  },

  pause: () => {
    if (get().status !== 'running') return;
    post({ type: 'pause' });
    set({ status: 'paused' });
  },

  resume: () => {
    if (get().status !== 'paused') return;
    post({ type: 'resume' });
    set({ status: 'running' });
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
