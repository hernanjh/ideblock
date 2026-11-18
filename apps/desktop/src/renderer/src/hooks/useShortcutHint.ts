import { useTranslation } from 'react-i18next';
import { formatShortcut, type ShortcutId } from '../shortcuts';
import { useSettingsStore } from '../state/settings';

/** Returns "Label (Ctrl+1)" style text for tooltips. */
export function useShortcutHint(): (label: string, shortcut: ShortcutId) => string {
  const { t } = useTranslation();
  const platform = useSettingsStore((state) => state.appInfo?.platform);
  return (label, shortcut) =>
    t('shortcut.withKeys', { label, keys: formatShortcut(shortcut, platform) });
}
