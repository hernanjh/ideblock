import type { BoardDefinition } from '@ideblock/boards';
import type { Node, Tree } from 'web-tree-sitter';

/** A block in Blockly's JSON serialization format. */
export interface SerializedBlock {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  deletable?: boolean;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: SerializedBlock; shadow?: SerializedBlock }>;
  next?: { block: SerializedBlock };
  extraState?: Record<string, unknown>;
}

/** A circuit part, so code on its pins becomes the block for that part. */
export interface CircuitPart {
  type: string;
  pins: Record<string, string>;
}

export interface ConvertOptions {
  board: BoardDefinition;
  parts?: readonly CircuitPart[];
}

export interface ConversionResult {
  /** A workspace in Blockly's serialization format, ready to load. */
  state: {
    blocks: { languageVersion: 0; blocks: SerializedBlock[] };
    variables?: { name: string; id: string }[];
  };
  /** Blocks created, and how many of them keep C++ as text. */
  blocks: number;
  codeBlocks: number;
  /** The code has syntax errors; the parts the parser understood were still converted. */
  syntaxError: boolean;
}

/** Functions the block generator writes itself; the blocks that use them bring them back. */
const GENERATED_HELPERS = new Set([
  'readDistanceCm',
  'readTemperatureC',
  'showDigit',
  'ideblockTrace',
]);
const GENERATED_GLOBALS = new Set(['DIGIT_SEGMENTS']);
const LIBRARY_HEADERS: Record<string, 'servo' | 'lcd' | 'strip'> = {
  'Servo.h': 'servo',
  'ESP32Servo.h': 'servo',
  'LiquidCrystal_PCF8574.h': 'lcd',
  'LiquidCrystal_I2C.h': 'lcd',
  'Adafruit_NeoPixel.h': 'strip',
};
const VARIABLE_TYPES = new Set([
  'int',
  'long',
  'float',
  'double',
  'bool',
  'boolean',
  'byte',
  'String',
  'unsigned long',
  'unsigned int',
]);
const ARITHMETIC: Record<string, string> = {
  '+': 'ADD',
  '-': 'MINUS',
  '*': 'MULTIPLY',
  '/': 'DIVIDE',
};
const COMPARISON: Record<string, string> = {
  '==': 'EQ',
  '!=': 'NEQ',
  '<': 'LT',
  '<=': 'LTE',
  '>': 'GT',
  '>=': 'GTE',
};

const named = (node: Node | null | undefined): Node[] =>
  (node?.namedChildren ?? []).filter(
    (child): child is Node => child !== null && child.type !== 'comment',
  );
const field = (node: Node, name: string): Node | null => node.childForFieldName(name);
/** The declared names of a declaration ("int a = 1, b;" has two). */
const declaratorsOf = (node: Node): Node[] =>
  node.childrenForFieldName('declarator').filter((child): child is Node => child !== null);
const unwrap = (node: Node | null): Node | null => {
  let current = node;
  while (
    current &&
    (current.type === 'parenthesized_expression' || current.type === 'condition_clause')
  ) {
    current = named(current)[0] ?? null;
  }
  return current;
};

function numberValue(node: Node | null): number | null {
  const inner = unwrap(node);
  if (!inner) return null;
  if (inner.type === 'number_literal') {
    const value = Number(inner.text.replace(/[uUlLfF]+$/, ''));
    return Number.isFinite(value) ? value : null;
  }
  if (inner.type === 'unary_expression' && field(inner, 'operator')?.text === '-') {
    const value = numberValue(field(inner, 'argument'));
    return value === null ? null : -value;
  }
  return null;
}

/** Arguments of a call, and the called name: "delay" or "lcd.print". */
function callParts(node: Node): {
  name: string;
  object: string | null;
  method: string;
  args: Node[];
} {
  const fn = field(node, 'function');
  const args = named(field(node, 'arguments'));
  if (fn?.type === 'field_expression') {
    const object = field(fn, 'argument')?.text ?? '';
    const method = field(fn, 'field')?.text ?? '';
    return { name: `${object}.${method}`, object, method, args };
  }
  const name = fn?.text ?? '';
  return { name, object: null, method: name, args };
}

function unescapeString(literal: string): string {
  const body = literal.replace(/^"|"$/g, '');
  return body.replace(/\\(.)/g, (_match, char: string) =>
    char === 'n' ? '\n' : char === 't' ? '\t' : char === 'r' ? '\r' : char,
  );
}

interface Deferred {
  deferred: 'pinMode';
  pin: string;
  mode: string;
  text: string;
}
type Converted = SerializedBlock | Deferred;
const isDeferred = (item: Converted): item is Deferred => 'deferred' in item;

/** Arguments that are pins, by function name; "*.attach" is any object's attach(). */
const PIN_ARGUMENTS: Record<string, number[]> = {
  pinMode: [0],
  digitalWrite: [0],
  digitalRead: [0],
  analogRead: [0],
  analogWrite: [0],
  tone: [0],
  noTone: [0],
  readDistanceCm: [0, 1],
  readTemperatureC: [0],
  pulseIn: [0],
  showDigit: [0],
  '*.attach': [0],
};

/** True when the node is a pin argument of a call, or a NeoPixel strip's size or pin. */
function isPinArgument(node: Node): boolean {
  const list = node.parent;
  if (list?.type !== 'argument_list') return false;
  const index = named(list).findIndex((arg) => arg.id === node.id);
  const owner = list.parent;
  if (owner?.type === 'init_declarator') {
    const declaration = owner.parent;
    return (
      declaration !== null && field(declaration, 'type')?.text === 'Adafruit_NeoPixel' && index <= 1
    );
  }
  if (owner?.type !== 'call_expression') return false;
  const { name, object, method } = callParts(owner);
  const positions = PIN_ARGUMENTS[object !== null ? `*.${method}` : name] ?? [];
  return positions.includes(index);
}

/** "#define LED 13", "const int ledPin = 13;" or "int led = A0;", as a name and a pin. */
function pinConstant(node: Node, builtinLed: string): { name: string; value: string } | null {
  const isPin = (text: string | undefined): text is string =>
    text !== undefined && (/^\d+$/.test(text) || /^A\d+$/.test(text));
  const result = pinConstantText(node);
  if (!result) return null;
  if (result.value === 'LED_BUILTIN' && builtinLed) return { name: result.name, value: builtinLed };
  return isPin(result.value) ? result : null;
}

