import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_NAMESPACE,
  FALLBACK_LANGUAGE,
  resources,
  type SupportedLanguage,
} from '@ideblock/i18n';

export async function initI18n(language: SupportedLanguage): Promise<typeof i18next> {
  await i18next.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [DEFAULT_NAMESPACE],
    interpolation: {
      // React already escapes rendered values.
      escapeValue: false,
    },
    returnNull: false,
  });
  return i18next;
}
