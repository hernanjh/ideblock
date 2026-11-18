import { resolveLanguage } from '@ideblock/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { applyAppearance } from './appearance';
import { BlockEditor } from './blocks/BlockEditor';
import { BlockLevelToggle } from './blocks/BlockLevelToggle';
import { GeneratedCode } from './blocks/GeneratedCode';
import { Toolbar } from './components/Toolbar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { PanelPlaceholder } from './layout/Panel';
import { Workspace } from './layout/Workspace';
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

  useKeyboardShortcuts();

  return (
    <div className="app">
      <Toolbar />
      <Workspace
        blocks={<BlockEditor language={language} />}
        blocksActions={<BlockLevelToggle />}
        code={<GeneratedCode />}
        simulator={<PanelPlaceholder />}
        console={<PanelPlaceholder />}
      />
      <footer className="status-bar">
        <span>{t('app.tagline')}</span>
        {appInfo && (
          <span data-testid="app-version">{t('status.version', { version: appInfo.version })}</span>
        )}
      </footer>
    </div>
  );
}