function pinConstantText(node: Node): { name: string; value: string } | null {
  if (node.type === 'preproc_def') {
    const name = field(node, 'name')?.text;
    const value = field(node, 'value')?.text.trim();
    return name && value ? { name, value } : null;
  }
  if (node.type !== 'declaration') return null;
  const type = field(node, 'type')?.text;
  if (!type || !['int', 'byte', 'uint8_t', 'short', 'long', 'unsigned int'].includes(type))
    return null;
  const declarators = declaratorsOf(node);
  if (declarators.length !== 1 || declarators[0]!.type !== 'init_declarator') return null;
  const name = field(declarators[0]!, 'declarator');
  const value = field(declarators[0]!, 'value')?.text;
  return name?.type === 'identifier' && value ? { name: name.text, value } : null;
}

class Converter {
  private readonly variables = new Map<string, string>();
  private readonly procedures = new Map<string, { returns: boolean; params: string[] }>();
  private readonly servos = new Map<string, string>();
  private readonly lcds = new Set<string>();
  private readonly strips = new Map<string, { pin: string; count: number }>();
  private readonly pinModes = new Map<string, string>();
  /** Names that only ever stand for a pin, such as "const int ledPin = 13;", and their pin. */
  private readonly constants = new Map<string, string>();
  /** Those of them used only as pins, whose declaration is no longer needed. */
  private readonly pinOnly = new Set<string>();
  /** Declarations of those names, put back if a code block still uses the name. */
  private readonly pinDeclarations = new Map<string, string>();
  /** Names used by other top-level declarations, such as an array size, which must stay constant. */
  private readonly globalNames = new Set<string>();
  /** The C++ kept in code blocks. */
  private readonly codeTexts: string[] = [];
  /** Pins the converted blocks set up themselves, and the mode they use. */
  private readonly generatedModes = new Map<string, string>();
  private parameters = new Map<string, string>();
  private blockCount = 0;
  private codeCount = 0;
  private usedLibraries = new Set<'servo' | 'lcd' | 'strip'>();

  constructor(private readonly options: ConvertOptions) {}

  private partOn(pin: string, ...types: string[]): CircuitPart | undefined {
    return this.options.parts?.find(
      (part) => types.includes(part.type) && Object.values(part.pins).includes(pin),
    );
  }

  private block(type: string, rest: Omit<SerializedBlock, 'type'> = {}): SerializedBlock {
    this.blockCount++;
    return { type, ...rest };
  }

  private code(
    type: 'code_statement' | 'code_expression' | 'code_global',
    text: string,
  ): SerializedBlock {
    this.codeCount++;
    this.codeTexts.push(text);
    return this.block(type, { fields: { CODE: text.trim() } });
  }

  private variable(name: string): string {
    let id = this.variables.get(name);
    if (!id) {
      id = name;
      this.variables.set(name, id);
    }
    return id;
  }

  private variableId(name: string): string | undefined {
    return this.parameters.get(name) ?? this.variables.get(name);
  }

  private uses(pin: string, mode: string): void {
    if (!this.generatedModes.has(pin)) this.generatedModes.set(pin, mode);
  }

  /** A pin written as in the sketch, or null when it is computed. */
  private pin(node: Node | undefined): string | null {
    const inner = unwrap(node ?? null);
    if (!inner) return null;
    if (inner.type === 'number_literal' || /^A\d+$/.test(inner.text)) return inner.text;
    if (inner.text === 'LED_BUILTIN') return this.options.board.builtinLedPin;
    if (inner.type === 'identifier') return this.constants.get(inner.text) ?? null;
    return null;
  }

  // ------------------------------------------------------------ expressions

  private input(node: Node | null): { block?: SerializedBlock; shadow?: SerializedBlock } {
    const value = numberValue(node);
    if (value !== null) {
      this.blockCount++;
      return { shadow: { type: 'math_number', fields: { NUM: value } } };
    }
    const inner = unwrap(node);
    if (inner?.type === 'string_literal') {
      this.blockCount++;
      return { shadow: { type: 'text', fields: { TEXT: unescapeString(inner.text) } } };
    }
    return { block: this.expression(node) };
  }

  private numberInput(value: number): { shadow: SerializedBlock } {
    this.blockCount++;
    return { shadow: { type: 'math_number', fields: { NUM: value } } };
  }

  /** "E - 1" back to E, or a literal minus one: blocks count from 1 where C++ counts from 0. */
  private fromZeroBased(
    node: Node | null,
  ): { block?: SerializedBlock; shadow?: SerializedBlock } | null {
    const value = numberValue(node);
    if (value !== null) return this.numberInput(value + 1);
    const inner = unwrap(node);
    if (
      inner?.type === 'binary_expression' &&
      field(inner, 'operator')?.text === '-' &&
      numberValue(field(inner, 'right')) === 1
    ) {
      return this.input(field(inner, 'left'));
    }
    return null;
  }

  /** The value E of "constrain(E, low, high)", which some blocks write around their input. */
  private unconstrain(node: Node | null, low: number, high: number): Node | null {
    const inner = unwrap(node);
    if (inner?.type !== 'call_expression') return null;
    const { name, args } = callParts(inner);
    if (name !== 'constrain' || args.length !== 3) return null;
    return numberValue(args[1]!) === low && numberValue(args[2]!) === high ? args[0]! : null;
  }

  private expression(node: Node | null): SerializedBlock {
    const inner = unwrap(node);
    if (!inner) return this.code('code_expression', node?.text ?? '0');
    const value = numberValue(inner);
    if (value !== null) return this.block('math_number', { fields: { NUM: value } });

    switch (inner.type) {
      case 'string_literal':
        return this.block('text', { fields: { TEXT: unescapeString(inner.text) } });
      case 'true':
      case 'false':
        return this.block('logic_boolean', { fields: { BOOL: inner.type.toUpperCase() } });
      case 'identifier': {
        // A pin read gives true for HIGH, so HIGH and LOW compare as true and false.
        if (inner.text === 'HIGH' || inner.text === 'LOW') {
          return this.block('logic_boolean', {
            fields: { BOOL: inner.text === 'HIGH' ? 'TRUE' : 'FALSE' },
          });
        }
        const id = this.variableId(inner.text);
        if (id) return this.block('variables_get', { fields: { VAR: { id } } });
        break;
      }
      case 'unary_expression':
        if (field(inner, 'operator')?.text === '-') {
          return this.block('math_single', {
            fields: { OP: 'NEG' },
            inputs: { NUM: this.input(field(inner, 'argument')) },
          });
        }
        if (field(inner, 'operator')?.text === '!') {
          return this.block('logic_negate', {
            inputs: { BOOL: { block: this.expression(field(inner, 'argument')) } },
          });
        }
        break;
      case 'update_expression':
        break;
      case 'conditional_expression':
        return this.block('logic_ternary', {
          inputs: {
            IF: { block: this.expression(field(inner, 'condition')) },
            THEN: this.input(field(inner, 'consequence')),
            ELSE: this.input(field(inner, 'alternative')),
          },
        });
      case 'binary_expression':
        return this.binary(inner);
      case 'call_expression':
        return this.callValue(inner) ?? this.code('code_expression', inner.text);
    }
    return this.code('code_expression', inner.text);
  }

