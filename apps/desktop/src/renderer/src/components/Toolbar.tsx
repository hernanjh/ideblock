import { Cpu, Settings, Terminal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { useSettingsStore } from '../state/settings';
import { SettingsDialog } from './SettingsDialog';
import { ViewSwitcher } from './ViewSwitcher';

export function Toolbar() {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const simulatorLabel = t('panels.simulator');
  const consoleLabel = t('panels.console');

  return (
    <header className="toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <h1 className="toolbar__brand">{t('app.name')}</h1>

      <div className="toolbar__group">
        <ViewSwitcher />
      </div>

      <div className="toolbar__group" role="group" aria-label={t('toolbar.panels')}>
        <button
          type="button"
          className="toggle-button"
          aria-pressed={settings.simulatorVisible}
          title={hint(
            t(settings.simulatorVisible ? 'panels.hide' : 'panels.show', { panel: simulatorLabel }),
            'toggleSimulator',
          )}
          data-testid="toggle-simulator"
          onClick={() => void update({ simulatorVisible: !settings.simulatorVisible })}
        >
          <Cpu aria-hidden="true" size="1.2em" />
          <span>{simulatorLabel}</span>
        </button>
        <button
          type="button"
          className="toggle-button"
          aria-pressed={settings.consoleVisible}
          title={hint(
            t(settings.consoleVisible ? 'panels.hide' : 'panels.show', { panel: consoleLabel }),
            'toggleConsole',
          )}
          data-testid="toggle-console"
          onClick={() => void update({ consoleVisible: !settings.consoleVisible })}
        >
          <Terminal aria-hidden="true" size="1.2em" />
          <span>{consoleLabel}</span>
        </button>
      </div>

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
