import * as Blockly from 'blockly/core';
import { getActiveBoard } from '../board-context';

/**
 * Read-only label showing the I2C pins of the selected board, such as
 * "SDA A4 · SCL A5". The bus is wired to fixed pins on each board, so the block
 * cannot choose them, but children should still see where to connect the part.
 */
export class FieldBusPins extends Blockly.FieldLabel {
  override SERIALIZABLE = false;

  constructor() {
    super(FieldBusPins.text());
  }

  static text(): string {
    const { sda, scl } = getActiveBoard().i2c;
    return `(SDA ${sda} · SCL ${scl})`;
  }

  /** Called when the board changes. */
  refresh(): void {
    this.setValue(FieldBusPins.text());
  }

  static override fromJson(): FieldBusPins {
    return new FieldBusPins();
  }
}

export const FIELD_BUS_PINS_TYPE = 'field_bus_pins';

export function registerBusPinsField(): void {
  if (!Blockly.registry.hasItem(Blockly.registry.Type.FIELD, FIELD_BUS_PINS_TYPE)) {
    Blockly.fieldRegistry.register(FIELD_BUS_PINS_TYPE, FieldBusPins);
  }
}

/** Updates every bus pin label in a workspace after the board changed. */
export function refreshBoardFields(workspace: Blockly.Workspace): void {
  for (const block of workspace.getAllBlocks(false)) {
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if (field instanceof FieldBusPins) field.refresh();
      }
    }
  }
}
