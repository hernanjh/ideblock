# 0008. Hand wiring and the circuit check

- Status: Accepted
- Date: 2026-11-18

## Context

Until Phase 2 each component stored the board pin of each of its pins, and the
drawing laid out the wires. That is quick for young children but hides how a
circuit is really built. Teachers also want students to use a breadboard and
learn why an LED needs a resistor. The simulator must keep running the same
component models either way.

## Decision

- A circuit has a wiring mode, stored as `wiring` in `circuit.json`:
  `auto` (the default, as before) or `manual`.
- With manual wiring, wires are stored in the existing `connections` list as
  `{ id, from, to, color }`. Terminals are named `board:<pin>`,
  `<part>:<leg>` or `<breadboard>:<hole>`.
- Breadboards and resistors are parts that only exist with manual wiring. A leg
  closer than about half a hole to a breadboard hole is plugged into it.
- The application builds nets with a union-find over terminals, wires, breadboard
  strips and the legs joined inside a part. It builds them twice: once treating
  resistors as connections, to find the board pin each part reaches, and once
  without them, to tell whether a resistor sits in series with an LED.
- The pins found this way are handed to the simulator, so component models are
  unchanged. A part that is not fully wired is left out of the simulation.
- The circuit check reports missing wires, a missing ground or supply, short
  circuits and LEDs without a resistor. Such an LED burns out the first time it
  lights, until the simulation stops.
- Switching from automatic to manual wiring creates the equivalent wires and a
  resistor in front of each LED, so the circuit keeps working. Switching back
  keeps the pins the wires reached and the wires themselves, for later.

## Consequences

- Projects made before this change open unchanged in automatic wiring.
- The analysis is electrical only at the level of connections: it does not
  compute currents or voltages, so capacitors, transistors and diodes cannot be
  simulated this way.
- Part shapes now carry leg positions that must match the 0.1 inch breadboard
  pitch, documented in the guide for adding a component.
