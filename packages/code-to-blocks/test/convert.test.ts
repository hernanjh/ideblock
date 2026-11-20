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

  it('turns names given to pins into the pins', async () => {
    const result = await convert(`
#define BUTTON 2
const int ledPin = 13;
int led2 = 12;
int buttonState = 0;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(led2, OUTPUT);
  pinMode(BUTTON, INPUT);
}

void loop() {
  buttonState = digitalRead(BUTTON);
  if (buttonState == HIGH) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(led2, LOW);
  }
}
`);
    expect(result.codeBlocks).toBe(0);
    expect(result.code).not.toContain('ledPin');
    expect(result.code).not.toContain('BUTTON');
    expect(result.code).toContain('digitalWrite(12, LOW);');
    expect(result.code).toContain('digitalRead(2)');
    expect(result.state.variables).toEqual([{ name: 'buttonState', id: 'buttonState' }]);
  });

  it('keeps a pin name that is also used as a number', async () => {
    const result = await convert(`
const int ledPin = 9;

void setup() {
  Serial.begin(9600);
  Serial.println(ledPin);
}

void loop() {
  analogWrite(ledPin, 100);
}
`);
    expect(result.code).toContain('ledPin = 9;');
    expect(result.code).toContain('analogWrite(9, 100);');
  });

  it('reads a NeoPixel strip sized with names', async () => {
    const result = await convert(`
#include <Adafruit_NeoPixel.h>
#define PIN 6
#define NUMPIXELS 8
Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  pixels.begin();
}

void loop() {
  pixels.setPixelColor(0, pixels.Color(0, 150, 0));
  pixels.show();
}
`);
    expect(result.codeBlocks).toBe(0);
    expect(result.code).toContain('Adafruit_NeoPixel pixels_6(8, 6');
  });

  it('reads the common LiquidCrystal_I2C library as the LCD blocks', async () => {
    const result = await convert(`
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);
void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 1);
  lcd.print("Hola");
}
void loop() {}
`);
    expect(result.codeBlocks).toBe(0);
    expect(types(result.state.blocks.blocks)).toContain('lcd_print');
  });

  it('keeps an LCD at another address as code', async () => {
    const result = await convert(`
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x3F, 16, 2);
void setup() {
  lcd.init();
}
void loop() {}
`);
    expect(result.code).toContain('LiquidCrystal_I2C lcd(0x3F, 16, 2);');
    expect(result.code).toContain('lcd.init();');
  });

  it('keeps a pin name that code blocks still use', async () => {
    const result = await convert(`
const int ledPin = LED_BUILTIN;
void setup() {
  pinMode(ledPin, OUTPUT);
}
void loop() {
  do {
    digitalWrite(ledPin, HIGH);
  } while (false);
}
`);
    expect(result.code).toContain('const int ledPin = LED_BUILTIN;');
    expect(result.code).toContain('digitalWrite(ledPin, HIGH);');
    expect(result.code).toContain('pinMode(13, OUTPUT);');
  });

  it('converts the classic ultrasonic sketch', async () => {
    const result = await convert(`
const int trigPin = 9;
const int echoPin = 10;
long duration;
void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}
void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  tone(8, duration);
  delay(100);
  noTone(8);
}
`);
    expect(result.codeBlocks).toBe(0);
    expect(result.code).toContain('delayMicroseconds(10);');
    expect(result.code).toContain('duration = pulseIn(10, HIGH);');
    expect(result.code).toContain('tone(8, duration);');
  });

  it('writes a variable level to a pin', async () => {
    const result = await convert(`
bool ledState = false;
void setup() {}
void loop() {
  ledState = !ledState;
  digitalWrite(13, ledState);
}
`);
    expect(result.codeBlocks).toBe(0);
    expect(result.code).toContain('digitalWrite(13, ledState);');
  });
});
