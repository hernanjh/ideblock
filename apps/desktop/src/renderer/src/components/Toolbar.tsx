import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  LANGUAGE_PREFERENCES,
  THEMES,
  type LanguagePreference,
  type Theme,
} from '@ideblock/shared';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../state/settings';

export function Toolbar() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const changeFontScale = useSettingsStore((state) => state.changeFontScale);

  const percent = Math.round(settings.fontScale * 100);

  return (
    <header className="toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <h1 className="toolbar__brand">{t('app.name')}</h1>

      <div className="toolbar__group">
        <label className="toolbar__field">
          <span>{t('toolbar.language')}</span>
          <select
            data-testid="language-select"
            value={settings.language}
            onChange={(event) =>
              void update({ language: event.target.value as LanguagePreference })
            }
          >
            {LANGUAGE_PREFERENCES.map((option) => (
              <option key={option} value={option}>
                {t(`language.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar__field">
          <span>{t('toolbar.theme')}</span>
          <select
            data-testid="theme-select"
            value={settings.theme}
            onChange={(event) => void update({ theme: event.target.value as Theme })}
          >
            {THEMES.map((option) => (
              <option key={option} value={option}>
                {t(`theme.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="toolbar__field" role="group" aria-label={t('toolbar.fontSize')}>
          <span aria-hidden="true">{t('toolbar.fontSize')}</span>
          <button
            type="button"
            data-testid="font-decrease"
            aria-label={t('toolbar.decreaseFont')}
            title={t('toolbar.decreaseFont')}
            disabled={settings.fontScale <= FONT_SCALE_MIN}
            onClick={() => void changeFontScale(-1)}
          >
            {t('toolbar.decreaseFontShort')}
          </button>
          <button
            type="button"
            data-testid="font-reset"
            aria-label={t('toolbar.resetFont')}
            title={t('toolbar.resetFont')}
            onClick={() => void changeFontScale(0)}
          >
            {percent}%
          </button>
          <button
            type="button"
            data-testid="font-increase"
            aria-label={t('toolbar.increaseFont')}
            title={t('toolbar.increaseFont')}
            disabled={settings.fontScale >= FONT_SCALE_MAX}
            onClick={() => void changeFontScale(1)}
          >
            {t('toolbar.increaseFontShort')}
          </button>
        </div>
      </div>
    </header>
  );
}
