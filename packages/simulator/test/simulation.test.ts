import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Simulation, type ComponentInstance } from '../src';

const hex = (name: string) =>
  readFileSync(join(import.meta.dirname, 'fixtures', `${name}.ino.hex`), 'utf8');

/** Runs the simulation for `ms` in frames of `frameMs`, returning every frame. */
function run(simulation: Simulation, ms: number, frameMs = 20) {
  const frames = [];
  for (let elapsed = 0; elapsed < ms; elapsed += frameMs) {
    simulation.advance(frameMs);
    frames.push(simulation.frame());
  }
  return frames;
}

const led = (pin: string): ComponentInstance => ({ id: 'led', type: 'led', pins: { anode: pin } });

describe('Simulation', () => {
  it('blinks the built-in LED once per second', () => {
    const simulation = new Simulation(hex('Blink'), [led('13')]);
    const frames = run(simulation, 2500, 50);
    const at = (ms: number) => frames[Math.round(ms / 50) - 1]!.components['led']!['brightness'];
    expect(at(500)).toBe(1);
    expect(at(1500)).toBe(0);
    expect(at(2500)).toBe(1);
    expect(simulation.timeMs).toBeCloseTo(2500, -1);
  });

  it('lights the LED while the button is pressed', () => {
    const simulation = new Simulation(hex('ButtonLed'), [
      led('13'),
      { id: 'button', type: 'pushbutton', pins: { signal: '2' } },
    ]);
    expect(run(simulation, 100).at(-1)!.components['led']!['brightness']).toBe(0);
    simulation.input('button', { pressed: true });
    expect(run(simulation, 100).at(-1)!.components['led']!['brightness']).toBe(1);
    simulation.input('button', { pressed: false });
    expect(run(simulation, 100).at(-1)!.components['led']!['brightness']).toBe(0);
  });

  it('dims the LED with PWM from the potentiometer', () => {
    const simulation = new Simulation(hex('Dimmer'), [
      led('9'),
      { id: 'pot', type: 'potentiometer', pins: { signal: 'A0' } },
    ]);
    simulation.input('pot', { value: 256 });
    const brightness = run(simulation, 200).at(-1)!.components['led']!['brightness'] as number;
    expect(brightness).toBeGreaterThan(0.15);
    expect(brightness).toBeLessThan(0.35);

    simulation.input('pot', { value: 1023 });
    expect(run(simulation, 200).at(-1)!.components['led']!['brightness']).toBeGreaterThan(0.95);
  });

  it('moves the servo with the potentiometer', () => {
    const simulation = new Simulation(hex('ServoKnob'), [
      { id: 'servo', type: 'servo', pins: { signal: '9' } },
      { id: 'pot', type: 'potentiometer', pins: { signal: 'A0' } },
    ]);
    simulation.input('pot', { value: 0 });
    expect(run(simulation, 300).at(-1)!.components['servo']!['angle']).toBeLessThanOrEqual(2);
    simulation.input('pot', { value: 1023 });
    expect(run(simulation, 300).at(-1)!.components['servo']!['angle']).toBeGreaterThanOrEqual(178);
  });

  it('plays notes on the buzzer', () => {
    const simulation = new Simulation(hex('Melody'), [
      { id: 'buzzer', type: 'buzzer', pins: { signal: '8' } },
    ]);
    const frequencies = run(simulation, 600).map(
      (frame) => frame.components['buzzer']!['frequency'] as number,
    );
    expect(frequencies.some((value) => Math.abs(value - 262) <= 3)).toBe(true);
    expect(frequencies.some((value) => Math.abs(value - 294) <= 3)).toBe(true);
  });

  it('sends serial output', () => {
    const simulation = new Simulation(hex('SerialCounter'), []);
    const text = run(simulation, 2200)
      .map((frame) => frame.serial)
      .join('');
    expect(text).toContain("Hello! Let's count.\r\n0\r\n1\r\n2\r\n");
  });

  it('measures distance with the ultrasonic sensor', () => {
    const simulation = new Simulation(hex('ParkingSensor'), [
      { id: 'sonar', type: 'hc-sr04', pins: { trig: '9', echo: '10' } },
    ]);
    simulation.input('sonar', { distance: 30 });
    const text = run(simulation, 1000)
      .map((frame) => frame.serial)
      .join('');
    const readings = text.split(/\r\n/).filter(Boolean).map(Number);
    expect(readings.length).toBeGreaterThan(0);
    for (const reading of readings) expect(Math.abs(reading - 30)).toBeLessThanOrEqual(2);
  });
});

describe('block tracing', () => {
  it('reports the index of the block that is running', () => {
    // Traced.ino.hex is a blink sketch built with ideblockTrace() calls 0, 1, 300 and 3.
    const simulation = new Simulation(hex('Traced'), []);
    const traces = run(simulation, 2100, 50).map((frame) => frame.trace);
    expect(traces[9]).toBe(1);
    expect(traces[29]).toBe(3);
  });
});
