import { resolveLanguage } from '@ideblock/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { applyAppearance } from './appearance';
import { BlockEditor } from './blocks/BlockEditor';
import { BlockLevelToggle } from './blocks/BlockLevelToggle';
import { CodeModeOverlay } from './blocks/CodeModeOverlay';
import { CodeEditor } from './code/CodeEditor';
import { ConsolePanel } from './console/ConsolePanel';
import { SerialMonitor } from './serial/SerialMonitor';
import { SimulatorControls } from './simulator/SimulatorControls';
import { SimulatorPanel } from './simulator/SimulatorPanel';
import { Toolbar } from './components/Toolbar';
import { SaveStatus } from './files/SaveStatus';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Workspace } from './layout/Workspace';
import { useProjectStore } from './state/project';
import { useSettingsStore } from './state/settings';

export function App() {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const appInfo = useSettingsStore((state) => state.appInfo);
  const loadId = useProjectStore((state) => state.loadId);

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
  useAutosave();

  return (
    <div className="app">
      <Toolbar />
      <Workspace
        blocks={
          <>
            <BlockEditor key={loadId} language={language} />
            <CodeModeOverlay />
          </>
        }
        blocksActions={<BlockLevelToggle />}
        code={<CodeEditor />}
        simulator={<SimulatorPanel />}
        simulatorActions={<SimulatorControls />}
        console={<ConsolePanel serial={<SerialMonitor />} />}
      />
      <footer className="status-bar">
        <SaveStatus />
        {appInfo && (
          <span data-testid="app-version">{t('status.version', { version: appInfo.version })}</span>
        )}
      </footer>
    </div>
  );
}
