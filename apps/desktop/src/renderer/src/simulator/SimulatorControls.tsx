import { AppWindow, LoaderCircle, PanelRightClose, Play, RotateCcw, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSimulatorModel } from './model';

export function SimulatorControls() {
  const { t } = useTranslation();
  const { snapshot, dispatch, detached, toggleWindow } = useSimulatorModel();
  const { status } = snapshot;
  const running = status === 'running';
  const windowLabel = detached ? t('simulator.attach') : t('simulator.detach');

  return (
    <>
      {running && (
        <button
          type="button"
          className="icon-button"
          aria-label={t('simulator.restart')}
          title={t('simulator.restart')}
          data-testid="simulator-restart"
          onClick={() => dispatch({ type: 'start' })}
        >
          <RotateCcw aria-hidden="true" size="1.1em" />
        </button>
      )}
      <button
        type="button"
        className={running ? 'toggle-button--small' : 'action-button toggle-button--small'}
        data-testid={running ? 'simulator-stop' : 'simulator-start'}
        disabled={status === 'compiling'}
        onClick={() => dispatch({ type: running ? 'stop' : 'start' })}
      >
        {status === 'compiling' ? (
          <LoaderCircle aria-hidden="true" size="1.1em" className="spin" />
        ) : running ? (
          <Square aria-hidden="true" size="1.1em" />
        ) : (
          <Play aria-hidden="true" size="1.1em" />
        )}
        <span>
          {status === 'compiling'
            ? t('simulator.preparing')
            : running
              ? t('simulator.stop')
              : t('simulator.start')}
        </span>
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={windowLabel}
        title={windowLabel}
        data-testid={detached ? 'simulator-attach' : 'simulator-detach'}
        onClick={toggleWindow}
      >
        {detached ? (
          <PanelRightClose aria-hidden="true" size="1.1em" />
        ) : (
          <AppWindow aria-hidden="true" size="1.1em" />
        )}
      </button>
    </>
  );
}
