import type { BoardDefinition } from '@ideblock/boards';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { registerBusPinsField } from './fields/field-bus-pins';
import { registerLedColourField } from './fields/field-led-colour';
import { registerPinField } from './fields/field-pin';
import { SketchGenerator } from './generator/sketch-generator';
import { BLOCK_MODULES } from './modules';
import type { BlockModule } from './types';

const registeredModules = new Set<string>();

/** Registers block definitions once per module; safe to call repeatedly. */
export function registerBlocks(modules: readonly BlockModule[] = BLOCK_MODULES): void {
  registerPinField();
  registerBusPinsField();
  registerLedColourField();
  for (const module of modules) {
    if (registeredModules.has(module.id)) continue;
    Blockly.common.defineBlocksWithJsonArray(module.blocks);
    registeredModules.add(module.id);
  }
}

export function createSketchGenerator(
  board: BoardDefinition,
  modules: readonly BlockModule[] = BLOCK_MODULES,
): SketchGenerator {
  registerBlocks(modules);
  const generator = new SketchGenerator({ board });
  for (const module of modules) {
    for (const [type, generate] of Object.entries(module.generators)) {
      generator.forBlock[type] = (block, gen) => generate(block, gen as SketchGenerator);
    }
    for (const [type, rule] of Object.entries(module.valueTypes ?? {})) {
      generator.valueTypes.set(type, rule);
    }
  }
  return generator;
}
