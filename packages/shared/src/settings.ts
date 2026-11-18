import { z } from 'zod';

export const LANGUAGE_PREFERENCES = ['system', 'en', 'es'] as const;
export const THEMES = ['system', 'light', 'dark', 'high-contrast'] as const;

export const BLOCK_LEVELS = ['beginner', 'advanced'] as const;

export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;

/** Panel sizes are stored as fractions of the space they share. */
export const PANEL_LIMITS = {
  editorSplit: { min: 0.2, max: 0.8 },
  simulatorSize: { min: 0.2, max: 0.6 },
  consoleSize: { min: 0.15, max: 0.6 },
} as const;

const fraction = (limits: { min: number; max: number }) =>
  z.number().min(limits.min).max(limits.max);

export const settingsSchema = z.object({
  language: z.enum(LANGUAGE_PREFERENCES),
  theme: z.enum(THEMES),
  fontScale: z.number().min(FONT_SCALE_MIN).max(FONT_SCALE_MAX),
  blocksVisible: z.boolean(),
  codeVisible: z.boolean(),
  blockLevel: z.enum(BLOCK_LEVELS),
  simulatorVisible: z.boolean(),
  consoleVisible: z.boolean(),
  consoleGraphVisible: z.boolean(),
  editorSplit: fraction(PANEL_LIMITS.editorSplit),
  simulatorSize: fraction(PANEL_LIMITS.simulatorSize),
  consoleSize: fraction(PANEL_LIMITS.consoleSize),
});

export type Settings = z.infer<typeof settingsSchema>;
export type LanguagePreference = Settings['language'];
export type Theme = Settings['theme'];
export type BlockLevel = Settings['blockLevel'];

export const settingsPatchSchema = settingsSchema.partial();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
  theme: 'system',
  fontScale: 1,
  blocksVisible: true,
  codeVisible: true,
  blockLevel: 'beginner',
  simulatorVisible: true,
  consoleVisible: true,
  consoleGraphVisible: true,
  editorSplit: 0.62,
  simulatorSize: 0.32,
  consoleSize: 0.3,
};

/**
 * Merges stored data over the defaults, dropping any field that fails validation
 * so a single bad value never resets the whole file.
 */
export function sanitizeSettings(input: unknown): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS };
  if (typeof input !== 'object' || input === null) {
    return result;
  }
  const shape = settingsSchema.shape;
  const record = input as Record<string, unknown>;
  for (const key of Object.keys(shape) as (keyof Settings)[]) {
    const parsed = shape[key].safeParse(record[key]);
    if (parsed.success) {
      (result as Record<keyof Settings, unknown>)[key] = parsed.data;
    }
  }
  return result;
}

export function clampFontScale(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rounded));
}
