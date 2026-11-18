import type { BoardDefinition } from '@ideblock/boards';
import type { CircuitDocument } from '@ideblock/project';
import { findComponent } from '@ideblock/simulator';
import { circuitComponents, wiringMode, type CircuitItem } from '../simulator/circuit';
import { shapeOf } from './geometry';
import { supplyPin } from './layout';
import { circuitAnalysis, circuitWires } from './model';
import type { CircuitIssue } from './netlist';

/** One thing to do with the real parts, in the order a child would do it. */
export type AssemblyStep =
  /** A leg goes to a board pin, through a resistor when the part needs one. */
  | { kind: 'pin'; part: string; leg: string; pin: string; resistor: boolean }
  | { kind: 'ground'; part: string; leg: string }
  | { kind: 'supply'; part: string; leg: string; supply: string }
  /** Hand wiring: a part's legs go into these breadboard holes (terminal ids). */
  | { kind: 'plug'; part: string; holes: { leg: string; hole: string }[] }
  /** Hand wiring: a jumper wire between two terminals. */
  | { kind: 'wire'; from: string; to: string; color: string | undefined };

export interface AssemblyPlan {
  /** Parts to gather, by type, in the order they appear in the circuit. */
  parts: { type: string; count: number }[];
  /** 220 Ω resistors that automatic wiring adds in front of LEDs. */
  extraResistors: number;
  wires: number;
  steps: AssemblyStep[];
  /** Problems to fix before building, with hand wiring. */
  issues: CircuitIssue[];
}

function countParts(items: CircuitItem[]): AssemblyPlan['parts'] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  return [...counts].map(([type, count]) => ({ type, count }));
}

/** What to buy and what to connect where to build the circuit with real parts. */
export function assemblyPlan(circuit: CircuitDocument, board: BoardDefinition): AssemblyPlan {
  const items = circuitComponents(circuit);

  if (wiringMode(circuit) === 'manual') {
    const analysis = circuitAnalysis(circuit, board);
    const steps: AssemblyStep[] = [];
    for (const item of items) {
      const holes = [...(analysis?.seated ?? [])]
        .filter(([leg]) => leg.startsWith(`${item.id}:`))
        .map(([leg, hole]) => ({ leg: leg.slice(item.id.length + 1), hole }));
      if (holes.length > 0) steps.push({ kind: 'plug', part: item.id, holes });
    }
    const wires = circuitWires(circuit);
    for (const wire of wires) {
      steps.push({ kind: 'wire', from: wire.from, to: wire.to, color: wire.color });
    }
    return {
      parts: countParts(items),
      extraResistors: 0,
      wires: wires.length,
      steps,
      issues: analysis?.issues ?? [],
    };
  }

  const simulated = items.filter((item) => findComponent(item.type));
  const supply = supplyPin(board);
  const steps: AssemblyStep[] = [];
  let extraResistors = 0;
  for (const item of simulated) {
    const shape = shapeOf(item);
    if (!shape) continue;
    for (const [signal, leg] of Object.entries(shape.signals)) {
      const pin = item.pins[signal];
      if (!pin) continue;
      const resistor = Boolean(shape.resistors);
      if (resistor) extraResistors++;
      steps.push({ kind: 'pin', part: item.id, leg, pin, resistor });
    }
    for (const leg of shape.ground) steps.push({ kind: 'ground', part: item.id, leg });
    for (const leg of shape.supply) steps.push({ kind: 'supply', part: item.id, leg, supply });
  }
  return {
    parts: countParts(simulated),
    extraResistors,
    wires: steps.length,
    steps,
    issues: [],
  };
}
