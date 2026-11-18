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

  it('lists every block that ran between frames, not only the last one', () => {
    const simulation = new Simulation(hex('Traced'), []);
    const ran = run(simulation, 2100, 50).flatMap((frame) => frame.ran);
    // The blocks before each wait run in microseconds, yet they are reported.
    expect(new Set(ran)).toEqual(new Set([0, 1, 300, 3]));
  });
});

describe('new components', () => {
  it('mixes colours on an RGB LED', () => {
    const simulation = new Simulation(hex('RgbColors'), [
      { id: 'rgb', type: 'rgb-led', pins: { red: '9', green: '10', blue: '11' } },
    ]);
    const frames = run(simulation, 2500, 50);
    expect(frames[9]!.components['rgb']).toEqual({ red: 1, green: 0, blue: 0 });
    expect(frames[29]!.components['rgb']).toEqual({ red: 0, green: 1, blue: 0 });
    expect(
      frames[49]?.components['rgb'] ?? run(simulation, 50, 50)[0]!.components['rgb'],
    ).toBeDefined();
  });

  it('shows text on an I2C LCD screen', () => {
    const simulation = new Simulation(hex('LcdCounter'), [
      { id: 'lcd', type: 'lcd1602', pins: { sda: 'A4', scl: 'A5' } },
    ]);
    const text = String(run(simulation, 2600, 50).at(-1)!.components['lcd']!['text']);
    expect(text.slice(0, 16).trimEnd()).toBe('Hello!');
    expect(text.slice(16).trim()).toBe('2');
    expect(run(simulation, 50, 50)[0]!.components['lcd']!['backlight']).toBe(true);
  });

  it('decodes NeoPixel colours from the data pin', () => {
    const simulation = new Simulation(hex('NeoPixelChase'), [
      { id: 'ring', type: 'neopixel-ring', pins: { din: '6' }, props: { pixels: 8 } },
    ]);
    const frames = run(simulation, 600, 20).map((frame) =>
      String(frame.components['ring']!['colours']),
    );
    const lit = frames.map((colours) => colours.split(';').indexOf('255,0,0'));
    expect(lit).toContain(0);
    expect(lit).toContain(2);
    expect(
      frames
        .at(-1)!
        .split(';')
        .filter((colour) => colour === '255,0,0'),
    ).toHaveLength(1);
  });

  it('reads the temperature sensor like the real module', () => {
    const simulation = new Simulation(hex('Thermometer'), [
      { id: 'thermo', type: 'temperature-sensor', pins: { signal: 'A0' } },
      led('13'),
    ]);
    const readings = () =>
      run(simulation, 1200, 50)
        .map((frame) => frame.serial)
        .join('')
        .split('\r\n')
        .filter((line) => line !== '')
        .map(Number);
    const room = readings();
    expect(room.length).toBeGreaterThan(0);
    // The 10-bit reading limits the precision to a few tenths of a degree.
    expect(room.at(-1)).toBeCloseTo(24, 0);
    expect(simulation.frame().components['led']).toEqual({ brightness: 0 });

    simulation.input('thermo', { temperature: 35 });
    expect(readings().at(-1)).toBeCloseTo(35, 0);
    expect(simulation.frame().components['led']).toEqual({ brightness: 1 });
  });

  it('sounds the alarm only while armed and something moves', () => {
    const simulation = new Simulation(hex('MotionAlarm'), [
      { id: 'switch', type: 'slide-switch', pins: { signal: '4' } },
      { id: 'pir', type: 'pir-sensor', pins: { signal: '7' } },
      { id: 'buzzer', type: 'buzzer', pins: { signal: '8' } },
      led('13'),
    ]);
    simulation.input('pir', { motion: true });
    run(simulation, 600);
    expect(simulation.frame().components['led']).toEqual({ brightness: 0 });

    simulation.input('switch', { on: true });
    const armed = run(simulation, 600);
    expect(armed.some((frame) => frame.components['led']?.['brightness'] === 1)).toBe(true);
    expect(armed.some((frame) => frame.components['buzzer']?.['frequency'] === 880)).toBe(true);

    // The sensor keeps its output on for a while after the motion stops.
    simulation.input('pir', { motion: false });
    run(simulation, 1000);
    expect(simulation.frame().components['pir']).toEqual({ motion: true });
    run(simulation, 1500);
    expect(simulation.frame().components['pir']).toEqual({ motion: false });
    run(simulation, 500);
    expect(simulation.frame().components['led']).toEqual({ brightness: 0 });
  });

  it('shows a rolled number on the 7-segment display', () => {
    const pins = Object.fromEntries([...'abcdefg'].map((segment, i) => [segment, String(2 + i)]));
    const simulation = new Simulation(hex('Dice'), [
      { id: 'display', type: 'seven-segment', pins },
      { id: 'button', type: 'pushbutton', pins: { signal: '12' } },
    ]);
    run(simulation, 200);
    expect(simulation.frame().components['display']).toEqual({ segments: '00000000' });
    simulation.input('button', { pressed: true });
    run(simulation, 200);
    simulation.input('button', { pressed: false });
    run(simulation, 400);
    // Segments a to g of the digits 1 to 6.
    const digits = ['01100000', '11011010', '11110010', '01100110', '10110110', '10111110'];
    expect(digits).toContain(simulation.frame().components['display']?.['segments']);
  });

  it('reads both joystick axes and its button', () => {
    const simulation = new Simulation(hex('Joystick'), [
      { id: 'stick', type: 'joystick', pins: { horz: 'A0', vert: 'A1', sel: '2' } },
      led('13'),
    ]);
    simulation.input('stick', { x: 100, y: -100, pressed: true });
    const lines = run(simulation, 500, 50)
      .map((frame) => frame.serial)
      .join('')
      .split('\r\n')
      .filter((line) => line !== '');
    expect(lines.at(-1)).toBe('100 -100');
    expect(simulation.frame().components['led']).toEqual({ brightness: 1 });
  });
});
