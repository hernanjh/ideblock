import * as Blockly from 'blockly/core';
import { getActiveBoard, pinsFor, type PinKind } from '../board-context';

/** Picks the pin a beginner most likely wired, based on common kit examples. */
function defaultPin(kind: PinKind): string | undefined {
  const board = getActiveBoard();
  const pins = pinsFor(board, kind);
  // Inputs and PWM outputs avoid the built-in LED pin, which is usually wired to the LED.
  const candidates: Record<PinKind, string[]> = {
    output: [board.builtinLedPin],
    pwm: ['9', '13', '5'],
    digital: ['2', '4', '5'],
    analog: [],
  };
  const choice = candidates[kind].find(
    (pin) => pins.includes(pin) && (kind === 'output' || pin !== board.builtinLedPin),
  );
  return choice ?? pins[0];
}

interface FieldPinJson extends Blockly.FieldDropdownFromJsonConfig {
  pinKind?: PinKind;
  value?: string;
}

/**
 * Pin dropdown whose options follow the selected board. Values that the
 * current board does not offer are kept, so switching boards never rewrites
 * the user's program.
 */
export class FieldPin extends Blockly.FieldDropdown {
  constructor(pinKind: PinKind, value?: string) {
    // The menu generator runs inside super(), before "this" is usable, so the
    // current value is read through a reference filled in afterwards.
    const self: { field?: FieldPin } = {};
    super(() => FieldPin.options(pinKind, self.field?.getValue() ?? value));
    self.field = this;
    const initial = value ?? defaultPin(pinKind);
    if (initial !== undefined) this.setValue(initial);
  }

  static options(kind: PinKind, keep?: string | null): Blockly.MenuOption[] {
    const pins = [...pinsFor(getActiveBoard(), kind)];
    if (keep && !pins.includes(keep)) pins.push(keep);
    return pins.map((pin) => [pin, pin]);
  }

  static override fromJson(options: FieldPinJson): FieldPin {
    return new FieldPin(options.pinKind ?? 'digital', options.value);
  }

  protected override doClassValidation_(newValue?: string): string | null {
    if (typeof newValue !== 'string' || newValue === '') return null;
    return /^[A-Za-z0-9_]+$/.test(newValue) ? newValue : null;
  }
}

export const FIELD_PIN_TYPE = 'field_pin';

export function registerPinField(): void {
  if (!Blockly.registry.hasItem(Blockly.registry.Type.FIELD, FIELD_PIN_TYPE)) {
    Blockly.fieldRegistry.register(FIELD_PIN_TYPE, FieldPin);
  }
}
