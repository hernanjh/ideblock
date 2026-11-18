import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  LANGUAGE_PREFERENCES,
  THEMES,
  type LanguagePreference,
  type Theme,
} from '@ideblock/shared';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { useSettingsStore } from '../state/settings';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const changeFontScale = useSettingsStore((state) => state.changeFontScale);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const percent = Math.round(settings.fontScale * 100);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="settings-title"
      data-testid="settings-dialog"
      onClose={onClose}
    >
      <header className="dialog__header">
        <h2 id="settings-title">{t('settings.title')}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={t('settings.close')}
          title={t('settings.close')}
          data-testid="settings-close"
          onClick={onClose}
        >
          <X aria-hidden="true" size="1.2em" />
        </button>
      </header>

      <div className="dialog__body">
        <label className="field">
          <span className="field__label">{t('settings.language')}</span>
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

        <label className="field">
          <span className="field__label">{t('settings.theme')}</span>
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

        <div className="field" role="group" aria-labelledby="font-size-label">
          <span id="font-size-label" className="field__label">
            {t('settings.fontSize')}
          </span>
          <div className="field__row">
            <button
              type="button"
              data-testid="font-decrease"
              aria-label={t('settings.decreaseFont')}
              title={hint(t('settings.decreaseFont'), 'fontDecrease')}
              disabled={settings.fontScale <= FONT_SCALE_MIN}
              onClick={() => void changeFontScale(-1)}
            >
              {t('settings.decreaseFontShort')}
            </button>
            <button
              type="button"
              data-testid="font-reset"
              aria-label={t('settings.resetFont')}
              title={hint(t('settings.resetFont'), 'fontReset')}
              onClick={() => void changeFontScale(0)}
            >
              {percent}%
            </button>
            <button
              type="button"
              data-testid="font-increase"
              aria-label={t('settings.increaseFont')}
              title={hint(t('settings.increaseFont'), 'fontIncrease')}
              disabled={settings.fontScale >= FONT_SCALE_MAX}
              onClick={() => void changeFontScale(1)}
            >
              {t('settings.increaseFontShort')}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
