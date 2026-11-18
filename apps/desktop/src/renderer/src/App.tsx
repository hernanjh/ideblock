import { AssemblyGuide } from './circuit/AssemblyGuide';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockEditor } from './blocks/BlockEditor';
import { BlockLevelToggle } from './blocks/BlockLevelToggle';
import { CodeModeOverlay } from './blocks/CodeModeOverlay';
import { CircuitView } from './circuit/CircuitView';
import { CodeEditor } from './code/CodeEditor';
import { SettingsDialog } from './components/SettingsDialog';
import { ConsolePanel } from './console/ConsolePanel';
import { ProjectCommandsProvider } from './files/ProjectCommands';
import { useAppearance } from './hooks/useAppearance';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ProgramView } from './layout/ProgramView';
import { SerialMonitor } from './serial/SerialMonitor';
import { AboutDialog } from './shell/AboutDialog';
import { AppHeader } from './shell/AppHeader';
import { MainToolbar } from './shell/MainToolbar';
import { SideRail } from './shell/SideRail';
import { StatusBar } from './shell/StatusBar';
import { LocalSimulator } from './simulator/LocalSimulator';
import { SimulatorPanel } from './simulator/SimulatorPanel';
import { useProjectStore } from './state/project';
import { useUiStore } from './state/ui';

export function App() {
  const { t } = useTranslation();
  const loadId = useProjectStore((state) => state.loadId);
  const view = useUiStore((state) => state.view);
  const dialog = useUiStore((state) => state.dialog);
  const openDialog = useUiStore((state) => state.openDialog);
  const language = useAppearance();

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  useKeyboardShortcuts();
  useAutosave();

  const consolePanel = <ConsolePanel serial={<SerialMonitor />} />;

  return (
    <ProjectCommandsProvider>
      <LocalSimulator>
        <div className="app">
          <AppHeader />
          <MainToolbar />
          <div className="app__main">
            <SideRail />
            {view === 'program' ? (
              <ProgramView
                blocks={
                  <>
                    <BlockEditor key={loadId} language={language} />
                    <CodeModeOverlay />
                  </>
                }
                blocksActions={<BlockLevelToggle />}
                code={<CodeEditor />}
                simulator={<SimulatorPanel />}
                console={consolePanel}
              />
            ) : (
              <CircuitView console={consolePanel} />
            )}
          </div>
          <StatusBar />
          <SettingsDialog open={dialog === 'settings'} onClose={() => openDialog(null)} />
          <AboutDialog open={dialog === 'about'} onClose={() => openDialog(null)} />
          <AssemblyGuide open={dialog === 'assembly'} onClose={() => openDialog(null)} />
        </div>
      </LocalSimulator>
    </ProjectCommandsProvider>
  );
}
