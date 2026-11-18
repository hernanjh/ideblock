import {
  FieldColour,
  registerFieldColour,
  type FieldColourFromJsonConfig,
} from '@blockly/field-colour';
import * as Blockly from 'blockly/core';

/** Colours an LED can show, as red, green and blue from 0 to 255, with their message names. */
const PALETTE: [string, string][] = [
  ['255,0,0', 'IDEBLOCK_COLOR_RED'],
  ['255,80,0', 'IDEBLOCK_COLOR_ORANGE'],
  ['255,180,0', 'IDEBLOCK_COLOR_YELLOW'],
  ['0,255,0', 'IDEBLOCK_COLOR_GREEN'],
  ['0,255,255', 'IDEBLOCK_COLOR_CYAN'],
  ['0,0,255', 'IDEBLOCK_COLOR_BLUE'],
  ['160,0,255', 'IDEBLOCK_COLOR_PURPLE'],
  ['255,255,255', 'IDEBLOCK_COLOR_WHITE'],
  ['0,0,0', 'IDEBLOCK_COLOR_OFF'],
];

const toHex = (rgb: string): string =>
  `#${rgb
    .split(',')
    .map((part) =>
      Math.max(0, Math.min(255, Number(part)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** Red, green and blue from 0 to 255 of a "#rrggbb" colour. */
export function colourChannels(hex: string): [number, number, number] {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1] ?? '000000';
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/**
 * Colour swatches for LEDs, as children pick colours in mBlock. Projects saved
 * before the swatches stored "r,g,b", which is still accepted.
 */
export class FieldLedColour extends FieldColour {
  constructor(value?: string) {
    super(toHex(value ?? PALETTE[0]![0]));
    this.setColours(
      PALETTE.map(([rgb]) => toHex(rgb)),
      PALETTE.map(([, name]) => Blockly.Msg[name] ?? name),
    );
    this.setColumns(5);
  }

  protected override doClassValidation_(newValue?: string): string | null {
    if (typeof newValue === 'string' && /^\d{1,3},\d{1,3},\d{1,3}$/.test(newValue)) {
      return toHex(newValue);
    }
    return super.doClassValidation_(newValue);
  }

  static override fromJson(options: FieldColourFromJsonConfig): FieldLedColour {
    return new FieldLedColour(options.colour);
  }
}

/**
 * Stand-in used without a DOM, where the swatch field cannot be built: code
 * generation and tests only need the value.
 */
class HeadlessLedColour extends Blockly.FieldTextInput {
  constructor(value?: string) {
    super(toHex(value ?? PALETTE[0]![0]));
  }

  protected override doClassValidation_(newValue?: string): string | null {
    if (typeof newValue !== 'string') return null;
    if (/^\d{1,3},\d{1,3},\d{1,3}$/.test(newValue)) return toHex(newValue);
    return /^#[0-9a-f]{6}$/i.test(newValue) ? newValue.toLowerCase() : null;
  }

  static override fromJson(options: FieldColourFromJsonConfig): HeadlessLedColour {
    return new HeadlessLedColour(options.colour);
  }
}

export const FIELD_LED_COLOUR_TYPE = 'field_led_colour';

export function registerLedColourField(): void {
  if (Blockly.registry.hasItem(Blockly.registry.Type.FIELD, FIELD_LED_COLOUR_TYPE)) return;
  if (!('document' in globalThis)) {
    Blockly.fieldRegistry.register(FIELD_LED_COLOUR_TYPE, HeadlessLedColour);
    return;
  }
  registerFieldColour();
  Blockly.fieldRegistry.register(FIELD_LED_COLOUR_TYPE, FieldLedColour);
}
