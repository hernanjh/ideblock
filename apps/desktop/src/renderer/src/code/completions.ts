import type * as monaco from 'monaco-editor/editor/editor.api';
import i18next from 'i18next';

interface ApiEntry {
  label: string;
  /** Snippet with ${n:placeholder} tab stops. */
  snippet: string;
  signature: string;
  kind: 'function' | 'constant' | 'method';
}

const API: ApiEntry[] = [
  {
    label: 'pinMode',
    snippet: 'pinMode(${1:pin}, ${2:OUTPUT});',
    signature: 'void pinMode(uint8_t pin, uint8_t mode)',
    kind: 'function',
  },
  {
    label: 'digitalWrite',
    snippet: 'digitalWrite(${1:pin}, ${2:HIGH});',
    signature: 'void digitalWrite(uint8_t pin, uint8_t value)',
    kind: 'function',
  },
  {
    label: 'digitalRead',
    snippet: 'digitalRead(${1:pin})',
    signature: 'int digitalRead(uint8_t pin)',
    kind: 'function',
  },
  {
    label: 'analogRead',
    snippet: 'analogRead(${1:A0})',
    signature: 'int analogRead(uint8_t pin)',
    kind: 'function',
  },
  {
    label: 'analogWrite',
    snippet: 'analogWrite(${1:pin}, ${2:value});',
    signature: 'void analogWrite(uint8_t pin, int value)',
    kind: 'function',
  },
  {
    label: 'delay',
    snippet: 'delay(${1:1000});',
    signature: 'void delay(unsigned long ms)',
    kind: 'function',
  },
  {
    label: 'delayMicroseconds',
    snippet: 'delayMicroseconds(${1:10});',
    signature: 'void delayMicroseconds(unsigned int us)',
    kind: 'function',
  },
  { label: 'millis', snippet: 'millis()', signature: 'unsigned long millis()', kind: 'function' },
  { label: 'micros', snippet: 'micros()', signature: 'unsigned long micros()', kind: 'function' },
  {
    label: 'tone',
    snippet: 'tone(${1:pin}, ${2:440}, ${3:500});',
    signature: 'void tone(uint8_t pin, unsigned int frequency, unsigned long duration)',
    kind: 'function',
  },
  {
    label: 'noTone',
    snippet: 'noTone(${1:pin});',
    signature: 'void noTone(uint8_t pin)',
    kind: 'function',
  },
  {
    label: 'map',
    snippet: 'map(${1:value}, ${2:0}, ${3:1023}, ${4:0}, ${5:255})',
    signature: 'long map(long value, long fromLow, long fromHigh, long toLow, long toHigh)',
    kind: 'function',
  },
  {
    label: 'constrain',
    snippet: 'constrain(${1:value}, ${2:min}, ${3:max})',
    signature: 'constrain(value, min, max)',
    kind: 'function',
  },
  {
    label: 'random',
    snippet: 'random(${1:min}, ${2:max})',
    signature: 'long random(long min, long max)',
    kind: 'function',
  },
  {
    label: 'pulseIn',
    snippet: 'pulseIn(${1:pin}, ${2:HIGH})',
    signature: 'unsigned long pulseIn(uint8_t pin, uint8_t state)',
    kind: 'function',
  },
  {
    label: 'Serial.begin',
    snippet: 'Serial.begin(${1:9600});',
    signature: 'void Serial.begin(unsigned long baud)',
    kind: 'method',
  },
  {
    label: 'Serial.print',
    snippet: 'Serial.print(${1:value});',
    signature: 'size_t Serial.print(value)',
    kind: 'method',
  },
  {
    label: 'Serial.println',
    snippet: 'Serial.println(${1:value});',
    signature: 'size_t Serial.println(value)',
    kind: 'method',
  },
  {
    label: 'Serial.available',
    snippet: 'Serial.available()',
    signature: 'int Serial.available()',
    kind: 'method',
  },
  {
    label: 'Serial.readStringUntil',
    snippet: "Serial.readStringUntil('\\n')",
    signature: 'String Serial.readStringUntil(char terminator)',
    kind: 'method',
  },
  { label: 'HIGH', snippet: 'HIGH', signature: 'HIGH', kind: 'constant' },
  { label: 'LOW', snippet: 'LOW', signature: 'LOW', kind: 'constant' },
  { label: 'INPUT', snippet: 'INPUT', signature: 'INPUT', kind: 'constant' },
  { label: 'OUTPUT', snippet: 'OUTPUT', signature: 'OUTPUT', kind: 'constant' },
  { label: 'INPUT_PULLUP', snippet: 'INPUT_PULLUP', signature: 'INPUT_PULLUP', kind: 'constant' },
  { label: 'LED_BUILTIN', snippet: 'LED_BUILTIN', signature: 'LED_BUILTIN', kind: 'constant' },
];

function documentation(label: string): string {
  const key = `codeApi.${label.replace('.', '_')}`;
  return i18next.exists(key) ? i18next.t(key as never) : '';
}

export function registerSketchCompletions(api: typeof monaco): void {
  const kinds = {
    function: api.languages.CompletionItemKind.Function,
    method: api.languages.CompletionItemKind.Method,
    constant: api.languages.CompletionItemKind.Constant,
  };

  api.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const word = model.getWordUntilPosition(position);
      const afterSerialDot = /Serial\.\w*$/.test(line);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const entries = afterSerialDot
        ? API.filter((entry) => entry.label.startsWith('Serial.'))
        : API;
      return {
        suggestions: entries.map((entry) => ({
          label: afterSerialDot ? entry.label.slice('Serial.'.length) : entry.label,
          kind: kinds[entry.kind],
          detail: entry.signature,
          documentation: documentation(entry.label),
          insertText: afterSerialDot ? entry.snippet.slice('Serial.'.length) : entry.snippet,
          insertTextRules: api.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });
}
