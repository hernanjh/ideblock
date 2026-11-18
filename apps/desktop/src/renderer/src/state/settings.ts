import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  clampFontScale,
  FONT_SCALE_STEP,
  sanitizeSettings,
  type AppInfo,
  type Settings,
  type SettingsPatch,
} from '@ideblock/shared';

interface SettingsState {
  settings: Settings;
  appInfo: AppInfo | null;
  hydrate: (settings: Settings, appInfo: AppInfo) => void;
  receive: (settings: Settings) => void;
  update: (patch: SettingsPatch) => Promise<void>;
  changeFontScale: (direction: -1 | 0 | 1) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  appInfo: null,
  hydrate: (settings, appInfo) => set({ settings, appInfo }),
  receive: (settings) => set({ settings }),
  update: async (patch) => {
    set({ settings: sanitizeSettings({ ...get().settings, ...patch }) });
    const confirmed = await window.ideblock.invoke('settings:update', patch);
    set({ settings: confirmed });
  },
  changeFontScale: async (direction) => {
    const current = get().settings.fontScale;
    const next =
      direction === 0
        ? DEFAULT_SETTINGS.fontScale
        : clampFontScale(current + direction * FONT_SCALE_STEP);
    if (next !== current) {
      await get().update({ fontScale: next });
    }
  },
}));
