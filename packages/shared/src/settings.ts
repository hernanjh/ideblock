import { z } from 'zod';

export const LANGUAGE_PREFERENCES = ['system', 'en', 'es'] as const;
export const THEMES = ['system', 'light', 'dark', 'high-contrast'] as const;

export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;

export const settingsSchema = z.object({
  language: z.enum(LANGUAGE_PREFERENCES),
  theme: z.enum(THEMES),
  fontScale: z.number().min(FONT_SCALE_MIN).max(FONT_SCALE_MAX),
});

export type Settings = z.infer<typeof settingsSchema>;
export type LanguagePreference = Settings['language'];
export type Theme = Settings['theme'];

export const settingsPatchSchema = settingsSchema.partial();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
  theme: 'system',
  fontScale: 1,
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
