import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { broadcast, registerInvokeHandlers } from './ipc';
import { installApplicationMenu } from './menu';
import { examplesDirectory, projectHandlers } from './project-ipc';
import { ProjectService } from './project-service';
import { SettingsStore } from './settings-store';
import { createMainWindow } from './window';

const isDev = !app.isPackaged && Boolean(process.env['ELECTRON_RENDERER_URL']);

// Lets end-to-end tests run against a throwaway profile.
const userDataOverride = process.env['IDEBLOCK_USER_DATA_DIR'];
if (userDataOverride) {
  app.setPath('userData', userDataOverride);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  });

  void app.whenReady().then(async () => {
    const settings = new SettingsStore(join(app.getPath('userData'), 'settings.json'));
    await settings.load();
    const projects = new ProjectService(app.getPath('userData'), examplesDirectory());

    registerInvokeHandlers({
      'app:get-info': () => ({
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        // The UI locale honours the --lang switch, so it goes first.
        systemLanguages: [app.getLocale(), ...app.getPreferredSystemLanguages()],
      }),
      'settings:get': () => settings.get(),
      'settings:update': async (_event, patch) => {
        const updated = await settings.update(patch);
        broadcast('settings:changed', updated);
        return updated;
      },
      ...projectHandlers(projects),
    });

    installApplicationMenu();
    createMainWindow(isDev);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(isDev);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
