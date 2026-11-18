# 0007. Simulator architecture

- Status: Accepted
- Date: 2026-11-18

## Context

The simulator must run the program the user wrote, not an approximation of it,
react to inputs such as buttons and knobs, stay responsive on modest school
computers, and be usable in a separate window.

## Decision

- Compile the sketch with the real toolchain and run the resulting firmware in
  avr8js (MIT), which emulates the ATmega328P used by the Uno and Nano.
- Run the emulator in a Web Worker in real time, catching up at most 50 ms per
  step, and send a frame of component states about 30 times per second.
- Model each component as a self-contained module in `packages/simulator` that
  only sees pins, voltages and CPU cycles. Measuring time in CPU cycles makes
  PWM brightness, servo pulses, tones and ultrasonic echoes accurate.
- For block programs, build the simulator firmware with a call before each
  statement that writes the block index to the GPIOR0 and GPIOR1 registers. The
  simulator watches those registers to highlight the running block. The code
  shown to the user and uploaded to boards never contains these calls.
- Draw components with wokwi-elements (MIT). Board drawings are not used, since
  they may carry trademarks.
- The separate simulator window is a view: the simulation keeps running in the
  main window and the main process relays snapshots and user actions between
  both windows.

## Consequences

- Behaviour matches real boards, including timing, because the same compiled
  code runs.
- Starting a simulation needs a compilation, which takes a few seconds.
- The Mega 2560 and the ESP32 are not simulated yet; ESP32 simulation is
  planned for Phase 2.
- Measured speed is about 1.4 times real time on the development machine; a
  notice tells the user when a computer cannot keep up.
