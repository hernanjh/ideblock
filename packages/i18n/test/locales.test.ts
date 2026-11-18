import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from '../src';

const localesDir = join(import.meta.dirname, '..', 'locales');

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function readNamespace(language: string, file: string): unknown {
  return JSON.parse(readFileSync(join(localesDir, language, file), 'utf8'));
}

// Covers i18next interpolation ({{name}}) and Blockly arguments (%1).
function placeholders(text: string): string[] {
  const named = [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1] ?? '');
  const positional = [...text.matchAll(/%(\d+)/g)].map((match) => `%${match[1]}`);
  return [...named, ...positional].sort();
}

const namespaces = readdirSync(join(localesDir, FALLBACK_LANGUAGE));

describe('locale files', () => {
  it('ship a directory for every supported language', () => {
    expect(readdirSync(localesDir).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  for (const language of SUPPORTED_LANGUAGES) {
    for (const namespace of namespaces) {
      it(`${language}/${namespace} has the same keys as ${FALLBACK_LANGUAGE}`, () => {
        const reference = flattenKeys(readNamespace(FALLBACK_LANGUAGE, namespace)).sort();
        const translated = flattenKeys(readNamespace(language, namespace)).sort();
        expect(translated).toEqual(reference);
      });

      it(`${language}/${namespace} has no empty strings and keeps placeholders`, () => {
        const reference = readNamespace(FALLBACK_LANGUAGE, namespace);
        const translated = readNamespace(language, namespace);
        for (const key of flattenKeys(reference)) {
          const lookup = (root: unknown): unknown =>
            key
              .split('.')
              .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root);
          const value = lookup(translated);
          expect(typeof value, key).toBe('string');
          expect((value as string).trim(), key).not.toBe('');
          expect(placeholders(value as string), key).toEqual(
            placeholders(lookup(reference) as string),
          );
        }
      });
    }
  }
});
