import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';
export const DEFAULT_NAMESPACE = 'common';

export const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
} as const satisfies Record<SupportedLanguage, Record<string, unknown>>;

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Picks the first supported language from a list of BCP 47 tags ordered by
 * preference, matching on the primary subtag so "es-AR" resolves to "es".
 */
export function matchLanguage(tags: readonly string[]): SupportedLanguage {
  for (const tag of tags) {
    const primary = tag.toLowerCase().split(/[-_]/)[0] ?? '';
    if (isSupportedLanguage(primary)) {
      return primary;
    }
  }
  return FALLBACK_LANGUAGE;
}

export function resolveLanguage(
  preference: string,
  systemLanguages: readonly string[],
): SupportedLanguage {
  if (isSupportedLanguage(preference)) {
    return preference;
  }
  return matchLanguage(systemLanguages);
}
