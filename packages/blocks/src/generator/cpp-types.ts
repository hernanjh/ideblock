export type CppType = 'bool' | 'int' | 'long' | 'unsigned long' | 'float' | 'String';

const NUMERIC_RANK: Record<Exclude<CppType, 'String'>, number> = {
  bool: 0,
  int: 1,
  long: 2,
  'unsigned long': 3,
  float: 4,
};

/** Picks a type able to hold values of both inputs. */
export function widenType(a: CppType, b: CppType): CppType {
  if (a === b) return a;
  if (a === 'String' || b === 'String') return 'String';
  const result = NUMERIC_RANK[a] >= NUMERIC_RANK[b] ? a : b;
  // Mixing booleans with numbers means the variable is really a number.
  return result === 'bool' ? 'int' : result;
}

export function defaultValue(type: CppType): string {
  switch (type) {
    case 'bool':
      return 'false';
    case 'float':
      return '0.0';
    case 'String':
      return '""';
    default:
      return '0';
  }
}

export function isNumeric(type: CppType): boolean {
  return type !== 'String' && type !== 'bool';
}
