import { useEffect } from 'react';
import { PANEL_VISIBILITY, type PanelId } from '../panels';
import { matchShortcut } from '../shortcuts';
import { useSettingsStore } from '../state/settings';

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      if (!shortcut) return;
      const { settings, update, changeFontScale } = useSettingsStore.getState();
      const panel = (Object.keys(PANEL_VISIBILITY) as PanelId[]).find(
        (id) => PANEL_VISIBILITY[id].shortcut === shortcut,
      );
      if (panel) {
        event.preventDefault();
        const setting = PANEL_VISIBILITY[panel].setting;
        void update({ [setting]: !settings[setting] });
        return;
      }
      const fontDirection = { fontIncrease: 1, fontDecrease: -1, fontReset: 0 } as const;
      if (shortcut in fontDirection) {
        event.preventDefault();
        void changeFontScale(fontDirection[shortcut as keyof typeof fontDirection]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
