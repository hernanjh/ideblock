import { LANGUAGE_PREFERENCES, type LanguagePreference } from '@ideblock/shared';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../state/settings';

export function LanguageSelect() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.settings.language);
  const update = useSettingsStore((state) => state.update);
  return (
    <label className="field-inline">
      <Languages aria-hidden="true" size="1.2em" />
      <span className="visually-hidden">{t('settings.language')}</span>
      <select
        value={language}
        title={t('settings.language')}
        data-testid="toolbar-language"
        onChange={(event) => void update({ language: event.target.value as LanguagePreference })}
      >
        {LANGUAGE_PREFERENCES.map((option) => (
          <option key={option} value={option}>
            {t(`languageShort.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
