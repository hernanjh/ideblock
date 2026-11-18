import { Simulation } from '@ideblock/simulator';
import type { WorkerRequest, WorkerResponse } from './protocol';

// Runs the emulated microcontroller off the interface thread and reports a
// frame of component states about 30 times per second.
const FRAME_MS = 33;

let simulation: Simulation | null = null;
let lastTick = 0;
let timer: ReturnType<typeof setInterval> | undefined;

const post = (message: WorkerResponse): void => self.postMessage(message);

function tick(): void {
  if (!simulation) return;
  const now = performance.now();
  try {
    simulation.advance(now - lastTick);
    lastTick = now;
    post({ type: 'frame', frame: simulation.frame() });
  } catch (error) {
    clearInterval(timer);
    simulation = null;
    post({ type: 'error', message: String(error) });
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === 'start') {
    clearInterval(timer);
    try {
      simulation = new Simulation(message.hex, message.components);
    } catch (error) {
      post({ type: 'error', message: String(error) });
      return;
    }
    lastTick = performance.now();
    timer = setInterval(tick, FRAME_MS);
  } else if (message.type === 'input') {
    simulation?.input(message.id, message.input);
  } else if (message.type === 'serial') {
    simulation?.writeSerial(message.text);
  }
};
