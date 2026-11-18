import { useEffect } from 'react';
import { useSettingsStore } from '../state/settings';

const INCREASE_KEYS = new Set(['+', '=']);
const DECREASE_KEYS = new Set(['-', '_']);

/** Ctrl/Cmd with +, - and 0 scale the interface text, matching browser habits. */
export function useFontScaleShortcuts(): void {
  const changeFontScale = useSettingsStore((state) => state.changeFontScale);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }
      let direction: -1 | 0 | 1 | null = null;
      if (INCREASE_KEYS.has(event.key)) direction = 1;
      else if (DECREASE_KEYS.has(event.key)) direction = -1;
      else if (event.key === '0') direction = 0;
      if (direction !== null) {
        event.preventDefault();
        void changeFontScale(direction);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeFontScale]);
}
