import { resolveLanguage, type SupportedLanguage } from '@ideblock/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { applyAppearance } from '../appearance';
import { useSettingsStore } from '../state/settings';

/** Keeps theme, text size and language in sync with the settings. */
export function useAppearance(): SupportedLanguage {
  const { i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const appInfo = useSettingsStore((state) => state.appInfo);
  const language = resolveLanguage(settings.language, appInfo?.systemLanguages ?? []);

  useEffect(() => {
    applyAppearance(settings, language);
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [settings, language, i18n]);

  return language;
}
