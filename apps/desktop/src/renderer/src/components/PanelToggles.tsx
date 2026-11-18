import { Blocks, Code, Cpu, Terminal, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { PANEL_VISIBILITY, type PanelId } from '../panels';
import { useSettingsStore } from '../state/settings';

const ICONS: Record<PanelId, LucideIcon> = {
  blocks: Blocks,
  code: Code,
  simulator: Cpu,
  console: Terminal,
};

/** One on/off button per panel, so any combination of panels can be shown. */
export function PanelToggles() {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);

  return (
    <div className="toolbar__group" role="group" aria-label={t('toolbar.panels')}>
      {(Object.keys(PANEL_VISIBILITY) as PanelId[]).map((panel) => {
        const { setting, shortcut } = PANEL_VISIBILITY[panel];
        const visible = settings[setting];
        const label = t(`panels.${panel}`);
        const Icon = ICONS[panel];
        return (
          <button
            key={panel}
            type="button"
            className="toggle-button"
            aria-pressed={visible}
            title={hint(t(visible ? 'panels.hide' : 'panels.show', { panel: label }), shortcut)}
            data-testid={`toggle-${panel}`}
            onClick={() => void update({ [setting]: !visible })}
          >
            <Icon aria-hidden="true" size="1.2em" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
