import type { BoardDefinition } from '@ideblock/boards';
import * as Blockly from 'blockly/core';
import { defaultValue, widenType, type CppType } from './cpp-types';
import { createNameDatabase } from './names';
import { Order, type OrderValue } from './order';

export type ValueTypeRule = CppType | ((block: Blockly.Block, types: TypeResolver) => CppType);

export interface TypeResolver {
  typeOf(block: Blockly.Block | null): CppType;
  variableType(variableId: string): CppType;
  procedureReturnType(name: string): CppType;
}

export interface SketchGeneratorOptions {
  board: BoardDefinition;
  /**
   * Reports each statement's block to the simulator before it runs, so the
   * running block can be highlighted. Only used for simulator builds.
   */
  trace?: boolean;
}

export interface SketchResult {
  code: string;
  /** Libraries that must be installed for the sketch to compile. */
  libraries: string[];
  /** Block ids in the order used by trace indices. */
  tracedBlocks: string[];
}

export const PROGRAM_BLOCK_TYPE = 'ideblock_program';

const TOP_LEVEL_BLOCKS = new Set([
  PROGRAM_BLOCK_TYPE,
  'procedures_defnoreturn',
  'procedures_defreturn',
]);

type VariableModel = Blockly.IVariableModel<Blockly.IVariableState>;

export function procedureParameters(block: Blockly.Block): VariableModel[] {
  return (block as Blockly.Block & { getVarModels(): VariableModel[] }).getVarModels();
}

interface Sections {
  includes: Map<string, string>;
  globals: Map<string, string>;
  setup: Map<string, string>;
  helpers: Map<string, string>;
  functions: Map<string, string>;
  libraries: Set<string>;
  userSetup: string;
  userLoop: string;
}

// The simulator watches these general purpose registers, which real sketches
// never use, to learn which block is running.
const TRACE_HELPER = `inline void ideblockTrace(uint16_t index) {
  GPIOR1 = index >> 8;
  GPIOR0 = index & 0xFF;
}`;

/** Keeps setup() in a predictable order regardless of block order. */
function setupRank(key: string): number {
  if (key === 'serial') return 0;
  if (key === 'randomSeed') return 1;
  if (key.startsWith('pinMode:')) return 2;
  return 3;
}

const emptySections = (): Sections => ({
  includes: new Map(),
  globals: new Map(),
  setup: new Map(),
  helpers: new Map(),
  functions: new Map(),
  libraries: new Set(),
  userSetup: '',
  userLoop: '',
});

/**
 * Turns a block workspace into a sketch. Blocks register what they need
 * (headers, globals, pin setup) through the add* methods, so independent
 * blocks never have to know about each other.
 */
export class SketchGenerator extends Blockly.CodeGenerator {
  readonly valueTypes = new Map<string, ValueTypeRule>();
  private sections = emptySections();
  private variableTypes = new Map<string, CppType>();
  private procedureReturnTypes = new Map<string, CppType>();
  private procedureArgTypeMap = new Map<string, CppType[]>();
  private tracedBlocks: string[] = [];
  private options: SketchGeneratorOptions;

  constructor(options: SketchGeneratorOptions) {
    super('Sketch');
    this.options = options;
    this.INDENT = '  ';
    this.isInitialized = false;
    // Associative operators do not need parentheses around a left operand of
    // the same precedence; right operands are requested one level tighter.
    this.ORDER_OVERRIDES = [
      [Order.ADDITIVE, Order.ADDITIVE],
      [Order.MULTIPLICATIVE, Order.MULTIPLICATIVE],
      [Order.LOGICAL_AND, Order.LOGICAL_AND],
      [Order.LOGICAL_OR, Order.LOGICAL_OR],
    ];
  }

  get board(): BoardDefinition {
    return this.options.board;
  }

  configure(options: SketchGeneratorOptions): void {
    this.options = options;
  }

  generate(workspace: Blockly.Workspace): SketchResult {
    const code = this.workspaceToCode(workspace);
    return {
      code,
      libraries: [...this.sections.libraries].sort(),
      tracedBlocks: [...this.tracedBlocks],
    };
  }

  override init(workspace: Blockly.Workspace): void {
    super.init(workspace);
    this.sections = emptySections();
    this.tracedBlocks = [];
    this.nameDB_ = createNameDatabase();
    this.nameDB_.setVariableMap(workspace.getVariableMap());
    this.nameDB_.populateVariables(workspace);
    this.nameDB_.populateProcedures(workspace);
    this.inferTypes(workspace);
    this.isInitialized = true;
  }

