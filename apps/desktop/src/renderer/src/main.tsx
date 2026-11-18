import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/global.css';

import { resolveLanguage } from '@ideblock/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyAppearance } from './appearance';
import { initI18n } from './i18n';
import { useSettingsStore } from './state/settings';

async function bootstrap(): Promise<void> {
  const [settings, appInfo] = await Promise.all([
    window.ideblock.invoke('settings:get'),
    window.ideblock.invoke('app:get-info'),
  ]);
  useSettingsStore.getState().hydrate(settings, appInfo);

  const language = resolveLanguage(settings.language, appInfo.systemLanguages);
  applyAppearance(settings, language);
  await initI18n(language);

  window.ideblock.on('settings:changed', (updated) => {
    useSettingsStore.getState().receive(updated);
  });

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
