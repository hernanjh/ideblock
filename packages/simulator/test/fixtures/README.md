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

`LcdCounter.ino.hex` also includes LiquidCrystal_PCF8574 2.3.0 (BSD-3-Clause,
<https://github.com/mathertel/LiquidCrystal_PCF8574>) and `NeoPixelChase.ino.hex`
includes Adafruit NeoPixel 1.15.5 (LGPL-3.0,
<https://github.com/adafruit/Adafruit_NeoPixel>).

`Thermometer.ino.hex`, `MotionAlarm.ino.hex`, `Dice.ino.hex` and `Joystick.ino.hex`
use only the Arduino AVR core. `LcdThermometer.ino.hex` also includes
LiquidCrystal_PCF8574 2.3.0, like `LcdCounter.ino.hex`.

`MegaCheck.ino.hex` is `MegaCheck.ino` in this folder, compiled for the Arduino Mega
(`arduino:avr:mega`). It uses only the Arduino AVR core.

`PicoCheck.ino.bin` is `PicoCheck.ino` in this folder, built for the Raspberry Pi
Pico (`rp2040:rp2040:rpipico`, arduino-pico 6.4.0). The image contains code from
the arduino-pico core (LGPL-2.1) and the Raspberry Pi Pico SDK (BSD-3-Clause),
available at <https://github.com/earlephilhower/arduino-pico>.

`LeoCheck.ino.hex` is `LeoCheck.ino` in this folder, compiled for the Arduino
Leonardo (`arduino:avr:leonardo`). Its first lines send `Serial` to USART1, as
the application does for Leonardo and Micro simulation builds.
