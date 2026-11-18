import { LoaderCircle, Play, RotateCcw, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSimulationStore } from '../state/simulation';

export function SimulatorControls() {
  const { t } = useTranslation();
  const status = useSimulationStore((state) => state.status);
  const start = useSimulationStore((state) => state.start);
  const stop = useSimulationStore((state) => state.stop);
  const running = status === 'running';

  return (
    <>
      {running && (
        <button
          type="button"
          className="icon-button"
          aria-label={t('simulator.restart')}
          title={t('simulator.restart')}
          data-testid="simulator-restart"
          onClick={() => void start()}
        >
          <RotateCcw aria-hidden="true" size="1.1em" />
        </button>
      )}
      <button
        type="button"
        className={running ? 'toggle-button--small' : 'action-button toggle-button--small'}
        data-testid={running ? 'simulator-stop' : 'simulator-start'}
        disabled={status === 'compiling'}
        onClick={() => (running ? stop() : void start())}
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
    </>
  );
}
