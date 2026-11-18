import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, clampFontScale, sanitizeSettings } from '../src';

describe('sanitizeSettings', () => {
  it('returns defaults for non-object input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and drops invalid ones individually', () => {
    expect(sanitizeSettings({ language: 'es', theme: 'neon', fontScale: 1.2 })).toEqual({
      ...DEFAULT_SETTINGS,
      language: 'es',
      fontScale: 1.2,
    });
  });

  it('ignores unknown fields', () => {
    expect(sanitizeSettings({ telemetry: true })).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects out of range font scales', () => {
    expect(sanitizeSettings({ fontScale: 5 }).fontScale).toBe(DEFAULT_SETTINGS.fontScale);
  });
});

describe('clampFontScale', () => {
  it('rounds to one decimal and clamps to the allowed range', () => {
    expect(clampFontScale(1.1500001)).toBe(1.2);
    expect(clampFontScale(0.1)).toBe(0.8);
    expect(clampFontScale(9)).toBe(1.6);
  });
});

describe('layout settings', () => {
  it('accepts every editor view', () => {
    for (const editorView of ['blocks', 'split', 'code']) {
      expect(sanitizeSettings({ editorView }).editorView).toBe(editorView);
    }
  });

  it('rejects panel sizes outside their limits', () => {
    const settings = sanitizeSettings({ editorSplit: 0.95, simulatorSize: 0.1, consoleSize: 0.3 });
    expect(settings.editorSplit).toBe(DEFAULT_SETTINGS.editorSplit);
    expect(settings.simulatorSize).toBe(DEFAULT_SETTINGS.simulatorSize);
    expect(settings.consoleSize).toBe(0.3);
  });
});