  override finish(_code: string): string {
    // Top-level code is ignored: everything is placed by the program block,
    // procedure definitions and the add* hooks.
    const sketch = this.assemble();
    this.isInitialized = false;
    this.nameDB_?.reset();
    return sketch;
  }

  override blockToCode(block: Blockly.Block | null, thisOnly?: boolean): string | [string, number] {
    // Loose blocks outside the program are not part of the sketch.
    if (block && !block.getParent() && !TOP_LEVEL_BLOCKS.has(block.type)) {
      return '';
    }
    return super.blockToCode(block, thisOnly);
  }

  override scrubNakedValue(): string {
    // A value block on its own has no effect in C++.
    return '';
  }

  override scrub_(block: Blockly.Block, code: string, thisOnly = false): string {
    let prefix = '';
    const comment = block.getCommentText();
    if (comment && !block.outputConnection) {
      prefix += this.prefixLines(`${comment}\n`, '// ');
    }
    const isStatement = Boolean(block.previousConnection) && !block.outputConnection;
    if (isStatement && this.options.trace && code) {
      const index = this.tracedBlocks.push(block.id) - 1;
      this.addHelper('ideblockTrace', TRACE_HELPER);
      prefix += `ideblockTrace(${index});\n`;
    }
    const next = block.nextConnection?.targetBlock();
    const nextCode = thisOnly || !next ? '' : this.blockToCode(next);
    return prefix + code + (typeof nextCode === 'string' ? nextCode : '');
  }

  addInclude(header: string): void {
    this.sections.includes.set(header, `#include <${header}>`);
  }

  addLibrary(name: string): void {
    this.sections.libraries.add(name);
  }

  addGlobal(key: string, code: string): void {
    if (!this.sections.globals.has(key)) this.sections.globals.set(key, code);
  }

  /** Adds a line to setup() before the user's own setup blocks. */
  addSetup(key: string, code: string): void {
    if (!this.sections.setup.has(key)) this.sections.setup.set(key, code);
  }

  addHelper(key: string, code: string): void {
    if (!this.sections.helpers.has(key)) this.sections.helpers.set(key, code);
  }

  setProgram(setup: string, loop: string): void {
    this.sections.userSetup += setup;
    this.sections.userLoop += loop;
  }

  addFunction(name: string, code: string): void {
    this.sections.functions.set(name, code);
  }

  pinMode(pin: string, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'): void {
    this.addSetup(`pinMode:${pin}`, `pinMode(${pin}, ${mode});`);
  }

  useSerial(): void {
    this.addSetup('serial', 'Serial.begin(9600);');
  }

  valueOrDefault(block: Blockly.Block, input: string, order: OrderValue, fallback: string): string {
    return this.valueToCode(block, input, order) || fallback;
  }

  variableName(variableId: string): string {
    return this.getVariableName(variableId);
  }

  readonly types: TypeResolver = {
    typeOf: (block) => this.resolveType(block, new Set()),
    variableType: (id) => this.variableTypes.get(id) ?? 'int',
    procedureReturnType: (name) => this.procedureReturnType(name),
  };

  procedureReturnType(name: string): CppType {
    return this.procedureReturnTypes.get(name) ?? 'int';
  }

  private resolveType(block: Blockly.Block | null, visiting: Set<string>): CppType {
    if (!block) return 'int';
    const rule = this.valueTypes.get(block.type);
    if (typeof rule === 'string') return rule;
    if (rule) {
      if (visiting.has(block.id)) return 'int';
      visiting.add(block.id);
      const result = rule(block, {
        ...this.types,
        typeOf: (child) => this.resolveType(child, visiting),
      });
      visiting.delete(block.id);
      return result;
    }
    const check = block.outputConnection?.getCheck();
    if (check?.includes('String')) return 'String';
    if (check?.includes('Boolean')) return 'bool';
    return 'int';
  }

