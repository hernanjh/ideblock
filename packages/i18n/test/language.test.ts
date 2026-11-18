import { describe, expect, it } from 'vitest';
import { matchLanguage, resolveLanguage } from '../src';

describe('matchLanguage', () => {
  it('matches regional variants by primary subtag', () => {
    expect(matchLanguage(['es-AR'])).toBe('es');
    expect(matchLanguage(['en_GB'])).toBe('en');
  });

  it('returns the first supported language in preference order', () => {
    expect(matchLanguage(['fr-FR', 'es-MX', 'en-US'])).toBe('es');
  });

  it('falls back to English when nothing matches', () => {
    expect(matchLanguage(['ja-JP'])).toBe('en');
    expect(matchLanguage([])).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('honours an explicit preference over the system languages', () => {
    expect(resolveLanguage('en', ['es-AR'])).toBe('en');
  });

  it('uses the system languages when the preference is "system"', () => {
    expect(resolveLanguage('system', ['es-AR'])).toBe('es');
  });
});
