import { join } from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { z } from 'zod';
import { broadcast, registerInvokeHandlers } from './ipc';
import { installApplicationMenu } from './menu';
import { examplesDirectory, projectHandlers } from './project-ipc';
import { ProjectService } from './project-service';
import { SettingsStore } from './settings-store';
import { SimulatorWindow } from './simulator-window';
import { ArduinoCli } from './toolchain/arduino-cli';
import { findMissingDrivers } from './toolchain/drivers';
import { PortWatcher } from './toolchain/port-watcher';
import { SerialMonitor } from './toolchain/serial-monitor';
import { ToolchainService } from './toolchain/toolchain-service';
import { createMainWindow } from './window';

const compileRequestSchema = z.object({
  code: z.string(),
  boardId: z.string(),
  sketchName: z.string(),
  libraries: z.array(z.string()),
});
const uploadRequestSchema = z.object({ compile: compileRequestSchema, port: z.string().min(1) });
const serialOpenSchema = z.object({
  port: z.string().min(1),
  baudRate: z.number().int().positive(),
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
    const ports = new PortWatcher(cli, (list) => broadcast('ports:changed', list));
    const serial = new SerialMonitor(cli, {
      onData: (text) => broadcast('serial:data', text),
      onStatus: (status) => broadcast('serial:status', status),
    });
    void ports.start();
    let mainWindow: BrowserWindow | null = null;
    const simulatorWindow = new SimulatorWindow(() => mainWindow, isDev);
    app.on('before-quit', () => {
      ports.stop();
      serial.close();
    });

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
      'toolchain:upload': async (_event, request) => {
        const parsed = uploadRequestSchema.parse(request);
        // The upload needs the port, so an open monitor on it is paused meanwhile.
        const monitor = serial.session;
        if (monitor?.port === parsed.port) serial.close();
        const result = await toolchain.upload(parsed);
        if (monitor?.port === parsed.port) await serial.open(monitor);
        return result;
      },
      'ports:list': () => ports.list(),
      'ports:missing-drivers': () => findMissingDrivers(),
      'serial:open': (_event, request) => serial.open(serialOpenSchema.parse(request)),
      'serial:close': () => serial.close(),
      'serial:write': (_event, text) => serial.write(z.string().max(4096).parse(text)),
      'simulator:detach': () => simulatorWindow.open(),
      'simulator:attach': () => simulatorWindow.close(),
      'simulator:sync': (_event, snapshot) => simulatorWindow.sync(snapshot),
      'simulator:action': (_event, action) =>
        simulatorWindow.forward(z.looseObject({ type: z.string() }).parse(action)),
      'app:open-external': async (_event, url) => {
        const parsed = new URL(z.string().parse(url));
        if (parsed.protocol === 'https:') await shell.openExternal(parsed.toString());
      },
    });

    installApplicationMenu();
    const openMainWindow = (): void => {
      const window = createMainWindow(isDev);
      mainWindow = window;
      // The simulator window only mirrors the main one, so it closes with it.
      window.on('closed', () => {
        mainWindow = null;
        simulatorWindow.close();
      });
    };
    openMainWindow();

    app.on('activate', () => {
      if (!mainWindow) openMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
