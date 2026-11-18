import type { ComponentDefinition } from '../component';

const COLUMNS = 16;
const ROWS = 2;
// Common backpack address; the PCF8574A variant uses 0x3F.
const DEFAULT_ADDRESS = 0x27;

// PCF8574 outputs wired to the HD44780 on common I2C backpacks.
const RS = 0x01;
const ENABLE = 0x04;
const BACKLIGHT = 0x08;

/**
 * 16x2 character display behind a PCF8574 I2C backpack. The controller is
 * driven in 4-bit mode: each byte arrives as two nibbles latched on the
 * falling edge of the enable line.
 */
export const lcd1602: ComponentDefinition = {
  type: 'lcd1602',
  pins: [
    { name: 'sda', kind: 'sda', defaultPin: 'A4' },
    { name: 'scl', kind: 'scl', defaultPin: 'A5' },
  ],
  create(instance, context) {
    const characters = new Uint8Array(COLUMNS * ROWS).fill(32);
    let address = 0;
    let increment = true;
    let displayOn = true;
    let backlight = false;
    let previous = 0;
    let pendingHigh: number | null = null;
    // After power-up the controller is in 8-bit mode until told otherwise.
    let fourBit = false;

    const cursorIndex = (): number => {
      const row = address >= 0x40 ? 1 : 0;
      const column = address - (row === 1 ? 0x40 : 0);
      return column >= 0 && column < COLUMNS ? row * COLUMNS + column : -1;
    };

    const command = (value: number): void => {
      if (value === 0x01) {
        characters.fill(32);
        address = 0;
      } else if ((value & 0xfe) === 0x02) {
        address = 0;
      } else if ((value & 0xfc) === 0x04) {
        increment = (value & 0x02) !== 0;
      } else if ((value & 0xf8) === 0x08) {
        displayOn = (value & 0x04) !== 0;
      } else if ((value & 0xe0) === 0x20) {
        fourBit = (value & 0x10) === 0;
      } else if (value & 0x80) {
        address = value & 0x7f;
      }
    };

    const data = (value: number): void => {
      const index = cursorIndex();
      if (index >= 0) characters[index] = value;
      address = (address + (increment ? 1 : -1)) & 0x7f;
    };

    const latch = (output: number): void => {
      const nibble = output & 0xf0;
      const isData = (output & RS) !== 0;
      if (!fourBit) {
        // Initialisation sends single nibbles while still in 8-bit mode.
        if (isData) data(nibble);
        else command(nibble);
        return;
      }
      if (pendingHigh === null) {
        pendingHigh = nibble;
        return;
      }
      const value = pendingHigh | (nibble >> 4);
      pendingHigh = null;
      if (isData) data(value);
      else command(value);
    };

    context.addI2CDevice(Number(instance.props?.['address'] ?? DEFAULT_ADDRESS), {
      write(value) {
        backlight = (value & BACKLIGHT) !== 0;
        if (previous & ENABLE && !(value & ENABLE)) latch(previous);
        previous = value;
        return true;
      },
      read: () => 0xff,
    });

    return {
      snapshot: () => ({
        text: displayOn ? String.fromCharCode(...characters) : ' '.repeat(COLUMNS * ROWS),
        backlight,
      }),
    };
  },
};
