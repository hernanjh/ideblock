import { getBoard } from '@ideblock/boards';
import { describe, expect, it } from 'vitest';
import { codeToBlocks, type CircuitPart, type SerializedBlock } from '../src';
import { files, generate } from './helpers';

async function convert(code: string, parts: CircuitPart[] = [], board = 'uno') {
  const result = await codeToBlocks(code, { board: getBoard(board), parts, files });
  return { ...result, code: generate(result.state, board) };
}

/** Every block type in the workspace, in reading order. */
function types(blocks: SerializedBlock[]): string[] {
  const found: string[] = [];
  const visit = (block: SerializedBlock | undefined): void => {
    if (!block) return;
    found.push(block.type);
    for (const input of Object.values(block.inputs ?? {})) visit(input.block ?? input.shadow);
    visit(block.next?.block);
  };
  blocks.forEach(visit);
  return found;
}

describe('codeToBlocks', () => {
  it('turns the classic Blink into board LED blocks', async () => {
    const result = await convert(`
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`);
    expect(result.codeBlocks).toBe(0);
    expect(types(result.state.blocks.blocks)).toEqual([
      'ideblock_program',
      'builtin_led_set',
      'time_delay_seconds',
      'math_number',
      'builtin_led_set',
      'time_delay',
      'math_number',
    ]);
    expect(result.code).toContain('pinMode(13, OUTPUT);');
    expect(result.code).toContain('delay(500);');
  });

  it('keeps an inverted board LED the right way round', async () => {
    const result = await convert(
      'void setup() {}\nvoid loop() { digitalWrite(LED_BUILTIN, LOW); }',
      [],
      'nodemcu',
    );
    const led = result.state.blocks.blocks[0]!.inputs!['LOOP']!.block!;
    expect(led).toMatchObject({ type: 'builtin_led_set', fields: { STATE: 'HIGH' } });
  });

  it('uses the circuit to pick part blocks', async () => {
    const result = await convert(
      `
void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(7, OUTPUT);
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(7, HIGH);
  } else if (analogRead(A0) > 500) {
    analogWrite(7, 128);
  } else {
    digitalWrite(7, LOW);
  }
}
`,
      [
        { type: 'pushbutton', pins: { signal: '2' } },
        { type: 'led', pins: { anode: '7' } },
        { type: 'potentiometer', pins: { signal: 'A0' } },
      ],
    );
    expect(result.codeBlocks).toBe(0);
    const found = types(result.state.blocks.blocks);
    expect(found).toContain('button_pressed');
    expect(found).toContain('led_set');
    expect(found).toContain('potentiometer_read');
    expect(found).toContain('io_analog_write');
  });

  it('converts variables, loops and functions', async () => {
    const result = await convert(`
int count = 3;
float level;

void blinkTimes(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(13, HIGH);
    delay(200);
    digitalWrite(13, LOW);
    delay(200);
  }
}

int twice(int value) {
  return value * 2;
}

void setup() {
  Serial.begin(9600);
}

void loop() {
  count++;
  level = twice(count) / 2.5;
  Serial.println(String("Level: ") + String(level));
  while (count > 10) {
    count -= 10;
  }
  blinkTimes(count);
}
`);
    expect(result.codeBlocks).toBe(0);
    const found = types(result.state.blocks.blocks);
    for (const type of [
      'variables_set',
      'math_change',
      'procedures_callreturn',
      'procedures_callnoreturn',
      'procedures_defnoreturn',
      'procedures_defreturn',
      'controls_repeat_ext',
      'controls_whileUntil',
      'text_join',
      'serial_print',
    ]) {
      expect(found).toContain(type);
    }
    expect(result.code).toContain('count = 3;');
    expect(result.code).toContain('void blinkTimes(');
  });

  it('keeps code without a block as code blocks', async () => {
    const result = await convert(`
#include <EEPROM.h>
#define LIMIT 40

void setup() {
  EEPROM.write(0, LIMIT);
}

void loop() {
  int stored = EEPROM.read(0);
  if (stored > LIMIT) {
    digitalWrite(13, HIGH);
  }
}
`);
    expect(result.codeBlocks).toBeGreaterThan(0);
    const found = types(result.state.blocks.blocks);
    expect(found).toContain('code_global');
    expect(found).toContain('code_statement');
    expect(found).toContain('code_expression');
    expect(result.code).toContain('#include <EEPROM.h>');
    expect(result.code).toContain('#define LIMIT 40');
    expect(result.code).toContain('EEPROM.write(0, LIMIT);');
    expect(result.code).toContain('EEPROM.read(0)');
  });

  it('reports syntax errors but converts what it understood', async () => {
    const result = await convert('void setup() {\n  delay(10)\n}\nvoid loop() {}');
    expect(result.syntaxError).toBe(true);
  });
});
