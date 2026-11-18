import { getBoard } from '@ideblock/boards';
import { useTranslation } from 'react-i18next';
import { SaveStatus } from '../files/SaveStatus';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { useSimulationStore } from '../state/simulation';

export function StatusBar() {
  const { t } = useTranslation();
  const appInfo = useSettingsStore((state) => state.appInfo);
  const boardId = useProjectStore((state) => state.boardId);
  const status = useSimulationStore((state) => state.status);
  const simulating = status === 'running' || status === 'paused';

  return (
    <footer className="status-bar">
      <span>
        <span className={`status-dot status-dot--${status}`} aria-hidden="true" />{' '}
        {simulating ? t('status.simulating') : t('status.ready')}
      </span>
      <span>{t('status.board', { board: getBoard(boardId).name })}</span>
      <SaveStatus />
      {appInfo && (
        <span className="status-bar__end" data-testid="app-version">
          {t('status.version', { version: appInfo.version })}
        </span>
      )}
    </footer>
  );
}
