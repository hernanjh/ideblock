import { describe, expect, it } from 'vitest';
import { explain, parseCompilerOutput, type CompilerDiagnostic } from '../src';

const OUTPUT = `/tmp/build/sketch/Blink/Blink.ino: In function 'void setup()':
/tmp/build/sketch/Blink/Blink.ino:2:3: error: 'foo' was not declared in this scope
   foo();
   ^~~
/tmp/build/sketch/Blink/Blink.ino:2:3: note: suggested alternative: 'feof'
C:\\Users\\kid\\AppData\\Blink\\Blink.ino:5:10: warning: unused variable 'x' [-Wunused-variable]
/libraries/Servo/src/Servo.h:12:1: error: expected ';' before 'class'
`;

function diagnostic(message: string): CompilerDiagnostic {
  return { file: 'a.ino', inSketch: true, line: 1, column: 1, severity: 'error', message };
}

describe('parseCompilerOutput', () => {
  it('extracts errors and warnings with their position', () => {
    expect(parseCompilerOutput(OUTPUT, 'Blink.ino')).toEqual([
      {
        file: 'Blink.ino',
        inSketch: true,
        line: 2,
        column: 3,
        severity: 'error',
        message: "'foo' was not declared in this scope",
      },
      {
        file: 'Blink.ino',
        inSketch: true,
        line: 5,
        column: 10,
        severity: 'warning',
        message: "unused variable 'x' [-Wunused-variable]",
      },
      {
        file: 'Servo.h',
        inSketch: false,
        line: 12,
        column: 1,
        severity: 'error',
        message: "expected ';' before 'class'",
      },
    ]);
  });

  it('reports linker errors without a position', () => {
    const result = parseCompilerOutput(
      "core.a(main.cpp.o): In function `main':\nmain.cpp:(.text+0x8): undefined reference to `loop'",
      'Blink.ino',
    );
    expect(result).toEqual([
      expect.objectContaining({ line: 0, message: "undefined reference to 'loop'" }),
    ]);
  });
});

describe('explain', () => {
  it.each([
    ["'contador' was not declared in this scope", 'notDeclared', { name: 'contador' }],
    ['‘ledPin’ was not declared in this scope', 'notDeclared', { name: 'ledPin' }],
    ["expected ';' before '}' token", 'missingSemicolon', {}],
    ["expected '}' at end of input", 'missingClosingBrace', {}],
    ["expected ')' before ';' token", 'missingParenthesis', {}],
    ["'Servo' does not name a type", 'notAType', { name: 'Servo' }],
    ['Servo.h: No such file or directory', 'missingLibrary', { name: 'Servo.h' }],
    ["redefinition of 'void loop()'", 'redefinition', { name: 'void loop()' }],
    ["stray '\\342' in program", 'strayCharacter', {}],
    ['missing terminating " character', 'unterminatedText', {}],
    ["'else' without a previous 'if'", 'elseWithoutIf', {}],
    ["undefined reference to 'setup'", 'missingSetupOrLoop', { name: 'setup' }],
  ])('explains "%s"', (message, key, values) => {
    expect(explain(diagnostic(message))).toEqual({ key, values });
  });

  it('returns null for messages without an explanation', () => {
    expect(explain(diagnostic('internal compiler error'))).toBeNull();
  });
});
