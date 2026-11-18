import { useEffect } from 'react';
import { matchShortcut } from '../shortcuts';
import { useSettingsStore } from '../state/settings';

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      if (!shortcut) return;
      event.preventDefault();
      const { settings, update, changeFontScale } = useSettingsStore.getState();
      switch (shortcut) {
        case 'viewBlocks':
          void update({ editorView: 'blocks' });
          break;
        case 'viewSplit':
          void update({ editorView: 'split' });
          break;
        case 'viewCode':
          void update({ editorView: 'code' });
          break;
        case 'toggleSimulator':
          void update({ simulatorVisible: !settings.simulatorVisible });
          break;
        case 'toggleConsole':
          void update({ consoleVisible: !settings.consoleVisible });
          break;
        case 'fontIncrease':
          void changeFontScale(1);
          break;
        case 'fontDecrease':
          void changeFontScale(-1);
          break;
        case 'fontReset':
          void changeFontScale(0);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
