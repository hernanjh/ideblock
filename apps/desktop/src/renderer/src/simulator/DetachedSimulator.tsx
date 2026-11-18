import { EMPTY_CIRCUIT } from '@ideblock/project';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../hooks/useAppearance';
import { SimulatorModelContext, type SimulatorAction, type SimulatorSnapshot } from './model';
import { SimulatorControls } from './SimulatorControls';
import { SimulatorPanel } from './SimulatorPanel';

const INITIAL: SimulatorSnapshot = {
  status: 'stopped',
  components: {},
  inputs: {},
  timeMs: 0,
  speed: 1,
  error: null,
  outdated: false,
  circuit: EMPTY_CIRCUIT,
  boardId: 'uno',
};

const dispatch = (action: SimulatorAction): void =>
  void window.ideblock.invoke('simulator:action', action);

/** The simulator in its own window, mirroring the simulation of the main window. */
export function DetachedSimulator() {
  const { t } = useTranslation();
  useAppearance();
  const [snapshot, setSnapshot] = useState<SimulatorSnapshot>(INITIAL);

  useEffect(
    () =>
      window.ideblock.on('simulator:snapshot', (next) =>
        setSnapshot(next as unknown as SimulatorSnapshot),
      ),
    [],
  );

  useEffect(() => {
    document.title = `${t('panels.simulator')} · ${t('app.name')}`;
  }, [t]);

  const model = useMemo(
    () => ({
      snapshot,
      dispatch,
      detached: true,
      toggleWindow: () => void window.ideblock.invoke('simulator:attach'),
    }),
    [snapshot],
  );

  return (
    <SimulatorModelContext.Provider value={model}>
      <div className="detached-simulator" data-testid="detached-simulator">
        <header className="card__header detached-simulator__header">
          <h1 className="card__title">{t('panels.simulator')}</h1>
          <div className="card__end">
            <SimulatorControls />
          </div>
        </header>
        <div className="detached-simulator__body">
          <SimulatorPanel />
        </div>
      </div>
    </SimulatorModelContext.Provider>
  );
}
