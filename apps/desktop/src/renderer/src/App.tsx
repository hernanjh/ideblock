import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockEditor } from './blocks/BlockEditor';
import { BlockLevelToggle } from './blocks/BlockLevelToggle';
import { CodeModeOverlay } from './blocks/CodeModeOverlay';
import { CodeEditor } from './code/CodeEditor';
import { ConsolePanel } from './console/ConsolePanel';
import { SerialMonitor } from './serial/SerialMonitor';
import { LocalSimulator } from './simulator/LocalSimulator';
import { SimulatorControls } from './simulator/SimulatorControls';
import { SimulatorPanel } from './simulator/SimulatorPanel';
import { Toolbar } from './components/Toolbar';
import { SaveStatus } from './files/SaveStatus';
import { useAppearance } from './hooks/useAppearance';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Workspace } from './layout/Workspace';
import { useProjectStore } from './state/project';
import { useSettingsStore } from './state/settings';

export function App() {
  const { t } = useTranslation();
  const appInfo = useSettingsStore((state) => state.appInfo);
  const loadId = useProjectStore((state) => state.loadId);

  const language = useAppearance();

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  useKeyboardShortcuts();
  useAutosave();

  return (
    <div className="app">
      <Toolbar />
      <LocalSimulator>
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
      </LocalSimulator>
      <footer className="status-bar">
        <SaveStatus />
        {appInfo && (
          <span data-testid="app-version">{t('status.version', { version: appInfo.version })}</span>
        )}
      </footer>
    </div>
  );
}
