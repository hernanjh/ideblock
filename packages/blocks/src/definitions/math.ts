import { COLOURS } from '../colours';
import { isNumeric, widenType } from '../generator/cpp-types';
import { Order, type OrderValue } from '../generator/order';
import type { BlockModule } from '../types';

const ARITHMETIC: Record<string, [string, OrderValue]> = {
  ADD: ['+', Order.ADDITIVE],
  MINUS: ['-', Order.ADDITIVE],
  MULTIPLY: ['*', Order.MULTIPLICATIVE],
  DIVIDE: ['/', Order.MULTIPLICATIVE],
};

const SINGLE: Record<string, (value: string) => string> = {
  ROOT: (value) => `sqrt(${value})`,
  ABS: (value) => `abs(${value})`,
  NEG: (value) => `-${value}`,
  LN: (value) => `log(${value})`,
  LOG10: (value) => `log10(${value})`,
  EXP: (value) => `exp(${value})`,
  POW10: (value) => `pow(10, ${value})`,
};

const ROUND: Record<string, string> = {
  ROUND: 'round',
  ROUNDUP: 'ceil',
  ROUNDDOWN: 'floor',
};

export const mathModule: BlockModule = {
  id: 'math',
  blocks: [
    {
      type: 'math_map',
      message0: '%{BKY_IDEBLOCK_MATH_MAP}',
      args0: [
        { type: 'input_value', name: 'VALUE', check: 'Number' },
        { type: 'input_value', name: 'FROM_LOW', check: 'Number' },
        { type: 'input_value', name: 'FROM_HIGH', check: 'Number' },
        { type: 'input_value', name: 'TO_LOW', check: 'Number' },
        { type: 'input_value', name: 'TO_HIGH', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      colour: COLOURS.math,
      tooltip: '%{BKY_IDEBLOCK_MATH_MAP_TOOLTIP}',
    },
  ],
  generators: {
    math_number: (block) => {
      const value = Number(block.getFieldValue('NUM'));
      return [String(value), value < 0 ? Order.PREFIX : Order.ATOMIC];
    },
    math_arithmetic: (block, generator) => {
      const op = block.getFieldValue('OP') as string;
      if (op === 'POWER') {
        const base = generator.valueOrDefault(block, 'A', Order.COMMA, '0');
        const exponent = generator.valueOrDefault(block, 'B', Order.COMMA, '0');
        return [`pow(${base}, ${exponent})`, Order.POSTFIX];
      }
      const [operator, order] = ARITHMETIC[op] ?? ARITHMETIC['ADD']!;
      const a = generator.valueOrDefault(block, 'A', order, '0');
      // The right operand binds one level tighter so "a - (b - c)" keeps its parentheses.
      const b = generator.valueOrDefault(block, 'B', (order - 1) as OrderValue, '0');
      return [`${a} ${operator} ${b}`, order];
    },
    math_single: (block, generator) => {
      const op = block.getFieldValue('OP') as string;
      const order = op === 'NEG' ? Order.PREFIX : Order.NONE;
      const value = generator.valueOrDefault(block, 'NUM', order, '0');
      const format = SINGLE[op] ?? SINGLE['ABS']!;
      return [format(value), op === 'NEG' ? Order.PREFIX : Order.POSTFIX];
    },
    math_round: (block, generator) => {
      const fn = ROUND[block.getFieldValue('OP') as string] ?? 'round';
      return [`${fn}(${generator.valueOrDefault(block, 'NUM', Order.NONE, '0')})`, Order.POSTFIX];
    },
    math_modulo: (block, generator) => {
      const dividend = block.getInputTargetBlock('DIVIDEND');
      const divisor = block.getInputTargetBlock('DIVISOR');
      const floating =
        generator.types.typeOf(dividend) === 'float' || generator.types.typeOf(divisor) === 'float';
      if (floating) {
        const a = generator.valueOrDefault(block, 'DIVIDEND', Order.COMMA, '0');
        const b = generator.valueOrDefault(block, 'DIVISOR', Order.COMMA, '1');
        return [`fmod(${a}, ${b})`, Order.POSTFIX];
      }
      const a = generator.valueOrDefault(block, 'DIVIDEND', Order.MULTIPLICATIVE, '0');
      const b = generator.valueOrDefault(block, 'DIVISOR', Order.PREFIX, '1');
      return [`${a} % ${b}`, Order.MULTIPLICATIVE];
    },
    math_constrain: (block, generator) => {
      const value = generator.valueOrDefault(block, 'VALUE', Order.COMMA, '0');
      const low = generator.valueOrDefault(block, 'LOW', Order.COMMA, '0');
      const high = generator.valueOrDefault(block, 'HIGH', Order.COMMA, '0');
      return [`constrain(${value}, ${low}, ${high})`, Order.POSTFIX];
    },
    math_random_int: (block, generator) => {
      const from = generator.valueOrDefault(block, 'FROM', Order.COMMA, '0');
      const to = generator.valueOrDefault(block, 'TO', Order.ADDITIVE, '0');
      // random(min, max) excludes max, while the block includes it.
      generator.addSetup('randomSeed', 'randomSeed(analogRead(0));');
      const upper = /^-?\d+$/.test(to) ? String(Number(to) + 1) : `${to} + 1`;
      return [`random(${from}, ${upper})`, Order.POSTFIX];
    },
    math_map: (block, generator) => {
      const args = ['VALUE', 'FROM_LOW', 'FROM_HIGH', 'TO_LOW', 'TO_HIGH'].map((name) =>
        generator.valueOrDefault(block, name, Order.COMMA, '0'),
      );
      return [`map(${args.join(', ')})`, Order.POSTFIX];
    },
  },
  valueTypes: {
    math_number: (block) => {
      const value = Number(block.getFieldValue('NUM'));
      if (!Number.isInteger(value)) return 'float';
      // An int has 16 bits on AVR boards, so larger numbers need a long.
      return Math.abs(value) > 32767 ? 'long' : 'int';
    },
    math_arithmetic: (block, types) => {
      const op = block.getFieldValue('OP') as string;
      if (op === 'POWER') return 'float';
      const a = types.typeOf(block.getInputTargetBlock('A'));
      const b = types.typeOf(block.getInputTargetBlock('B'));
      const combined = widenType(a, b);
      return isNumeric(combined) ? combined : 'int';
    },
    math_single: 'float',
    math_round: 'int',
    math_modulo: (block, types) =>
      types.typeOf(block.getInputTargetBlock('DIVIDEND')) === 'float' ? 'float' : 'int',
    math_constrain: (block, types) => types.typeOf(block.getInputTargetBlock('VALUE')),
    math_random_int: 'long',
    math_map: 'long',
  },
};
