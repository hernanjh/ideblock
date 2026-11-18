import type { SimulationContext } from '../component';

/**
 * Share of time a pin was high since the previous call, so PWM dims a light
 * the same way persistence of vision does.
 */
export function dutyCycle(context: SimulationContext, pin: string): () => number {
  let high = context.readPin(pin);
  let lastChange = context.cycles();
  let frameStart = lastChange;
  let highCycles = 0;

  context.onPin(pin, (value, cycles) => {
    if (high) highCycles += cycles - lastChange;
    high = value;
    lastChange = cycles;
  });

  return () => {
    const now = context.cycles();
    if (high) highCycles += now - lastChange;
    const elapsed = now - frameStart;
    const duty = elapsed > 0 ? Math.min(1, highCycles / elapsed) : high ? 1 : 0;
    frameStart = now;
    lastChange = now;
    highCycles = 0;
    return Math.round(duty * 100) / 100;
  };
}
