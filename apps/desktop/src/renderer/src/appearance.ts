import type { Settings } from '@ideblock/shared';

export function applyAppearance(settings: Settings, language: string): void {
  const root = document.documentElement;
  root.lang = language;
  root.dataset['theme'] = settings.theme;
  root.style.fontSize = `${Math.round(settings.fontScale * 100)}%`;
}