  private binary(node: Node): SerializedBlock {
    const operator = field(node, 'operator')?.text ?? '';
    const left = field(node, 'left');
    const right = field(node, 'right');

    if (operator === '+' && this.isText(left)) {
      const parts = this.textParts(node);
      return this.block('text_join', {
        extraState: { itemCount: parts.length },
        inputs: Object.fromEntries(parts.map((part, index) => [`ADD${index}`, this.input(part)])),
      });
    }
    if (ARITHMETIC[operator]) {
      return this.block('math_arithmetic', {
        fields: { OP: ARITHMETIC[operator] },
        inputs: { A: this.input(left), B: this.input(right) },
      });
    }
    if (operator === '%') {
      return this.block('math_modulo', {
        inputs: { DIVIDEND: this.input(left), DIVISOR: this.input(right) },
      });
    }
    if (operator === '&&' || operator === '||') {
      return this.block('logic_operation', {
        fields: { OP: operator === '&&' ? 'AND' : 'OR' },
        inputs: { A: { block: this.expression(left) }, B: { block: this.expression(right) } },
      });
    }
    if (COMPARISON[operator]) {
      return (
        this.comparison(operator, left, right) ??
        this.block('logic_compare', {
          fields: { OP: COMPARISON[operator] },
          inputs: { A: this.input(left), B: this.input(right) },
        })
      );
    }
    return this.code('code_expression', node.text);
  }

  /** Reads of a digital sensor, which blocks write as "digitalRead(pin) == LOW" or "== HIGH". */
  private comparison(
    operator: string,
    left: Node | null,
    right: Node | null,
  ): SerializedBlock | null {
    const read = unwrap(left);
    const level = unwrap(right)?.text;
    if (
      operator === '>' &&
      read?.type === 'call_expression' &&
      callParts(read).name === 'Serial.available' &&
      numberValue(right) === 0
    ) {
      return this.block('serial_available');
    }
    if (operator !== '==' || read?.type !== 'call_expression') return null;
    const { name, args } = callParts(read);
    const pin = this.pin(args[0]);
    if (name !== 'digitalRead' || !pin) return null;
    if (level === 'LOW' && this.pinModes.get(pin) === 'INPUT_PULLUP') {
      this.uses(pin, 'INPUT_PULLUP');
      const joystick = this.partOn(pin, 'joystick');
      return this.block(joystick ? 'joystick_pressed' : 'button_pressed', { fields: { PIN: pin } });
    }
    if (level === 'HIGH') {
      const sensor = this.partOn(pin, 'slide-switch', 'pir-sensor', 'tilt-switch');
      const type =
        sensor?.type === 'pir-sensor'
          ? 'motion_detected'
          : sensor?.type === 'tilt-switch'
            ? 'tilt_detected'
            : sensor
              ? 'switch_on'
              : null;
      if (type) {
        this.uses(pin, 'INPUT');
        return this.block(type, { fields: { PIN: pin } });
      }
    }
    return null;
  }

  private isText(node: Node | null): boolean {
    const inner = unwrap(node);
    if (!inner) return false;
    if (inner.type === 'string_literal') return true;
    if (inner.type === 'call_expression') return callParts(inner).name === 'String';
    if (inner.type === 'binary_expression')
      return field(inner, 'operator')?.text === '+' && this.isText(field(inner, 'left'));
    return false;
  }

  /** "String(a) + String(b) + ..." as its parts, without the String() wrappers. */
  private textParts(node: Node): Node[] {
    const inner = unwrap(node)!;
    if (inner.type === 'binary_expression' && field(inner, 'operator')?.text === '+') {
      return [...this.textParts(field(inner, 'left')!), ...this.textParts(field(inner, 'right')!)];
    }
    if (inner.type === 'call_expression' && callParts(inner).name === 'String') {
      return callParts(inner).args.slice(0, 1);
    }
    return [inner];
  }

  private callValue(node: Node): SerializedBlock | null {
    const { name, object, method, args } = callParts(node);
    const pin = this.pin(args[0]);
    switch (name) {
      case 'analogRead': {
        if (!pin) return null;
        const part = this.partOn(pin, 'potentiometer', 'photoresistor');
        const type =
          part?.type === 'photoresistor'
            ? 'light_sensor_read'
            : part
              ? 'potentiometer_read'
              : 'io_analog_read';
        return this.block(type, { fields: { PIN: pin } });
      }
      case 'pulseIn': {
        const level = args[1]?.text;
        if (!pin || args.length !== 2 || (level !== 'HIGH' && level !== 'LOW')) return null;
        this.uses(pin, 'INPUT');
        return this.block('io_pulse_in', { fields: { PIN: pin, STATE: level } });
      }
      case 'digitalRead':
        if (!pin) return null;
        this.uses(pin, 'INPUT');
        return this.block('io_digital_read', { fields: { PIN: pin } });
      case 'millis':
        return this.block('time_millis');
      case 'random': {
        if (args.length !== 2) return null;
        const upper = args[1]!;
        const to = numberValue(upper);
        const inner = unwrap(upper);
        let toInput;
        if (to !== null) toInput = this.numberInput(to - 1);
        else if (
          inner?.type === 'binary_expression' &&
          field(inner, 'operator')?.text === '+' &&
          numberValue(field(inner, 'right')) === 1
        ) {
          toInput = this.input(field(inner, 'left'));
        } else return null;
        return this.block('math_random_int', {
          inputs: { FROM: this.input(args[0]!), TO: toInput },
        });
      }
      case 'map':
        if (args.length !== 5) return null;
        return this.block('math_map', {
          inputs: Object.fromEntries(
            ['VALUE', 'FROM_LOW', 'FROM_HIGH', 'TO_LOW', 'TO_HIGH'].map((input, index) => [
              input,
              this.input(args[index]!),
            ]),
          ),
        });
      case 'constrain':
        if (args.length !== 3) return null;
        return this.block('math_constrain', {
          inputs: {
            VALUE: this.input(args[0]!),
            LOW: this.input(args[1]!),
            HIGH: this.input(args[2]!),
          },
        });
      case 'pow':
        if (args.length !== 2) return null;
        return this.block('math_arithmetic', {
          fields: { OP: 'POWER' },
          inputs: { A: this.input(args[0]!), B: this.input(args[1]!) },
        });
      case 'readDistanceCm': {
        const echo = this.pin(args[1]);
        if (!pin || !echo) return null;
        this.uses(pin, 'OUTPUT');
        this.uses(echo, 'INPUT');
        return this.block('ultrasonic_distance', { fields: { TRIG: pin, ECHO: echo } });
      }
      case 'readTemperatureC':
        if (!pin) return null;
        return this.block('temperature_read', { fields: { PIN: pin } });
      case 'String':
        return args[0] ? this.expression(args[0]) : null;
      case 'Serial.readStringUntil':
        return this.block('serial_read_line');
    }
    // String(x).length()
    if (method === 'length' && object !== null) {
      const fn = field(node, 'function');
      const target = fn ? field(fn, 'argument') : null;
      const inner = unwrap(target);
      if (inner?.type === 'call_expression' && callParts(inner).name === 'String') {
        return this.block('text_length', {
          inputs: { VALUE: this.input(callParts(inner).args[0] ?? null) },
        });
      }
    }
    const procedure = this.procedures.get(name);
    if (procedure?.returns && args.length === procedure.params.length) {
      return this.block('procedures_callreturn', {
        extraState: { name, params: procedure.params },
        inputs: Object.fromEntries(args.map((arg, index) => [`ARG${index}`, this.input(arg)])),
      });
    }
    return null;
  }

