import { resolveLanguage } from '@ideblock/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { applyAppearance } from './appearance';
import { Panel } from './components/Panel';
import { Toolbar } from './components/Toolbar';
import { useFontScaleShortcuts } from './hooks/useFontScaleShortcuts';
import { useSettingsStore } from './state/settings';

export function App() {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const appInfo = useSettingsStore((state) => state.appInfo);

  const language = resolveLanguage(settings.language, appInfo?.systemLanguages ?? []);

  useEffect(() => {
    applyAppearance(settings, language);
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [settings, language, i18n]);

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  useFontScaleShortcuts();

  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <Panel id="blocks" title={t('panels.blocks')} />
        <Panel id="code" title={t('panels.code')} />
        <Panel id="simulator" title={t('panels.simulator')} />
      </main>
      <footer className="status-bar">
        <span>{t('app.tagline')}</span>
        {appInfo && (
          <span data-testid="app-version">{t('status.version', { version: appInfo.version })}</span>
        )}
      </footer>
    </div>
  );
}
