import { AppWindow, PanelRightClose } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSimulatorModel } from './model';

/** Moves the simulator between its own window and the main window. */
export function SimulatorControls() {
  const { t } = useTranslation();
  const { detached, toggleWindow } = useSimulatorModel();
  const label = detached ? t('simulator.attach') : t('simulator.detach');

  return (
    <button
      type="button"
      className="icon-button icon-button--framed"
      aria-label={label}
      title={label}
      data-testid={detached ? 'simulator-attach' : 'simulator-detach'}
      onClick={toggleWindow}
    >
      {detached ? (
        <PanelRightClose aria-hidden="true" size="1.1em" />
      ) : (
        <AppWindow aria-hidden="true" size="1.1em" />
      )}
    </button>
  );
}
