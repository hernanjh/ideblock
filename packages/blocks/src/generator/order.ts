/** C++ operator precedence, from tightest to loosest binding. */
export const Order = {
  ATOMIC: 0,
  POSTFIX: 1,
  PREFIX: 2,
  MULTIPLICATIVE: 3,
  ADDITIVE: 4,
  SHIFT: 5,
  RELATIONAL: 6,
  EQUALITY: 7,
  BITWISE_AND: 8,
  BITWISE_XOR: 9,
  BITWISE_OR: 10,
  LOGICAL_AND: 11,
  LOGICAL_OR: 12,
  CONDITIONAL: 13,
  ASSIGNMENT: 14,
  COMMA: 15,
  NONE: 99,
} as const;

export type OrderValue = (typeof Order)[keyof typeof Order];
