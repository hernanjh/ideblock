# Test firmware

These Intel HEX files are the bundled examples in `examples/` compiled for the
Arduino Uno (`arduino:avr:uno`, platform `arduino:avr` 1.8.8, Servo 1.2) with
arduino-cli 1.6.0. They let the simulator tests run without a toolchain.

The firmware contains object code from the Arduino AVR core and the Servo
library, both under the GNU LGPL 2.1. Their source code is available at
<https://github.com/arduino/ArduinoCore-avr> and
<https://github.com/arduino-libraries/Servo>.

To regenerate a file after changing an example, compile it with
`arduino-cli compile --fqbn arduino:avr:uno --build-path <dir> examples/<Name>`
and copy `<dir>/<Name>.ino.hex` here.

`Traced.ino.hex` is a blink sketch that calls `ideblockTrace()` with the
indices 0, 1, 300 and 3, as the block generator does for simulator builds.
