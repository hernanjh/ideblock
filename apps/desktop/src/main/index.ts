import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { z } from 'zod';
import { broadcast, registerInvokeHandlers } from './ipc';
import { installApplicationMenu } from './menu';
import { examplesDirectory, projectHandlers } from './project-ipc';
import { ProjectService } from './project-service';
import { SettingsStore } from './settings-store';
import { ArduinoCli } from './toolchain/arduino-cli';
import { ToolchainService } from './toolchain/toolchain-service';
import { createMainWindow } from './window';

const compileRequestSchema = z.object({
  code: z.string(),
  boardId: z.string(),
  sketchName: z.string(),
  libraries: z.array(z.string()),
});

function arduinoCliBinary(): string {
  const name = process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
  return app.isPackaged
    ? join(process.resourcesPath, 'bin', name)
    : join(app.getAppPath(), 'resources', 'bin', name);
}

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
    const cli = new ArduinoCli({
      binary: arduinoCliBinary(),
      // Tests and classroom setups can share one folder of installed cores.
      dataRoot:
        process.env['IDEBLOCK_ARDUINO_DATA_DIR'] ?? join(app.getPath('userData'), 'arduino'),
    });
    const toolchain = new ToolchainService(
      cli,
      join(app.getPath('userData'), 'build'),
      (progress) => broadcast('toolchain:progress', progress),
    );

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
      'toolchain:compile': (_event, request) =>
        toolchain.compile(compileRequestSchema.parse(request)),
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
