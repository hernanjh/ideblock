import { describe, expect, it } from 'vitest';
import { chain, generate, num, program, str } from './helpers';

const led = (state: 'HIGH' | 'LOW', pin = '13') => ({
  type: 'led_set',
  fields: { PIN: pin, STATE: state },
});
const waitSeconds = (seconds: number) => ({
  type: 'time_delay_seconds',
  inputs: { SECONDS: num(seconds) },
});

describe('sketch generator', () => {
  it('generates an empty sketch', () => {
    expect(generate(program([], [])).code).toBe('void setup() {\n}\n\nvoid loop() {\n}\n');
  });

  it('generates the blink sketch', () => {
    const { code, libraries } = generate(
      program([], [led('HIGH'), waitSeconds(1), led('LOW'), waitSeconds(0.5)]),
    );
    expect(code).toBe(
      [
        'void setup() {',
        '  pinMode(13, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  digitalWrite(13, HIGH);',
        '  delay(1000);',
        '  digitalWrite(13, LOW);',
        '  delay(500);',
        '}',
        '',
      ].join('\n'),
    );
    expect(libraries).toEqual([]);
  });

  it('declares pin modes once and before user setup code', () => {
    const { code } = generate(
      program(
        [{ type: 'serial_print', fields: { NEWLINE: 'TRUE' }, inputs: { TEXT: str('Hi') } }],
        [led('HIGH'), led('LOW')],
      ),
    );
    expect(code).toContain(
      'void setup() {\n  Serial.begin(9600);\n  pinMode(13, OUTPUT);\n  Serial.println("Hi");\n}',
    );
    expect(code.match(/pinMode/g)).toHaveLength(1);
  });

  it('reads a button with the internal pull-up', () => {
    const { code } = generate(
      program(
        [],
        [
          {
            type: 'controls_if',
            extraState: { hasElse: true },
            inputs: {
              IF0: { block: { type: 'button_pressed', fields: { PIN: '2' } } },
              DO0: { block: led('HIGH') },
              ELSE: { block: led('LOW') },
            },
          },
        ],
      ),
    );
    expect(code).toContain('pinMode(2, INPUT_PULLUP);');
    expect(code).toContain(
      '  if (digitalRead(2) == LOW) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n',
    );
  });

  it('uses the right servo library for each architecture', () => {
    const servo = program(
      [],
      [{ type: 'servo_write', fields: { PIN: '9' }, inputs: { ANGLE: num(45) } }],
    );
    const avr = generate(servo);
    expect(avr.code).toContain('#include <Servo.h>');
    expect(avr.code).toContain('Servo servo_9;');
    expect(avr.code).toContain('servo_9.attach(9);');
    expect(avr.code).toContain('servo_9.write(constrain(45, 0, 180));');
    expect(avr.libraries).toEqual(['Servo']);

    const esp32Servo = program(
      [],
      [{ type: 'servo_write', fields: { PIN: '13' }, inputs: { ANGLE: num(45) } }],
    );
    const esp32 = generate(esp32Servo, { board: 'esp32-devkit' });
    expect(esp32.code).toContain('#include <ESP32Servo.h>');
    expect(esp32.libraries).toEqual(['ESP32Servo']);
  });

  it('uses the servo library bundled with ESP8266 and RP2040 platforms', () => {
    const servo = program(
      [],
      [{ type: 'servo_write', fields: { PIN: '5' }, inputs: { ANGLE: num(45) } }],
    );
    for (const board of ['nodemcu', 'pico']) {
      const result = generate(servo, { board });
      expect(result.code).toContain('#include <Servo.h>');
      expect(result.libraries).toEqual([]);
    }
  });

  it('mixes RGB LED colours with PWM', () => {
    const { code } = generate(
      program(
        [],
        [
          {
            type: 'rgb_led_color',
            fields: { RED: '9', GREEN: '10', BLUE: '11', COLOR: '255,180,0' },
          },
        ],
      ),
    );
    expect(code.match(/pinMode\(\d+, OUTPUT\);/g)).toHaveLength(3);
    expect(code).toContain('analogWrite(9, 255);\n  analogWrite(10, 180);\n  analogWrite(11, 0);');
  });

  it('prints on the I2C LCD with rows and columns counted from 1', () => {
    const { code, libraries } = generate(
      program(
        [],
        [
          { type: 'lcd_clear' },
          { type: 'lcd_print', inputs: { TEXT: str('Hi'), ROW: num(2), COLUMN: num(1) } },
        ],
      ),
    );
    expect(code).toContain('#include <Wire.h>\n#include <LiquidCrystal_PCF8574.h>');
    expect(code).toContain('LiquidCrystal_PCF8574 lcd(0x27);');
    expect(code).toContain('lcd.begin(16, 2);\n  lcd.setBacklight(255);');
    expect(code).toContain('lcd.clear();\n  lcd.setCursor(0, 1);\n  lcd.print("Hi");');
    expect(code.match(/lcd\.begin/g)).toHaveLength(1);
    expect(libraries).toEqual(['LiquidCrystal_PCF8574']);
  });

  it('declares one NeoPixel strip per pin and counts pixels from 1', () => {
    const { code, libraries } = generate(
      program(
        [],
        [
          {
            type: 'neopixel_set',
            fields: { PIN: '6', COLOR: '0,0,255', COUNT: 8 },
            inputs: { INDEX: num(3) },
          },
          { type: 'neopixel_clear', fields: { PIN: '6', COUNT: 8 } },
        ],
      ),
    );
    expect(code).toContain('Adafruit_NeoPixel pixels_6(8, 6, NEO_GRB + NEO_KHZ800);');
    expect(code.match(/pixels_6\.begin\(\);/g)).toHaveLength(1);
    expect(code).toContain('pixels_6.setPixelColor(2, pixels_6.Color(0, 0, 255));');
    expect(code).toContain('pixels_6.clear();\n  pixels_6.show();');
    expect(libraries).toEqual(['Adafruit NeoPixel']);
  });

  it('drives the board LED on whatever pin each board uses', () => {
    const blink = program([], [{ type: 'builtin_led_set', fields: { STATE: 'HIGH' } }]);
    expect(generate(blink).code).toContain('pinMode(13, OUTPUT);');
    expect(generate(blink).code).toContain('digitalWrite(13, HIGH);');
    expect(generate(blink, { board: 'esp32-devkit' }).code).toContain('digitalWrite(2, HIGH);');
  });

  it('turns an LED on for a while', () => {
    const { code } = generate(
      program([], [{ type: 'led_on_for', fields: { PIN: '13' }, inputs: { SECONDS: num(1.5) } }]),
    );
    expect(code).toContain('pinMode(13, OUTPUT);');
    expect(code).toContain('digitalWrite(13, HIGH);\n  delay(1500);\n  digitalWrite(13, LOW);');
  });

  it('reads letters counting from 1 and searches text', () => {
    const { code } = generate(
      program(
        [],
        [
          {
            type: 'serial_print',
            fields: { NEWLINE: 'TRUE' },
            inputs: {
              TEXT: {
                block: { type: 'text_letter', inputs: { INDEX: num(1), TEXT: str('hola') } },
              },
            },
          },
          {
            type: 'serial_print',
            fields: { NEWLINE: 'TRUE' },
            inputs: {
              TEXT: {
                block: { type: 'text_contains', inputs: { TEXT: str('hola'), PART: str('o') } },
              },
            },
          },
        ],
      ),
    );
    expect(code).toContain('Serial.println(String(String("hola").charAt(0)));');
    expect(code).toContain('Serial.println(String("hola").indexOf(String("o")) >= 0);');
  });

  it('ignores blocks that are not inside the program', () => {
    const { code } = generate(program([], []), { extraTopBlocks: [led('HIGH', '7')] });
    expect(code).not.toContain('7');
  });

  it('adds helper functions once', () => {
    const distance = { block: { type: 'ultrasonic_distance', fields: { TRIG: '9', ECHO: '10' } } };
    const { code } = generate(
      program(
        [],
        [
          { type: 'serial_print', fields: { NEWLINE: 'TRUE' }, inputs: { TEXT: distance } },
          { type: 'serial_print', fields: { NEWLINE: 'TRUE' }, inputs: { TEXT: distance } },
        ],
      ),
    );
    expect(code.match(/long readDistanceCm/g)).toHaveLength(1);
    expect(code).toContain('Serial.println(readDistanceCm(9, 10));');
  });

  it('escapes text', () => {
    const { code } = generate(
      program(
        [],
        [
          {
            type: 'serial_print',
            fields: { NEWLINE: 'FALSE' },
            inputs: { TEXT: str('say "hi"\\') },
          },
        ],
      ),
    );
    expect(code).toContain('Serial.print("say \\"hi\\"\\\\");');
  });

  it('keeps operator precedence', () => {
    const arithmetic = (op: string, a: unknown, b: unknown) => ({
      block: { type: 'math_arithmetic', fields: { OP: op }, inputs: { A: a, B: b } },
    });
    const value = arithmetic(
      'MULTIPLY',
      arithmetic('ADD', num(1), num(2)),
      arithmetic('MINUS', num(3), arithmetic('MINUS', num(4), num(5))),
    );
    const { code } = generate(
      program([], [{ type: 'serial_print', fields: { NEWLINE: 'TRUE' }, inputs: { TEXT: value } }]),
    );
    expect(code).toContain('Serial.println((1 + 2) * (3 - (4 - 5)));');
  });

  it('generates loops', () => {
    const { code } = generate(
      program(
        [],
        [
          {
            type: 'controls_repeat_ext',
            inputs: { TIMES: num(3), DO: { block: led('HIGH') } },
          },
          {
            type: 'controls_for',
            fields: { VAR: { id: 'v1' } },
            inputs: { FROM: num(10), TO: num(0), BY: num(2), DO: { block: waitSeconds(1) } },
          },
        ],
      ),
      { variables: [{ id: 'v1', name: 'step' }] },
    );
    expect(code).toContain('for (int i = 0; i < 3; i++) {');
    expect(code).toContain('for (step = 10; step >= 0; step -= 2) {');
  });

  it('reports running blocks to the simulator when tracing', async () => {
    const { getBoard } = await import('@ideblock/boards');
    const { createSketchGenerator, applyBlockMessages } = await import('../src');
    const Blockly = await import('blockly/core');
    applyBlockMessages('en');
    const generator = createSketchGenerator(getBoard('uno'));
    generator.configure({ board: getBoard('uno'), trace: true });
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(
      { blocks: { languageVersion: 0, blocks: [program([], [led('HIGH'), led('LOW')])] } },
      workspace,
    );
    const result = generator.generate(workspace);
    expect(result.code).toContain('inline void ideblockTrace(uint16_t index)');
    expect(result.code).toContain(
      '  ideblockTrace(0);\n  digitalWrite(13, HIGH);\n  ideblockTrace(1);\n',
    );
    expect(result.tracedBlocks).toHaveLength(2);
    workspace.dispose();
  });
});

describe('chain helper', () => {
  it('links blocks in order', () => {
    expect(chain({ type: 'a' }, { type: 'b' })).toEqual({
      type: 'a',
      next: { block: { type: 'b' } },
    });
  });
});
