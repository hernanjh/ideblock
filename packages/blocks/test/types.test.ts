import { describe, expect, it } from 'vitest';
import { generate, num, program, str } from './helpers';

const set = (id: string, value: unknown) => ({
  type: 'variables_set',
  fields: { VAR: { id } },
  inputs: { VALUE: value },
});
const get = (id: string) => ({ block: { type: 'variables_get', fields: { VAR: { id } } } });

describe('variable type inference', () => {
  it('declares variables with types inferred from their values', () => {
    const { code } = generate(
      program(
        [
          set('count', num(0)),
          set('ratio', num(0.5)),
          set('name', str('Ada')),
          set('pressed', { block: { type: 'button_pressed', fields: { PIN: '2' } } }),
          set('start', { block: { type: 'time_millis' } }),
        ],
        [],
      ),
      {
        variables: [
          { id: 'count', name: 'count' },
          { id: 'ratio', name: 'ratio' },
          { id: 'name', name: 'name' },
          { id: 'pressed', name: 'pressed' },
          { id: 'start', name: 'start' },
        ],
      },
    );
    expect(code).toContain('int count = 0;');
    expect(code).toContain('float ratio = 0.0;');
    expect(code).toContain('String name = "";');
    expect(code).toContain('bool pressed = false;');
    expect(code).toContain('unsigned long start = 0;');
  });

  it('widens a variable assigned both integers and decimals', () => {
    const { code } = generate(
      program(
        [set('x', num(1))],
        [{ type: 'math_change', fields: { VAR: { id: 'x' } }, inputs: { DELTA: num(0.1) } }],
      ),
      { variables: [{ id: 'x', name: 'x' }] },
    );
    expect(code).toContain('float x = 0.0;');
    expect(code).toContain('x += 0.1;');
  });

  it('propagates types through other variables', () => {
    const { code } = generate(program([set('a', str('hi')), set('b', get('a'))], []), {
      variables: [
        { id: 'a', name: 'a' },
        { id: 'b', name: 'b' },
      ],
    });
    expect(code).toContain('String b = "";');
  });

  it('turns accented names into valid identifiers', () => {
    const { code } = generate(program([set('n', num(1))], []), {
      variables: [{ id: 'n', name: 'número de vueltas' }],
    });
    expect(code).toContain('int numero_de_vueltas = 0;');
    expect(code).toContain('numero_de_vueltas = 1;');
  });

  it('renames variables that clash with reserved words', () => {
    const { code } = generate(program([set('d', num(1))], []), {
      variables: [{ id: 'd', name: 'delay' }],
    });
    expect(code).not.toMatch(/int delay =/);
  });
});

describe('functions', () => {
  it('types parameters from calls and return values from definitions', () => {
    const definition = {
      type: 'procedures_defreturn',
      fields: { NAME: 'double it' },
      extraState: { params: [{ name: 'value', id: 'p1' }] },
      inputs: {
        RETURN: {
          block: {
            type: 'math_arithmetic',
            fields: { OP: 'MULTIPLY' },
            inputs: { A: get('p1'), B: num(2) },
          },
        },
      },
    };
    const call = {
      block: {
        type: 'procedures_callreturn',
        extraState: { name: 'double it', params: ['value'] },
        inputs: { ARG0: num(1.5) },
      },
    };
    const { code } = generate(
      program([], [{ type: 'serial_print', fields: { NEWLINE: 'TRUE' }, inputs: { TEXT: call } }]),
      { variables: [{ id: 'p1', name: 'value' }], extraTopBlocks: [definition] },
    );
    expect(code).toContain('float double_it(float value) {\n  return value * 2;\n}');
    expect(code).toContain('Serial.println(double_it(1.5));');
    expect(code).not.toContain('float value = 0.0;');
  });

  it('generates void functions', () => {
    const definition = {
      type: 'procedures_defnoreturn',
      fields: { NAME: 'blink' },
      inputs: {
        STACK: { block: { type: 'led_set', fields: { PIN: '13', STATE: 'HIGH' } } },
      },
    };
    const { code } = generate(
      program([], [{ type: 'procedures_callnoreturn', extraState: { name: 'blink' } }]),
      { extraTopBlocks: [definition] },
    );
    expect(code).toContain('void blink() {\n  digitalWrite(13, HIGH);\n}');
    expect(code).toContain('  blink();\n');
  });
});
