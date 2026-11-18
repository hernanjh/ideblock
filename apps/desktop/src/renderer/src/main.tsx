import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/global.css';

import { resolveLanguage } from '@ideblock/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyAppearance } from './appearance';
import { initI18n } from './i18n';
import { useBuildStore } from './state/build';
import { usePortsStore } from './state/ports';
import { useSerialStore } from './state/serial';
import { useProjectStore } from './state/project';
import { useSettingsStore } from './state/settings';

async function bootstrap(): Promise<void> {
  const [settings, appInfo] = await Promise.all([
    window.ideblock.invoke('settings:get'),
    window.ideblock.invoke('app:get-info'),
  ]);
  useSettingsStore.getState().hydrate(settings, appInfo);

  const language = resolveLanguage(settings.language, appInfo.systemLanguages);
  applyAppearance(settings, language);
  const i18n = await initI18n(language);

  const session = await window.ideblock.invoke('session:load');
  if (session) {
    useProjectStore.getState().load(session.project, session.path);
  } else {
    useProjectStore.getState().newProject(i18n.t('files.untitled'));
  }

  window.ideblock.on('settings:changed', (updated) => {
    useSettingsStore.getState().receive(updated);
  });
  usePortsStore.getState().setPorts(await window.ideblock.invoke('ports:list'));
  window.ideblock.on('ports:changed', (ports) => usePortsStore.getState().setPorts(ports));
  window.ideblock.on('serial:data', (text) => useSerialStore.getState().receive(text));
  window.ideblock.on('serial:status', (status) =>
    useSerialStore.getState().setStatus({
      open: status.state === 'open',
      port: status.port ?? null,
      error: status.state === 'error' ? (status.message ?? '') : null,
    }),
  );
  window.ideblock.on('toolchain:progress', (progress) => {
    useBuildStore.getState().setProgress(progress);
    // First-time downloads take a while, so the console shows what is happening.
    const { settings, update } = useSettingsStore.getState();
    if (progress.stage !== 'compile' && !settings.consoleVisible) {
      void update({ consoleVisible: true });
    }
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