  /**
   * Variables in blocks are untyped, so their C++ type is inferred from every
   * value assigned to them. A few passes let types flow through variables that
   * are assigned from other variables.
   */
  private inferTypes(workspace: Blockly.Workspace): void {
    this.variableTypes.clear();
    this.procedureReturnTypes.clear();
    this.procedureArgTypeMap.clear();
    const blocks = workspace.getAllBlocks(false).filter((block) => block.isEnabled());

    for (let pass = 0; pass < 3; pass++) {
      const variables = new Map<string, CppType>();
      const assign = (id: string, type: CppType): void => {
        const current = variables.get(id);
        variables.set(id, current ? widenType(current, type) : type);
      };

      const argTypes = new Map<string, CppType[]>();
      const returnTypes = new Map<string, CppType>();

      for (const block of blocks) {
        if (block.type === 'variables_set') {
          const id = block.getFieldValue('VAR') as string;
          assign(id, this.types.typeOf(block.getInputTargetBlock('VALUE')));
        } else if (block.type === 'math_change') {
          const id = block.getFieldValue('VAR') as string;
          assign(id, this.types.typeOf(block.getInputTargetBlock('DELTA')));
        } else if (block.type === 'controls_for') {
          const id = block.getFieldValue('VAR') as string;
          for (const input of ['FROM', 'TO', 'BY']) {
            assign(id, this.types.typeOf(block.getInputTargetBlock(input)));
          }
        } else if (
          block.type === 'procedures_callnoreturn' ||
          block.type === 'procedures_callreturn'
        ) {
          const name = block.getFieldValue('NAME') as string;
          const args = block.inputList.filter((input) => /^ARG\d+$/.test(input.name));
          const current = argTypes.get(name) ?? [];
          args.forEach((input, index) => {
            const type = this.types.typeOf(input.connection?.targetBlock() ?? null);
            const previous = current[index];
            current[index] = previous ? widenType(previous, type) : type;
          });
          argTypes.set(name, current);
        } else if (block.type === 'procedures_defreturn') {
          const name = block.getFieldValue('NAME') as string;
          returnTypes.set(name, this.types.typeOf(block.getInputTargetBlock('RETURN')));
        }
      }

      // Procedure parameters are variables too; their type comes from callers.
      for (const block of blocks) {
        if (block.type !== 'procedures_defnoreturn' && block.type !== 'procedures_defreturn') {
          continue;
        }
        const name = block.getFieldValue('NAME') as string;
        const params = procedureParameters(block);
        const types = argTypes.get(name) ?? [];
        params.forEach((param, index) => assign(param.getId(), types[index] ?? 'int'));
      }

      this.variableTypes = variables;
      this.procedureArgTypeMap = argTypes;
      this.procedureReturnTypes = returnTypes;
    }
  }

  private assemble(): string {
    const { includes, globals, setup, helpers, functions, userSetup, userLoop } = this.sections;
    const parts: string[] = [];

    if (includes.size > 0) parts.push([...includes.values()].join('\n'));

    const variableDeclarations = this.variableDeclarations();
    const globalLines = [...globals.values(), ...variableDeclarations];
    if (globalLines.length > 0) parts.push(globalLines.join('\n'));

    for (const helper of helpers.values()) parts.push(helper.trimEnd());
    for (const fn of functions.values()) parts.push(fn.trimEnd());

    const setupLines = [...setup.entries()]
      .map(([key, line], index) => ({ line, index, rank: setupRank(key) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ line }) => `${this.INDENT}${line}\n`);
    const setupBody = [...setupLines, userSetup].join('');
    parts.push(`void setup() {\n${setupBody}}`);
    parts.push(`void loop() {\n${userLoop}}`);

    return `${parts.join('\n\n')}\n`;
  }

  private variableDeclarations(): string[] {
    const workspace = this.currentWorkspace;
    if (!workspace) return [];
    const parameterIds = new Set<string>();
    for (const block of workspace.getAllBlocks(false)) {
      if (block.type === 'procedures_defnoreturn' || block.type === 'procedures_defreturn') {
        const params = procedureParameters(block);
        for (const param of params) parameterIds.add(param.getId());
      }
    }
    return Blockly.Variables.allUsedVarModels(workspace)
      .filter((variable) => !parameterIds.has(variable.getId()))
      .map((variable) => {
        const type = this.types.variableType(variable.getId());
        return `${type} ${this.getVariableName(variable.getId())} = ${defaultValue(type)};`;
      });
  }

  private currentWorkspace: Blockly.Workspace | null = null;

  override workspaceToCode(workspace?: Blockly.Workspace): string {
    this.currentWorkspace = workspace ?? null;
    return super.workspaceToCode(workspace);
  }
}
