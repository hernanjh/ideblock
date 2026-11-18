import { useEffect } from 'react';
import { PANEL_VISIBILITY, type PanelId } from '../panels';
import { matchShortcut } from '../shortcuts';
import { useSettingsStore } from '../state/settings';

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      if (!shortcut) return;
      event.preventDefault();
      const { settings, update, changeFontScale } = useSettingsStore.getState();
      const panel = (Object.keys(PANEL_VISIBILITY) as PanelId[]).find(
        (id) => PANEL_VISIBILITY[id].shortcut === shortcut,
      );
      if (panel) {
        const setting = PANEL_VISIBILITY[panel].setting;
        void update({ [setting]: !settings[setting] });
        return;
      }
      if (shortcut === 'fontIncrease') void changeFontScale(1);
      if (shortcut === 'fontDecrease') void changeFontScale(-1);
      if (shortcut === 'fontReset') void changeFontScale(0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