  // ------------------------------------------------------------- statements

  private statements(nodes: Node[]): Converted[] {
    const result: Converted[] = [];
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]!;
      const ahead = (offset: number): Node | undefined => nodes[index + offset];
      const converted = this.statement(node, ahead);
      result.push(...converted.blocks);
      index += converted.consumed;
    }
    return result;
  }

  /** One statement, maybe with the ones after it when blocks write several lines. */
  private statement(
    node: Node,
    ahead: (offset: number) => Node | undefined,
  ): { blocks: Converted[]; consumed: number } {
    const one = (block: Converted | null): { blocks: Converted[]; consumed: number } => ({
      blocks: block ? [block] : [],
      consumed: 0,
    });
    switch (node.type) {
      case 'compound_statement':
        return { blocks: this.statements(named(node)), consumed: 0 };
      case 'expression_statement': {
        const expression = named(node)[0];
        if (!expression) return one(null);
        if (expression.type === 'call_expression') return this.callStatement(expression, ahead);
        return one(this.assignment(expression) ?? this.code('code_statement', node.text));
      }
      case 'declaration':
        return { blocks: this.localDeclaration(node), consumed: 0 };
      case 'if_statement':
        return one(this.ifStatement(node));
      case 'while_statement':
        return one(this.whileStatement(node));
      case 'for_statement':
        return one(this.forStatement(node) ?? this.code('code_statement', node.text));
      case 'break_statement':
        return one(this.block('controls_flow_statements', { fields: { FLOW: 'BREAK' } }));
      case 'continue_statement':
        return one(this.block('controls_flow_statements', { fields: { FLOW: 'CONTINUE' } }));
      default:
        return one(this.code('code_statement', node.text));
    }
  }

  private callStatement(
    node: Node,
    ahead: (offset: number) => Node | undefined,
  ): { blocks: Converted[]; consumed: number } {
    const { name, object, method, args } = callParts(node);
    const single = (block: Converted | null) => ({ blocks: block ? [block] : [], consumed: 0 });
    const nextCall = (offset: number) => {
      const next = ahead(offset);
      const expression = next?.type === 'expression_statement' ? named(next)[0] : undefined;
      return expression?.type === 'call_expression' ? callParts(expression) : null;
    };
    const pin = this.pin(args[0]);

    switch (name) {
      case 'pinMode':
        if (pin && args[1]) {
          this.pinModes.set(pin, args[1].text);
          return single({
            deferred: 'pinMode',
            pin,
            mode: args[1].text,
            text: `pinMode(${pin}, ${args[1].text});`,
          });
        }
        break;
      case 'Serial.begin':
      case 'randomSeed':
      case 'ideblockTrace':
        return single(null);
      case 'digitalWrite': {
        const level = args[1]?.text;
        if (pin && args[1] && level !== 'HIGH' && level !== 'LOW') {
          this.uses(pin, 'OUTPUT');
          return single(
            this.block('io_digital_write_value', {
              fields: { PIN: pin },
              inputs: { VALUE: this.input(args[1]) },
            }),
          );
        }
        if (!pin || (level !== 'HIGH' && level !== 'LOW')) break;
        this.uses(pin, 'OUTPUT');
        const led = this.partOn(pin, 'led');
        const pause = nextCall(1);
        const off = nextCall(2);
        if (
          led &&
          level === 'HIGH' &&
          pause?.name === 'delay' &&
          off?.name === 'digitalWrite' &&
          this.pin(off.args[0]) === pin &&
          off.args[1]?.text === 'LOW'
        ) {
          const ms = numberValue(pause.args[0] ?? null);
          if (ms !== null) {
            return {
              blocks: [
                this.block('led_on_for', {
                  fields: { PIN: pin },
                  inputs: { SECONDS: this.numberInput(ms / 1000) },
                }),
              ],
              consumed: 2,
            };
          }
        }
        if (led) return single(this.block('led_set', { fields: { STATE: level, PIN: pin } }));
        const { builtinLedPin, builtinLedActiveLow } = this.options.board;
        if (pin === builtinLedPin && !this.partOn(pin, ...ALL_PARTS)) {
          const on = (level === 'HIGH') !== Boolean(builtinLedActiveLow);
          return single(this.block('builtin_led_set', { fields: { STATE: on ? 'HIGH' : 'LOW' } }));
        }
        return single(this.block('io_digital_write', { fields: { PIN: pin, STATE: level } }));
      }
      case 'analogWrite': {
        if (!pin) break;
        const value = args[1] ?? null;
        const rgb = this.rgb(pin, value, nextCall);
        if (rgb) return rgb;
        this.uses(pin, 'OUTPUT');
        const percent = this.percent(value);
        if (percent)
          return single(
            this.block('led_brightness', {
              fields: { PIN: pin },
              inputs: { PERCENT: this.input(percent) },
            }),
          );
        return single(
          this.block('io_analog_write', {
            fields: { PIN: pin },
            inputs: { VALUE: this.input(value) },
          }),
        );
      }
      case 'delayMicroseconds':
        if (args.length !== 1) break;
        return single(this.block('time_delay_us', { inputs: { US: this.input(args[0]!) } }));
      case 'delay': {
        const ms = numberValue(args[0] ?? null);
        if (ms !== null && ms >= 1000 && ms % 100 === 0) {
          return single(
            this.block('time_delay_seconds', { inputs: { SECONDS: this.numberInput(ms / 1000) } }),
          );
        }
        const inner = unwrap(args[0] ?? null);
        if (
          inner?.type === 'binary_expression' &&
          field(inner, 'operator')?.text === '*' &&
          numberValue(field(inner, 'right')) === 1000
        ) {
          return single(
            this.block('time_delay_seconds', {
              inputs: { SECONDS: this.input(field(inner, 'left')) },
            }),
          );
        }
        return single(this.block('time_delay', { inputs: { MS: this.input(args[0] ?? null) } }));
      }
      case 'tone': {
        const pause = nextCall(1);
        if (
          pin &&
          args.length === 3 &&
          pause?.name === 'delay' &&
          pause.args[0]?.text === args[2]!.text
        ) {
          return {
            blocks: [
              this.block('buzzer_tone', {
                fields: { PIN: pin },
                inputs: { FREQUENCY: this.input(args[1]!), DURATION: this.input(args[2]!) },
              }),
            ],
            consumed: 1,
          };
        }
        if (pin && args.length === 2) {
          return single(
            this.block('buzzer_tone_start', {
              fields: { PIN: pin },
              inputs: { FREQUENCY: this.input(args[1]!) },
            }),
          );
        }
        break;
      }
      case 'noTone':
        if (pin && args.length === 1)
          return single(this.block('buzzer_stop', { fields: { PIN: pin } }));
        break;
      case 'Serial.print':
      case 'Serial.println':
        if (args.length === 1) {
          return single(
            this.block('serial_print', {
              fields: { NEWLINE: method === 'println' ? 'TRUE' : 'FALSE' },
              inputs: { TEXT: this.input(args[0]!) },
            }),
          );
        }
        break;
      case 'showDigit': {
        if (!pin || args.length !== 2) break;
        return single(
          this.block('seven_segment_show', {
            fields: { FIRST: pin },
            inputs: { NUMBER: this.input(args[1]!) },
          }),
        );
      }
    }

    if (object !== null && this.servos.has(object)) {
      if (method === 'attach') return single(null);
      if (method === 'write' && args.length === 1) {
        this.usedLibraries.add('servo');
        const angle = this.unconstrain(args[0]!, 0, 180) ?? args[0]!;
        return single(
          this.block('servo_write', {
            fields: { PIN: this.servos.get(object)! },
            inputs: { ANGLE: this.input(angle) },
          }),
        );
      }
    }
    if (object !== null && this.lcds.has(object)) {
      if (['begin', 'init', 'setBacklight', 'backlight'].includes(method)) return single(null);
      if (method === 'clear') {
        this.usedLibraries.add('lcd');
        return single(this.block('lcd_clear'));
      }
      const print = nextCall(1);
      if (
        method === 'setCursor' &&
        args.length === 2 &&
        print?.object === object &&
        print.method === 'print' &&
        print.args.length === 1
      ) {
        const column = this.fromZeroBased(args[0]!);
        const row = this.fromZeroBased(args[1]!);
        if (column && row) {
          this.usedLibraries.add('lcd');
          return {
            blocks: [
              this.block('lcd_print', {
                inputs: { TEXT: this.input(print.args[0]!), ROW: row, COLUMN: column },
              }),
            ],
            consumed: 1,
          };
        }
      }
    }
    if (object !== null && this.strips.has(object)) {
      const strip = this.strips.get(object)!;
      const show = nextCall(1);
      if (method === 'begin') return single(null);
      if (method === 'clear' && show?.object === object && show.method === 'show') {
        this.usedLibraries.add('strip');
        return {
          blocks: [
            this.block('neopixel_clear', { fields: { PIN: strip.pin, COUNT: strip.count } }),
          ],
          consumed: 1,
        };
      }
      if (
        method === 'setPixelColor' &&
        args.length === 2 &&
        show?.object === object &&
        show.method === 'show'
      ) {
        const index = this.fromZeroBased(args[0]!);
        const colour = unwrap(args[1]!);
        const channels =
          colour?.type === 'call_expression' && callParts(colour).method === 'Color'
            ? callParts(colour).args.map((arg) => numberValue(arg))
            : [];
        if (index && channels.length === 3 && channels.every((value) => value !== null)) {
          this.usedLibraries.add('strip');
          return {
            blocks: [
              this.block('neopixel_set', {
                fields: { PIN: strip.pin, COLOR: channels.join(','), COUNT: strip.count },
                inputs: { INDEX: index },
              }),
            ],
            consumed: 1,
          };
        }
      }
    }

    const procedure = this.procedures.get(name);
    if (procedure && !procedure.returns && args.length === procedure.params.length) {
      return single(
        this.block('procedures_callnoreturn', {
          extraState: { name, params: procedure.params },
          inputs: Object.fromEntries(args.map((arg, index) => [`ARG${index}`, this.input(arg)])),
        }),
      );
    }
    return single(this.code('code_statement', `${node.text};`));
  }

  /** "map(constrain(E, 0, 100), 0, 100, 0, 255)", the LED brightness block's code. */
  private percent(node: Node | null): Node | null {
    const inner = unwrap(node);
    if (inner?.type !== 'call_expression') return null;
    const { name, args } = callParts(inner);
    if (name !== 'map' || args.length !== 5) return null;
    const bounds = args.slice(1).map((arg) => numberValue(arg));
    if (bounds.join() !== '0,100,0,255') return null;
    return this.unconstrain(args[0]!, 0, 100);
  }

  /** Three analogWrite calls on the pins of an RGB LED, in red, green, blue order. */
  private rgb(
    pin: string,
    value: Node | null,
    nextCall: (offset: number) => { name: string; args: Node[] } | null,
  ): { blocks: Converted[]; consumed: number } | null {
    const part = this.partOn(pin, 'rgb-led');
    if (!part || part.pins['red'] !== pin) return null;
    const green = nextCall(1);
    const blue = nextCall(2);
    if (green?.name !== 'analogWrite' || blue?.name !== 'analogWrite') return null;
    if (
      this.pin(green.args[0]) !== part.pins['green'] ||
      this.pin(blue.args[0]) !== part.pins['blue']
    )
      return null;
    const values = [value, green.args[1] ?? null, blue.args[1] ?? null];
    const fields = { RED: part.pins['red'], GREEN: part.pins['green'], BLUE: part.pins['blue'] };
    for (const used of Object.values(fields)) if (used) this.uses(used, 'OUTPUT');
    const literals = values.map((item) => numberValue(item));
    if (literals.every((item) => item !== null)) {
      return {
        blocks: [this.block('rgb_led_color', { fields: { ...fields, COLOR: literals.join(',') } })],
        consumed: 2,
      };
    }
    const mixed = values.map((item) => this.unconstrain(item, 0, 255));
    if (mixed.every((item) => item !== null)) {
      return {
        blocks: [
          this.block('rgb_led_mix', {
            fields,
            inputs: {
              R: this.input(mixed[0]!),
              G: this.input(mixed[1]!),
              B: this.input(mixed[2]!),
            },
          }),
        ],
        consumed: 2,
      };
    }
    return null;
  }

  private assignment(node: Node): SerializedBlock | null {
    if (node.type === 'update_expression') {
      const id = this.variableId(field(node, 'argument')?.text ?? '');
      if (!id) return null;
      const delta = field(node, 'operator')?.text === '--' ? -1 : 1;
      return this.block('math_change', {
        fields: { VAR: { id } },
        inputs: { DELTA: this.numberInput(delta) },
      });
    }
    if (node.type !== 'assignment_expression') return null;
    const id = this.variableId(field(node, 'left')?.text ?? '');
    if (!id) return null;
    const operator = field(node, 'operator')?.text;
    const right = field(node, 'right');
    if (operator === '=')
      return this.block('variables_set', {
        fields: { VAR: { id } },
        inputs: { VALUE: this.input(right) },
      });
    if (operator === '+=')
      return this.block('math_change', {
        fields: { VAR: { id } },
        inputs: { DELTA: this.input(right) },
      });
    if (operator === '-=') {
      const value = numberValue(right);
      if (value !== null)
        return this.block('math_change', {
          fields: { VAR: { id } },
          inputs: { DELTA: this.numberInput(-value) },
        });
    }
    return null;
  }

  /** "int x = 5;" inside a function: blocks keep every variable global. */
  private localDeclaration(node: Node): Converted[] {
    const type = field(node, 'type')?.text ?? '';
    if (!VARIABLE_TYPES.has(type)) return [this.code('code_statement', node.text)];
    const result: Converted[] = [];
    for (const declarator of declaratorsOf(node)) {
      const name =
        declarator.type === 'init_declarator'
          ? field(declarator, 'declarator')?.text
          : declarator.text;
      if (!name || !/^\w+$/.test(name)) return [this.code('code_statement', node.text)];
      const id = this.variable(name);
      if (declarator.type === 'init_declarator') {
        result.push(
          this.block('variables_set', {
            fields: { VAR: { id } },
            inputs: { VALUE: this.input(field(declarator, 'value')) },
          }),
        );
      }
    }
    return result;
  }

  private body(node: Node | null): SerializedBlock | undefined {
    if (!node) return undefined;
    return this.chain(this.statements(node.type === 'compound_statement' ? named(node) : [node]));
  }

  private ifStatement(node: Node): SerializedBlock {
    const inputs: NonNullable<SerializedBlock['inputs']> = {};
    let current: Node | null = node;
    let index = 0;
    let elseBody: Node | null = null;
    while (current) {
      inputs[`IF${index}`] = { block: this.expression(field(current, 'condition')) };
      const branch = this.body(field(current, 'consequence'));
      if (branch) inputs[`DO${index}`] = { block: branch };
      const alternative = field(current, 'alternative');
      const next = alternative
        ? alternative.type === 'else_clause'
          ? (named(alternative)[0] ?? null)
          : alternative
        : null;
      index++;
      if (next?.type === 'if_statement') {
        current = next;
      } else {
        elseBody = next;
        current = null;
      }
    }
    if (elseBody) {
      const branch = this.body(elseBody);
      if (branch) inputs['ELSE'] = { block: branch };
    }
    const extraState: Record<string, unknown> = {};
    if (index > 1) extraState['elseIfCount'] = index - 1;
    if (elseBody) extraState['hasElse'] = true;
    return this.block('controls_if', {
      inputs,
      ...(Object.keys(extraState).length > 0 ? { extraState } : {}),
    });
  }

  private whileStatement(node: Node): SerializedBlock {
    const condition = unwrap(field(node, 'condition'));
    const until =
      condition?.type === 'unary_expression' && field(condition, 'operator')?.text === '!';
    const test = until ? field(condition, 'argument') : condition;
    const body = this.body(field(node, 'body'));
    return this.block('controls_whileUntil', {
      fields: { MODE: until ? 'UNTIL' : 'WHILE' },
      inputs: { BOOL: { block: this.expression(test) }, ...(body ? { DO: { block: body } } : {}) },
    });
  }

  private forStatement(node: Node): SerializedBlock | null {
    const init = field(node, 'initializer');
    const condition = unwrap(field(node, 'condition'));
    const update = field(node, 'update');
    const bodyNode = field(node, 'body');
    if (!init || condition?.type !== 'binary_expression' || !update) return null;

    let name: string | undefined;
    let start: Node | null = null;
    let declared = false;
    if (init.type === 'declaration') {
      const declarator = named(init).find((child) => child.type === 'init_declarator');
      name = declarator ? field(declarator, 'declarator')?.text : undefined;
      start = declarator ? field(declarator, 'value') : null;
      declared = true;
    } else if (init.type === 'assignment_expression' && field(init, 'operator')?.text === '=') {
      name = field(init, 'left')?.text;
      start = field(init, 'right');
    }
    if (!name || !start || field(condition, 'left')?.text !== name) return null;
    const operator = field(condition, 'operator')?.text;
    const limit = field(condition, 'right');

    let step: number | null = null;
    if (update.type === 'update_expression' && field(update, 'argument')?.text === name) {
      step = field(update, 'operator')?.text === '--' ? -1 : 1;
    } else if (update.type === 'assignment_expression' && field(update, 'left')?.text === name) {
      const amount = numberValue(field(update, 'right'));
      const op = field(update, 'operator')?.text;
      if (amount !== null && (op === '+=' || op === '-=')) step = op === '+=' ? amount : -amount;
    }
    if (step === null) return null;

    // "for (int i = 0; i < n; i++)" whose body never reads i: a plain repeat.
    const bodyText = bodyNode?.text ?? '';
    if (
      declared &&
      numberValue(start) === 0 &&
      operator === '<' &&
      step === 1 &&
      !new RegExp(`\\b${name}\\b`).test(bodyText)
    ) {
      const body = this.body(bodyNode);
      return this.block('controls_repeat_ext', {
        inputs: { TIMES: this.input(limit), ...(body ? { DO: { block: body } } : {}) },
      });
    }

    let to: { block?: SerializedBlock; shadow?: SerializedBlock };
    if (operator === '<=' || operator === '>=') {
      to = this.input(limit);
    } else if ((operator === '<' && step > 0) || (operator === '>' && step < 0)) {
      const value = numberValue(limit);
      if (value === null) return null;
      to = this.numberInput(step > 0 ? value - 1 : value + 1);
    } else {
      return null;
    }
    const id = this.variable(name);
    const body = this.body(bodyNode);
    return this.block('controls_for', {
      fields: { VAR: { id } },
      inputs: {
        FROM: this.input(start),
        TO: to,
        BY: this.numberInput(Math.abs(step)),
        ...(body ? { DO: { block: body } } : {}),
      },
    });
  }

  /** Links statements into a chain, dropping pinMode calls the blocks write themselves. */
  private chain(items: Converted[]): SerializedBlock | undefined {
    const blocks = items
      .map((item) => {
        if (!isDeferred(item)) return item;
        return this.generatedModes.get(item.pin) === item.mode
          ? null
          : this.code('code_statement', item.text);
      })
      .filter((block): block is SerializedBlock => block !== null);
    let head: SerializedBlock | undefined;
    for (const block of blocks.reverse()) {
      head = head ? { ...block, next: { block: head } } : block;
    }
    return head;
  }

  // ------------------------------------------------------------- top level

  convert(tree: Tree): ConversionResult {
    const root = tree.rootNode;
    const top = named(root);
    const globals: string[] = [];
    const procedures: SerializedBlock[] = [];
    const setupStart: SerializedBlock[] = [];
    let setupNode: Node | null = null;
    let loopNode: Node | null = null;
    const includes: { header: string; text: string }[] = [];
    const functions: Node[] = [];

    this.findPinConstants(root, top);

    // First pass: names that statements refer to.
    for (const node of top) {
      if (this.isPinConstant(node)) continue;
      if (node.type === 'function_definition') {
        const declarator = field(node, 'declarator');
        const name = declarator ? (field(declarator, 'declarator')?.text ?? '') : '';
        const params = named(declarator ? field(declarator, 'parameters') : null).map(
          (param) => field(param, 'declarator')?.text ?? '',
        );
        if (name === 'setup') setupNode = field(node, 'body');
        else if (name === 'loop') loopNode = field(node, 'body');
        else if (!GENERATED_HELPERS.has(name)) {
          this.procedures.set(name, { returns: field(node, 'type')?.text !== 'void', params });
          functions.push(node);
        }
      } else if (node.type === 'declaration') {
        this.globalDeclaration(node, globals, setupStart);
      } else if (node.type === 'preproc_include') {
        const header = field(node, 'path')?.text.replace(/^[<"]|[>"]$/g, '') ?? '';
        includes.push({ header, text: node.text.trim() });
      } else {
        globals.push(node.text);
      }
    }
    // Servo pins come from attach() calls in setup.
    if (setupNode) this.findServoPins(setupNode);

    const setup = this.statements(named(setupNode));
    const loop = this.statements(named(loopNode));

    for (const node of functions) procedures.push(this.procedure(node, globals));

    const program: SerializedBlock = {
      type: 'ideblock_program',
      id: 'program',
      x: 40,
      y: 40,
      deletable: false,
      inputs: {},
    };
    const setupChain = this.chain([...setupStart, ...setup]);
    const loopChain = this.chain(loop);
    if (setupChain) program.inputs!['SETUP'] = { block: setupChain };
    if (loopChain) program.inputs!['LOOP'] = { block: loopChain };

    // Library includes come back with the blocks that use the library.
    const rawIncludes = includes
      .filter(({ header }) => {
        const library = LIBRARY_HEADERS[header];
        if (library) return !this.usedLibraries.has(library);
        return header !== 'Wire.h' || !this.usedLibraries.has('lcd');
      })
      .map(({ text }) => text);
    const stillNamed = [...this.pinOnly].filter((name) =>
      [...this.codeTexts, ...globals].some((text) => new RegExp(`\\b${name}\\b`).test(text)),
    );
    const kept = stillNamed.map((name) => this.pinDeclarations.get(name)!);
    const rawGlobal = [...rawIncludes, ...kept, ...globals].join('\n').trim();

    const blocks: SerializedBlock[] = [program];
    let y = 40;
    if (rawGlobal) {
      blocks.push({ ...this.code('code_global', rawGlobal), x: 640, y });
      y += 120;
    }
    for (const procedure of procedures) {
      blocks.push({ ...procedure, x: 640, y });
      y += 200;
    }
    const variables = [...this.variables].map(([name, id]) => ({ name, id }));
    return {
      state: {
        blocks: { languageVersion: 0, blocks },
        ...(variables.length > 0 ? { variables } : {}),
      },
      blocks: this.blockCount + 1,
      codeBlocks: this.codeCount,
      syntaxError: root.hasError,
    };
  }

  /**
   * Names given to pins: "#define LED 13", "const int ledPin = 13;" or a
   * variable that is never changed. They become the pin itself when every use
   * is a pin, so the blocks show the pin and the name is not needed.
   */
  private findPinConstants(root: Node, top: Node[]): void {
    const candidates = new Map<string, string>();
    for (const node of top) {
      const constant = pinConstant(node, this.options.board.builtinLedPin);
      if (constant) {
        candidates.set(constant.name, constant.value);
        this.pinDeclarations.set(constant.name, node.text.trim());
      }
      // Names other declarations use, such as an array size, must stay as they are.
      if (node.type !== 'function_definition' && node.type !== 'preproc_def') {
        const names = new Map<string, number>();
        const count = (child: Node): void => {
          if (child.type === 'identifier') names.set(child.text, (names.get(child.text) ?? 0) + 1);
          for (const grandchild of child.children) if (grandchild) count(grandchild);
        };
        count(node);
        const own = node.type === 'declaration' ? declaratorsOf(node) : [];
        for (const [name, uses] of names) {
          const declared = own.some(
            (declarator) =>
              (declarator.type === 'init_declarator' ? field(declarator, 'declarator') : declarator)
                ?.text === name,
          );
          if (uses > (declared ? 1 : 0)) this.globalNames.add(name);
        }
      }
    }
    if (candidates.size === 0) return;
    const rejected = new Set<string>();
    const assigned = new Set<string>();
    const visit = (node: Node): void => {
      if (node.type === 'identifier' && candidates.has(node.text) && !isPinArgument(node)) {
        // The declaration's own name is not a use.
        const parent = node.parent;
        const declares =
          parent !== null &&
          (parent.type === 'init_declarator' || parent.type === 'preproc_def') &&
          field(parent, parent.type === 'preproc_def' ? 'name' : 'declarator')?.id === node.id;
        const target =
          parent !== null &&
          ((parent.type === 'assignment_expression' && field(parent, 'left')?.id === node.id) ||
            parent.type === 'update_expression');
        if (target) assigned.add(node.text);
        if (!declares) rejected.add(node.text);
      }
      for (const child of node.children) if (child) visit(child);
    };
    visit(root);
    for (const [name, value] of candidates) {
      if (assigned.has(name)) continue;
      this.constants.set(name, value);
      if (!rejected.has(name)) this.pinOnly.add(name);
    }
  }

  private isPinConstant(node: Node): boolean {
    const constant = pinConstant(node, this.options.board.builtinLedPin);
    return constant !== null && this.pinOnly.has(constant.name);
  }

  private globalDeclaration(node: Node, globals: string[], setupStart: SerializedBlock[]): void {
    const type = field(node, 'type')?.text ?? '';
    const declarators = declaratorsOf(node);
    const nameOf = (declarator: Node) =>
      declarator.type === 'init_declarator'
        ? (field(declarator, 'declarator')?.text ?? '')
        : declarator.text;

    if (
      declarators.some((declarator) =>
        GENERATED_GLOBALS.has(nameOf(declarator).replace(/\[.*$/, '')),
      )
    )
      return;
    if (type === 'Servo') {
      for (const declarator of declarators) this.servos.set(nameOf(declarator), '');
      return;
    }
    if (type === 'LiquidCrystal_PCF8574' || type === 'LiquidCrystal_I2C') {
      // The blocks drive a 16x2 screen at address 0x27; others stay as code.
      const fits = declarators.every((declarator) => {
        const args = declarator.type === 'init_declarator' ? named(field(declarator, 'value')) : [];
        const sizes = args
          .slice(1)
          .map((arg) => arg.text)
          .join();
        return args[0]?.text.toLowerCase() === '0x27' && (sizes === '' || sizes === '16,2');
      });
      if (fits) {
        for (const declarator of declarators) this.lcds.add(nameOf(declarator));
        return;
      }
    }
    if (type === 'Adafruit_NeoPixel') {
      for (const declarator of declarators) {
        const args = declarator.type === 'init_declarator' ? named(field(declarator, 'value')) : [];
        const countText = this.pin(args[0]);
        const count = countText !== null && /^\d+$/.test(countText) ? Number(countText) : null;
        const pin = this.pin(args[1]);
        if (count === null || !pin) {
          globals.push(node.text);
          return;
        }
        this.strips.set(nameOf(declarator), { pin, count });
      }
      return;
    }
    const constant = /\bconst\b/.test(node.text);
    if (
      VARIABLE_TYPES.has(type) &&
      (!constant || declarators.every((declarator) => !this.globalNames.has(nameOf(declarator))))
    ) {
      for (const declarator of declarators) {
        const name = nameOf(declarator);
        if (!/^\w+$/.test(name)) {
          globals.push(node.text);
          return;
        }
      }
      for (const declarator of declarators) {
        const id = this.variable(nameOf(declarator));
        if (declarator.type !== 'init_declarator') continue;
        const value = field(declarator, 'value');
        // Blocks declare every variable with 0 or ""; other starting values are set first thing.
        const literal = numberValue(value);
        const empty = ['""', 'false', 'LOW'].includes(unwrap(value)?.text ?? '');
        if (literal === 0 || empty) continue;
        setupStart.push(
          this.block('variables_set', {
            fields: { VAR: { id } },
            inputs: { VALUE: this.input(value) },
          }),
        );
      }
      return;
    }
    globals.push(node.text);
  }

  private findServoPins(setup: Node): void {
    const visit = (node: Node): void => {
      if (node.type === 'call_expression') {
        const { object, method, args } = callParts(node);
        const pin = this.pin(args[0]);
        if (object !== null && method === 'attach' && this.servos.has(object) && pin)
          this.servos.set(object, pin);
      }
      for (const child of named(node)) visit(child);
    };
    visit(setup);
    // A servo never attached in setup cannot become a block; keep it as code.
    for (const [name, pin] of this.servos) if (!pin) this.servos.delete(name);
  }

  private procedure(node: Node, globals: string[]): SerializedBlock {
    const declarator = field(node, 'declarator');
    const name = declarator ? (field(declarator, 'declarator')?.text ?? '') : '';
    const info = this.procedures.get(name)!;
    const params = info.params.map((param) => ({ name: param, id: `${name}_${param}` }));
    this.parameters = new Map(params.map((param) => [param.name, param.id]));
    const statements = named(field(node, 'body'));
    let returnValue: Node | null = null;
    if (info.returns) {
      const last = statements.at(-1);
      if (
        last?.type !== 'return_statement' ||
        statements.slice(0, -1).some((s) => /\breturn\b/.test(s.text))
      ) {
        this.parameters = new Map();
        this.procedures.delete(name);
        globals.push(node.text);
        return this.code('code_global', node.text);
      }
      returnValue = named(last)[0] ?? null;
      statements.pop();
    }
    const body = this.chain(this.statements(statements));
    const block = this.block(info.returns ? 'procedures_defreturn' : 'procedures_defnoreturn', {
      fields: { NAME: name },
      ...(params.length > 0 ? { extraState: { params } } : {}),
      inputs: {
        ...(body ? { STACK: { block: body } } : {}),
        ...(returnValue ? { RETURN: this.input(returnValue) } : {}),
      },
    });
    this.parameters = new Map();
    return block;
  }
}

const ALL_PARTS = [
  'led',
  'rgb-led',
  'pushbutton',
  'slide-switch',
  'potentiometer',
  'photoresistor',
  'temperature-sensor',
  'pir-sensor',
  'tilt-switch',
  'joystick',
  'servo',
  'buzzer',
  'hc-sr04',
  'lcd1602',
  'seven-segment',
  'neopixel-ring',
];

/** Turns a parsed sketch into blocks; code without a matching block stays as code blocks. */
export function convertTree(tree: Tree, options: ConvertOptions): ConversionResult {
  return new Converter(options).convert(tree);
}
