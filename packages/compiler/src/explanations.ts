import type { CompilerDiagnostic } from './diagnostics';

/**
 * A plain-language explanation for a common compiler message. `key` is a
 * translation key under "compilerHelp" and `values` fills its placeholders.
 */
export interface Explanation {
  key: string;
  values: Record<string, string>;
}

interface Rule {
  key: string;
  pattern: RegExp;
  /** Names the capture groups passed to the translation. */
  captures?: string[];
}

const QUOTE = `['‘’"]`;

const RULES: Rule[] = [
  {
    key: 'notDeclared',
    pattern: new RegExp(`${QUOTE}(.+?)${QUOTE} was not declared in this scope`),
    captures: ['name'],
  },
  {
    key: 'missingSemicolon',
    pattern: new RegExp(`expected ${QUOTE};${QUOTE} before`),
  },
  {
    key: 'missingClosingBrace',
    pattern: new RegExp(`expected ${QUOTE}}${QUOTE} at end of input`),
  },
  {
    key: 'missingParenthesis',
    pattern: new RegExp(`expected ${QUOTE}\\)${QUOTE}`),
  },
  {
    key: 'notAType',
    pattern: new RegExp(`${QUOTE}(.+?)${QUOTE} does not name a type`),
    captures: ['name'],
  },
  {
    key: 'missingLibrary',
    pattern: /([\w./-]+\.h): No such file or directory/,
    captures: ['name'],
  },
  {
    key: 'redefinition',
    pattern: new RegExp(`redefinition of ${QUOTE}(.+?)${QUOTE}`),
    captures: ['name'],
  },
  {
    key: 'wrongArguments',
    pattern: /too (few|many) arguments to function/,
  },
  {
    key: 'strayCharacter',
    pattern: /stray .+ in program/,
  },
  {
    key: 'unterminatedText',
    pattern: /missing terminating .+ character/,
  },
  {
    key: 'assignInsteadOfCompare',
    pattern: /lvalue required as left operand of assignment/,
  },
  {
    key: 'elseWithoutIf',
    pattern: new RegExp(`${QUOTE}else${QUOTE} without a previous ${QUOTE}if${QUOTE}`),
  },
  {
    key: 'typeMismatch',
    pattern: /(invalid conversion from|cannot convert)/,
  },
  {
    key: 'incompleteExpression',
    pattern: /expected primary-expression before/,
  },
  {
    key: 'unexpectedText',
    pattern: /expected unqualified-id before/,
  },
  {
    key: 'missingSetupOrLoop',
    pattern: /undefined reference to '(setup|loop)'/,
    captures: ['name'],
  },
  {
    key: 'programTooBig',
    pattern: /(Sketch too big|text section exceeds available space)/i,
  },
];

export function explain(diagnostic: CompilerDiagnostic): Explanation | null {
  for (const rule of RULES) {
    const match = rule.pattern.exec(diagnostic.message);
    if (!match) continue;
    const values: Record<string, string> = {};
    rule.captures?.forEach((name, index) => {
      values[name] = match[index + 1] ?? '';
    });
    return { key: rule.key, values };
  }
  return null;
}

export const EXPLANATION_KEYS: readonly string[] = RULES.map((rule) => rule.key);
