import { CircleCheck, FolderOpen, Play, Save, Settings, Square, Upload } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simulate, upload, verify } from '../build/actions';
import { BoardSelect } from '../components/BoardSelect';
import { useProjectCommands } from '../files/ProjectCommands';
import { ProjectName } from '../files/ProjectName';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { PortSelect } from '../ports/PortSelect';
import { matchShortcut } from '../shortcuts';
import { useBuildStore } from '../state/build';
import { useSimulationStore } from '../state/simulation';
import { useUiStore } from '../state/ui';
import { LanguageSelect } from './LanguageSelect';

export function MainToolbar() {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const commands = useProjectCommands();
  const working = useBuildStore((state) => state.status === 'working');
  const simulationStatus = useSimulationStore((state) => state.status);
  const stopSimulation = useSimulationStore((state) => state.stop);
  const openDialog = useUiStore((state) => state.openDialog);
  const simulating = simulationStatus === 'running' || simulationStatus === 'paused';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      if (shortcut === 'verify') {
        event.preventDefault();
        void verify();
      } else if (shortcut === 'upload') {
        event.preventDefault();
        void upload();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="main-toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <div className="main-toolbar__group">
        <FolderOpen aria-hidden="true" size="1.3em" className="main-toolbar__icon" />
        <ProjectName />
        <button
          type="button"
          className="icon-button icon-button--framed"
          aria-label={t('files.save')}
          title={hint(t('files.save'), 'saveProject')}
          data-testid="file-save"
          onClick={() => void commands.save()}
        >
          <Save aria-hidden="true" size="1.15em" />
        </button>
      </div>
      <span className="main-toolbar__separator" aria-hidden="true" />
      <BoardSelect />
      <PortSelect />
      <span className="main-toolbar__separator" aria-hidden="true" />
      <div className="main-toolbar__group">
        <button
          type="button"
          className="action-button action-button--green"
          data-testid="build-verify"
          disabled={working}
          title={hint(t('build.verifyHint'), 'verify')}
          onClick={() => void verify()}
        >
          <CircleCheck aria-hidden="true" size="1.2em" />
          <span>{t('build.verify')}</span>
        </button>
        <button
          type="button"
          className="action-button"
          data-testid="build-upload"
          disabled={working}
          title={hint(t('build.uploadHint'), 'upload')}
          onClick={() => void upload()}
        >
          <Upload aria-hidden="true" size="1.2em" />
          <span>{t('build.upload')}</span>
        </button>
        {simulating ? (
          <button
            type="button"
            className="action-button action-button--orange"
            data-testid="toolbar-stop-simulation"
            onClick={stopSimulation}
          >
            <Square aria-hidden="true" size="1.2em" />
            <span>{t('simulator.stop')}</span>
          </button>
        ) : (
          <button
            type="button"
            className="action-button action-button--orange"
            data-testid="toolbar-simulate"
            disabled={simulationStatus === 'compiling'}
            title={t('simulator.startHint')}
            onClick={() => void simulate()}
          >
            <Play aria-hidden="true" size="1.2em" />
            <span>{t('simulator.start')}</span>
          </button>
        )}
      </div>
      <div className="main-toolbar__end">
        <LanguageSelect />
        <button
          type="button"
          className="icon-button icon-button--framed"
          aria-label={t('toolbar.settings')}
          title={t('toolbar.settings')}
          aria-haspopup="dialog"
          data-testid="open-settings"
          onClick={() => openDialog('settings')}
        >
          <Settings aria-hidden="true" size="1.2em" />
        </button>
      </div>
    </div>
  );
}
