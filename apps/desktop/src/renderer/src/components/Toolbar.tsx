import { Settings } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BuildActions } from '../build/BuildActions';
import { FileActions } from '../files/FileActions';
import { ProjectName } from '../files/ProjectName';
import { BoardSelect } from './BoardSelect';
import { PanelToggles } from './PanelToggles';
import { SettingsDialog } from './SettingsDialog';

export function Toolbar() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <h1 className="toolbar__brand">{t('app.name')}</h1>
      <ProjectName />

      <FileActions />

      <div className="toolbar__group">
        <BoardSelect />
      </div>

      <BuildActions />

      <PanelToggles />

      <div className="toolbar__spacer" />

      <button
        type="button"
        className="icon-button"
        aria-label={t('toolbar.settings')}
        title={t('toolbar.settings')}
        aria-haspopup="dialog"
        data-testid="open-settings"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings aria-hidden="true" size="1.3em" />
      </button>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
